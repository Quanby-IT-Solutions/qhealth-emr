import { Logger, type INestApplication } from "@nestjs/common"
import type { IncomingMessage, ServerResponse } from "http"
import { toNodeHandler } from "better-auth/node"

import { AUTH_BASE_PATH, getAuth } from "@repo/auth"

import { getVersionKeys } from "@/config/api-versions.config"
import { env } from "@/config/env.config"
import { generateBetterAuthSchema } from "@/utils/openapi"

// In-memory IP lockout: 5 failures in 15 min → 30-min lockout (ADM-BE-02)
// Survives per-process restart only; acceptable for single-instance deployments.
// For multi-instance, replace with the auth_lockout DB table.
const IP_LOCKOUT_THRESHOLD = 5
const IP_LOCKOUT_WINDOW_MS = 15 * 60 * 1000
const IP_LOCKOUT_DURATION_MS = 30 * 60 * 1000
const ipFailures = new Map<string, { count: number; lastAttempt: number }>()

function getClientIp(req: IncomingMessage): string {
	const forwarded = req.headers["x-forwarded-for"]
	if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() ?? "unknown"
	return req.socket.remoteAddress ?? "unknown"
}

function isIpLocked(ip: string): boolean {
	const record = ipFailures.get(ip)
	if (!record) return false
	const now = Date.now()
	if (now - record.lastAttempt > IP_LOCKOUT_DURATION_MS) {
		ipFailures.delete(ip)
		return false
	}
	return record.count >= IP_LOCKOUT_THRESHOLD
}

function recordIpFailure(ip: string): void {
	const now = Date.now()
	const record = ipFailures.get(ip) ?? { count: 0, lastAttempt: now }
	if (now - record.lastAttempt > IP_LOCKOUT_WINDOW_MS) record.count = 0
	record.count++
	record.lastAttempt = now
	ipFailures.set(ip, record)
}

function clearIpFailures(ip: string): void {
	ipFailures.delete(ip)
}

const logger = new Logger("BetterAuthConfig")

interface JsonResponse {
	json: (body: Record<string, unknown>) => void
}

/**
 * Creates middleware that routes versioned auth paths to Better Auth
 *
 * Rewrites URLs like /api/v1/auth/ok -> /auth/ok before passing to Better Auth handler.
 * This allows the same Better Auth instance to handle all API versions.
 */
function createAuthMiddleware(versionedAuthPaths: string[]) {
	const handler = toNodeHandler(getAuth())
	const allowedOrigins = env.CORS_ORIGINS.split(",").map(origin => origin.trim())

	const applyAuthCorsHeaders = (req: IncomingMessage, res: ServerResponse): void => {
		const requestOrigin = req.headers.origin

		if (!requestOrigin || !allowedOrigins.includes(requestOrigin)) {
			return
		}

		res.setHeader("Access-Control-Allow-Origin", requestOrigin)
		res.setHeader("Access-Control-Allow-Credentials", "true")
		res.setHeader("Vary", "Origin")
	}

	return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
		const url = req.url ?? ""
		const matchedPath = versionedAuthPaths.find(path => url.startsWith(path))

		if (matchedPath) {
			applyAuthCorsHeaders(req, res)

			// Let Express/Nest CORS middleware answer preflight requests.
			if (req.method === "OPTIONS") {
				return next()
			}

			const rewrittenPath = url.replace(matchedPath, AUTH_BASE_PATH)
			req.url = rewrittenPath

			// Account lockout: check and track failed sign-in attempts per IP (ADM-BE-02)
			const isSignIn = req.method === "POST" && rewrittenPath === `${AUTH_BASE_PATH}/sign-in/email`
			if (isSignIn) {
				const ip = getClientIp(req)
				if (isIpLocked(ip)) {
					res.writeHead(423, { "Content-Type": "application/json" })
					res.end(
						JSON.stringify({
							message:
								"Account temporarily locked due to too many failed attempts. Try again later.",
						})
					)
					return
				}
				let capturedStatus = 0
				const origWriteHead = res.writeHead.bind(res)
				const origEnd = res.end.bind(res)
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				;(res as any).writeHead = (code: number, ...a: unknown[]) => {
					capturedStatus = code
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					return (origWriteHead as any)(code, ...a)
				}
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				;(res as any).end = (...a: unknown[]) => {
					if (capturedStatus >= 400) recordIpFailure(ip)
					else if (capturedStatus >= 200 && capturedStatus < 300) {
						clearIpFailures(ip)
						// ADM-BE-02: audit successful login (fire-and-forget)
						logger.log(
							`auth.login.success ip=${ip} userAgent=${req.headers["user-agent"] ?? "unknown"}`
						)
					}
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					return (origEnd as any)(...a)
				}
			}

			return handler(req, res)
		}

		next()
	}
}

/**
 * Registers OpenAPI documentation endpoint for auth routes
 */
function registerAuthOpenApiEndpoint(httpServer: any, authPath: string): void {
	httpServer.get(`${authPath}/open-api`, async (_: unknown, res: JsonResponse) => {
		res.json(await generateBetterAuthSchema())
	})
}

/**
 * Set up Better Auth routes for all registered API versions
 *
 * Routes are registered at /api/v1/auth/*, /api/v2/auth/*, etc.
 * All versions share the same Better Auth instance with URL rewriting.
 */
export function setupBetterAuth(app: INestApplication): void {
	const httpServer = app.getHttpAdapter().getInstance()
	const versions = getVersionKeys()
	const authPaths = versions.map(version => `/api/${version}/auth`)

	// Single middleware handles all versioned auth routes
	httpServer.use(createAuthMiddleware(authPaths))

	// Register OpenAPI endpoints for each version
	for (const authPath of authPaths) {
		registerAuthOpenApiEndpoint(httpServer, authPath)
		logger.log(`Auth routes registered at ${authPath}/*`)
	}
}

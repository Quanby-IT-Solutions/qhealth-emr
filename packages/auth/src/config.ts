import { createEnv } from "@t3-oss/env-core"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { openAPI, twoFactor } from "better-auth/plugins"
import { z } from "zod"

import { createDBClient } from "@repo/db/client"
import { accounts, sessions, twoFactors, users, verifications } from "@repo/db/schema"

/**
 * Type-safe environment variable validation for Auth package
 *
 * Validates auth-related environment variables at module load time.
 * This ensures all required auth configuration is present before initialization.
 */
export const authEnv = createEnv({
	server: {
		// Authentication
		BETTER_AUTH_SECRET: z.string(),
		BETTER_AUTH_TRUSTED_ORIGINS: z.string(),
		BETTER_AUTH_COOKIE_DOMAIN: z.string().optional(),
		BETTER_AUTH_RATE_LIMIT_ENABLED: z.enum(["true", "false"]).optional(),

		// OAuth Providers (Google)
		GOOGLE_CLIENT_ID: z.string().optional(),
		GOOGLE_CLIENT_SECRET: z.string().optional(),
	},
	runtimeEnv: process.env,
	skipValidation: !!process.env.CI || process.env.npm_lifecycle_event === "lint",
})

/**
 * Internal basePath used by Better Auth.
 * All versioned API requests (/api/v1/auth/*, /api/v2/auth/*, etc.) are
 * normalized to this path before being handled by Better Auth.
 */
export const AUTH_BASE_PATH = "/auth"

/**
 * Creates a Better Auth instance configured with Drizzle adapter.
 *
 * The auth instance uses database connection from @repo/db and is
 * configured to work across multiple apps (backend, web, mobile via API).
 *
 * Uses a neutral basePath ("/auth") - the backend normalizes versioned
 * paths (/api/v1/auth/*, /api/v2/auth/*) to this basePath before handling.
 *
 * @returns Better Auth instance
 */
export function createAuth(): ReturnType<typeof betterAuth> {
	const db = createDBClient()

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",
			schema: {
				users,
				sessions,
				accounts,
				verifications,
				twoFactors,
			},
			usePlural: true,
		}),
		basePath: AUTH_BASE_PATH,
		secret: authEnv.BETTER_AUTH_SECRET,
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
		},
		socialProviders: {
			google: {
				prompt: "select_account",
				clientId: authEnv.GOOGLE_CLIENT_ID as string,
				clientSecret: authEnv.GOOGLE_CLIENT_SECRET as string,
			},
		},
		trustedOrigins: authEnv.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? [],
		rateLimit: {
			enabled: authEnv.BETTER_AUTH_RATE_LIMIT_ENABLED !== "false",
			window: 3600,
			max: 200,
			customRules: {
				"/sign-in/email": { window: 900, max: 10 },
				"/reset-password": { window: 3600, max: 3 },
				"/forget-password": { window: 3600, max: 3 },
			},
		},
		advanced: {
			...(authEnv.BETTER_AUTH_COOKIE_DOMAIN && {
				crossSubDomainCookies: {
					enabled: true,
					domain: authEnv.BETTER_AUTH_COOKIE_DOMAIN,
				},
			}),
		},
		plugins: [
			openAPI({
				path: "/reference",
			}),
			twoFactor({
				// TOTP issuer shown in authenticator apps
				issuer: "QHealth EMR",
				// Backup codes provide recovery when TOTP device is lost
				backupCodes: {
					enabled: true,
					amount: 10,
				},
			}),
		],
	})
}

/**
 * Default Better Auth instance.
 * This is the shared instance used across all apps.
 *
 * Lazy initialization to ensure environment variables are loaded before creating the instance.
 */
let _auth: ReturnType<typeof betterAuth> | null = null

/**
 * Clear the cached auth instance. Call this when configuration changes.
 */
export function clearAuthCache(): void {
	_auth = null
}

export function getAuth(): ReturnType<typeof betterAuth> {
	if (!_auth) {
		_auth = createAuth()
	}
	return _auth!
}

/**
 * Inferred Session type from Better Auth.
 * Export this so web app can use the correct types matching backend config.
 */
export type Session = ReturnType<typeof getAuth>["$Infer"]["Session"]

import { createORPCClient, ORPCError } from "@orpc/client"
import type { ContractRouterClient } from "@orpc/contract"
import { OpenAPILink } from "@orpc/openapi-client/fetch"
import { createTanstackQueryUtils } from "@orpc/tanstack-query"

import { billingContract, v1Contract } from "@repo/contracts"

type V1Contract = typeof v1Contract
type BillingContract = typeof billingContract

import { env } from "@/env"

type ORPCErrorCode = ConstructorParameters<typeof ORPCError>[0]

const STATUS_TO_ORPC_CODE: Partial<Record<number, ORPCErrorCode>> = {
	400: "BAD_REQUEST",
	401: "UNAUTHORIZED",
	403: "FORBIDDEN",
	404: "NOT_FOUND",
	405: "METHOD_NOT_SUPPORTED",
	406: "NOT_ACCEPTABLE",
	408: "TIMEOUT",
	409: "CONFLICT",
	412: "PRECONDITION_FAILED",
	413: "PAYLOAD_TOO_LARGE",
	415: "UNSUPPORTED_MEDIA_TYPE",
	422: "UNPROCESSABLE_CONTENT",
	429: "TOO_MANY_REQUESTS",
	499: "CLIENT_CLOSED_REQUEST",
	500: "INTERNAL_SERVER_ERROR",
	501: "NOT_IMPLEMENTED",
	502: "BAD_GATEWAY",
	503: "SERVICE_UNAVAILABLE",
	504: "GATEWAY_TIMEOUT",
}

type BackendErrorEnvelope = {
	success?: boolean
	error?: {
		code?: string
		message?: string | string[]
		details?: unknown
	}
}

function decodeBackendError(body: unknown, status: number) {
	if (!body || typeof body !== "object") return null

	const envelope = body as BackendErrorEnvelope
	if (!envelope.error || typeof envelope.error !== "object") return null

	const rawMessage = envelope.error.message
	const message =
		typeof rawMessage === "string"
			? rawMessage
			: Array.isArray(rawMessage)
				? rawMessage.join("; ")
				: undefined

	return new ORPCError(STATUS_TO_ORPC_CODE[status] ?? "INTERNAL_SERVER_ERROR", {
		status,
		message,
		data: {
			backendCode: envelope.error.code ?? null,
			details: envelope.error.details ?? null,
		},
	})
}

/**
 * Creates an oRPC link pointing at the NestJS backend.
 * Accepts an optional cookie-forwarding function for SSR server components.
 */
export function createOrpcLink(options?: { getCookieHeader?: () => string | undefined }) {
	return new OpenAPILink<typeof v1Contract>(v1Contract, {
		url: env.NEXT_PUBLIC_API_BASE_URL,
		customErrorResponseBodyDecoder: (body, response) => decodeBackendError(body, response.status),
		fetch: (url, init) => {
			const cookieHeader = options?.getCookieHeader?.()

			if (!cookieHeader) {
				return fetch(url, { ...(init as RequestInit), credentials: "include" })
			}

			const headers = new Headers((init as RequestInit | undefined)?.headers)
			headers.set("cookie", cookieHeader)

			return fetch(url, { ...(init as RequestInit), headers })
		},
	})
}

const link = createOrpcLink()

const baseOrpc = createORPCClient(link) as unknown as ContractRouterClient<V1Contract>

/**
 * oRPC TanStack Query utils — the primary export used by all feature hooks.
 *
 * Usage:
 *   import { orpc } from "@/services/orpc/client"
 *   useQuery(orpc.rbac.me.queryOptions())
 */
export const orpc = createTanstackQueryUtils(baseOrpc, { path: ["orpc"] })

/**
 * Typed billing oRPC utils — uses billingContract directly for full type inference.
 * The underlying client is the same runtime object as orpc.billing but with
 * explicit type information from billingContract (bypasses the `as any` cast in v1.billing.ts).
 *
 * Usage:
 *   import { billingOrpc } from "@/services/orpc/client"
 *   useQuery(billingOrpc.listCharges.queryOptions({ input: { encounterId } }))
 */
export const billingOrpc = createTanstackQueryUtils(
	(baseOrpc as unknown as { billing: ContractRouterClient<BillingContract> }).billing,
	{ path: ["orpc", "billing"] }
)

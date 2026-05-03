import { createORPCClient } from "@orpc/client"
import type { ContractRouterClient } from "@orpc/contract"
import { OpenAPILink } from "@orpc/openapi-client/fetch"
import { createTanstackQueryUtils } from "@orpc/tanstack-query"

import { billingContract, v1Contract } from "@repo/contracts"

type V1Contract = typeof v1Contract
type BillingContract = typeof billingContract

import { env } from "@/env"

/**
 * Creates an oRPC link pointing at the NestJS backend.
 * Accepts an optional cookie-forwarding function for SSR server components.
 */
export function createOrpcLink(options?: { getCookieHeader?: () => string | undefined }) {
	return new OpenAPILink<typeof v1Contract>(v1Contract, {
		url: env.NEXT_PUBLIC_API_BASE_URL,
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

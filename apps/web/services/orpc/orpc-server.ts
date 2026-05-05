import "server-only"

import { createORPCClient } from "@orpc/client"
import type { ContractRouterClient } from "@orpc/contract"
import { createTanstackQueryUtils } from "@orpc/tanstack-query"

import { billingContract, himContract, v1Contract } from "@repo/contracts"

import { getCookieHeader } from "@/core/lib/cookie-utils"

import { createOrpcLink } from "./client"

type V1Contract = typeof v1Contract
type BillingContract = typeof billingContract
type HimContract = typeof himContract

/**
 * Server-side oRPC client. Use in Server Components, Server Actions, and Route
 * Handlers to prefetch data into TanStack Query during SSR. Cookie header is
 * forwarded automatically so the NestJS backend sees the same Better Auth
 * session that the browser sent.
 *
 * Usage (Server Component):
 *   import { serverOrpc } from "@/services/orpc/orpc-server"
 *   const queryClient = getQueryClient()
 *   await queryClient.prefetchQuery(serverOrpc.billing.listCharges.queryOptions({ ... }))
 *   return (
 *     <HydrationBoundary state={dehydrate(queryClient)}>
 *       <ChargeCapturePageComponent .../>
 *     </HydrationBoundary>
 *   )
 *
 * For billing list pages (Charge Capture, Invoices, eClaims status, Konsulta
 * Tracker) a typed billing-specific client is also exported for ergonomics.
 */
function createServerOrpc() {
	const link = createOrpcLink({
		getCookieHeader: () => {
			// Sync function called inside fetch; resolve Next.js headers eagerly.
			// Falls back to empty string when called outside a request scope (e.g.,
			// during build) so that the link does not throw.
			try {
				return getServerCookieHeaderSync()
			} catch {
				return undefined
			}
		},
	})
	return createORPCClient(link) as unknown as ContractRouterClient<V1Contract>
}

/**
 * Cached cookie header for the lifetime of a single server request. The
 * `getCookieHeader` from `cookie-utils` is async (uses `await headers()`),
 * but oRPC's link wants a sync getter. Server components must call
 * `prepareServerOrpc()` once at the top of the page to populate the cache
 * before any prefetch.
 */
let cachedCookieHeader: string | undefined

function getServerCookieHeaderSync(): string | undefined {
	return cachedCookieHeader
}

/**
 * Call this at the top of each Server Component that prefetches via
 * serverOrpc. Resolves the cookie header once so the sync getter inside the
 * link can return it without awaiting.
 */
export async function prepareServerOrpc() {
	cachedCookieHeader = await getCookieHeader()
}

const baseServerOrpc = createServerOrpc()

export const serverOrpc = createTanstackQueryUtils(baseServerOrpc, { path: ["orpc"] })

export const billingServerOrpc = createTanstackQueryUtils(
	(baseServerOrpc as unknown as { billing: ContractRouterClient<BillingContract> }).billing,
	{ path: ["orpc", "billing"] }
)

export const himServerOrpc = createTanstackQueryUtils(
	(baseServerOrpc as unknown as { him: ContractRouterClient<HimContract> }).him,
	{ path: ["orpc", "him"] }
)

import { createORPCClient } from "@orpc/client"
import type { ContractRouterClient } from "@orpc/contract"
import { OpenAPILink } from "@orpc/openapi-client/fetch"
import { createTanstackQueryUtils } from "@orpc/tanstack-query"

import { v1Contract, type V1Contract } from "@repo/contracts"

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

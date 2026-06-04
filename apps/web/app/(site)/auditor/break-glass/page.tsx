import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"
import { createQueryClient } from "@/services/tanstack-query/query-client"

import "@/services/orpc/orpc-server"

import { BreakGlassInboxPageClient } from "@/features/auditor/break-glass-review/components/break-glass-inbox-page-client"

export default async function BreakGlassInboxPage() {
	const queryClient = createQueryClient()
	// Pre-warm the profile cache so facilityId resolves without a client waterfall
	await queryClient.prefetchQuery(orpc.rbac.me.queryOptions())

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<BreakGlassInboxPageClient />
		</HydrationBoundary>
	)
}

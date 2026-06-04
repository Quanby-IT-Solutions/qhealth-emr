import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"
import { createQueryClient } from "@/services/tanstack-query/query-client"

import "@/services/orpc/orpc-server"

import { FeatureFlagsPageClient } from "@/features/admin/components/feature-flags-page-client"

export default async function AdminFeatureFlagsPage() {
	const queryClient = createQueryClient()
	await queryClient.prefetchQuery(orpc.featureFlags.list.queryOptions())

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<FeatureFlagsPageClient />
		</HydrationBoundary>
	)
}

import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { prepareServerOrpc, reportingServerOrpc, serverOrpc } from "@/services/orpc/orpc-server"
import { getQueryClient } from "@/services/tanstack-query/query-client"
import { AhsrDashboardClient } from "@/features/surveillance/ahsr/components/ahsr-dashboard"

export default async function AhsrPage() {
	await prepareServerOrpc()
	const queryClient = getQueryClient()

	// Prefetch profile and real-time metrics for instant render
	const profile = await queryClient.fetchQuery(serverOrpc.rbac.me.queryOptions()).catch(() => null)
	const facilityId = profile?.staffProfiles?.[0]?.facilityId

	if (facilityId) {
		const currentYear = new Date().getFullYear()
		await Promise.all([
			queryClient.prefetchQuery(
				reportingServerOrpc.getAhsrRealTime.queryOptions({
					input: { facilityId },
				})
			),
			queryClient.prefetchQuery(
				reportingServerOrpc.getAhsrMetrics.queryOptions({
					input: { facilityId, year: currentYear },
				})
			),
		])
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<AhsrDashboardClient />
		</HydrationBoundary>
	)
}

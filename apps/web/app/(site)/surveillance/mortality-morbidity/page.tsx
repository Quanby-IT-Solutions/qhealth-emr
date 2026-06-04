import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { prepareServerOrpc, reportingServerOrpc, serverOrpc } from "@/services/orpc/orpc-server"
import { getQueryClient } from "@/services/tanstack-query/query-client"
import { MmReportClient } from "@/features/surveillance/mortality-morbidity/components/mm-report"

export default async function MortalityMorbidityPage() {
	await prepareServerOrpc()
	const queryClient = getQueryClient()

	// Prefetch profile and default top-10 mortality for instant render
	const profile = await queryClient.fetchQuery(serverOrpc.rbac.me.queryOptions()).catch(() => null)
	const facilityId = profile?.staffProfiles?.[0]?.facilityId

	if (facilityId) {
		const currentYear = new Date().getFullYear()
		await Promise.all([
			queryClient.prefetchQuery(
				reportingServerOrpc.getMmTop10.queryOptions({
					input: { facilityId, type: "mortality", year: currentYear },
				})
			),
			queryClient.prefetchQuery(
				reportingServerOrpc.getMmTop10.queryOptions({
					input: { facilityId, type: "morbidity", year: currentYear },
				})
			),
		])
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<MmReportClient />
		</HydrationBoundary>
	)
}

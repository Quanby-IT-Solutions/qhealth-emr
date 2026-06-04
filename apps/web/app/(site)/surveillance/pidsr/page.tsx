import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { prepareServerOrpc, reportingServerOrpc, serverOrpc } from "@/services/orpc/orpc-server"
import { getQueryClient } from "@/services/tanstack-query/query-client"
import { PidsrInboxClient } from "@/features/surveillance/pidsr/components/pidsr-inbox"

export default async function PidsrPage() {
	await prepareServerOrpc()
	const queryClient = getQueryClient()

	// Prefetch the user profile so the client component doesn't flicker
	const profile = await queryClient.fetchQuery(serverOrpc.rbac.me.queryOptions()).catch(() => null)
	const facilityId = profile?.staffProfiles?.[0]?.facilityId

	if (facilityId) {
		await queryClient.prefetchQuery(
			reportingServerOrpc.listSurveillanceFlags.queryOptions({
				input: { facilityId, page: 1, limit: 50, isReviewed: false },
			})
		)
		await queryClient.prefetchQuery(
			reportingServerOrpc.listPidsrCases.queryOptions({
				input: { facilityId, page: 1, limit: 20 },
			})
		)
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<PidsrInboxClient />
		</HydrationBoundary>
	)
}

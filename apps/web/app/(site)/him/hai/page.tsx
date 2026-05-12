import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { createQueryClient } from "@/services/tanstack-query/query-client"
import { himServerOrpc, prepareServerOrpc, serverOrpc } from "@/services/orpc/orpc-server"

import { HimHaiClient } from "@/features/him/hai-reconciliation/components/him-hai-client"

export default async function HimHaiPage() {
	await prepareServerOrpc()
	const queryClient = createQueryClient()
	const profile = await queryClient.fetchQuery(serverOrpc.rbac.me.queryOptions())
	const facilityId = profile.staffProfiles?.[0]?.facilityId

	if (facilityId) {
		await queryClient.prefetchQuery(
			himServerOrpc.listHai.queryOptions({
				input: {
					facilityId,
					page: 1,
					limit: 50,
				},
			})
		)
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<HimHaiClient />
		</HydrationBoundary>
	)
}

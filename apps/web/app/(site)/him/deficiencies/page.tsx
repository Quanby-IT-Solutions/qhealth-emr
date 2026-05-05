import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { createQueryClient } from "@/services/tanstack-query/query-client"
import { himServerOrpc, prepareServerOrpc, serverOrpc } from "@/services/orpc/orpc-server"

import { HimDeficienciesClient } from "@/features/him/deficiency-tracking/components/him-deficiencies-client"

export default async function HimDeficienciesPage() {
	await prepareServerOrpc()
	const queryClient = createQueryClient()
	const profile = await queryClient.fetchQuery(serverOrpc.rbac.me.queryOptions())
	const facilityId = profile.staffProfiles?.[0]?.facilityId

	if (facilityId) {
		await queryClient.prefetchQuery(
			himServerOrpc.listDeficiencies.queryOptions({
				input: {
					facilityId,
					page: 1,
					limit: 25,
					status: "open",
					sortBy: "dischargeDatetime",
					sortDirection: "desc",
				},
			})
		)
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<HimDeficienciesClient />
		</HydrationBoundary>
	)
}

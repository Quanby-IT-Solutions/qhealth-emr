import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { prepareServerOrpc, serverOrpc } from "@/services/orpc/orpc-server"
import { createQueryClient } from "@/services/tanstack-query/query-client"
import { HimRecordsClient } from "@/features/him/records-issuance/components/him-records-client"

export default async function HimRecordsRequestsPage() {
	await prepareServerOrpc()
	const queryClient = createQueryClient()
	const profile = await queryClient.fetchQuery(serverOrpc.rbac.me.queryOptions())
	const facilityId = profile.staffProfiles?.[0]?.facilityId

	if (facilityId) {
		await queryClient.prefetchQuery(
			serverOrpc.medicalRecords.listMedicalRecordsRequests.queryOptions({
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
			<HimRecordsClient />
		</HydrationBoundary>
	)
}

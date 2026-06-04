import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { mswServerOrpc, prepareServerOrpc } from "@/services/orpc/orpc-server"
import { createQueryClient } from "@/services/tanstack-query/query-client"

import { EncountersClient } from "./encounters-client"

export default async function EncountersPage() {
	await prepareServerOrpc()
	const queryClient = createQueryClient()
	await queryClient.prefetchQuery(
		mswServerOrpc.list.queryOptions({ input: { page: 1, limit: 25 } })
	)

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<EncountersClient />
		</HydrationBoundary>
	)
}

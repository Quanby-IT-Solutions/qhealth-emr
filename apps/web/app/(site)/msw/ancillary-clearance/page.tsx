import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { createQueryClient } from "@/services/tanstack-query/query-client"
import { mswServerOrpc, prepareServerOrpc } from "@/services/orpc/orpc-server"

import { AncillaryClearanceClient } from "./ancillary-clearance-client"

export default async function AncillaryClearancePage() {
	await prepareServerOrpc()
	const queryClient = createQueryClient()
	await queryClient.prefetchQuery(
		mswServerOrpc.ancillaryClearance.queue.queryOptions({ input: {} })
	)

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<AncillaryClearanceClient />
		</HydrationBoundary>
	)
}

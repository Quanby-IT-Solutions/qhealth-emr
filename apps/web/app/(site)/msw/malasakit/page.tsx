import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { createQueryClient } from "@/services/tanstack-query/query-client"
import { mswServerOrpc, prepareServerOrpc } from "@/services/orpc/orpc-server"

import { MalasakitQueueClient } from "./malasakit-queue-client"

export default async function MalasakitPage() {
	await prepareServerOrpc()
	const queryClient = createQueryClient()
	await queryClient.prefetchQuery(
		mswServerOrpc.malasakit.list.queryOptions({ input: { page: 1, limit: 25 } })
	)

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<MalasakitQueueClient />
		</HydrationBoundary>
	)
}

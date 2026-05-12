import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { createQueryClient } from "@/services/tanstack-query/query-client"
import { mswServerOrpc, prepareServerOrpc } from "@/services/orpc/orpc-server"

import { SignedFormsClient } from "./signed-forms-client"

export default async function SignedFormsPage() {
	await prepareServerOrpc()
	const queryClient = createQueryClient()
	await queryClient.prefetchQuery(
		mswServerOrpc.annexSignatures.list.queryOptions({ input: {} })
	)

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<SignedFormsClient />
		</HydrationBoundary>
	)
}

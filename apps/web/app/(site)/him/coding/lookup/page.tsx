import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { prepareServerOrpc, serverOrpc } from "@/services/orpc/orpc-server"
import { createQueryClient } from "@/services/tanstack-query/query-client"
import { CodeLookupPage } from "@/features/him/icd10-coding/components/code-lookup-page"

export default async function HimCodingLookupPage() {
	await prepareServerOrpc()
	const queryClient = createQueryClient()
	await queryClient.prefetchQuery(serverOrpc.rbac.me.queryOptions())
	await queryClient.prefetchQuery(serverOrpc.terminology.listSystems.queryOptions())

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<CodeLookupPage />
		</HydrationBoundary>
	)
}

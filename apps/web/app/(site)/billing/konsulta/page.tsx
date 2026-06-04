import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

import "@/services/orpc/orpc-server"

import { createQueryClient } from "@/services/tanstack-query/query-client"

import { KonsultaTrackerPageClient } from "./konsulta-tracker-page-client"

export default async function KonsultaTrackerPage() {
	const queryClient = createQueryClient()
	await queryClient.prefetchQuery(orpc.rbac.me.queryOptions())

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<KonsultaTrackerPageClient />
		</HydrationBoundary>
	)
}

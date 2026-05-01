import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { createQueryClient } from "@/services/tanstack-query/query-client"
import { orpc } from "@/services/orpc/client"
import "@/services/orpc/orpc-server"
import { AuditLogPageClient } from "@/features/auditor/audit-log/components/audit-log-page-client"

export default async function AuditLogPage() {
	const queryClient = createQueryClient()
	// Pre-warm the profile cache so facilityId resolves without a client waterfall
	await queryClient.prefetchQuery(orpc.rbac.me.queryOptions())

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<AuditLogPageClient />
		</HydrationBoundary>
	)
}

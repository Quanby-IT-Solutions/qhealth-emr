import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { createQueryClient } from "@/services/tanstack-query/query-client"
import { orpc } from "@/services/orpc/client"
import "@/services/orpc/orpc-server"
import { UsersPageClient } from "@/features/admin/components/users-page-client"

export default async function AdminUsersPage() {
	const queryClient = createQueryClient()
	await queryClient.prefetchQuery(
		orpc.rbac.listStaff.queryOptions({
			input: { page: 1, limit: 20 },
		})
	)

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<UsersPageClient />
		</HydrationBoundary>
	)
}

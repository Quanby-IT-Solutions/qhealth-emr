import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"
import { createQueryClient } from "@/services/tanstack-query/query-client"

import "@/services/orpc/orpc-server"

import { ClinicianLicenseList } from "@/features/admin/clinician-licenses/components/clinician-license-list"

export const metadata = { title: "Clinician Licenses" }

export default async function ClinicianLicensesPage() {
	const queryClient = createQueryClient()
	await queryClient.prefetchQuery(
		orpc.clinicianLicenses.list.queryOptions({
			input: { page: 1, limit: 20 },
		})
	)

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-semibold">Clinician Licenses</h1>
					<p className="text-muted-foreground mt-1 text-sm">
						Manage PRC, PTR, and S2 license records for clinical staff.
					</p>
				</div>
				<ClinicianLicenseList />
			</div>
		</HydrationBoundary>
	)
}

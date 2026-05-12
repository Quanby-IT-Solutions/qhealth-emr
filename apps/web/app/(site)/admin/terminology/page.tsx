import { TerminologyManagementPage } from "@/features/admin/terminology/components/terminology-management-page"

export const metadata = { title: "Terminology Management" }

export default function TerminologyPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Terminology Management</h1>
				<p className="text-sm text-muted-foreground mt-1">Manage ICD-10, SNOMED CT, LOINC, RxNorm, and RVS code sets.</p>
			</div>
			<TerminologyManagementPage />
		</div>
	)
}

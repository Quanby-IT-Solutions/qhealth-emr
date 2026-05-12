import { DepartmentsPage } from "@/features/admin/facility-setup/components/departments-page"

export const metadata = { title: "Departments" }

export default function FacilityDepartmentsPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Departments</h1>
				<p className="text-sm text-muted-foreground mt-1">Manage facility departments and their codes.</p>
			</div>
			<DepartmentsPage />
		</div>
	)
}

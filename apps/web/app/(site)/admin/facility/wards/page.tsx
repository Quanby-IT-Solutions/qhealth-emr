import { WardsPage } from "@/features/admin/facility-setup/components/wards-page"

export const metadata = { title: "Wards & Beds" }

export default function FacilityWardsPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Wards & Beds</h1>
				<p className="text-sm text-muted-foreground mt-1">View and manage wards, rooms, and bed statuses.</p>
			</div>
			<WardsPage />
		</div>
	)
}

import { BorDashboard } from "@/features/admin/bor-census/components/bor-dashboard"

export const metadata = { title: "BOR Dashboard" }

export default function BorPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Bed Occupancy Rate</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Real-time bed census and occupancy metrics.
				</p>
			</div>
			<BorDashboard />
		</div>
	)
}

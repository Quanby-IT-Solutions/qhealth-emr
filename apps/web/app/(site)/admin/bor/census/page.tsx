import { CensusReportPage } from "@/features/admin/bor-census/components/census-report-page"

export const metadata = { title: "Census Report" }

export default function CensusPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Daily Census Report</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Bed occupancy snapshots by ward and date.
				</p>
			</div>
			<CensusReportPage />
		</div>
	)
}

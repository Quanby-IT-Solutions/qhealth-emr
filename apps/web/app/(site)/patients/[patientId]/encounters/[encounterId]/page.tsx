"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { useChartContext } from "@/features/encounters/context/chart-context"

function formatDateTime(dateStr: string | Date | null | undefined) {
	if (!dateStr) return "—"
	return new Date(dateStr).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

export default function EncounterSummaryPage() {
	const { encounter, isLoading } = useChartContext()

	if (isLoading) {
		return <div className="h-32 animate-pulse rounded bg-muted" />
	}

	if (!encounter) {
		return null
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Encounter Summary</CardTitle>
			</CardHeader>
			<CardContent>
				<dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
					<div>
						<dt className="text-muted-foreground">Chief Complaint</dt>
						<dd>{encounter.chiefComplaint ?? "—"}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">Encounter Type</dt>
						<dd className="capitalize">{encounter.encounterType}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">Status</dt>
						<dd className="capitalize">{encounter.status}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">Admission</dt>
						<dd>{formatDateTime(encounter.admissionDatetime)}</dd>
					</div>
					{encounter.dischargeDatetime && (
						<div>
							<dt className="text-muted-foreground">Discharge</dt>
							<dd>{formatDateTime(encounter.dischargeDatetime)}</dd>
						</div>
					)}
					{encounter.disposition && (
						<div>
							<dt className="text-muted-foreground">Disposition</dt>
							<dd className="capitalize">{encounter.disposition}</dd>
						</div>
					)}
					<div>
						<dt className="text-muted-foreground">Admitting Physician</dt>
						<dd>{encounter.admittingStaffName ?? "—"}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">Attending Physician</dt>
						<dd>{encounter.attendingStaffName ?? "—"}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">OECB Eligible</dt>
						<dd>{encounter.oecbEligible ? "Yes" : "No"}</dd>
					</div>
				</dl>
			</CardContent>
		</Card>
	)
}

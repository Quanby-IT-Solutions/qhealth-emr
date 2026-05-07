"use client"

import { WifiOff } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { useChartContext } from "@/features/encounters/context/chart-context"
import { useOfflineEncounter } from "@/features/offline-cache/lib/use-offline-encounter"
import type { OfflineVitalSummary } from "@/features/offline-cache/lib/offline-cache"

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

function VitalItem({ label, value, unit }: { label: string; value: string; unit: string }) {
	return (
		<div className="rounded-lg border p-3 text-center">
			<div className="text-xs font-medium text-muted-foreground">{label}</div>
			<div className="mt-1 text-lg font-semibold">{value}</div>
			<div className="text-xs text-muted-foreground">{unit}</div>
		</div>
	)
}

function VitalsCard({ vital }: { vital: OfflineVitalSummary | null }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Latest Vitals</CardTitle>
			</CardHeader>
			<CardContent>
				{vital ? (
					<div>
						<div className="mb-3 text-xs text-muted-foreground">
							Recorded {formatDateTime(vital.recordedAt)}
						</div>
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
							<VitalItem
								label="BP"
								value={
									vital.bpSystolic != null && vital.bpDiastolic != null
										? `${vital.bpSystolic}/${vital.bpDiastolic}`
										: "—"
								}
								unit="mmHg"
							/>
							<VitalItem
								label="HR"
								value={vital.heartRate != null ? String(vital.heartRate) : "—"}
								unit="bpm"
							/>
							<VitalItem
								label="RR"
								value={vital.respiratoryRate != null ? String(vital.respiratoryRate) : "—"}
								unit="br/min"
							/>
							<VitalItem
								label="Temp"
								value={vital.temperature != null ? String(vital.temperature) : "—"}
								unit="°C"
							/>
							<VitalItem
								label="SpO₂"
								value={vital.spo2 != null ? String(vital.spo2) : "—"}
								unit="%"
							/>
						</div>
						{vital.newsScore != null && (
							<div className="mt-3 text-sm">
								<span className="text-muted-foreground">NEWS Score: </span>
								<span
									className={
										vital.newsRiskLevel === "high"
											? "font-semibold text-destructive"
											: vital.newsRiskLevel === "medium"
												? "font-semibold text-amber-600"
												: "font-medium"
									}
								>
									{vital.newsScore}
								</span>
								{vital.newsRiskLevel && (
									<span className="ml-1 capitalize text-muted-foreground">
										({vital.newsRiskLevel} risk)
									</span>
								)}
							</div>
						)}
					</div>
				) : (
					<p className="text-sm text-muted-foreground">No vitals recorded.</p>
				)}
			</CardContent>
		</Card>
	)
}

export default function EncounterSummaryPage() {
	const { encounter, isLoading, encounterId, patientId } = useChartContext()
	const { isOnline, latestVital, cachedSummary, cachedAt } = useOfflineEncounter(
		encounterId,
		patientId,
	)

	if (isLoading && isOnline) {
		return <div className="h-32 animate-pulse rounded bg-muted" />
	}

	// Offline with no cached data
	if (!isOnline && !cachedSummary) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-12 text-center">
					<WifiOff className="mb-3 size-8 text-muted-foreground" />
					<p className="font-medium">No cached data available</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Connect to the network to load this encounter.
					</p>
				</CardContent>
			</Card>
		)
	}

	const encounterData = isOnline ? encounter : cachedSummary?.encounter

	if (!encounterData) return null

	return (
		<div className="space-y-4">
			{!isOnline && (
				<div className="flex items-center gap-2">
					<Badge
						variant="secondary"
						className="gap-1 border-amber-300 bg-amber-100 text-amber-800"
					>
						<WifiOff className="size-3" />
						Cached
					</Badge>
					{cachedAt && (
						<span className="text-xs text-muted-foreground">as of {formatDateTime(cachedAt)}</span>
					)}
				</div>
			)}

			<VitalsCard vital={latestVital} />

			<Card>
				<CardHeader>
					<CardTitle>Encounter Summary</CardTitle>
				</CardHeader>
				<CardContent>
					<dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
						<div>
							<dt className="text-muted-foreground">Chief Complaint</dt>
							<dd>{encounterData.chiefComplaint ?? "—"}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Encounter Type</dt>
							<dd className="capitalize">{encounterData.encounterType}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Status</dt>
							<dd className="capitalize">{encounterData.status}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Admission</dt>
							<dd>{formatDateTime(encounterData.admissionDatetime)}</dd>
						</div>
						{encounterData.dischargeDatetime && (
							<div>
								<dt className="text-muted-foreground">Discharge</dt>
								<dd>{formatDateTime(encounterData.dischargeDatetime)}</dd>
							</div>
						)}
						{encounterData.disposition && (
							<div>
								<dt className="text-muted-foreground">Disposition</dt>
								<dd className="capitalize">{encounterData.disposition}</dd>
							</div>
						)}
						<div>
							<dt className="text-muted-foreground">Admitting Physician</dt>
							<dd>{encounterData.admittingStaffName ?? "—"}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Attending Physician</dt>
							<dd>{encounterData.attendingStaffName ?? "—"}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">OECB Eligible</dt>
							<dd>{encounterData.oecbEligible ? "Yes" : "No"}</dd>
						</div>
					</dl>
				</CardContent>
			</Card>
		</div>
	)
}

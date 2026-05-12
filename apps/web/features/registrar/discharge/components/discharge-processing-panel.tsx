"use client"

import { useRouter } from "next/navigation"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import { useEncounterDetailQuery } from "@/features/encounters/api/encounters.hooks"
import { useClearanceStatusQuery, useGatePassQuery, useIssueGatePassMutation } from "../api/discharge.hooks"
import { ClearanceStatusCard } from "./clearance-status-card"

function formatDatetime(value: Date | string | null) {
	if (!value) return "—"
	return new Date(value).toLocaleString("en-PH", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function computeLos(admissionDatetime: Date | string | null, dischargeDatetime: Date | string | null) {
	const start = admissionDatetime ? new Date(admissionDatetime).getTime() : null
	const end = dischargeDatetime ? new Date(dischargeDatetime).getTime() : Date.now()
	if (!start) return "Unknown"
	const ms = end - start
	const days = Math.floor(ms / 86_400_000)
	const hours = Math.floor((ms % 86_400_000) / 3_600_000)
	if (days === 0) return `${hours}h`
	return hours > 0 ? `${days}d ${hours}h` : `${days}d`
}

function computeDeathClassification(
	admissionDatetime: Date | string | null,
	dischargeDatetime: Date | string | null
): "gross" | "net" | null {
	if (!admissionDatetime || !dischargeDatetime) return null
	const ms = new Date(dischargeDatetime).getTime() - new Date(admissionDatetime).getTime()
	return ms / 3_600_000 <= 48 ? "gross" : "net"
}

const DISPOSITION_LABELS: Record<string, string> = {
	home: "Discharged to Home",
	transfer: "Transferred",
	deceased: "Deceased",
	ama: "Against Medical Advice",
}

export function DischargeProcessingPanel({ encounterId }: { encounterId: string }) {
	const router = useRouter()

	const { data: encounter, isLoading: encounterLoading } = useEncounterDetailQuery(encounterId)
	const { data: clearance, isLoading: clearanceLoading } = useClearanceStatusQuery(encounterId)
	const { data: gatePass } = useGatePassQuery(encounterId)
	const issueGatePass = useIssueGatePassMutation()

	if (encounterLoading || clearanceLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-48 w-full" />
			</div>
		)
	}

	if (!encounter) {
		return (
			<div className="text-muted-foreground py-8 text-center">Encounter not found.</div>
		)
	}

	const isDeceased = encounter.disposition === "deceased"
	const deathClass = isDeceased
		? computeDeathClassification(encounter.admissionDatetime, encounter.dischargeDatetime)
		: null

	const handleIssueGatePass = () => {
		issueGatePass.mutate(
			{ encounterId },
			{
				onSuccess: () => {
					router.push(`/registrar/discharge/${encounterId}/gate-pass`)
				},
			}
		)
	}

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">Patient Information</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="grid grid-cols-2 gap-3 text-sm">
						<div>
							<span className="text-muted-foreground">Ward</span>
							<p className="font-medium">{encounter.wardName ?? "—"}</p>
						</div>
						<div>
							<span className="text-muted-foreground">Bed</span>
							<p className="font-medium">
								{encounter.bedNumber ? `Bed ${encounter.bedNumber}` : "—"}
							</p>
						</div>
						<div>
							<span className="text-muted-foreground">Admitted</span>
							<p className="font-medium">{formatDatetime(encounter.admissionDatetime)}</p>
						</div>
						<div>
							<span className="text-muted-foreground">Length of Stay</span>
							<p className="font-medium">
								{computeLos(encounter.admissionDatetime, encounter.dischargeDatetime)}
							</p>
						</div>
						{encounter.disposition && (
							<div>
								<span className="text-muted-foreground">Disposition</span>
								<p className="font-medium">
									{DISPOSITION_LABELS[encounter.disposition] ?? encounter.disposition}
								</p>
							</div>
						)}
						{isDeceased && deathClass && (
							<div>
								<span className="text-muted-foreground">Death Classification</span>
								<div className="mt-0.5">
									<Badge variant="destructive">
										{deathClass === "gross"
											? "Gross Death Rate (≤48h)"
											: "Net Death Rate (>48h)"}
									</Badge>
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{clearance && <ClearanceStatusCard status={clearance} />}

			<div className="flex gap-3">
				{gatePass ? (
					<Button
						variant="outline"
						onClick={() => router.push(`/registrar/discharge/${encounterId}/gate-pass`)}
					>
						View / Reprint Gate Pass
					</Button>
				) : (
					<Button
						disabled={!clearance?.allConfirmed || issueGatePass.isPending}
						onClick={handleIssueGatePass}
					>
						{issueGatePass.isPending ? "Issuing…" : "Issue Gate Pass"}
					</Button>
				)}
			</div>
			{!clearance?.allConfirmed && !gatePass && (
				<p className="text-muted-foreground text-sm">
					Gate pass is available once all three clearances are confirmed.
				</p>
			)}
		</div>
	)
}

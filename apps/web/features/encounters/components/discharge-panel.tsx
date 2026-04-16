"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import {
	isMaternalDeathCandidate,
	isNeonatalDeathCandidate,
	useDeathReportStatusQuery,
} from "@/features/death-reporting/api/death-reporting.hooks"
import { DeathReportModal } from "@/features/death-reporting/components/death-report-modal"
import {
	useCloseEncounterMutation,
	useDischargeChecklistQuery,
	useDischargeEncounterMutation,
} from "@/features/encounters/api/encounters.hooks"
import { DischargeChecklist } from "@/features/encounters/components/discharge-checklist"

interface DischargePanelProps {
	encounterId: string
	encounterType: string
	patientId: string
	patientSex?: string
	patientDateOfBirth?: string
}

export function DischargePanel({
	encounterId,
	encounterType,
	patientId,
	patientSex,
	patientDateOfBirth,
}: DischargePanelProps) {
	const router = useRouter()
	const { data: checklist, isLoading: checklistLoading } = useDischargeChecklistQuery(encounterId)
	const discharge = useDischargeEncounterMutation()
	const close = useCloseEncounterMutation()
	const { data: deathReportStatus } = useDeathReportStatusQuery(encounterId)

	const [disposition, setDisposition] = useState("")
	const [deathReportModalOpen, setDeathReportModalOpen] = useState(false)

	const isOutpatient = encounterType === "outpatient"

	const needsDeathReport =
		disposition === "deceased" &&
		!!patientDateOfBirth &&
		(isMaternalDeathCandidate(patientSex ?? "", patientDateOfBirth) ||
			isNeonatalDeathCandidate(patientDateOfBirth))

	const deathReportComplete =
		!needsDeathReport ||
		((!isMaternalDeathCandidate(patientSex ?? "", patientDateOfBirth ?? "") ||
			!!deathReportStatus?.hasFmdrf) &&
			(!isNeonatalDeathCandidate(patientDateOfBirth ?? "") ||
				!!deathReportStatus?.hasFndrf))

	const handleDischarge = async () => {
		if (isOutpatient) {
			await close.mutateAsync({ encounterId })
		} else {
			if (!disposition) return

			if (needsDeathReport && !deathReportComplete) {
				setDeathReportModalOpen(true)
				return
			}

			await discharge.mutateAsync({
				encounterId,
				disposition: disposition as "home" | "transfer" | "deceased" | "ama",
			})
		}
		router.push(`/patients/${patientId}`)
	}

	return (
		<div className="space-y-4">
			{/* Checklist */}
			<Card>
				<CardHeader>
					<CardTitle>
						{isOutpatient ? "Close Checklist" : "Discharge Checklist"}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{checklistLoading ? (
						<div className="text-muted-foreground py-4 text-sm">Loading checklist…</div>
					) : checklist ? (
						<DischargeChecklist
							items={checklist.items}
							encounterType={checklist.encounterType}
						/>
					) : null}
				</CardContent>
			</Card>

			{/* Discharge / Close action */}
			<Card>
				<CardHeader>
					<CardTitle>{isOutpatient ? "Close Encounter" : "Discharge Patient"}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{!isOutpatient && (
						<div className="space-y-1.5">
							<Label>Disposition *</Label>
							<Select value={disposition} onValueChange={v => setDisposition(v ?? "")}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="home">Discharged to Home</SelectItem>
									<SelectItem value="transfer">Transferred to Another Facility</SelectItem>
									<SelectItem value="deceased">Deceased</SelectItem>
									<SelectItem value="ama">Against Medical Advice</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}

					<Button
						onClick={handleDischarge}
						disabled={
							!checklist?.allComplete ||
							(!isOutpatient && !disposition) ||
							discharge.isPending ||
							close.isPending
						}
						variant={isOutpatient ? "default" : "destructive"}
					>
						{discharge.isPending || close.isPending
							? "Processing…"
							: isOutpatient
								? "Close Encounter"
								: "Confirm Discharge"}
					</Button>
				</CardContent>
			</Card>

			{needsDeathReport && (
				<DeathReportModal
					open={deathReportModalOpen}
					onOpenChange={setDeathReportModalOpen}
					encounterId={encounterId}
					patientId={patientId}
					patientSex={patientSex ?? ""}
					patientDateOfBirth={patientDateOfBirth ?? ""}
				/>
			)}
		</div>
	)
}

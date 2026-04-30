"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Printer } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { useNotesQuery } from "@/features/clinical-docs/api/clinical-docs.hooks"
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
import { ClinicalAbstractDialog } from "@/features/encounters/components/clinical-abstract-dialog"
import { PrescriptionPrintDialog } from "@/features/orders/components/prescription-print-dialog"
import { usePrescriptionListQuery } from "@/features/orders/api/orders.hooks"

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

	const isOutpatient = encounterType === "outpatient"

	// Release artifact queries (OPD only)
	const { data: notesData } = useNotesQuery(
		isOutpatient ? { encounterId } : {}
	)
	const { data: prescriptionsData } = usePrescriptionListQuery(
		isOutpatient ? { encounterId, page: 1, limit: 50 } : {}
	)

	const signedNoteCount = (notesData?.data ?? []).filter(n => n.status === "signed").length
	const prescriptionCount = prescriptionsData?.data.length ?? 0

	const [disposition, setDisposition] = useState("")
	const [deathReportModalOpen, setDeathReportModalOpen] = useState(false)
	const [abstractOpen, setAbstractOpen] = useState(false)
	const [rxPrintOpen, setRxPrintOpen] = useState(false)
	// PS-017: track that required release documents were opened before close
	const [abstractOpened, setAbstractOpened] = useState(false)
	const [rxOpened, setRxOpened] = useState(false)

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

		{/* OPD Release Documents */}
		{isOutpatient && (
			<Card>
				<CardHeader>
					<CardTitle>Release Documents</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-muted-foreground text-sm">
						Review and share the following documents before closing the encounter.
					</p>
					<div className="flex flex-col gap-2 sm:flex-row">
						<Button
							variant="outline"
							onClick={() => { setAbstractOpen(true) }}
						>
							<Printer className="mr-1.5 size-4" />
							Print Clinical Abstract
							{signedNoteCount > 0 && (
								<span className="bg-secondary text-secondary-foreground ml-2 rounded-full px-2 py-0.5 text-xs">
									{signedNoteCount}
								</span>
							)}
						</Button>
						<Button
							variant="outline"
							onClick={() => { setRxPrintOpen(true) }}
						>
							<Printer className="mr-1.5 size-4" />
							Print e-Prescription
							{prescriptionCount > 0 && (
								<span className="bg-secondary text-secondary-foreground ml-2 rounded-full px-2 py-0.5 text-xs">
									{prescriptionCount}
								</span>
							)}
						</Button>
					</div>
				</CardContent>
			</Card>
		)}

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
							// PS-017: require release documents to be opened before OPD close
							(isOutpatient && signedNoteCount > 0 && !abstractOpened) ||
							(isOutpatient && prescriptionCount > 0 && !rxOpened) ||
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

			{/* OPD print dialogs */}
			{isOutpatient && (
				<>
					<ClinicalAbstractDialog
						open={abstractOpen}
						onOpenChange={setAbstractOpen}
						encounterId={encounterId}
						patientId={patientId}
						onPrinted={() => setAbstractOpened(true)}
					/>
					<PrescriptionPrintDialog
						open={rxPrintOpen}
						onOpenChange={setRxPrintOpen}
						encounterId={encounterId}
						patientId={patientId}
						onPrinted={() => setRxOpened(true)}
					/>
				</>
			)}
		</div>
	)
}

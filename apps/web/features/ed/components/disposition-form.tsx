"use client"

import { useState } from "react"

import { ArrowRightLeft, BedDouble, HeartOff, LogOut } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Checkbox } from "@/core/components/ui/checkbox"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { useWardsQuery, useBedListQuery } from "@/features/beds/api/beds.hooks"
import { useNotesQuery } from "@/features/clinical-docs/api/clinical-docs.hooks"
import {
	isMaternalDeathCandidate,
	isNeonatalDeathCandidate,
	useDeathReportStatusQuery,
} from "@/features/death-reporting/api/death-reporting.hooks"
import { DeathReportModal } from "@/features/death-reporting/components/death-report-modal"
import { useEdDispositionMutation } from "@/features/ed/api/ed.hooks"
import { useEncounterDetailQuery } from "@/features/encounters/api/encounters.hooks"

import { OecbTagIndicator } from "./oecb-tag-indicator"

// ============================================================================
// Constants
// ============================================================================

const OECB_CRITERIA = [
	"Patient was not admitted as inpatient",
	"Emergency care was rendered",
	"Patient has active PhilHealth membership",
] as const

type DispositionType = "admit" | "discharge" | "transfer" | "deceased"

const DISPOSITION_OPTIONS: {
	value: DispositionType
	label: string
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	icon: React.ComponentType<any>
	description: string
}[] = [
	{ value: "admit", label: "Admit", icon: BedDouble, description: "Transfer to inpatient ward" },
	{ value: "discharge", label: "Discharge", icon: LogOut, description: "Release from ED" },
	{
		value: "transfer",
		label: "Transfer",
		icon: ArrowRightLeft,
		description: "Transfer to another facility",
	},
	{ value: "deceased", label: "Deceased", icon: HeartOff, description: "Patient expired" },
]

// ============================================================================
// Props
// ============================================================================

interface DispositionFormProps {
	encounterId: string
	facilityId: string
	onSuccess: () => void
	onDischargeSuccess?: (result: {
		encounterId: string
		disposition: DispositionType
		oecbEligible: boolean
		inpatientEncounterId: string | null
	}) => void
}

// ============================================================================
// Component
// ============================================================================

export function DispositionForm({
	encounterId,
	facilityId,
	onSuccess,
	onDischargeSuccess,
}: DispositionFormProps) {
	const dispose = useEdDispositionMutation()

	const [disposition, setDisposition] = useState<DispositionType | "">("")
	const [oecbChecklist, setOecbChecklist] = useState<boolean[]>(OECB_CRITERIA.map(() => false))
	const [admitWardId, setAdmitWardId] = useState("")
	const [admitBedId, setAdmitBedId] = useState("")
	const [deathReportOpen, setDeathReportOpen] = useState(false)

	const { data: wards } = useWardsQuery(facilityId)
	const { data: bedData } = useBedListQuery({
		facilityId,
		wardId: admitWardId || undefined,
		status: "available",
	})
	const { data: notesData } = useNotesQuery({ encounterId })
	const { data: encounter } = useEncounterDetailQuery(encounterId)
	const { data: deathStatus } = useDeathReportStatusQuery(encounterId)

	const availableBeds =
		bedData?.wards?.flatMap(w => w.beds.filter(b => b.status === "available")) ?? []
	const hasSignedNote = (notesData?.data ?? []).some(n => n.status === "signed")
	const oecbEligible = oecbChecklist.every(Boolean)

	const patientSex = encounter?.patientSex ?? ""
	const patientDateOfBirth = encounter?.patientDateOfBirth ?? ""
	const patientId = encounter?.patientId ?? ""

	const needsFmdrf =
		patientSex && patientDateOfBirth
			? isMaternalDeathCandidate(patientSex, patientDateOfBirth)
			: false
	const needsFndrf = patientDateOfBirth ? isNeonatalDeathCandidate(patientDateOfBirth) : false
	const needsDeathReport = disposition === "deceased" && (needsFmdrf || needsFndrf)
	const deathReportsDone =
		(!needsFmdrf || (deathStatus?.hasFmdrf ?? false)) &&
		(!needsFndrf || (deathStatus?.hasFndrf ?? false))

	function doDispose() {
		if (!disposition) return
		dispose.mutate(
			{
				encounterId,
				disposition,
				oecbEligible:
					disposition === "discharge" || disposition === "transfer" ? oecbEligible : false,
				admitWardId: disposition === "admit" && admitWardId ? admitWardId : undefined,
				admitBedId: disposition === "admit" && admitBedId ? admitBedId : undefined,
			},
			{
				onSuccess: result => {
					if (result.disposition === "discharge") {
						onDischargeSuccess?.(result)
					}
					onSuccess()
				},
			}
		)
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!disposition) return
		if (needsDeathReport && !deathReportsDone) {
			setDeathReportOpen(true)
			return
		}
		doDispose()
	}

	return (
		<>
			<form onSubmit={handleSubmit} className="space-y-4">
				{/* Documentation completeness gate */}
				{!hasSignedNote && (
					<div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400">
						No signed clinical notes. Sign at least one note before dispositioning this
						patient.
					</div>
				)}

				{/* Disposition radio cards */}
				<div className="space-y-2">
					<Label>Disposition</Label>
					<div className="grid grid-cols-2 gap-2">
						{DISPOSITION_OPTIONS.map(opt => {
							const Icon = opt.icon
							const selected = disposition === opt.value
							return (
								<button
									key={opt.value}
									type="button"
									onClick={() => {
										setDisposition(opt.value)
										if (opt.value !== "discharge" && opt.value !== "transfer") {
											setOecbChecklist(OECB_CRITERIA.map(() => false))
										}
									}}
									className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all ${
										selected
											? "border-primary bg-primary/5 ring-2 ring-primary"
											: "border-border hover:border-primary/50"
									}`}
								>
									<div className="flex items-center gap-2">
										<Icon className="size-4" />
										<span className="text-sm font-medium">{opt.label}</span>
									</div>
									<span className="text-muted-foreground text-xs">{opt.description}</span>
								</button>
							)
						})}
					</div>
				</div>

				{/* Admit: ward & bed */}
				{disposition === "admit" && (
					<>
						<div className="space-y-2">
							<Label>Admitting Ward</Label>
							<Select
								value={admitWardId || null}
								onValueChange={v => {
									setAdmitWardId(v ?? "")
									setAdmitBedId("")
								}}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select ward...">
									        {admitWardId ? (wards ?? []).find(w => w.id === admitWardId)?.name : undefined}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{(wards ?? []).map(ward => (
										<SelectItem key={ward.id} value={ward.id}>
											{ward.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{admitWardId && (
							<div className="space-y-2">
								<Label>Bed</Label>
								<Select
									value={admitBedId || null}
									onValueChange={v => setAdmitBedId(v ?? "")}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select bed...">
										        {admitBedId ? availableBeds.find(b => b.id === admitBedId)?.bedNumber : undefined}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{availableBeds.map(bed => (
											<SelectItem key={bed.id} value={bed.id}>
												{bed.bedNumber}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</>
				)}

				{/* OECB eligibility checklist */}
				{(disposition === "discharge" || disposition === "transfer") && (
					<div className="space-y-2">
						<Label>OECB Eligibility Checklist</Label>
						<div className="space-y-2 rounded-md border p-3">
							{OECB_CRITERIA.map((criterion, i) => (
								<div key={i} className="flex items-center gap-2">
									<Checkbox
										id={`oecb-${i}`}
										checked={oecbChecklist[i]}
										onCheckedChange={v => {
											const next = [...oecbChecklist]
											next[i] = v === true
											setOecbChecklist(next)
										}}
									/>
									<Label htmlFor={`oecb-${i}`} className="text-sm font-normal">
										{criterion}
									</Label>
								</div>
							))}
						</div>
						{oecbEligible && <OecbTagIndicator oecbEligible />}
					</div>
				)}

				<Button
					type="submit"
					className="w-full"
					disabled={!disposition || !hasSignedNote || dispose.isPending}
				>
					{dispose.isPending ? "Processing…" : "Confirm Disposition"}
				</Button>

				{dispose.isError && (
					<p className="text-destructive text-sm">{dispose.error.message}</p>
				)}
			</form>

			{patientId && (
				<DeathReportModal
					open={deathReportOpen}
					onOpenChange={setDeathReportOpen}
					encounterId={encounterId}
					patientId={patientId}
					patientSex={patientSex}
					patientDateOfBirth={patientDateOfBirth}
				/>
			)}
		</>
	)
}

"use client"

import { useState } from "react"
import { Link2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { useListCliniciansQuery } from "@/features/patients/api/patients.hooks"
import { useOpdTriageQuery } from "@/features/opd-triage/api/opd-triage.hooks"

interface LinkTriageBannerProps {
	pendingTriageId: string
	/** Used to scope the clinician list to the correct facility. */
	facilityId: string
	selectedPatientId: string | null
	selectedPatientName: string | null
	/**
	 * Called after the triage is linked to the patient and the encounter has been
	 * created. The caller is responsible for navigation.
	 * @param patientId - the patient that was linked
	 * @param clinicianStaffId - the clinician/clinic chosen during confirmation
	 * @param chiefComplaint - chief complaint from the triage intake (PS-045)
	 */
	onLinked: (patientId: string, clinicianStaffId: string | undefined, chiefComplaint: string | undefined) => Promise<void>
}

/**
 * Shown on the patient-search page when there is a pending walk-in triage
 * that needs to be linked to a patient record. The registrar searches for
 * the patient and clicks "Link" to reconcile.
 */
export function LinkTriageBanner({
	pendingTriageId,
	facilityId,
	selectedPatientId,
	selectedPatientName,
	onLinked,
}: LinkTriageBannerProps) {
	const [confirmOpen, setConfirmOpen] = useState(false)
	const [selectedClinicianId, setSelectedClinicianId] = useState("")
	const [isProcessing, setIsProcessing] = useState(false)

	const { data: intake } = useOpdTriageQuery(pendingTriageId, { enabled: !!pendingTriageId })
	const { data: cliniciansData } = useListCliniciansQuery(facilityId)

	const clinicianOptions = cliniciansData?.data ?? []

	if (!intake) return null

	const arrivalTime = new Date(intake.arrivalTime).toLocaleTimeString("en-PH", {
		hour: "2-digit",
		minute: "2-digit",
	})

	async function handleConfirmLink() {
		if (!selectedPatientId) return
		setIsProcessing(true)
		try {
			// PS-033: encounter creation (via onLinked) atomically links the triage intake —
			// no separate linkToPatient call needed; encounters.service.ts sets patientId +
			// status=registered + encounterId in a single DB transaction when triageIntakeId is provided
			setConfirmOpen(false)
			await onLinked(selectedPatientId, selectedClinicianId || undefined, intake.chiefComplaint ?? undefined) // PS-045
		} finally {
			setIsProcessing(false)
		}
	}

	return (
		<>
			<Alert className="border-amber-300 bg-amber-50">
				<Link2 className="size-4 text-amber-700" />
				<AlertTitle className="text-amber-900">Pending Walk-in Triage</AlertTitle>
				<AlertDescription className="text-amber-800">
					<p className="mt-1 text-sm">
						A triage intake was recorded at <strong>{arrivalTime}</strong> for a walk-in patient.
						Chief complaint: <strong>{intake.chiefComplaint}</strong>.
					</p>
					<p className="mt-1 text-sm">
						Search for the patient below and click <strong>Link to Triage</strong> to complete registration.
					</p>
					{selectedPatientId && (
						<div className="mt-3">
							<Button
								size="sm"
								onClick={() => setConfirmOpen(true)}
							>
								<Link2 className="mr-1.5 size-3.5" />
								Link to Triage — {selectedPatientName}
							</Button>
						</div>
					)}
				</AlertDescription>
			</Alert>

			<Dialog open={confirmOpen} onOpenChange={open => { if (!isProcessing) setConfirmOpen(open) }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Complete Registration</DialogTitle>
						<DialogDescription>
							Link the walk-in triage intake (arrived {arrivalTime}) to{" "}
							<strong>{selectedPatientName}</strong>, create the OPD encounter, and assign a
							queue number for the selected clinic.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-1.5 py-2">
						<Label htmlFor="link-clinician">Attending Clinician / Clinic *</Label>
						<Select value={selectedClinicianId} onValueChange={setSelectedClinicianId}>
							<SelectTrigger id="link-clinician" className="w-full">
								<SelectValue placeholder="Select a clinician…" />
							</SelectTrigger>
							<SelectContent>
								{clinicianOptions.map(opt => (
									<SelectItem key={opt.staffProfileId} value={opt.staffProfileId}>
										{opt.name}{opt.department ? ` — ${opt.department}` : ""}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-muted-foreground text-xs">
							Required for clinic-specific queue assignment (TOR Flow 1 Step 2).
						</p>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isProcessing}>
							Cancel
						</Button>
						<Button
							onClick={() => void handleConfirmLink()}
							disabled={isProcessing || !selectedClinicianId}
						>
							{isProcessing ? "Registering…" : "Confirm & Register"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}

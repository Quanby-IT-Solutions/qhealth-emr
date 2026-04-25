"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { useListStaffQuery } from "@/features/admin/api/admin.hooks"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useBedListQuery } from "@/features/beds/api/beds.hooks"
import { BedSuggestionPanel } from "@/features/beds/components/bed-suggestion-panel"
import { useCreateEncounterMutation } from "@/features/encounters/api/encounters.hooks"
import { useOpdTriageQuery } from "@/features/opd-triage/api/opd-triage.hooks"

interface CreateEncounterFormProps {
	patientId: string
	patientName: string
	/** Pre-select encounter type (e.g. from the OPD quick-register flow) */
	defaultType?: "inpatient" | "outpatient" | "emergency"
	/** OPD triage intake id — pre-fills chiefComplaint and links encounter to intake */
	triageId?: string
}

export function CreateEncounterForm({
	patientId,
	patientName,
	defaultType,
	triageId,
}: CreateEncounterFormProps) {
	const router = useRouter()
	const { data: profile } = useMyProfile()
	const facilityId = useActiveFacilityId()
	const staffId = profile?.staffProfiles?.[0]?.id ?? ""

	const createEncounter = useCreateEncounterMutation()
	const { data: bedData } = useBedListQuery({ facilityId: facilityId ?? "" })
	const { data: triageData } = useOpdTriageQuery(triageId ?? "", { enabled: !!triageId })
	const { data: staffData } = useListStaffQuery({
		facilityId: facilityId ?? "",
		isActive: true,
		limit: 100,
	})

	const clinicianOptions = (staffData?.data ?? []).flatMap(user =>
		user.staffProfiles
			.filter(sp => sp.facilityId === facilityId && sp.isActive)
			.map(sp => ({
				staffProfileId: sp.id,
				name: user.name,
				department: sp.department,
			}))
	)

	const [form, setForm] = useState({
		encounterType: (defaultType ?? "") as "" | "inpatient" | "outpatient" | "emergency",
		chiefComplaint: "",
		bedId: "",
		clinicianStaffId: "",
	})	// Pre-fill chiefComplaint from triage intake once loaded
	const [triagedPrefilled, setTriagedPrefilled] = useState(false)
	if (triageData && !triagedPrefilled) {
		setForm(prev => ({ ...prev, chiefComplaint: prev.chiefComplaint || triageData.chiefComplaint }))
		setTriagedPrefilled(true)
	}
	const [assignedQueueNumber, setAssignedQueueNumber] = useState<number | null>(null)
	const [createdEncounterId, setCreatedEncounterId] = useState<string | null>(null)

	const update = (field: string, value: string) =>
		setForm(prev => ({ ...prev, [field]: value }))

	const availableBeds = (bedData?.wards ?? []).flatMap(ward =>
		ward.beds
			.filter(bed => bed.status === "available")
			.map(bed => ({ ...bed, wardName: ward.name, wardType: ward.wardType }))
	)

	const needsBed =
		form.encounterType === "inpatient" || form.encounterType === "emergency"

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!facilityId || !form.encounterType) return

		const encounter = await createEncounter.mutateAsync({
			facilityId,
			patientId,
			encounterType: form.encounterType,
			chiefComplaint: form.chiefComplaint || undefined,
			admittingStaffId: staffId,
			attendingStaffId: staffId || undefined,
			bedId: form.bedId || undefined,
			triageIntakeId: triageId || undefined,
			clinicianStaffId: form.encounterType === "outpatient" ? (form.clinicianStaffId || undefined) : undefined,
		})

		// For OPD encounters, show queue number confirmation before navigating
		if (encounter.queueNumber != null) {
			setAssignedQueueNumber(encounter.queueNumber)
			setCreatedEncounterId(encounter.id)
			return
		}

		router.push(`/patients/${patientId}/encounters/${encounter.id}`)
	}

	// Queue number confirmation state (OPD only)
	if (assignedQueueNumber != null && createdEncounterId) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>OPD Encounter Created</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex flex-col items-center gap-3 py-4">
						<p className="text-muted-foreground text-sm">Queue number assigned for {patientName}</p>
						<Badge className="px-8 py-4 text-5xl font-bold tabular-nums" variant="default">
							{assignedQueueNumber}
						</Badge>
						<p className="text-muted-foreground text-xs">Hand this number to the patient</p>
					</div>
					<div className="flex gap-3">
						<Button
							onClick={() => router.push(`/patients/${patientId}/encounters/${createdEncounterId}`)}
						>
							View Encounter
						</Button>
						<Button variant="outline" onClick={() => router.push(`/patients/search`)}>
							Next Patient
						</Button>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>New Encounter - {patientName}</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label>Encounter Type *</Label>
						<Select
							value={form.encounterType}
							onValueChange={value => update("encounterType", value ?? "")}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="inpatient">Inpatient</SelectItem>
								<SelectItem value="outpatient">Outpatient</SelectItem>
								<SelectItem value="emergency">Emergency</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{form.encounterType === "outpatient" && (
						<div className="space-y-1.5">
							<Label>Attending Clinician *</Label>
							<Select
								value={form.clinicianStaffId}
								onValueChange={value => update("clinicianStaffId", value ?? "")}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select a clinician…" />
								</SelectTrigger>
								<SelectContent>
									{clinicianOptions.map(opt => (
										<SelectItem key={opt.staffProfileId} value={opt.staffProfileId}>
											{opt.name}
											{opt.department ? ` — ${opt.department}` : ""}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					<div className="space-y-1.5 sm:col-span-2">
						<Label>Chief Complaint</Label>
						<Textarea
							rows={3}
							value={form.chiefComplaint}
							onChange={e => update("chiefComplaint", e.target.value)}
						/>
					</div>
				</CardContent>
			</Card>

			{needsBed && (
				<div className="space-y-1.5">
					<Label>Bed Assignment</Label>
					<BedSuggestionPanel
						encounterType={form.encounterType as "inpatient" | "emergency"}
						availableBeds={availableBeds}
						selectedBedId={form.bedId}
						onSelect={bedId => update("bedId", bedId)}
					/>
				</div>
			)}

			<div className="flex gap-3">
				<Button
					type="submit"
					disabled={
						!form.encounterType ||
						(form.encounterType === "outpatient" && !form.clinicianStaffId) ||
						createEncounter.isPending
					}
				>
					{createEncounter.isPending ? "Creating..." : "Create Encounter"}
				</Button>
				<Button type="button" variant="outline" onClick={() => router.back()}>
					Cancel
				</Button>
			</div>
		</form>
	)
}

"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useBedListQuery } from "@/features/beds/api/beds.hooks"
import { useCreateEncounterMutation } from "@/features/encounters/api/encounters.hooks"

interface CreateEncounterFormProps {
	patientId: string
	patientName: string
}

export function CreateEncounterForm({ patientId, patientName }: CreateEncounterFormProps) {
	const router = useRouter()
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	const staffId = profile?.staffProfiles?.[0]?.id ?? ""

	const createEncounter = useCreateEncounterMutation()
	const { data: bedData } = useBedListQuery({ facilityId })

	const [form, setForm] = useState({
		encounterType: "" as "" | "inpatient" | "outpatient" | "emergency",
		chiefComplaint: "",
		bedId: "",
	})

	const update = (field: string, value: string) =>
		setForm(prev => ({ ...prev, [field]: value }))

	const availableBeds = (bedData?.wards ?? []).flatMap(w =>
		w.beds
			.filter(b => b.status === "available")
			.map(b => ({ ...b, wardName: w.name }))
	)

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
		})

		router.push(`/patients/${patientId}/encounters/${encounter.id}`)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>New Encounter — {patientName}</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label>Encounter Type *</Label>
						<Select value={form.encounterType} onValueChange={v => update("encounterType", v ?? "")}>
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

					{(form.encounterType === "inpatient" || form.encounterType === "emergency") && (
						<div className="space-y-1.5">
							<Label>Bed Assignment</Label>
							<Select value={form.bedId} onValueChange={v => update("bedId", v ?? "")}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{availableBeds.map(bed => (
										<SelectItem key={bed.id} value={bed.id}>
											{bed.wardName} — {bed.bedNumber}
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

			<div className="flex gap-3">
				<Button type="submit" disabled={!form.encounterType || createEncounter.isPending}>
					{createEncounter.isPending ? "Creating…" : "Create Encounter"}
				</Button>
				<Button type="button" variant="outline" onClick={() => router.back()}>
					Cancel
				</Button>
			</div>
		</form>
	)
}

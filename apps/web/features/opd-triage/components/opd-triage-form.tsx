"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Textarea } from "@/core/components/ui/textarea"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useCreateOpdTriageMutation } from "@/features/opd-triage/api/opd-triage.hooks"

interface OpdTriageFormProps {
	/** Provide for existing registered patients. Omit for pre-registration (walk-in) triage. */
	patientId?: string
}

export function OpdTriageForm({ patientId }: OpdTriageFormProps) {
	const router = useRouter()
	const { data: profile } = useMyProfile()
	const facilityId = useActiveFacilityId()
	const staffId = profile?.staffProfiles?.[0]?.id ?? ""

	const createTriage = useCreateOpdTriageMutation()

	const [form, setForm] = useState({
		chiefComplaint: "",
		systolicBp: "",
		diastolicBp: "",
		temperatureCelsius: "",
		heartRateBpm: "",
		respiratoryRate: "",
		oxygenSatPct: "",
		heightCm: "",
		weightKg: "",
	})

	const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

	const parseOptionalInt = (v: string) => (v.trim() !== "" ? parseInt(v, 10) : undefined)
	const parseOptionalFloat = (v: string) => (v.trim() !== "" ? parseFloat(v) : undefined)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!facilityId) return

		const intake = await createTriage.mutateAsync({
			facilityId,
			// Omit patientId for walk-in (pre-registration) triage
			...(patientId ? { patientId } : {}),
			chiefComplaint: form.chiefComplaint,
			systolicBp: parseOptionalInt(form.systolicBp),
			diastolicBp: parseOptionalInt(form.diastolicBp),
			temperatureCelsius: parseOptionalFloat(form.temperatureCelsius),
			heartRateBpm: parseOptionalInt(form.heartRateBpm),
			respiratoryRate: parseOptionalInt(form.respiratoryRate),
			oxygenSatPct: parseOptionalFloat(form.oxygenSatPct),
			heightCm: parseOptionalFloat(form.heightCm),
			weightKg: parseOptionalFloat(form.weightKg),
			triageNurseStaffId: staffId || undefined,
		})

		if (patientId) {
			// Registered patient: proceed directly to encounter creation
			router.push(`/patients/${patientId}/encounters/new?type=outpatient&triageId=${intake.id}`)
		} else {
			// Pre-registration: go to registrar queue so intake can be linked to a patient
			router.push(`/patients/register?pendingTriageId=${intake.id}`)
		}
	}

	return (
		<form onSubmit={e => void handleSubmit(e)} className="mx-auto max-w-2xl space-y-6">
			{!patientId && (
				<Card className="border-amber-200 bg-amber-50">
					<CardContent className="pt-4 pb-3">
						<p className="text-sm text-amber-800">
							<strong>Walk-in triage</strong> — Patient is not yet registered. Complete triage now
							and a registrar will link this intake to the patient record.
						</p>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>OPD Triage Assessment</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-1">
						<Label htmlFor="chiefComplaint">Chief Complaint *</Label>
						<Textarea
							id="chiefComplaint"
							required
							placeholder="Describe the patient's main concern"
							value={form.chiefComplaint}
							onChange={e => update("chiefComplaint", e.target.value)}
							rows={3}
						/>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Vital Signs</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-2 gap-4">
					<div className="space-y-1">
						<Label htmlFor="systolicBp">Systolic BP (mmHg)</Label>
						<Input
							id="systolicBp"
							type="number"
							min={0}
							max={300}
							placeholder="120"
							value={form.systolicBp}
							onChange={e => update("systolicBp", e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="diastolicBp">Diastolic BP (mmHg)</Label>
						<Input
							id="diastolicBp"
							type="number"
							min={0}
							max={200}
							placeholder="80"
							value={form.diastolicBp}
							onChange={e => update("diastolicBp", e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="temperatureCelsius">Temperature (°C)</Label>
						<Input
							id="temperatureCelsius"
							type="number"
							step="0.1"
							min={30}
							max={45}
							placeholder="36.5"
							value={form.temperatureCelsius}
							onChange={e => update("temperatureCelsius", e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="heartRateBpm">Heart Rate (bpm)</Label>
						<Input
							id="heartRateBpm"
							type="number"
							min={0}
							max={300}
							placeholder="72"
							value={form.heartRateBpm}
							onChange={e => update("heartRateBpm", e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="respiratoryRate">Respiratory Rate (/min)</Label>
						<Input
							id="respiratoryRate"
							type="number"
							min={0}
							max={100}
							placeholder="16"
							value={form.respiratoryRate}
							onChange={e => update("respiratoryRate", e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="oxygenSatPct">O₂ Saturation (%)</Label>
						<Input
							id="oxygenSatPct"
							type="number"
							step="0.1"
							min={0}
							max={100}
							placeholder="98"
							value={form.oxygenSatPct}
							onChange={e => update("oxygenSatPct", e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="heightCm">Height (cm)</Label>
						<Input
							id="heightCm"
							type="number"
							step="0.1"
							min={0}
							max={300}
							placeholder="165"
							value={form.heightCm}
							onChange={e => update("heightCm", e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="weightKg">Weight (kg)</Label>
						<Input
							id="weightKg"
							type="number"
							step="0.1"
							min={0}
							max={500}
							placeholder="65"
							value={form.weightKg}
							onChange={e => update("weightKg", e.target.value)}
						/>
					</div>
				</CardContent>
			</Card>

			<div className="flex justify-end gap-3">
				<Button type="button" variant="outline" onClick={() => router.back()}>
					Cancel
				</Button>
				<Button type="submit" disabled={createTriage.isPending || !form.chiefComplaint.trim()}>
					{createTriage.isPending
						? "Saving…"
						: patientId
							? "Save & Register Encounter"
							: "Save Triage — Register Patient Later"}
				</Button>
			</div>
		</form>
	)
}

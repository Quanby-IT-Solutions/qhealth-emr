"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"
import { useCreatePreEncounterMutation } from "@/features/ed/api/ed.hooks"

type AcuityScale = "esi" | "ats" | "ctas"

interface TriageFormProps {
	facilityId: string
	triageStaffId: string
	onSuccess: () => void
}

function parseOptionalNumber(value: string) {
	return value.trim() ? Number(value) : undefined
}

function suggestAcuityLevel({
	chiefComplaint,
	heartRate,
	respiratoryRate,
	spo2,
	systolicBp,
	temperature,
}: {
	chiefComplaint: string
	heartRate?: number
	respiratoryRate?: number
	spo2?: number
	systolicBp?: number
	temperature?: number
}) {
	const complaint = chiefComplaint.toLowerCase()
	const levelOneKeywords = ["cardiac arrest", "unresponsive", "seizure", "severe trauma"]
	const levelTwoKeywords = ["chest pain", "stroke", "difficulty breathing", "severe pain", "bleeding"]

	if (
		levelOneKeywords.some(keyword => complaint.includes(keyword)) ||
		(spo2 !== undefined && spo2 < 90) ||
		(systolicBp !== undefined && systolicBp < 90)
	) {
		return 1
	}

	if (
		levelTwoKeywords.some(keyword => complaint.includes(keyword)) ||
		(heartRate !== undefined && (heartRate > 130 || heartRate < 45)) ||
		(respiratoryRate !== undefined && (respiratoryRate > 30 || respiratoryRate < 8)) ||
		(temperature !== undefined && temperature >= 40)
	) {
		return 2
	}

	if (
		(heartRate !== undefined && heartRate > 110) ||
		(respiratoryRate !== undefined && respiratoryRate > 24) ||
		(temperature !== undefined && temperature >= 38.5)
	) {
		return 3
	}

	return 4
}

export function TriageForm({ facilityId, triageStaffId, onSuccess }: TriageFormProps) {
	const createPreEncounter = useCreatePreEncounterMutation()

	const [acuityScale, setAcuityScale] = useState<AcuityScale>("esi")
	const [acuityLevel, setAcuityLevel] = useState<number>(3)
	const [chiefComplaint, setChiefComplaint] = useState("")
	const [vitals, setVitals] = useState({
		temperature: "",
		bpSystolic: "",
		bpDiastolic: "",
		heartRate: "",
		respiratoryRate: "",
		spo2: "",
		painScore: "",
		weight: "",
		height: "",
	})

	const suggestedLevel = suggestAcuityLevel({
		chiefComplaint,
		heartRate: parseOptionalNumber(vitals.heartRate),
		respiratoryRate: parseOptionalNumber(vitals.respiratoryRate),
		spo2: parseOptionalNumber(vitals.spo2),
		systolicBp: parseOptionalNumber(vitals.bpSystolic),
		temperature: parseOptionalNumber(vitals.temperature),
	})

	function updateVital(field: keyof typeof vitals, value: string) {
		setVitals(current => ({ ...current, [field]: value }))
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		createPreEncounter.mutate(
			{
				facilityId,
				triageAcuityScale: acuityScale,
				triageAcuityLevel: acuityLevel,
				triageStaffId,
				chiefComplaint: chiefComplaint || undefined,
				temperature: parseOptionalNumber(vitals.temperature),
				bpSystolic: parseOptionalNumber(vitals.bpSystolic),
				bpDiastolic: parseOptionalNumber(vitals.bpDiastolic),
				heartRate: parseOptionalNumber(vitals.heartRate),
				respiratoryRate: parseOptionalNumber(vitals.respiratoryRate),
				spo2: parseOptionalNumber(vitals.spo2),
				painScore: parseOptionalNumber(vitals.painScore),
				weight: parseOptionalNumber(vitals.weight),
				height: parseOptionalNumber(vitals.height),
			},
			{
				onSuccess: () => {
					onSuccess()
				},
			}
		)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{/* Acuity Scale */}
			<div className="space-y-2">
				<Label>Acuity Scale</Label>
				<Select value={acuityScale} onValueChange={v => setAcuityScale((v ?? "esi") as AcuityScale)}>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="esi">ESI (Emergency Severity Index)</SelectItem>
						<SelectItem value="ats">ATS (Australasian Triage Scale)</SelectItem>
						<SelectItem value="ctas">CTAS (Canadian Triage & Acuity Scale)</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Acuity Level */}
			<div className="space-y-2">
				<Label>Acuity Level (1 = most urgent, 5 = least urgent)</Label>
				<Select
					value={String(acuityLevel)}
					onValueChange={v => setAcuityLevel(Number(v ?? "3"))}
				>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="1">1 - Resuscitation</SelectItem>
						<SelectItem value="2">2 - Emergent</SelectItem>
						<SelectItem value="3">3 - Urgent</SelectItem>
						<SelectItem value="4">4 - Less Urgent</SelectItem>
						<SelectItem value="5">5 - Non-Urgent</SelectItem>
					</SelectContent>
				</Select>
				<div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
					<span>Suggested level: {suggestedLevel}</span>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => setAcuityLevel(suggestedLevel)}
					>
						Use suggestion
					</Button>
				</div>
			</div>

			{/* Chief Complaint */}
			<div className="space-y-2">
				<Label>Chief Complaint</Label>
				<Textarea
					placeholder="Describe the patient's chief complaint..."
					value={chiefComplaint}
					onChange={e => setChiefComplaint(e.target.value)}
					rows={3}
				/>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-2">
					<Label htmlFor="temperature">Temperature (C)</Label>
					<Input
						id="temperature"
						type="number"
						step="0.1"
						value={vitals.temperature}
						onChange={event => updateVital("temperature", event.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="spo2">SpO2 (%)</Label>
					<Input
						id="spo2"
						type="number"
						value={vitals.spo2}
						onChange={event => updateVital("spo2", event.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="bpSystolic">Systolic BP</Label>
					<Input
						id="bpSystolic"
						type="number"
						value={vitals.bpSystolic}
						onChange={event => updateVital("bpSystolic", event.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="bpDiastolic">Diastolic BP</Label>
					<Input
						id="bpDiastolic"
						type="number"
						value={vitals.bpDiastolic}
						onChange={event => updateVital("bpDiastolic", event.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="heartRate">Heart Rate</Label>
					<Input
						id="heartRate"
						type="number"
						value={vitals.heartRate}
						onChange={event => updateVital("heartRate", event.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="respiratoryRate">Respiratory Rate</Label>
					<Input
						id="respiratoryRate"
						type="number"
						value={vitals.respiratoryRate}
						onChange={event => updateVital("respiratoryRate", event.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="painScore">Pain Score</Label>
					<Input
						id="painScore"
						type="number"
						min={0}
						max={10}
						value={vitals.painScore}
						onChange={event => updateVital("painScore", event.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="weight">Weight (kg)</Label>
					<Input
						id="weight"
						type="number"
						step="0.1"
						value={vitals.weight}
						onChange={event => updateVital("weight", event.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="height">Height (cm)</Label>
					<Input
						id="height"
						type="number"
						step="0.1"
						value={vitals.height}
						onChange={event => updateVital("height", event.target.value)}
					/>
				</div>
			</div>

			<Button
				type="submit"
				className="w-full"
				disabled={createPreEncounter.isPending}
			>
				{createPreEncounter.isPending ? "Creating…" : "Create Pre-Encounter"}
			</Button>

			{createPreEncounter.isError && (
				<p className="text-destructive text-sm">
					{createPreEncounter.error.message}
				</p>
			)}
		</form>
	)
}

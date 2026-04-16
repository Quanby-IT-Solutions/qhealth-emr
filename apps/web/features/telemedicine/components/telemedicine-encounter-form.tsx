"use client"

import { useState } from "react"
import { CheckCircle2, ClipboardList, Link2, Unlink } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import {
	type CreateEncounterInput,
	type EncounterType,
	useCreateEncounterMutation,
} from "@/features/telemedicine/api/telemedicine.hooks"

// ============================================================================
// Types
// ============================================================================

interface TelemedicineEncounterFormProps {
	appointmentId: string
	patientName: string
	clinicianName: string
	onEncounterCreated?: (encounterId: string) => void
}

interface EncounterFormState {
	encounterType: EncounterType
	linkedEncounterId: string
	linkedEncounterNumber: string
	chiefComplaint: string
	subjectiveNotes: string
	objectiveNotes: string
	assessmentNotes: string
	planNotes: string
	diagnosis: string
	icdCode: string
	// Vitals
	bloodPressure: string
	heartRate: string
	temperature: string
	oxygenSaturation: string
	weight: string
}

const EMPTY_FORM: EncounterFormState = {
	encounterType: "standalone",
	linkedEncounterId: "",
	linkedEncounterNumber: "",
	chiefComplaint: "",
	subjectiveNotes: "",
	objectiveNotes: "",
	assessmentNotes: "",
	planNotes: "",
	diagnosis: "",
	icdCode: "",
	bloodPressure: "",
	heartRate: "",
	temperature: "",
	oxygenSaturation: "",
	weight: "",
}

// ============================================================================
// Helpers
// ============================================================================

function EncounterTypeToggle({
	value,
	onChange,
}: {
	value: EncounterType
	onChange: (v: EncounterType) => void
}) {
	return (
		<div className="flex gap-3">
			<button
				type="button"
				onClick={() => onChange("standalone")}
				className={[
					"flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors",
					value === "standalone"
						? "border-primary bg-primary/10 text-primary"
						: "border-muted bg-background text-muted-foreground hover:border-primary/40",
				].join(" ")}
			>
				<Unlink className="size-4" />
				Standalone
			</button>
			<button
				type="button"
				onClick={() => onChange("linked")}
				className={[
					"flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors",
					value === "linked"
						? "border-primary bg-primary/10 text-primary"
						: "border-muted bg-background text-muted-foreground hover:border-primary/40",
				].join(" ")}
			>
				<Link2 className="size-4" />
				Linked to In-Person Visit
			</button>
		</div>
	)
}

const SOAP_SECTIONS = [
	{
		key: "subjectiveNotes" as const,
		label: "S — Subjective",
		placeholder: "Patient's reported symptoms, history, complaints...",
	},
	{
		key: "objectiveNotes" as const,
		label: "O — Objective",
		placeholder: "Observations from video consultation, vitals, examination findings...",
	},
	{
		key: "assessmentNotes" as const,
		label: "A — Assessment",
		placeholder: "Clinical interpretation, differential diagnoses...",
	},
	{
		key: "planNotes" as const,
		label: "P — Plan",
		placeholder: "Treatment plan, medications ordered, follow-up instructions...",
	},
] as const

// ============================================================================
// Main Component
// ============================================================================

export function TelemedicineEncounterForm({
	appointmentId,
	patientName,
	clinicianName,
	onEncounterCreated,
}: TelemedicineEncounterFormProps) {
	const [form, setForm] = useState<EncounterFormState>(EMPTY_FORM)
	const [submitted, setSubmitted] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const createMutation = useCreateEncounterMutation()

	function patch(key: keyof EncounterFormState, value: string) {
		setForm((prev) => ({ ...prev, [key]: value }))
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)

		if (!form.chiefComplaint.trim()) {
			setError("Chief complaint is required.")
			return
		}
		if (!form.diagnosis.trim()) {
			setError("Diagnosis is required.")
			return
		}

		const input: CreateEncounterInput = {
			appointmentId,
			encounterType: form.encounterType,
			linkedEncounterId: form.encounterType === "linked" && form.linkedEncounterId
				? form.linkedEncounterId
				: undefined,
			chiefComplaint: form.chiefComplaint,
			subjectiveNotes: form.subjectiveNotes,
			objectiveNotes: form.objectiveNotes,
			assessmentNotes: form.assessmentNotes,
			planNotes: form.planNotes,
			diagnosis: form.diagnosis,
			icdCode: form.icdCode || undefined,
			vitalSigns: {
				bloodPressure: form.bloodPressure || undefined,
				heartRate: form.heartRate || undefined,
				temperature: form.temperature || undefined,
				oxygenSaturation: form.oxygenSaturation || undefined,
				weight: form.weight || undefined,
			},
		}

		try {
			const encounter = await createMutation.mutateAsync(input)
			setSubmitted(true)
			onEncounterCreated?.(encounter.id)
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save encounter.")
		}
	}

	if (submitted) {
		return (
			<Card>
				<CardContent className="py-10">
					<div className="flex flex-col items-center gap-3 text-center">
						<CheckCircle2 className="size-12 text-green-500" />
						<h3 className="text-lg font-semibold">Encounter Saved</h3>
						<p className="text-muted-foreground text-sm">
							The telemedicine clinical note has been recorded.
						</p>
						<Button
							variant="outline"
							onClick={() => {
								setSubmitted(false)
								setForm(EMPTY_FORM)
							}}
						>
							New Encounter
						</Button>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-3">
					<div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
						<ClipboardList className="text-primary size-5" />
					</div>
					<div>
						<CardTitle className="text-base">Telemedicine Clinical Note</CardTitle>
						<p className="text-muted-foreground text-xs">
							{patientName} — {clinicianName}
						</p>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Encounter Type */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Encounter Type</label>
						<EncounterTypeToggle
							value={form.encounterType}
							onChange={(v) => patch("encounterType", v)}
						/>
						{form.encounterType === "linked" && (
							<div className="grid grid-cols-2 gap-4 pt-1">
								<div className="space-y-1.5">
									<label htmlFor="linkedEncounterId" className="text-sm font-medium">
										Linked Encounter ID
									</label>
									<input
										id="linkedEncounterId"
										className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
										value={form.linkedEncounterId}
										onChange={(e) => patch("linkedEncounterId", e.target.value)}
										placeholder="e.g. ENC-001234"
									/>
								</div>
								<div className="space-y-1.5">
									<label htmlFor="linkedEncounterNumber" className="text-sm font-medium">
										Encounter Number
									</label>
									<input
										id="linkedEncounterNumber"
										className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
										value={form.linkedEncounterNumber}
										onChange={(e) => patch("linkedEncounterNumber", e.target.value)}
										placeholder="e.g. IP-2026-00045"
									/>
								</div>
							</div>
						)}
					</div>

					<Separator />

					{/* Chief Complaint */}
					<div className="space-y-1.5">
						<label htmlFor="chiefComplaint" className="text-sm font-medium">
							Chief Complaint <span className="text-destructive">*</span>
						</label>
						<input
							id="chiefComplaint"
							className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
							value={form.chiefComplaint}
							onChange={(e) => patch("chiefComplaint", e.target.value)}
							placeholder="Primary reason for virtual consultation"
							required
						/>
					</div>

					{/* Vitals */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Vital Signs (Optional)</label>
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
							{[
								{ key: "bloodPressure" as const, label: "BP (mmHg)", placeholder: "120/80" },
								{ key: "heartRate" as const, label: "HR (bpm)", placeholder: "72" },
								{ key: "temperature" as const, label: "Temp (°C)", placeholder: "36.5" },
								{ key: "oxygenSaturation" as const, label: "O₂ Sat (%)", placeholder: "98" },
								{ key: "weight" as const, label: "Weight (kg)", placeholder: "65" },
							].map(({ key, label, placeholder }) => (
								<div key={key} className="space-y-1">
									<label className="text-muted-foreground text-xs">{label}</label>
									<input
										className="border-input bg-background w-full rounded-md border px-2 py-1.5 text-sm"
										value={form[key]}
										onChange={(e) => patch(key, e.target.value)}
										placeholder={placeholder}
									/>
								</div>
							))}
						</div>
					</div>

					<Separator />

					{/* SOAP Notes */}
					<div className="space-y-4">
						<label className="text-sm font-medium">SOAP Notes</label>
						{SOAP_SECTIONS.map(({ key, label, placeholder }) => (
							<div key={key} className="space-y-1.5">
								<label htmlFor={key} className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
									{label}
								</label>
								<textarea
									id={key}
									className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
									rows={3}
									value={form[key]}
									onChange={(e) => patch(key, e.target.value)}
									placeholder={placeholder}
								/>
							</div>
						))}
					</div>

					<Separator />

					{/* Diagnosis */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<label htmlFor="diagnosis" className="text-sm font-medium">
								Diagnosis <span className="text-destructive">*</span>
							</label>
							<input
								id="diagnosis"
								className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
								value={form.diagnosis}
								onChange={(e) => patch("diagnosis", e.target.value)}
								placeholder="Clinical diagnosis"
								required
							/>
						</div>
						<div className="space-y-1.5">
							<label htmlFor="icdCode" className="text-sm font-medium">
								ICD-10 Code
							</label>
							<input
								id="icdCode"
								className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
								value={form.icdCode}
								onChange={(e) => patch("icdCode", e.target.value)}
								placeholder="e.g. J06.9"
							/>
						</div>
					</div>

					{error && (
						<p className="text-destructive rounded-md bg-red-50 px-3 py-2 text-sm">{error}</p>
					)}

					<div className="flex justify-end gap-3 pt-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => setForm(EMPTY_FORM)}
						>
							Clear
						</Button>
						<Button type="submit" disabled={createMutation.isPending}>
							{createMutation.isPending ? "Saving..." : "Save Clinical Note"}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	)
}

"use client"

import { useRef, useState } from "react"
import { AlertCircle, CheckCircle2, ClipboardList, Link2, Unlink } from "lucide-react"
import { toast } from "sonner"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/core/components/ui/alert-dialog"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { usePatientSummaryQuery } from "@/features/problems-allergies/api/problems-allergies.hooks"
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
	patientId: string
	patientName: string
	clinicianName: string
	onEncounterCreated?: (encounterId: string) => void
}

interface EncounterFormState {
	encounterType: EncounterType
	linkedEncounterId: string
	chiefComplaint: string
	subjectiveNotes: string
	objectiveNotes: string
	assessmentNotes: string
	planNotes: string
	diagnosis: string
	icdCode: string
	bloodPressure: string
	heartRate: string
	temperature: string
	oxygenSaturation: string
	weight: string
}

type FieldKey = keyof EncounterFormState
type FieldErrors = Partial<Record<FieldKey, string>>

const EMPTY_FORM: EncounterFormState = {
	encounterType: "standalone",
	linkedEncounterId: "",
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
// Validation helpers
// ============================================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const BP_RE = /^\d{2,3}\/\d{2,3}$/
const ICD10_RE = /^[A-Z]\d{2}(\.\d{1,3})?$/i

function validateNumberRange(value: string, min: number, max: number): string | null {
	if (!value.trim()) return null
	const n = Number(value)
	if (!Number.isFinite(n)) return "Must be a number"
	if (n < min || n > max) return `Must be between ${min} and ${max}`
	return null
}

function validateForm(form: EncounterFormState): FieldErrors {
	const errors: FieldErrors = {}

	if (!form.chiefComplaint.trim()) errors.chiefComplaint = "Required"

	if (form.encounterType === "linked") {
		if (!form.linkedEncounterId.trim()) errors.linkedEncounterId = "Linked encounter ID is required"
		else if (!UUID_RE.test(form.linkedEncounterId.trim())) errors.linkedEncounterId = "Must be a valid UUID"
	}

	if (!form.diagnosis.trim()) errors.diagnosis = "Required"

	if (form.icdCode.trim() && !ICD10_RE.test(form.icdCode.trim())) {
		errors.icdCode = "Must look like J06.9"
	}

	if (form.bloodPressure.trim() && !BP_RE.test(form.bloodPressure.trim())) {
		errors.bloodPressure = "Use format 120/80"
	}

	const hrErr = validateNumberRange(form.heartRate, 1, 250)
	if (hrErr) errors.heartRate = hrErr
	const tempErr = validateNumberRange(form.temperature, 30, 45)
	if (tempErr) errors.temperature = tempErr
	const o2Err = validateNumberRange(form.oxygenSaturation, 1, 100)
	if (o2Err) errors.oxygenSaturation = o2Err
	const wtErr = validateNumberRange(form.weight, 1, 500)
	if (wtErr) errors.weight = wtErr

	return errors
}

// ============================================================================
// UI helpers
// ============================================================================

function FieldError({ message }: { message?: string }) {
	if (!message) return null
	return (
		<p className="text-destructive flex items-center gap-1 text-xs">
			<AlertCircle className="size-3" />
			{message}
		</p>
	)
}

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
		label: "S - Subjective",
		hint: "What the patient reports",
		placeholder: "Patient's reported symptoms, history, complaints...",
	},
	{
		key: "objectiveNotes" as const,
		label: "O - Objective",
		hint: "What you observed",
		placeholder: "Observations from video consultation, vitals, examination findings...",
	},
	{
		key: "assessmentNotes" as const,
		label: "A - Assessment",
		hint: "Clinical interpretation",
		placeholder: "Differential diagnoses, clinical reasoning...",
	},
	{
		key: "planNotes" as const,
		label: "P - Plan",
		hint: "What happens next",
		placeholder: "Treatment plan, medications ordered, follow-up instructions...",
	},
] as const

function ChartSnapshot({ patientId }: { patientId: string }) {
	const { data: summary, isLoading } = usePatientSummaryQuery(patientId, {
		enabled: Boolean(patientId),
	})
	const activeProblems = summary?.activeProblems ?? []
	const activeAllergies = summary?.activeAllergies ?? []

	return (
		<div className="grid gap-3 md:grid-cols-2">
			<div className="rounded-lg border p-3">
				<p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
					Active Problems
				</p>
				{isLoading ? (
					<p className="text-muted-foreground text-sm">Loading chart...</p>
				) : activeProblems.length ? (
					<ul className="space-y-1 text-sm">
						{activeProblems.slice(0, 5).map(problem => (
							<li key={problem.id} className="text-foreground">
								{problem.description}
								{problem.icd10Code && (
									<span className="text-muted-foreground"> - {problem.icd10Code}</span>
								)}
							</li>
						))}
					</ul>
				) : (
					<p className="text-muted-foreground text-sm">None recorded</p>
				)}
			</div>
			<div className="rounded-lg border p-3">
				<p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
					Active Allergies
				</p>
				{isLoading ? (
					<p className="text-muted-foreground text-sm">Loading chart...</p>
				) : activeAllergies.length ? (
					<ul className="space-y-1 text-sm">
						{activeAllergies.slice(0, 5).map(allergy => (
							<li key={allergy.id} className="text-foreground">
								{allergy.allergenName}
								{allergy.severity && (
									<span className="text-muted-foreground"> - {allergy.severity}</span>
								)}
							</li>
						))}
					</ul>
				) : (
					<p className="text-muted-foreground text-sm">None recorded</p>
				)}
			</div>
		</div>
	)
}

// ============================================================================
// Main Component
// ============================================================================

export function TelemedicineEncounterForm({
	appointmentId,
	patientId,
	patientName,
	clinicianName,
	onEncounterCreated,
}: TelemedicineEncounterFormProps) {
	const [form, setForm] = useState<EncounterFormState>(EMPTY_FORM)
	const [submitted, setSubmitted] = useState(false)
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
	const [submitError, setSubmitError] = useState<string | null>(null)
	const [clearDialogOpen, setClearDialogOpen] = useState(false)
	const formRef = useRef<HTMLFormElement>(null)

	const createMutation = useCreateEncounterMutation()

	const hasFieldErrors = Object.keys(fieldErrors).length > 0

	function patch(key: FieldKey, value: string) {
		setForm(prev => ({ ...prev, [key]: value }))
		if (fieldErrors[key]) {
			setFieldErrors(prev => {
				const next = { ...prev }
				delete next[key]
				return next
			})
		}
	}

	function inputClass(field: FieldKey, extra = ""): string {
		const base = "border-input bg-background w-full rounded-md border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
		const errorCls = fieldErrors[field] ? "border-destructive focus-visible:ring-destructive/30" : ""
		return [base, errorCls, extra].filter(Boolean).join(" ")
	}

	function scrollToFirstError(errors: FieldErrors) {
		const firstKey = Object.keys(errors)[0]
		if (!firstKey || !formRef.current) return
		const el = formRef.current.querySelector<HTMLElement>(`[data-field="${firstKey}"]`)
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "center" })
			const input = el.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea")
			input?.focus()
		}
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setSubmitError(null)

		const errors = validateForm(form)
		if (Object.keys(errors).length > 0) {
			setFieldErrors(errors)
			scrollToFirstError(errors)
			toast.error("Please fix the highlighted fields before saving.")
			return
		}
		setFieldErrors({})

		const input: CreateEncounterInput = {
			appointmentId,
			encounterType: form.encounterType,
			linkedEncounterId:
				form.encounterType === "linked" && form.linkedEncounterId.trim()
					? form.linkedEncounterId.trim()
					: undefined,
			chiefComplaint: form.chiefComplaint.trim(),
			subjectiveNotes: form.subjectiveNotes.trim(),
			objectiveNotes: form.objectiveNotes.trim(),
			assessmentNotes: form.assessmentNotes.trim(),
			planNotes: form.planNotes.trim(),
			diagnosis: form.diagnosis.trim(),
			icdCode: form.icdCode.trim() || undefined,
			vitalSigns: {
				bloodPressure: form.bloodPressure.trim() || undefined,
				heartRate: form.heartRate.trim() || undefined,
				temperature: form.temperature.trim() || undefined,
				oxygenSaturation: form.oxygenSaturation.trim() || undefined,
				weight: form.weight.trim() || undefined,
			},
		}

		try {
			const encounter = await createMutation.mutateAsync(input)
			setSubmitted(true)
			toast.success("Clinical note saved", {
				description: "The encounter has been recorded.",
			})
			onEncounterCreated?.(encounter.id)
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to save encounter."
			setSubmitError(message)
			toast.error("Could not save encounter", { description: message })
		}
	}

	function handleConfirmClear() {
		setForm(EMPTY_FORM)
		setFieldErrors({})
		setSubmitError(null)
		setClearDialogOpen(false)
	}

	if (submitted) {
		return (
			<Card>
				<CardContent className="py-10">
					<div className="flex flex-col items-center gap-3 text-center">
						<CheckCircle2 className="text-success size-12" />
						<h3 className="text-lg font-semibold">Encounter Saved</h3>
						<p className="text-muted-foreground text-sm">
							The telemedicine clinical note has been recorded.
						</p>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
							<ClipboardList className="text-primary size-5" />
						</div>
						<div>
							<CardTitle className="text-base">Telemedicine Clinical Note</CardTitle>
							<p className="text-muted-foreground text-xs">
								{patientName ? `${patientName} · ` : ""}Documented by {clinicianName || "you"}
							</p>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<form ref={formRef} onSubmit={handleSubmit} className="space-y-6" noValidate>
						<ChartSnapshot patientId={patientId} />
						<Separator />

						{/* Encounter Type */}
						<div className="space-y-2">
							<label className="text-sm font-medium">Encounter Type</label>
							<EncounterTypeToggle
								value={form.encounterType}
								onChange={v => patch("encounterType", v)}
							/>
							{form.encounterType === "linked" && (
								<div data-field="linkedEncounterId" className="space-y-1.5 pt-1">
									<label htmlFor="linkedEncounterId" className="text-sm font-medium">
										Linked Encounter UUID <span className="text-destructive">*</span>
									</label>
									<input
										id="linkedEncounterId"
										className={inputClass("linkedEncounterId")}
										value={form.linkedEncounterId}
										onChange={e => patch("linkedEncounterId", e.target.value)}
										placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
										aria-invalid={Boolean(fieldErrors.linkedEncounterId)}
									/>
									<FieldError message={fieldErrors.linkedEncounterId} />
									<p className="text-muted-foreground text-xs">
										Paste the encounter ID from the linked in-person visit.
									</p>
								</div>
							)}
						</div>

						<Separator />

						{/* Chief Complaint */}
						<div data-field="chiefComplaint" className="space-y-1.5">
							<label htmlFor="chiefComplaint" className="text-sm font-medium">
								Chief Complaint <span className="text-destructive">*</span>
							</label>
							<input
								id="chiefComplaint"
								className={inputClass("chiefComplaint")}
								value={form.chiefComplaint}
								onChange={e => patch("chiefComplaint", e.target.value)}
								placeholder="Primary reason for virtual consultation"
								aria-invalid={Boolean(fieldErrors.chiefComplaint)}
								required
							/>
							<FieldError message={fieldErrors.chiefComplaint} />
						</div>

						{/* Vitals */}
						<div className="space-y-2">
							<div>
								<label className="text-sm font-medium">Vital Signs</label>
								<p className="text-muted-foreground text-xs">
									Optional. Leave blank if not measured during the call.
								</p>
							</div>
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
								{[
									{
										key: "bloodPressure" as const,
										label: "BP (mmHg)",
										placeholder: "120/80",
									},
									{ key: "heartRate" as const, label: "HR (bpm)", placeholder: "72" },
									{ key: "temperature" as const, label: "Temp (°C)", placeholder: "36.5" },
									{ key: "oxygenSaturation" as const, label: "SpO₂ (%)", placeholder: "98" },
									{ key: "weight" as const, label: "Weight (kg)", placeholder: "65" },
								].map(({ key, label, placeholder }) => (
									<div key={key} data-field={key} className="space-y-1">
										<label className="text-muted-foreground text-xs">{label}</label>
										<input
											className={inputClass(key, "px-2 py-1.5")}
											value={form[key]}
											onChange={e => patch(key, e.target.value)}
											placeholder={placeholder}
											aria-invalid={Boolean(fieldErrors[key])}
										/>
										<FieldError message={fieldErrors[key]} />
									</div>
								))}
							</div>
						</div>

						<Separator />

						{/* SOAP Notes */}
						<div className="space-y-4">
							<div>
								<label className="text-sm font-medium">SOAP Notes</label>
								<p className="text-muted-foreground text-xs">
									Standard structure for telemedicine documentation.
								</p>
							</div>
							{SOAP_SECTIONS.map(({ key, label, hint, placeholder }) => (
								<div key={key} data-field={key} className="space-y-1.5">
									<div className="flex items-baseline justify-between gap-2">
										<label
											htmlFor={key}
											className="text-muted-foreground text-xs font-medium uppercase tracking-wide"
										>
											{label}
										</label>
										<span className="text-muted-foreground text-xs">{hint}</span>
									</div>
									<textarea
										id={key}
										className={inputClass(key)}
										rows={3}
										value={form[key]}
										onChange={e => patch(key, e.target.value)}
										placeholder={placeholder}
									/>
								</div>
							))}
						</div>

						<Separator />

						{/* Diagnosis */}
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div data-field="diagnosis" className="space-y-1.5">
								<label htmlFor="diagnosis" className="text-sm font-medium">
									Diagnosis <span className="text-destructive">*</span>
								</label>
								<input
									id="diagnosis"
									className={inputClass("diagnosis")}
									value={form.diagnosis}
									onChange={e => patch("diagnosis", e.target.value)}
									placeholder="Clinical diagnosis"
									aria-invalid={Boolean(fieldErrors.diagnosis)}
									required
								/>
								<FieldError message={fieldErrors.diagnosis} />
							</div>
							<div data-field="icdCode" className="space-y-1.5">
								<label htmlFor="icdCode" className="text-sm font-medium">
									ICD-10 Code
								</label>
								<input
									id="icdCode"
									className={inputClass("icdCode")}
									value={form.icdCode}
									onChange={e => patch("icdCode", e.target.value)}
									placeholder="e.g. J06.9"
									aria-invalid={Boolean(fieldErrors.icdCode)}
								/>
								<FieldError message={fieldErrors.icdCode} />
							</div>
						</div>

						{(submitError || hasFieldErrors) && (
							<div
								role="alert"
								className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
							>
								<AlertCircle className="mt-0.5 size-4 shrink-0" />
								<div>
									{submitError ? (
										<>
											<p className="font-medium">Could not save encounter</p>
											<p className="text-xs">{submitError}</p>
										</>
									) : (
										<p>Some fields need attention before you can save.</p>
									)}
								</div>
							</div>
						)}

						<div className="flex flex-wrap justify-end gap-3 pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setClearDialogOpen(true)}
								disabled={createMutation.isPending}
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

			<AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Clear this clinical note?</AlertDialogTitle>
						<AlertDialogDescription>
							All notes, vitals, and diagnosis information you've typed will be discarded. This
							cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep editing</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmClear}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Clear note
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

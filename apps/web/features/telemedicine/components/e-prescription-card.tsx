"use client"

import { useState } from "react"
import {
	AlertTriangle,
	CheckCircle2,
	Download,
	FileText,
	Loader2,
	Mail,
	MessageSquare,
	Pill,
	Plus,
	Printer,
	Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import {
	type CreatePrescriptionInput,
	type EPrescription,
	type EPrescriptionItem,
	type PrescriptionStatus,
	useCreatePrescriptionMutation,
	useEncounterPrescriptionsQuery,
} from "@/features/telemedicine/api/telemedicine.hooks"

// ============================================================================
// Types
// ============================================================================

interface EPrescriptionCardProps {
	encounterId: string
	patientName: string
	patientMrn: string
	patientAge?: number
	patientSex?: string
	clinicianName: string
	clinicianPrcNumber: string
	clinicianPrcExpiry?: string | null
	clinicianPtrExpiry?: string | null
	facilityName: string
	facilityAddress?: string
	onPrescriptionCreated?: (prescriptionId: string) => void
}

// ============================================================================
// License helpers
// ============================================================================

function normalizeDate(d: string) {
	const date = new Date(d)
	date.setHours(0, 0, 0, 0)
	return date
}

function isPastDate(d: string | null | undefined): boolean {
	if (!d) return true
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	return normalizeDate(d) < today
}

function isWithinDays(d: string | null | undefined, days: number): boolean {
	if (!d || isPastDate(d)) return false
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	return normalizeDate(d).getTime() - today.getTime() <= days * 86400000
}

function formatDate(d: string | null | undefined): string {
	if (!d) return "--"
	return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
}

type NewMedItem = Omit<EPrescriptionItem, "id">

const EMPTY_MED: NewMedItem = {
	genericName: "",
	brandName: "",
	dosage: "",
	form: "",
	quantity: 1,
	unit: "tablet(s)",
	frequency: "",
	duration: "",
	route: "oral",
	instructions: "",
}

const MED_FORMS = [
	"tablet",
	"capsule",
	"syrup",
	"suspension",
	"solution",
	"injection",
	"cream",
	"ointment",
	"inhaler",
	"drops",
	"patch",
	"suppository",
]

const MED_ROUTES = [
	"oral",
	"intravenous",
	"intramuscular",
	"subcutaneous",
	"topical",
	"inhalation",
	"sublingual",
	"rectal",
	"ophthalmic",
	"otic",
]

const UNIT_OPTIONS = [
	"tablet(s)",
	"capsule(s)",
	"ml",
	"mg",
	"vial(s)",
	"ampule(s)",
	"tube(s)",
	"sachet(s)",
	"patch(es)",
]

// ============================================================================
// Status helpers
// ============================================================================

function getPrescriptionStatusColor(status: PrescriptionStatus): string {
	const map: Record<PrescriptionStatus, string> = {
		draft: "bg-yellow-100 text-yellow-800",
		active: "bg-green-100 text-green-800",
		dispensed: "bg-blue-100 text-blue-800",
		cancelled: "bg-red-100 text-red-800",
	}
	return map[status] ?? "bg-gray-100 text-gray-800"
}

function getPrescriptionStatusLabel(status: PrescriptionStatus): string {
	const map: Record<PrescriptionStatus, string> = {
		draft: "Draft",
		active: "Active",
		dispensed: "Dispensed",
		cancelled: "Cancelled",
	}
	return map[status] ?? status
}

// ============================================================================
// Subcomponents
// ============================================================================

function MedicationRow({
	med,
	index,
	onChange,
	onRemove,
}: {
	med: NewMedItem
	index: number
	onChange: (key: keyof NewMedItem, value: string | number) => void
	onRemove: () => void
}) {
	return (
		<div className="rounded-lg border p-4 space-y-3">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium text-muted-foreground">Medication #{index + 1}</span>
				<button
					type="button"
					onClick={onRemove}
					className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
				>
					<Trash2 className="size-3.5" />
				</button>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-1">
					<label className="text-xs text-muted-foreground">Generic Name *</label>
					<input
						className="border-input bg-background w-full rounded border px-2 py-1.5 text-sm"
						value={med.genericName}
						onChange={(e) => onChange("genericName", e.target.value)}
						placeholder="e.g. Amoxicillin"
						required
					/>
				</div>
				<div className="space-y-1">
					<label className="text-xs text-muted-foreground">Brand Name</label>
					<input
						className="border-input bg-background w-full rounded border px-2 py-1.5 text-sm"
						value={med.brandName ?? ""}
						onChange={(e) => onChange("brandName", e.target.value)}
						placeholder="e.g. Amoxil"
					/>
				</div>
				<div className="space-y-1">
					<label className="text-xs text-muted-foreground">Dosage *</label>
					<input
						className="border-input bg-background w-full rounded border px-2 py-1.5 text-sm"
						value={med.dosage}
						onChange={(e) => onChange("dosage", e.target.value)}
						placeholder="e.g. 500mg"
						required
					/>
				</div>
				<div className="space-y-1">
					<label className="text-xs text-muted-foreground">Form</label>
					<select
						className="border-input bg-background w-full rounded border px-2 py-1.5 text-sm"
						value={med.form}
						onChange={(e) => onChange("form", e.target.value)}
					>
						<option value="">Select form</option>
						{MED_FORMS.map((f) => (
							<option key={f} value={f}>
								{f.charAt(0).toUpperCase() + f.slice(1)}
							</option>
						))}
					</select>
				</div>
				<div className="space-y-1">
					<label className="text-xs text-muted-foreground">Quantity *</label>
					<div className="flex gap-2">
						<input
							type="number"
							min={1}
							className="border-input bg-background w-20 rounded border px-2 py-1.5 text-sm"
							value={med.quantity}
							onChange={(e) => onChange("quantity", Number(e.target.value))}
							required
						/>
						<select
							className="border-input bg-background flex-1 rounded border px-2 py-1.5 text-sm"
							value={med.unit}
							onChange={(e) => onChange("unit", e.target.value)}
						>
							{UNIT_OPTIONS.map((u) => (
								<option key={u} value={u}>
									{u}
								</option>
							))}
						</select>
					</div>
				</div>
				<div className="space-y-1">
					<label className="text-xs text-muted-foreground">Route</label>
					<select
						className="border-input bg-background w-full rounded border px-2 py-1.5 text-sm"
						value={med.route}
						onChange={(e) => onChange("route", e.target.value)}
					>
						{MED_ROUTES.map((r) => (
							<option key={r} value={r}>
								{r.charAt(0).toUpperCase() + r.slice(1)}
							</option>
						))}
					</select>
				</div>
				<div className="space-y-1">
					<label className="text-xs text-muted-foreground">Frequency *</label>
					<input
						className="border-input bg-background w-full rounded border px-2 py-1.5 text-sm"
						value={med.frequency}
						onChange={(e) => onChange("frequency", e.target.value)}
						placeholder="e.g. 3x daily"
						required
					/>
				</div>
				<div className="space-y-1">
					<label className="text-xs text-muted-foreground">Duration *</label>
					<input
						className="border-input bg-background w-full rounded border px-2 py-1.5 text-sm"
						value={med.duration}
						onChange={(e) => onChange("duration", e.target.value)}
						placeholder="e.g. 7 days"
						required
					/>
				</div>
			</div>

			<div className="space-y-1">
				<label className="text-xs text-muted-foreground">Special Instructions</label>
				<input
					className="border-input bg-background w-full rounded border px-2 py-1.5 text-sm"
					value={med.instructions ?? ""}
					onChange={(e) => onChange("instructions", e.target.value)}
					placeholder="e.g. Take with food, avoid sunlight..."
				/>
			</div>
		</div>
	)
}

function PrescriptionPreview({ rx }: { rx: EPrescription }) {
	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="rounded-lg border p-4">
				<div className="mb-3 flex items-start justify-between">
					<div>
						<h3 className="text-base font-bold">{rx.facilityName}</h3>
						<p className="text-muted-foreground text-xs">{rx.facilityAddress}</p>
					</div>
					<Badge className={getPrescriptionStatusColor(rx.status)}>
						{getPrescriptionStatusLabel(rx.status)}
					</Badge>
				</div>
				<Separator className="mb-3" />
				<div className="grid grid-cols-2 gap-2 text-sm">
					<div>
						<span className="text-muted-foreground">Patient: </span>
						<span className="font-medium">{rx.patientName}</span>
					</div>
					<div>
						<span className="text-muted-foreground">MRN: </span>
						<span className="font-medium">{rx.patientMrn}</span>
					</div>
					<div>
						<span className="text-muted-foreground">Age/Sex: </span>
						<span className="font-medium">{rx.patientAge} y/o {rx.patientSex}</span>
					</div>
					<div>
						<span className="text-muted-foreground">Date: </span>
						<span className="font-medium">{new Date(rx.prescriptionDate).toLocaleDateString("en-PH")}</span>
					</div>
					<div>
						<span className="text-muted-foreground">Valid Until: </span>
						<span className="font-medium">{new Date(rx.validUntil).toLocaleDateString("en-PH")}</span>
					</div>
				</div>
			</div>

			{/* Medications */}
			<div className="space-y-3">
				{rx.medications.map((med, i) => (
					<div key={med.id} className="rounded-lg border p-3">
						<div className="flex items-center gap-2">
							<span className="bg-primary/10 text-primary flex size-6 items-center justify-center rounded-full text-xs font-bold">
								{i + 1}
							</span>
							<div>
								<p className="text-sm font-semibold">
									{med.genericName}
									{med.brandName && (
										<span className="text-muted-foreground ml-1 text-xs">({med.brandName})</span>
									)}
								</p>
								<p className="text-muted-foreground text-xs">
									{med.dosage} — {med.form} — {med.route}
								</p>
							</div>
						</div>
						<div className="mt-2 text-xs">
							<span className="font-medium">{med.quantity} {med.unit}</span>
							<span className="text-muted-foreground mx-1">•</span>
							{med.frequency}
							<span className="text-muted-foreground mx-1">•</span>
							{med.duration}
						</div>
						{med.instructions && (
							<p className="text-muted-foreground mt-1 text-xs italic">{med.instructions}</p>
						)}
					</div>
				))}
			</div>

			{/* Dispensing instructions */}
			{rx.dispensingInstructions && (
				<div className="rounded-lg bg-yellow-50 p-3">
					<p className="text-xs font-medium text-yellow-800">Dispensing Instructions:</p>
					<p className="text-xs text-yellow-700">{rx.dispensingInstructions}</p>
				</div>
			)}

			{/* Clinician signature */}
			<div className="rounded-lg border border-dashed p-3 text-right">
				<p className="text-sm font-semibold">{rx.clinicianName}</p>
				<p className="text-muted-foreground text-xs">PRC #{rx.clinicianPrcNumber}</p>
				<div className="mt-2 border-t pt-2">
					<p className="text-muted-foreground text-xs">Signature over Printed Name</p>
				</div>
			</div>

			{/* Action Buttons */}
			<div className="flex flex-wrap gap-3">
				<Button variant="outline" size="sm" onClick={() => window.print()}>
					<Printer className="mr-1.5 size-3.5" />
					Print
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => toast.info("PDF download is not yet available.")}
				>
					<Download className="mr-1.5 size-3.5" />
					Download PDF
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => toast.info("SMS delivery is not yet configured.")}
				>
					<MessageSquare className="mr-1.5 size-3.5" />
					Send via SMS
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => toast.info("Email delivery is not yet configured.")}
				>
					<Mail className="mr-1.5 size-3.5" />
					Send via Email
				</Button>
			</div>
		</div>
	)
}

// ============================================================================
// Main Component
// ============================================================================

export function EPrescriptionCard({
	encounterId,
	patientName,
	patientMrn,
	patientAge,
	patientSex,
	clinicianName,
	clinicianPrcNumber,
	clinicianPrcExpiry,
	clinicianPtrExpiry,
	facilityName,
	facilityAddress,
	onPrescriptionCreated,
}: EPrescriptionCardProps) {
	const [showForm, setShowForm] = useState(false)
	const [medications, setMedications] = useState<NewMedItem[]>([{ ...EMPTY_MED }])
	const [dispensingInstructions, setDispensingInstructions] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [selectedRxId, setSelectedRxId] = useState<string | null>(null)

	const { data: prescriptions, isLoading } = useEncounterPrescriptionsQuery(encounterId)
	const createMutation = useCreatePrescriptionMutation()

	const prcExpired = isPastDate(clinicianPrcExpiry)
	const ptrExpired = isPastDate(clinicianPtrExpiry)
	const prcExpiringSoon = isWithinDays(clinicianPrcExpiry, 30)
	const ptrExpiringSoon = isWithinDays(clinicianPtrExpiry, 30)
	const licenseBlocked = Boolean(clinicianPrcExpiry || clinicianPtrExpiry) && (prcExpired || ptrExpired)

	const licenseWarnings: string[] = []
	if (clinicianPrcExpiry && prcExpired)
		licenseWarnings.push(`PRC license expired ${formatDate(clinicianPrcExpiry)} — prescription generation blocked.`)
	else if (clinicianPrcExpiry && prcExpiringSoon)
		licenseWarnings.push(`PRC license expires ${formatDate(clinicianPrcExpiry)}.`)
	if (clinicianPtrExpiry && ptrExpired)
		licenseWarnings.push(`PTR expired ${formatDate(clinicianPtrExpiry)} — prescription generation blocked.`)
	else if (clinicianPtrExpiry && ptrExpiringSoon)
		licenseWarnings.push(`PTR expires ${formatDate(clinicianPtrExpiry)}.`)

	const selectedRx = prescriptions?.find((rx) => rx.id === selectedRxId) ?? prescriptions?.[0] ?? null

	function addMedication() {
		setMedications((prev) => [...prev, { ...EMPTY_MED }])
	}

	function removeMedication(index: number) {
		setMedications((prev) => prev.filter((_, i) => i !== index))
	}

	function updateMedication(index: number, key: keyof NewMedItem, value: string | number) {
		setMedications((prev) =>
			prev.map((m, i) => (i === index ? { ...m, [key]: value } : m)),
		)
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)

		const invalid = medications.some(
			(m) => !m.genericName.trim() || !m.dosage.trim() || !m.frequency.trim() || !m.duration.trim(),
		)
		if (invalid) {
			setError("Please fill in all required medication fields (Generic Name, Dosage, Frequency, Duration).")
			return
		}

		const input: CreatePrescriptionInput = {
			encounterId,
			medications,
			dispensingInstructions: dispensingInstructions || undefined,
		}

		try {
			const rx = await createMutation.mutateAsync(input)
			setShowForm(false)
			setMedications([{ ...EMPTY_MED }])
			setDispensingInstructions("")
			setSelectedRxId(rx.id)
			onPrescriptionCreated?.(rx.id)
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to generate prescription.")
		}
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 text-base">
						<Pill className="text-primary size-5" />
						E-Prescription
					</CardTitle>
					<Button
						size="sm"
						onClick={() => setShowForm((v) => !v)}
						variant={showForm ? "outline" : "default"}
						disabled={licenseBlocked && !showForm}
					>
						{showForm ? "Cancel" : (
							<>
								<Plus className="mr-1.5 size-3.5" />
								New Prescription
							</>
						)}
					</Button>
				</div>
				{licenseWarnings.length > 0 && (
					<Alert variant={licenseBlocked ? "destructive" : "default"} className="mt-3">
						<AlertTriangle className="size-4" />
						<AlertTitle>Prescription License Warning</AlertTitle>
						<AlertDescription>
							{licenseWarnings.map((msg, i) => (
								<p key={i}>{msg}</p>
							))}
						</AlertDescription>
					</Alert>
				)}
			</CardHeader>
			<CardContent>
				{showForm ? (
					<form onSubmit={handleSubmit} className="space-y-5">
						<div className="space-y-4">
							{medications.map((med, i) => (
								<MedicationRow
									key={i}
									med={med}
									index={i}
									onChange={(key, value) => updateMedication(i, key, value)}
									onRemove={() => removeMedication(i)}
								/>
							))}
						</div>

						<Button
							type="button"
							variant="outline"
							className="w-full"
							onClick={addMedication}
						>
							<Plus className="mr-1.5 size-3.5" />
							Add Medication
						</Button>

						<div className="space-y-1.5">
							<label htmlFor="dispensingInstructions" className="text-sm font-medium">
								Dispensing Instructions
							</label>
							<textarea
								id="dispensingInstructions"
								className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
								rows={2}
								value={dispensingInstructions}
								onChange={(e) => setDispensingInstructions(e.target.value)}
								placeholder="Special instructions for the pharmacist..."
							/>
						</div>

						{error && (
							<p className="text-destructive rounded-md bg-red-50 px-3 py-2 text-sm">{error}</p>
						)}

						<div className="flex justify-end gap-3">
							<Button type="button" variant="outline" onClick={() => setShowForm(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={createMutation.isPending || licenseBlocked}>
								{createMutation.isPending ? (
									<>
										<Loader2 className="mr-1.5 size-3.5 animate-spin" />
										Generating...
									</>
								) : (
									<>
										<FileText className="mr-1.5 size-3.5" />
										Generate E-Prescription
									</>
								)}
							</Button>
						</div>
					</form>
				) : isLoading ? (
					<div className="flex items-center gap-2 py-6 text-sm text-gray-500">
						<Loader2 className="size-4 animate-spin" />
						Loading prescriptions...
					</div>
				) : !prescriptions?.length ? (
					<div className="flex flex-col items-center gap-3 py-8 text-center">
						<Pill className="text-muted-foreground size-10" />
						<p className="text-muted-foreground text-sm">No prescriptions yet for this encounter.</p>
						<Button onClick={() => setShowForm(true)} disabled={licenseBlocked}>
							<Plus className="mr-1.5 size-3.5" />
							Generate E-Prescription
						</Button>
					</div>
				) : (
					<div className="space-y-4">
						{/* Prescription selector */}
						{prescriptions.length > 1 && (
							<div className="flex flex-wrap gap-2">
								{prescriptions.map((rx) => (
									<button
										key={rx.id}
										type="button"
										onClick={() => setSelectedRxId(rx.id)}
										className={[
											"rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
											selectedRxId === rx.id || (!selectedRxId && rx === prescriptions[0])
												? "border-primary bg-primary/10 text-primary"
												: "border-muted text-muted-foreground hover:border-primary/40",
										].join(" ")}
									>
										<CheckCircle2 className="mr-1 inline size-3" />
										Rx #{rx.id.slice(-6).toUpperCase()}
									</button>
								))}
							</div>
						)}

						{selectedRx && <PrescriptionPreview rx={selectedRx} />}
					</div>
				)}
			</CardContent>
		</Card>
	)
}

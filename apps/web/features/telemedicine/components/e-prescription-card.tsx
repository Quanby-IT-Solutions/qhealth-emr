"use client"

import { useState } from "react"
import {
	AlertTriangle,
	CheckCircle2,
	Download,
	FileText,
	Loader2,
	Mail,
	PenLine,
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
	useCreatePrescriptionMutation,
	useEncounterPrescriptionsQuery,
	useSendPrescriptionMutation,
	useSignPrescriptionMutation,
	type CreatePrescriptionInput,
	type EPrescription,
	type EPrescriptionItem,
	type PrescriptionStatus,
} from "@/features/telemedicine/api/telemedicine.hooks"
import { env } from "@/env"

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
	clinicianPtrNumber: string
	clinicianPrcExpiry?: string | null
	clinicianPtrExpiry?: string | null
	facilityName: string
	facilityAddress?: string
	defaultPatientEmail?: string | null
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

function isValidEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function escapeHtml(value: string | null | undefined): string {
	return (value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;")
}

function formatDateTime(value: string | null | undefined): string {
	if (!value) return "--"
	return new Date(value).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function openPrescriptionPrintWindow(rx: EPrescription): void {
	const win = window.open("", "_blank", "width=870,height=1100")
	if (!win) return

	const medicationRows = rx.medications
		.map((med, index) => {
			const brand = med.brandName ? ` (${escapeHtml(med.brandName)})` : ""
			const instructions = med.instructions
				? `<div class="muted">Instructions: ${escapeHtml(med.instructions)}</div>`
				: ""
			return `<tr>
				<td>${index + 1}</td>
				<td><strong>${escapeHtml(med.genericName)}${brand}</strong><div class="muted">${escapeHtml(med.dosage)} ${escapeHtml(med.form)} ${escapeHtml(med.route)}</div></td>
				<td>${escapeHtml(String(med.quantity))} ${escapeHtml(med.unit)}</td>
				<td>${escapeHtml(med.frequency)}</td>
				<td>${escapeHtml(med.duration)}${instructions}</td>
			</tr>`
		})
		.join("")

	const sentNotice =
		rx.sentAt && rx.sentToEmail
			? `<div class="notice">Sent to patient: ${escapeHtml(rx.sentToEmail)} on ${escapeHtml(formatDateTime(rx.sentAt))}</div>`
			: ""

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Telemedicine e-Prescription - ${escapeHtml(rx.patientName)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 2cm; font-size: 10.5pt; }
    .header { text-align: center; margin-bottom: 18px; }
    .facility { font-size: 13pt; font-weight: 700; }
    .title { margin-top: 4px; font-size: 15pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; border: 1px solid #bbb; padding: 10px 12px; margin-bottom: 16px; }
    .label { color: #555; font-size: 8.5pt; font-weight: 700; text-transform: uppercase; }
    .value { display: block; min-height: 18px; border-bottom: 1px solid #ddd; padding-top: 1px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { border: 1px solid #ccc; padding: 7px; vertical-align: top; text-align: left; }
    th { background: #f4f4f5; font-size: 8.5pt; text-transform: uppercase; }
    .muted { color: #555; font-size: 8.5pt; margin-top: 2px; }
    .section { border: 1px solid #ddd; padding: 10px 12px; margin-bottom: 12px; }
    .signature { margin-top: 28px; display: flex; justify-content: flex-end; }
    .signature-box { width: 280px; text-align: center; }
    .sig-line { border-bottom: 1px solid #000; height: 34px; margin-bottom: 5px; }
    .notice { margin-top: 14px; border: 1px solid #bfdbfe; background: #eff6ff; color: #1e40af; padding: 8px 10px; font-size: 9.5pt; }
    @media print { @page { size: A4; margin: 2cm; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="facility">${escapeHtml(rx.facilityName)}</div>
    <div>${escapeHtml(rx.facilityAddress)}</div>
    <div class="title">Telemedicine e-Prescription</div>
  </div>
  <div class="meta">
    <div><span class="label">Patient</span><span class="value">${escapeHtml(rx.patientName)}</span></div>
    <div><span class="label">MRN</span><span class="value">${escapeHtml(rx.patientMrn)}</span></div>
    <div><span class="label">Age / Sex</span><span class="value">${escapeHtml(String(rx.patientAge))} / ${escapeHtml(rx.patientSex)}</span></div>
    <div><span class="label">Prescription Date</span><span class="value">${escapeHtml(rx.prescriptionDate)}</span></div>
    <div><span class="label">Valid Until</span><span class="value">${escapeHtml(rx.validUntil)}</span></div>
    <div><span class="label">Signed</span><span class="value">${escapeHtml(formatDateTime(rx.signedAt))}</span></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Medication</th><th>Quantity</th><th>Frequency</th><th>Duration</th></tr></thead>
    <tbody>${medicationRows}</tbody>
  </table>
  ${
		rx.dispensingInstructions
			? `<div class="section"><strong>Dispensing Instructions</strong><br>${escapeHtml(rx.dispensingInstructions)}</div>`
			: ""
	}
  <div class="signature">
    <div class="signature-box">
      <div class="sig-line"></div>
      <div><strong>${escapeHtml(rx.clinicianName)}</strong></div>
      <div>PRC Lic. No.: ${escapeHtml(rx.clinicianPrcNumber)}</div>
      <div>PTR No.: ${escapeHtml(rx.clinicianPtrNumber)}</div>
      <div class="muted">Digitally signed by ${escapeHtml(rx.signedByName ?? rx.clinicianName)}</div>
    </div>
  </div>
  ${sentNotice}
  <script>window.addEventListener("load", function () { setTimeout(function () { window.print() }, 250) })</script>
</body>
</html>`

	win.document.write(html)
	win.document.close()
	win.focus()
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
		draft: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
		active: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
		signed: "bg-success/15 text-success border-success/30",
		sent: "bg-primary/15 text-primary border-primary/30",
		dispensed: "bg-primary/15 text-primary border-primary/30",
		cancelled: "bg-destructive/15 text-destructive border-destructive/30",
	}
	return map[status] ?? "bg-muted text-muted-foreground border-border"
}

function getPrescriptionStatusLabel(status: PrescriptionStatus): string {
	const map: Record<PrescriptionStatus, string> = {
		draft: "Draft",
		active: "Needs Signature",
		signed: "Signed",
		sent: "Sent to Patient",
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
	removeDisabled,
}: {
	med: NewMedItem
	index: number
	onChange: (key: keyof NewMedItem, value: string | number) => void
	onRemove: () => void
	removeDisabled?: boolean
}) {
	return (
		<div className="space-y-3 rounded-lg border p-4">
			<div className="flex items-center justify-between">
				<span className="text-muted-foreground text-sm font-medium">Medication #{index + 1}</span>
				<button
					type="button"
					onClick={onRemove}
					disabled={removeDisabled}
					title={removeDisabled ? "At least one medication row is required" : "Remove medication"}
					className="text-muted-foreground hover:text-destructive disabled:hover:text-muted-foreground rounded p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
				>
					<Trash2 className="size-3.5" />
				</button>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-1">
					<label className="text-muted-foreground text-xs">Generic Name *</label>
					<input
						className="border-input bg-background w-full rounded border px-2 py-1.5 text-sm"
						value={med.genericName}
						onChange={e => onChange("genericName", e.target.value)}
						placeholder="e.g. Amoxicillin"
						required
					/>
				</div>
				<div className="space-y-1">
					<label className="text-muted-foreground text-xs">Brand Name</label>
					<input
						className="border-input bg-background w-full rounded border px-2 py-1.5 text-sm"
						value={med.brandName ?? ""}
						onChange={e => onChange("brandName", e.target.value)}
						placeholder="e.g. Amoxil"
					/>
				</div>
				<div className="space-y-1">
					<label className="text-muted-foreground text-xs">Dosage *</label>
					<input
						className="border-input bg-background w-full rounded border px-2 py-1.5 text-sm"
						value={med.dosage}
						onChange={e => onChange("dosage", e.target.value)}
						placeholder="e.g. 500mg"
						required
					/>
				</div>
				<div className="space-y-1">
					<label className="text-muted-foreground text-xs">Form *</label>
					<select
						className="border-input bg-background w-full rounded border px-2 py-1.5 text-sm"
						value={med.form}
						onChange={e => onChange("form", e.target.value)}
						required
					>
						<option value="">Select form</option>
						{MED_FORMS.map(f => (
							<option key={f} value={f}>
								{f.charAt(0).toUpperCase() + f.slice(1)}
							</option>
						))}
					</select>
				</div>
				<div className="space-y-1">
					<label className="text-muted-foreground text-xs">Quantity *</label>
					<div className="flex gap-2">
						<input
							type="number"
							min={1}
							className="border-input bg-background w-20 rounded border px-2 py-1.5 text-sm"
							value={med.quantity}
							onChange={e => onChange("quantity", Number(e.target.value))}
							required
						/>
						<select
							className="border-input bg-background flex-1 rounded border px-2 py-1.5 text-sm"
							value={med.unit}
							onChange={e => onChange("unit", e.target.value)}
						>
							{UNIT_OPTIONS.map(u => (
								<option key={u} value={u}>
									{u}
								</option>
							))}
						</select>
					</div>
				</div>
				<div className="space-y-1">
					<label className="text-muted-foreground text-xs">Route *</label>
					<select
						className="border-input bg-background w-full rounded border px-2 py-1.5 text-sm"
						value={med.route}
						onChange={e => onChange("route", e.target.value)}
						required
					>
						{MED_ROUTES.map(r => (
							<option key={r} value={r}>
								{r.charAt(0).toUpperCase() + r.slice(1)}
							</option>
						))}
					</select>
				</div>
				<div className="space-y-1">
					<label className="text-muted-foreground text-xs">Frequency *</label>
					<input
						className="border-input bg-background w-full rounded border px-2 py-1.5 text-sm"
						value={med.frequency}
						onChange={e => onChange("frequency", e.target.value)}
						placeholder="e.g. 3x daily"
						required
					/>
				</div>
				<div className="space-y-1">
					<label className="text-muted-foreground text-xs">Duration *</label>
					<input
						className="border-input bg-background w-full rounded border px-2 py-1.5 text-sm"
						value={med.duration}
						onChange={e => onChange("duration", e.target.value)}
						placeholder="e.g. 7 days"
						required
					/>
				</div>
			</div>

			<div className="space-y-1">
				<label className="text-muted-foreground text-xs">Special Instructions</label>
				<input
					className="border-input bg-background w-full rounded border px-2 py-1.5 text-sm"
					value={med.instructions ?? ""}
					onChange={e => onChange("instructions", e.target.value)}
					placeholder="e.g. Take with food, avoid sunlight..."
				/>
			</div>
		</div>
	)
}

function PrescriptionPreview({
	rx,
	defaultPatientEmail,
}: {
	rx: EPrescription
	defaultPatientEmail?: string | null
}) {
	const [showSendForm, setShowSendForm] = useState(false)
	const [sendEmailOverride, setSendEmailOverride] = useState<string | null>(null)
	const signMutation = useSignPrescriptionMutation()
	const sendMutation = useSendPrescriptionMutation()
	const canSign = rx.status === "draft" || rx.status === "active"
	const requiresSignature = canSign || !rx.signedAt
	const sendEmail = sendEmailOverride ?? defaultPatientEmail ?? ""

	async function handleSign() {
		try {
			await signMutation.mutateAsync({ id: rx.id })
			toast.success("Prescription signed.")
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to sign prescription.")
		}
	}

	async function handleDownloadPdf() {
		if (requiresSignature) {
			toast.error("Sign the prescription before downloading the PDF.")
			return
		}
		try {
			const response = await fetch(
				`${env.NEXT_PUBLIC_API_BASE_URL}/v1/telemedicine/prescriptions/${rx.id}/pdf`,
				{ credentials: "include" }
			)
			if (!response.ok) {
				throw new Error(await response.text().catch(() => "Failed to download PDF."))
			}
			const blob = await response.blob()
			const url = URL.createObjectURL(blob)
			const link = document.createElement("a")
			link.href = url
			link.download = `prescription-${rx.id}.pdf`
			document.body.appendChild(link)
			link.click()
			link.remove()
			URL.revokeObjectURL(url)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to download PDF.")
		}
	}

	async function handleSendEmail(e: React.FormEvent) {
		e.preventDefault()
		if (requiresSignature) {
			toast.error("Sign the prescription before sending it.")
			return
		}
		const email = sendEmail.trim()
		if (!isValidEmail(email)) {
			toast.error("Enter a valid email address.")
			return
		}
		try {
			await sendMutation.mutateAsync({ id: rx.id, email })
			toast.success("Prescription marked sent.")
			setSendEmailOverride(null)
			setShowSendForm(false)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to mark prescription sent.")
		}
	}

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
						<span className="font-medium">
							{rx.patientAge} y/o {rx.patientSex}
						</span>
					</div>
					<div>
						<span className="text-muted-foreground">Date: </span>
						<span className="font-medium">
							{new Date(rx.prescriptionDate).toLocaleDateString("en-PH")}
						</span>
					</div>
					<div>
						<span className="text-muted-foreground">Valid Until: </span>
						<span className="font-medium">
							{new Date(rx.validUntil).toLocaleDateString("en-PH")}
						</span>
					</div>
					{rx.signedAt && (
						<div>
							<span className="text-muted-foreground">Signed: </span>
							<span className="font-medium">{new Date(rx.signedAt).toLocaleString("en-PH")}</span>
						</div>
					)}
					{rx.sentAt && (
						<div>
							<span className="text-muted-foreground">Sent: </span>
							<span className="font-medium">{new Date(rx.sentAt).toLocaleString("en-PH")}</span>
						</div>
					)}
				</div>
			</div>

			{requiresSignature && (
				<Alert>
					<AlertTriangle className="size-4" />
					<AlertTitle>Physician Signature Required</AlertTitle>
					<AlertDescription>
						This e-prescription must be signed before it can be printed, downloaded, or sent.
					</AlertDescription>
				</Alert>
			)}

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
									{med.dosage} - {med.form} - {med.route}
								</p>
							</div>
						</div>
						<div className="mt-2 text-xs">
							<span className="font-medium">
								{med.quantity} {med.unit}
							</span>
							<span className="text-muted-foreground mx-1">/</span>
							{med.frequency}
							<span className="text-muted-foreground mx-1">/</span>
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
				<div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
					<p className="text-xs font-medium text-amber-700 dark:text-amber-300">
						Dispensing Instructions:
					</p>
					<p className="text-xs text-amber-700 dark:text-amber-300/90">
						{rx.dispensingInstructions}
					</p>
				</div>
			)}

			{/* Clinician signature */}
			<div className="rounded-lg border border-dashed p-3 text-right">
				<p className="text-sm font-semibold">{rx.clinicianName}</p>
				<p className="text-muted-foreground text-xs">PRC #{rx.clinicianPrcNumber}</p>
				<p className="text-muted-foreground text-xs">PTR #{rx.clinicianPtrNumber}</p>
				{rx.signedByName && rx.signedAt && (
					<p className="text-muted-foreground text-xs">
						Digitally signed by {rx.signedByName} on {new Date(rx.signedAt).toLocaleString("en-PH")}
					</p>
				)}
				<div className="mt-2 border-t pt-2">
					<p className="text-muted-foreground text-xs">Signature over Printed Name</p>
				</div>
			</div>

			{/* Action Buttons */}
			<div className="flex flex-wrap gap-3">
				{canSign && (
					<Button size="sm" onClick={handleSign} disabled={signMutation.isPending}>
						{signMutation.isPending ? (
							<Loader2 className="mr-1.5 size-3.5 animate-spin" />
						) : (
							<PenLine className="mr-1.5 size-3.5" />
						)}
						Sign Prescription
					</Button>
				)}
				<Button
					variant="outline"
					size="sm"
					onClick={() => openPrescriptionPrintWindow(rx)}
					disabled={requiresSignature}
				>
					<Printer className="mr-1.5 size-3.5" />
					Print
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={handleDownloadPdf}
					disabled={requiresSignature}
				>
					<Download className="mr-1.5 size-3.5" />
					Download PDF
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setShowSendForm(v => !v)}
					disabled={requiresSignature}
				>
					<Mail className="mr-1.5 size-3.5" />
					Send via Email
				</Button>
			</div>
			{showSendForm && !requiresSignature && (
				<form onSubmit={handleSendEmail} className="mt-3 flex flex-wrap gap-2">
					<input
						type="email"
						className="border-input bg-background min-w-64 flex-1 rounded-md border px-3 py-2 text-sm"
						value={sendEmail}
						onChange={e => setSendEmailOverride(e.target.value)}
						placeholder="patient@email.com"
						required
					/>
					<Button type="submit" size="sm" disabled={sendMutation.isPending}>
						{sendMutation.isPending ? "Sending..." : "Send"}
					</Button>
				</form>
			)}
		</div>
	)
}

// ============================================================================
// Main Component
// ============================================================================

export function EPrescriptionCard({
	encounterId,
	clinicianPrcNumber,
	clinicianPtrNumber,
	clinicianPrcExpiry,
	clinicianPtrExpiry,
	defaultPatientEmail,
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
	const credentialMissing =
		!clinicianPrcNumber || !clinicianPtrNumber || !clinicianPrcExpiry || !clinicianPtrExpiry
	const licenseBlocked = credentialMissing || prcExpired || ptrExpired

	const licenseWarnings: string[] = []
	if (!clinicianPrcNumber) licenseWarnings.push("PRC license number is missing.")
	if (!clinicianPtrNumber) licenseWarnings.push("PTR number is missing.")
	if (!clinicianPrcExpiry) licenseWarnings.push("PRC license expiry is missing.")
	if (!clinicianPtrExpiry) licenseWarnings.push("PTR expiry is missing.")
	if (clinicianPrcExpiry && prcExpired)
		licenseWarnings.push(
			`PRC license expired ${formatDate(clinicianPrcExpiry)} - prescription generation blocked.`
		)
	else if (clinicianPrcExpiry && prcExpiringSoon)
		licenseWarnings.push(`PRC license expires ${formatDate(clinicianPrcExpiry)}.`)
	if (clinicianPtrExpiry && ptrExpired)
		licenseWarnings.push(
			`PTR expired ${formatDate(clinicianPtrExpiry)} - prescription generation blocked.`
		)
	else if (clinicianPtrExpiry && ptrExpiringSoon)
		licenseWarnings.push(`PTR expires ${formatDate(clinicianPtrExpiry)}.`)

	const selectedRx = prescriptions?.find(rx => rx.id === selectedRxId) ?? prescriptions?.[0] ?? null

	function addMedication() {
		setMedications(prev => [...prev, { ...EMPTY_MED }])
	}

	function removeMedication(index: number) {
		setMedications(prev => {
			if (prev.length <= 1) return [{ ...EMPTY_MED }]
			return prev.filter((_, i) => i !== index)
		})
	}

	function updateMedication(index: number, key: keyof NewMedItem, value: string | number) {
		setMedications(prev => prev.map((m, i) => (i === index ? { ...m, [key]: value } : m)))
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)

		const invalid = medications.some(
			m =>
				!m.genericName.trim() ||
				!m.dosage.trim() ||
				!m.form.trim() ||
				!m.unit.trim() ||
				!m.route.trim() ||
				!m.frequency.trim() ||
				!m.duration.trim() ||
				!Number.isInteger(m.quantity) ||
				m.quantity < 1
		)
		if (invalid) {
			setError(
				"Please complete each medication: generic name, dosage, form, quantity, unit, route, frequency, and duration are required."
			)
			return
		}

		const input: CreatePrescriptionInput = {
			encounterId,
			medications: medications.map(med => ({
				...med,
				genericName: med.genericName.trim(),
				brandName: med.brandName?.trim() || undefined,
				dosage: med.dosage.trim(),
				form: med.form.trim(),
				unit: med.unit.trim(),
				frequency: med.frequency.trim(),
				duration: med.duration.trim(),
				route: med.route.trim(),
				instructions: med.instructions?.trim() || undefined,
			})),
			dispensingInstructions: dispensingInstructions.trim() || undefined,
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
						onClick={() => setShowForm(v => !v)}
						variant={showForm ? "outline" : "default"}
						disabled={licenseBlocked && !showForm}
					>
						{showForm ? (
							"Cancel"
						) : (
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
									removeDisabled={medications.length <= 1}
								/>
							))}
						</div>

						<Button type="button" variant="outline" className="w-full" onClick={addMedication}>
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
								onChange={e => setDispensingInstructions(e.target.value)}
								placeholder="Special instructions for the pharmacist..."
							/>
						</div>

						{error && (
							<p className="text-destructive border-destructive/30 bg-destructive/10 rounded-md border px-3 py-2 text-sm">
								{error}
							</p>
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
					<div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
						<Loader2 className="size-4 animate-spin" />
						Loading prescriptions...
					</div>
				) : !prescriptions?.length ? (
					<div className="flex flex-col items-center gap-3 py-8 text-center">
						<Pill className="text-muted-foreground size-10" />
						<p className="text-muted-foreground text-sm">
							No prescriptions yet for this encounter.
						</p>
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
								{prescriptions.map(rx => (
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

						{selectedRx && (
							<PrescriptionPreview rx={selectedRx} defaultPatientEmail={defaultPatientEmail} />
						)}
					</div>
				)}
			</CardContent>
		</Card>
	)
}

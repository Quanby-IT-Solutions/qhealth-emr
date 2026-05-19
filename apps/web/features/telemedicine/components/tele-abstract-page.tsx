"use client"

import { useState } from "react"
import {
	CheckCircle2,
	ClipboardList,
	Download,
	FileText,
	Loader2,
	Mail,
	Pen,
	Printer,
	Send,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { env } from "@/env"
import {
	useEncounterAbstractsQuery,
	useGenerateAbstractMutation,
	useSendAbstractMutation,
	useSignAbstractMutation,
	type TeleAbstract,
} from "@/features/telemedicine/api/telemedicine.hooks"

function escapeHtml(value: string | null | undefined): string {
	return (value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;")
}

function formatPrintDate(value: string | null | undefined): string {
	if (!value) return "--"
	return new Date(value).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function isValidEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function openAbstractPrintWindow(abstract: TeleAbstract): void {
	const win = window.open("", "_blank", "width=870,height=1100")
	if (!win) return

	const sentNotice =
		abstract.status === "sent"
			? `<div class="notice">Sent to patient${abstract.sentToEmail ? `: ${escapeHtml(abstract.sentToEmail)}` : ""}${abstract.sentAt ? ` on ${escapeHtml(formatPrintDate(abstract.sentAt))}` : ""}</div>`
			: ""

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Telemedicine Encounter Abstract - ${escapeHtml(abstract.patientName)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 2cm; font-size: 11pt; }
    .header { text-align: center; margin-bottom: 18px; }
    .facility { font-size: 13pt; font-weight: 700; }
    .title { margin-top: 4px; font-size: 15pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; border: 1px solid #bbb; padding: 10px 12px; margin-bottom: 16px; }
    .label { color: #555; font-size: 9pt; font-weight: 700; text-transform: uppercase; }
    .value { display: block; min-height: 18px; border-bottom: 1px solid #ddd; padding-top: 1px; }
    .section { border: 1px solid #ddd; padding: 10px 12px; margin-bottom: 10px; page-break-inside: avoid; }
    .section h2 { color: #333; font-size: 9pt; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 6px; }
    .section p { white-space: pre-wrap; line-height: 1.45; }
    .signature { margin-top: 28px; display: flex; justify-content: flex-end; }
    .signature-box { width: 260px; text-align: center; }
    .sig-line { border-bottom: 1px solid #000; height: 34px; margin-bottom: 5px; }
    .notice { margin-top: 14px; border: 1px solid #bfdbfe; background: #eff6ff; color: #1e40af; padding: 8px 10px; font-size: 9.5pt; }
    @media print { @page { size: A4; margin: 2cm; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="facility">${escapeHtml(abstract.facilityName)}</div>
    <div class="title">Telemedicine Encounter Abstract</div>
  </div>
  <div class="meta">
    <div><span class="label">Patient</span><span class="value">${escapeHtml(abstract.patientName)}</span></div>
    <div><span class="label">Clinician</span><span class="value">${escapeHtml(abstract.clinicianName)}</span></div>
    <div><span class="label">PRC Number</span><span class="value">${escapeHtml(abstract.clinicianPrcNumber ?? "--")}</span></div>
    <div><span class="label">Date</span><span class="value">${escapeHtml(formatPrintDate(abstract.createdAt))}</span></div>
  </div>
  <div class="section"><h2>Chief Complaint</h2><p>${escapeHtml(abstract.chiefComplaint) || "--"}</p></div>
  <div class="section"><h2>Subjective</h2><p>${escapeHtml(abstract.subjectiveNotes) || "--"}</p></div>
  <div class="section"><h2>Objective</h2><p>${escapeHtml(abstract.objectiveNotes) || "--"}</p></div>
  <div class="section"><h2>Assessment</h2><p>${escapeHtml(abstract.assessmentNotes) || "--"}</p></div>
  <div class="section"><h2>Plan</h2><p>${escapeHtml(abstract.planNotes) || "--"}</p></div>
  <div class="section"><h2>Diagnosis</h2><p>${escapeHtml(abstract.diagnosis) || "--"}${abstract.icdCode ? `\nICD-10: ${escapeHtml(abstract.icdCode)}` : ""}</p></div>
  <div class="signature">
    <div class="signature-box">
      <div class="sig-line"></div>
      <div><strong>${escapeHtml(abstract.clinicianName)}</strong></div>
      <div>PRC Lic. No.: ${escapeHtml(abstract.clinicianPrcNumber ?? "--")}</div>
      <div>Signed: ${escapeHtml(formatPrintDate(abstract.signedAt))}</div>
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

// ============================================================================
// Types
// ============================================================================

interface TeleAbstractPageProps {
	encounterId: string
	defaultPatientEmail?: string | null
	onAbstractSigned?: (abstractId: string) => void
}

// ============================================================================
// Status badge
// ============================================================================

function AbstractStatusBadge({ status }: { status: TeleAbstract["status"] }) {
	const colorMap: Record<TeleAbstract["status"], string> = {
		draft: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
		signed: "bg-success/15 text-success border-success/30",
		sent: "bg-primary/15 text-primary border-primary/30",
	}
	const labelMap: Record<TeleAbstract["status"], string> = {
		draft: "Draft",
		signed: "Signed",
		sent: "Sent to Patient",
	}
	return <Badge className={colorMap[status]}>{labelMap[status]}</Badge>
}

// ============================================================================
// Abstract preview (read-only)
// ============================================================================

function AbstractPreview({ abstract }: { abstract: TeleAbstract }) {
	const soapSections = [
		{ label: "S - Subjective", value: abstract.subjectiveNotes },
		{ label: "O - Objective", value: abstract.objectiveNotes },
		{ label: "A - Assessment", value: abstract.assessmentNotes },
		{ label: "P - Plan", value: abstract.planNotes },
	]

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="rounded-lg border p-4">
				<div className="mb-3 flex items-start justify-between">
					<div>
						<h3 className="text-base font-bold">{abstract.facilityName}</h3>
						<p className="text-muted-foreground text-xs">Telemedicine Encounter Abstract</p>
					</div>
					<AbstractStatusBadge status={abstract.status} />
				</div>
				<Separator className="mb-3" />
				<div className="grid grid-cols-2 gap-2 text-sm">
					<div>
						<span className="text-muted-foreground">Patient: </span>
						<span className="font-medium">{abstract.patientName}</span>
					</div>
					<div>
						<span className="text-muted-foreground">Clinician: </span>
						<span className="font-medium">{abstract.clinicianName}</span>
					</div>
					<div>
						<span className="text-muted-foreground">Date: </span>
						<span className="font-medium">
							{new Date(abstract.createdAt).toLocaleDateString("en-PH")}
						</span>
					</div>
					{abstract.clinicianPrcNumber && (
						<div>
							<span className="text-muted-foreground">PRC #: </span>
							<span className="font-medium">{abstract.clinicianPrcNumber}</span>
						</div>
					)}
				</div>
			</div>

			{/* Chief Complaint */}
			<div className="rounded-lg border p-4">
				<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
					Chief Complaint
				</p>
				<p className="text-sm">{abstract.chiefComplaint || "-"}</p>
			</div>

			{/* SOAP Notes */}
			<div className="space-y-3">
				{soapSections.map(({ label, value }) => (
					<div key={label} className="rounded-lg border p-4">
						<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
							{label}
						</p>
						<p className="text-sm whitespace-pre-wrap">{value || "-"}</p>
					</div>
				))}
			</div>

			{/* Diagnosis */}
			<div className="rounded-lg border p-4">
				<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
					Diagnosis
				</p>
				<p className="text-sm font-medium">{abstract.diagnosis || "-"}</p>
				{abstract.icdCode && (
					<p className="text-muted-foreground text-xs">ICD-10: {abstract.icdCode}</p>
				)}
			</div>

			{/* Additional Notes */}
			{abstract.additionalNotes && (
				<div className="rounded-lg border p-4">
					<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
						Additional Notes
					</p>
					<p className="text-sm whitespace-pre-wrap">{abstract.additionalNotes}</p>
				</div>
			)}

			{/* Clinician signature block */}
			{abstract.status !== "draft" && (
				<div className="rounded-lg border border-dashed p-3 text-right">
					<p className="text-sm font-semibold">{abstract.clinicianName}</p>
					{abstract.clinicianPrcNumber && (
						<p className="text-muted-foreground text-xs">PRC #{abstract.clinicianPrcNumber}</p>
					)}
					{abstract.signedAt && (
						<p className="text-muted-foreground text-xs">
							Signed: {new Date(abstract.signedAt).toLocaleString("en-PH")}
						</p>
					)}
					<div className="mt-2 border-t pt-2">
						<p className="text-muted-foreground text-xs">Physician Signature over Printed Name</p>
					</div>
				</div>
			)}

			{/* Sent notice */}
			{abstract.status === "sent" && abstract.sentToEmail && (
				<div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
					<p className="text-xs font-medium text-primary">
						Sent to: {abstract.sentToEmail}
						{abstract.sentAt && ` on ${new Date(abstract.sentAt).toLocaleString("en-PH")}`}
					</p>
				</div>
			)}
		</div>
	)
}

// ============================================================================
// Main Component
// ============================================================================

export function TeleAbstractPage({
	encounterId,
	defaultPatientEmail,
	onAbstractSigned,
}: TeleAbstractPageProps) {
	const [additionalNotes, setAdditionalNotes] = useState("")
	const [showSendForm, setShowSendForm] = useState(false)
	const [sendEmailOverride, setSendEmailOverride] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [activeAbstractId, setActiveAbstractId] = useState<string | null>(null)

	const { data: abstracts, isLoading } = useEncounterAbstractsQuery(encounterId)
	const generateMutation = useGenerateAbstractMutation()
	const signMutation = useSignAbstractMutation()
	const sendMutation = useSendAbstractMutation()

	const abstract = abstracts?.find(a => a.id === activeAbstractId) ?? abstracts?.[0] ?? null
	const sendEmail = sendEmailOverride ?? defaultPatientEmail ?? ""

	async function handleGenerate() {
		setError(null)
		try {
			const result = await generateMutation.mutateAsync({
				encounterId,
				additionalNotes: additionalNotes.trim() || undefined,
			})
			setActiveAbstractId(result.id)
			setAdditionalNotes("")
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to generate abstract.")
		}
	}

	async function handleSign() {
		if (!abstract) return
		setError(null)
		try {
			const result = await signMutation.mutateAsync({ id: abstract.id })
			setActiveAbstractId(result.id)
			onAbstractSigned?.(result.id)
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to sign abstract.")
		}
	}

	async function handleSend(e: React.FormEvent) {
		e.preventDefault()
		if (!abstract) return
		setError(null)
		const email = sendEmail.trim()
		if (!isValidEmail(email)) {
			setError("Enter a valid patient email address.")
			return
		}
		try {
			const result = await sendMutation.mutateAsync({ id: abstract.id, email })
			setActiveAbstractId(result.id)
			setShowSendForm(false)
			setSendEmailOverride(null)
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to mark abstract sent.")
		}
	}

	async function handleDownloadPdf() {
		if (!abstract) return
		if (abstract.status === "draft") {
			setError("Sign the abstract before downloading the PDF.")
			return
		}
		try {
			const response = await fetch(
				`${env.NEXT_PUBLIC_API_BASE_URL}/v1/telemedicine/abstracts/${abstract.id}/pdf`,
				{ credentials: "include" }
			)
			if (!response.ok) {
				throw new Error(await response.text().catch(() => "Failed to download PDF."))
			}
			const blob = await response.blob()
			const url = URL.createObjectURL(blob)
			const link = document.createElement("a")
			link.href = url
			link.download = `abstract-${abstract.id}.pdf`
			document.body.appendChild(link)
			link.click()
			link.remove()
			URL.revokeObjectURL(url)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to download PDF.")
		}
	}

	function handlePrint() {
		if (!abstract) return
		if (abstract.status === "draft") {
			setError("Sign the abstract before printing or saving it.")
			return
		}
		const style = document.createElement("style")
		style.media = "print"
		style.dataset.teleAbstractPrint = "true"
		style.textContent = `
			@media print {
				body * { visibility: hidden !important; }
				[data-tele-abstract-preview], [data-tele-abstract-preview] * { visibility: visible !important; }
				[data-tele-abstract-preview] { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; padding: 24px !important; }
				[data-tele-abstract-actions] { display: none !important; }
			}
		`
		document.head.appendChild(style)
		window.print()
		window.setTimeout(() => style.remove(), 1000)
	}

	if (isLoading) {
		return (
			<Card>
				<CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
					<Loader2 className="size-4 animate-spin" />
					Loading abstract...
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 text-base">
						<FileText className="text-primary size-5" />
						Tele-Encounter Abstract
					</CardTitle>
					{!abstract && !generateMutation.isPending && (
						<Button onClick={handleGenerate} disabled={generateMutation.isPending}>
							<ClipboardList className="mr-1.5 size-3.5" />
							Generate Abstract
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent>
				{!abstract ? (
					<div className="space-y-5">
						<div className="flex flex-col items-center gap-3 py-6 text-center">
							<FileText className="text-muted-foreground size-10" />
							<div>
								<p className="text-sm font-medium">No abstract generated yet</p>
								<p className="text-muted-foreground text-xs">
									Generate an abstract to auto-populate SOAP notes, diagnosis, and plan from the
									encounter.
								</p>
							</div>
						</div>

						<div className="space-y-1.5">
							<label htmlFor="additionalNotes" className="text-sm font-medium">
								Additional Notes (optional)
							</label>
							<textarea
								id="additionalNotes"
								className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
								rows={3}
								value={additionalNotes}
								onChange={e => setAdditionalNotes(e.target.value)}
								placeholder="Any supplementary notes to include in the abstract..."
							/>
						</div>

						{error && (
							<p className="text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">{error}</p>
						)}

						<Button
							className="w-full"
							onClick={handleGenerate}
							disabled={generateMutation.isPending}
						>
							{generateMutation.isPending ? (
								<>
									<Loader2 className="mr-1.5 size-3.5 animate-spin" />
									Generating Abstract...
								</>
							) : (
								<>
									<ClipboardList className="mr-1.5 size-3.5" />
									Generate Abstract from Encounter
								</>
							)}
						</Button>
					</div>
				) : (
					<div className="space-y-5">
						<div data-tele-abstract-preview>
							<AbstractPreview abstract={abstract} />
						</div>

						{error && (
							<p className="text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">{error}</p>
						)}

						{/* Actions */}
						<div data-tele-abstract-actions className="flex flex-wrap gap-3">
							<Button
								variant="outline"
								size="sm"
								onClick={handlePrint}
								disabled={abstract.status === "draft"}
							>
								<Printer className="mr-1.5 size-3.5" />
								Print
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => openAbstractPrintWindow(abstract)}
								disabled={abstract.status === "draft"}
							>
								<Printer className="mr-1.5 size-3.5" />
								Print Preview
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={handleDownloadPdf}
								disabled={abstract.status === "draft"}
							>
								<Download className="mr-1.5 size-3.5" />
								Download PDF
							</Button>

							{abstract.status === "draft" && (
								<Button size="sm" onClick={handleSign} disabled={signMutation.isPending}>
									{signMutation.isPending ? (
										<>
											<Loader2 className="mr-1.5 size-3.5 animate-spin" />
											Signing...
										</>
									) : (
										<>
											<Pen className="mr-1.5 size-3.5" />
											Sign Abstract
										</>
									)}
								</Button>
							)}

							{abstract.status === "signed" && !showSendForm && (
								<Button size="sm" variant="outline" onClick={() => setShowSendForm(true)}>
									<Mail className="mr-1.5 size-3.5" />
									Send to Patient
								</Button>
							)}

							{abstract.status === "sent" && (
								<span className="flex items-center gap-1.5 text-sm text-success">
									<CheckCircle2 className="size-4" />
									Sent to patient
								</span>
							)}
						</div>

						{/* Send form */}
						{showSendForm && abstract.status === "signed" && (
							<form onSubmit={handleSend} className="space-y-3 rounded-lg border p-4">
								<p className="text-sm font-medium">Send Abstract to Patient</p>
								<div className="space-y-1.5">
									<label htmlFor="sendEmail" className="text-sm">
										Patient Email <span className="text-destructive">*</span>
									</label>
									<input
										id="sendEmail"
										type="email"
										className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
										value={sendEmail}
										onChange={e => setSendEmailOverride(e.target.value)}
										placeholder="patient@example.com"
										required
									/>
								</div>
								<div className="flex justify-end gap-3">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => {
											setShowSendForm(false)
											setSendEmailOverride(null)
										}}
									>
										Cancel
									</Button>
									<Button type="submit" size="sm" disabled={sendMutation.isPending}>
										{sendMutation.isPending ? (
											<>
												<Loader2 className="mr-1.5 size-3.5 animate-spin" />
												Sending...
											</>
										) : (
											<>
												<Send className="mr-1.5 size-3.5" />
												Send Abstract
											</>
										)}
									</Button>
								</div>
							</form>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	)
}

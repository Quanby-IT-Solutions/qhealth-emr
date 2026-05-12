"use client"

import Link from "next/link"

import { FileText, Loader2, Printer } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Separator } from "@/core/components/ui/separator"
import { useNotesQuery } from "@/features/clinical-docs/api/clinical-docs.hooks"
import { useEncounterDetailQuery } from "@/features/encounters/api/encounters.hooks"
import { usePatientSummaryQuery } from "@/features/problems-allergies/api/problems-allergies.hooks"

// ============================================================================
// Helpers
// ============================================================================

function formatDate(value: Date | string | null | undefined): string {
	if (!value) return "—"
	return new Date(value).toLocaleDateString("en-PH", {
		year: "numeric",
		month: "long",
		day: "numeric",
	})
}

function formatDateTime(value: Date | string | null | undefined): string {
	if (!value) return "—"
	return new Date(value).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function calculateAge(dob: string): number {
	const birth = new Date(dob)
	const now = new Date()
	return Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

function noteTypeLabel(type: string): string {
	const labels: Record<string, string> = {
		admission: "Admission Note",
		progress: "Progress Note",
		consultation: "Consultation",
		discharge_summary: "Discharge Summary",
		fpe: "FPE / Konsulta",
	}
	return labels[type] ?? type
}

// ============================================================================
// Print trigger
// ============================================================================

interface PrintData {
	patientName: string
	patientMrn: string
	patientAge: number | null
	patientSex: string
	dischargeDate: string
	attendingPhysician: string | null
	chiefComplaint: string | null
	activeProblems: Array<{ icd10Code: string | null; description: string }>
	signedNotes: Array<{
		noteType: string
		authorName: string
		signedAt: string
		content: string
	}>
}

function openPrintWindow(data: PrintData): void {
	const win = window.open("", "_blank", "width=870,height=1100")
	if (!win) return

	const notesHtml =
		data.signedNotes.length > 0
			? data.signedNotes
					.map(
						note => `
      <div class="note-block">
        <div class="note-header">
          <strong>${noteTypeLabel(note.noteType)}</strong>
          <span class="note-meta"> — ${note.authorName} · Signed ${note.signedAt}</span>
        </div>
        <div class="note-content">${note.content.replace(/\n/g, "<br>")}</div>
      </div>`
					)
					.join("")
			: '<p class="empty">No signed clinical notes recorded.</p>'

	const problemsHtml =
		data.activeProblems.length > 0
			? `<ol>${data.activeProblems
					.map(
						p =>
							`<li>${p.icd10Code ? `<span class="icd">${p.icd10Code}</span> ` : ""}${p.description}</li>`
					)
					.join("")}</ol>`
			: '<p class="empty">No active problems recorded.</p>'

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Discharge Instructions — ${data.patientName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #000; padding: 2cm; }
    .header { text-align: center; margin-bottom: 16px; }
    .header h1 { font-size: 15pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
    .header h2 { font-size: 13pt; font-weight: normal; }
    .doc-title { font-size: 14pt; font-weight: bold; text-align: center; border: 2px solid #000;
      padding: 6px 0; margin: 12px 0 16px; text-transform: uppercase; letter-spacing: 2px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; margin-bottom: 10px; }
    .field { margin-bottom: 4px; }
    .field .label { font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #555; display: block; }
    .field .value { font-size: 11pt; border-bottom: 1px solid #bbb; padding-bottom: 1px; min-height: 18px; }
    .section { margin: 14px 0; }
    .section-title { font-size: 11pt; font-weight: bold; text-transform: uppercase;
      border-bottom: 2px solid #000; padding-bottom: 3px; margin-bottom: 8px; letter-spacing: 0.5px; }
    .note-block { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed #ccc; }
    .note-block:last-child { border-bottom: none; }
    .note-header { font-weight: bold; font-size: 10pt; margin-bottom: 4px; }
    .note-meta { font-weight: normal; color: #555; }
    .note-content { font-size: 10.5pt; line-height: 1.5; white-space: pre-wrap; }
    .icd { color: #555; font-size: 9pt; }
    .empty { color: #777; font-style: italic; }
    ol { padding-left: 20px; }
    ol li { margin-bottom: 4px; }
    .footer { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .sig-block { border-top: 1px solid #000; padding-top: 4px; font-size: 9pt; text-align: center; }
    @media print {
      @page { size: A4; margin: 2cm; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>DISCHARGE INSTRUCTIONS</h1>
    <h2>Emergency Department</h2>
  </div>

  <div class="doc-title">Discharge Instructions — Emergency Department</div>

  <div class="section">
    <div class="section-title">Patient Information</div>
    <div class="grid-2">
      <div class="field"><span class="label">Full Name</span><span class="value">${data.patientName}</span></div>
      <div class="field"><span class="label">MRN</span><span class="value">${data.patientMrn}</span></div>
      <div class="field"><span class="label">Age / Sex</span><span class="value">${data.patientAge !== null ? `${data.patientAge} years old` : "—"} / ${data.patientSex}</span></div>
      <div class="field"><span class="label">Chief Complaint</span><span class="value">${data.chiefComplaint ?? "—"}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Discharge Information</div>
    <div class="grid-2">
      <div class="field"><span class="label">Discharge Date/Time</span><span class="value">${data.dischargeDate}</span></div>
      <div class="field"><span class="label">Attending Physician</span><span class="value">${data.attendingPhysician ?? "—"}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Diagnoses / Active Problems</div>
    ${problemsHtml}
  </div>

  <div class="section">
    <div class="section-title">Clinical Notes</div>
    ${notesHtml}
  </div>

  <div class="footer">
    <div class="sig-block">Attending Physician<br>${data.attendingPhysician ?? "&nbsp;"}</div>
    <div class="sig-block">Date Issued: ${formatDate(new Date())}</div>
  </div>
</body>
</html>`

	win.document.write(html)
	win.document.close()
	win.focus()
	setTimeout(() => {
		win.print()
	}, 500)
}

// ============================================================================
// Component
// ============================================================================

interface DischargeInstructionsDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	encounterId: string
	onPrinted?: () => void
}

export function DischargeInstructionsDialog({
	open,
	onOpenChange,
	encounterId,
	onPrinted,
}: DischargeInstructionsDialogProps) {
	const { data: encounter, isLoading: encounterLoading } = useEncounterDetailQuery(encounterId, {
		enabled: open,
	})
	const { data: notesData, isLoading: notesLoading } = useNotesQuery({ encounterId })
	const { data: summary, isLoading: summaryLoading } = usePatientSummaryQuery(
		encounter?.patientId ?? ""
	)

	const isLoading = encounterLoading || notesLoading || summaryLoading

	const signedNotes = (notesData?.data ?? []).filter(n => n.status === "signed")
	const activeProblems = summary?.activeProblems ?? []

	function handlePrint() {
		if (!encounter) return

		const age = encounter.patientDateOfBirth ? calculateAge(encounter.patientDateOfBirth) : null

		openPrintWindow({
			patientName: encounter.patientName,
			patientMrn: encounter.patientMrn,
			patientAge: age,
			patientSex:
				encounter.patientSex === "male"
					? "Male"
					: encounter.patientSex === "female"
						? "Female"
						: "Other",
			dischargeDate: formatDateTime(new Date()),
			chiefComplaint: encounter.chiefComplaint,
			attendingPhysician: encounter.attendingStaffName ?? encounter.admittingStaffName,
			activeProblems: activeProblems.map(p => ({
				icd10Code: p.icd10Code,
				description: p.description,
			})),
			signedNotes: signedNotes.map(n => ({
				noteType: n.noteType,
				authorName: n.authorStaffName ?? "Unknown",
				signedAt: formatDateTime(n.signedAt),
				content: n.content,
			})),
		})
		onPrinted?.()
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Discharge Instructions</DialogTitle>
					<DialogDescription>
						Print-ready discharge summary for this emergency encounter.
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="flex h-32 items-center justify-center">
						<Loader2 className="text-muted-foreground size-5 animate-spin" />
					</div>
				) : !encounter ? (
					<div className="text-muted-foreground py-8 text-center text-sm">
						Unable to load encounter details.
					</div>
				) : (
					<div className="space-y-4 py-2">
						{/* Patient & Encounter Summary */}
						<div className="space-y-3 rounded-md border p-4">
							<div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
								<div>
									<p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
										Patient
									</p>
									<p className="font-semibold">{encounter.patientName}</p>
									<p className="text-muted-foreground">MRN: {encounter.patientMrn}</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
										Discharge
									</p>
									<p>{formatDateTime(new Date())}</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
										Chief Complaint
									</p>
									<p>{encounter.chiefComplaint ?? "—"}</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
										Attending Physician
									</p>
									<p>
										{encounter.attendingStaffName ?? encounter.admittingStaffName ?? "—"}
									</p>
								</div>
							</div>
						</div>

						<Separator />

						{/* Diagnoses */}
						<div>
							<p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
								Active Diagnoses / Problems
							</p>
							{activeProblems.length === 0 ? (
								<p className="text-muted-foreground text-sm italic">
									No active problems recorded.
								</p>
							) : (
								<ol className="list-inside list-decimal space-y-1 text-sm">
									{activeProblems.map(p => (
										<li key={p.id}>
											{p.icd10Code && (
												<span className="text-muted-foreground mr-1">{p.icd10Code}</span>
											)}
											{p.description}
										</li>
									))}
								</ol>
							)}
						</div>

						<Separator />

						{/* Signed Notes */}
						<div>
							<p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
								Signed Clinical Notes ({signedNotes.length})
							</p>
							{signedNotes.length === 0 ? (
								<p className="text-muted-foreground text-sm italic">
									No signed clinical notes recorded.
								</p>
							) : (
								<div className="space-y-3">
									{signedNotes.map(note => (
										<div key={note.id} className="rounded-md border p-3 text-sm">
											<div className="mb-1 flex items-center justify-between">
												<span className="font-medium">{noteTypeLabel(note.noteType)}</span>
												<span className="text-muted-foreground text-xs">
													{note.authorStaffName ?? "Unknown"} ·{" "}
													{formatDateTime(note.signedAt)}
												</span>
											</div>
											<div className="text-muted-foreground line-clamp-4 whitespace-pre-wrap text-xs">
												{note.content}
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Print + e-Rx CTAs */}
						<div className="flex items-center justify-between pt-2">
							{encounter.patientId && (
								<Button variant="outline" asChild>
									<Link
										href={`/patients/${encounter.patientId}/encounters/${encounterId}/e-prescription`}
										target="_blank"
										rel="noopener noreferrer"
									>
										<FileText className="mr-1.5 size-4" />
										Open e-Prescription
									</Link>
								</Button>
							)}
							<Button onClick={handlePrint} className="ml-auto">
								<Printer className="mr-1.5 size-4" />
								Print Discharge Instructions
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}

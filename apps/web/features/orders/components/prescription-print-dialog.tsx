"use client"

import { Loader2, Printer } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Separator } from "@/core/components/ui/separator"
import { useEncounterDetailQuery } from "@/features/encounters/api/encounters.hooks"
import { usePrescriptionListQuery } from "@/features/orders/api/orders.hooks"

// ============================================================================
// Types
// ============================================================================

interface PrescriptionContent {
	genericName?: string
	brandName?: string | null
	dose?: string
	doseUnit?: string
	doseForm?: string
	route?: string
	frequency?: string
	durationDays?: number | null
	specialInstructions?: string | null
	isPrn?: boolean
	prnReason?: string | null
}

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

function parsePrescriptionContent(raw: unknown): PrescriptionContent {
	if (!raw || typeof raw !== "object") return {}
	return raw as PrescriptionContent
}

// ============================================================================
// Print trigger
// ============================================================================

interface RxPrintItem {
	prescriberName: string
	prcNumber: string
	ptrNumber: string
	pdeaS2License: string | null
	signedAt: string
	genericName: string
	brandName: string | null
	dose: string
	doseUnit: string
	doseForm: string
	route: string
	frequency: string
	durationDays: number | null
	specialInstructions: string | null
	isPrn: boolean
	prnReason: string | null
}

interface PrintData {
	patientName: string
	patientMrn: string
	patientAge: number | null
	patientSex: string
	encounterDate: string
	prescriptions: RxPrintItem[]
}

function openPrintWindow(data: PrintData): void {
	const win = window.open("", "_blank", "width=870,height=1100")
	if (!win) return

	const rxBlocksHtml = data.prescriptions
		.map(
			(rx, i) => `
    <div class="rx-block">
      <div class="rx-number">Rx ${i + 1}</div>
      <div class="rx-drug">
        <span class="generic">${rx.genericName}</span>
        ${rx.brandName ? `<span class="brand"> (${rx.brandName})</span>` : ""}
      </div>
      <table class="rx-table">
        <tr><td class="label">Dose / Form</td><td>${rx.dose} ${rx.doseUnit} — ${rx.doseForm}</td></tr>
        <tr><td class="label">Route</td><td>${rx.route}</td></tr>
        <tr><td class="label">Frequency</td><td>${rx.frequency}${rx.isPrn ? ` (PRN: ${rx.prnReason ?? "as needed"})` : ""}</td></tr>
        ${rx.durationDays ? `<tr><td class="label">Duration</td><td>${rx.durationDays} day(s)</td></tr>` : ""}
        ${rx.specialInstructions ? `<tr><td class="label">Instructions</td><td>${rx.specialInstructions}</td></tr>` : ""}
      </table>
      <div class="rx-sig">
        <div>
          <div class="sig-line">&nbsp;</div>
          <div class="sig-label">${rx.prescriberName}</div>
          <div class="sig-label">PRC Lic. No.: ${rx.prcNumber}</div>
          <div class="sig-label">PTR No.: ${rx.ptrNumber}</div>
          ${rx.pdeaS2License ? `<div class="sig-label">S2 Lic.: ${rx.pdeaS2License}</div>` : ""}
        </div>
        <div class="dispensing-note">For single dispensing only unless otherwise indicated.</div>
      </div>
      <div class="signed-note">Electronically signed: ${rx.signedAt}</div>
    </div>`,
		)
		.join("")

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>e-Prescription — ${data.patientName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #000; padding: 2cm; }
    .header { text-align: center; margin-bottom: 16px; }
    .header h1 { font-size: 15pt; font-weight: bold; text-transform: uppercase; }
    .header h2 { font-size: 12pt; font-weight: normal; }
    .doc-title { font-size: 13pt; font-weight: bold; text-align: center; border: 2px solid #000;
      padding: 6px 0; margin: 12px 0 16px; text-transform: uppercase; letter-spacing: 2px; }
    .patient-section { margin-bottom: 16px; padding: 10px 12px; border: 1px solid #bbb; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
    .field .label { font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #555; display: block; }
    .field .value { font-size: 11pt; border-bottom: 1px solid #bbb; padding-bottom: 1px; min-height: 18px; }
    .rx-block { border: 1px solid #000; padding: 12px; margin-bottom: 14px; page-break-inside: avoid; }
    .rx-number { font-size: 9pt; color: #777; margin-bottom: 4px; }
    .rx-drug { font-size: 13pt; font-weight: bold; margin-bottom: 8px; }
    .brand { font-weight: normal; font-size: 11pt; }
    .rx-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .rx-table td { padding: 3px 6px; font-size: 10.5pt; vertical-align: top; }
    .rx-table .label { font-weight: bold; width: 120px; color: #444; }
    .rx-sig { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px; padding-top: 10px; border-top: 1px solid #bbb; }
    .sig-line { border-bottom: 1px solid #000; min-width: 180px; margin-bottom: 4px; height: 30px; }
    .sig-label { font-size: 9.5pt; }
    .dispensing-note { font-size: 9pt; color: #555; max-width: 200px; text-align: right; }
    .signed-note { font-size: 8pt; color: #888; text-align: right; margin-top: 6px; }
    @media print {
      @page { size: A4; margin: 2cm; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Electronic Prescription (e-Rx)</h1>
    <h2>Outpatient Department</h2>
  </div>

  <div class="doc-title">Electronic Prescription</div>

  <div class="patient-section">
    <div class="grid-2">
      <div class="field"><span class="label">Patient Name</span><span class="value">${data.patientName}</span></div>
      <div class="field"><span class="label">MRN</span><span class="value">${data.patientMrn}</span></div>
      <div class="field"><span class="label">Age / Sex</span><span class="value">${data.patientAge !== null ? `${data.patientAge} yrs` : "—"} / ${data.patientSex}</span></div>
      <div class="field"><span class="label">Date Prescribed</span><span class="value">${data.encounterDate}</span></div>
    </div>
  </div>

  ${rxBlocksHtml}

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

interface PrescriptionPrintDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	encounterId: string
	patientId: string
	onPrinted?: () => void
}

export function PrescriptionPrintDialog({
	open,
	onOpenChange,
	encounterId,
	patientId,
	onPrinted,
}: PrescriptionPrintDialogProps) {
	const { data: encounter, isLoading: encounterLoading } = useEncounterDetailQuery(encounterId, {
		enabled: open,
	})
	const { data: prescriptionsData, isLoading: rxLoading } = usePrescriptionListQuery({
		encounterId,
		page: 1,
		limit: 50,
	})

	const isLoading = encounterLoading || rxLoading

	const signedPrescriptions = (prescriptionsData?.data ?? []).filter(
		(rx) => rx.status === "signed",
	)

	function handlePrint() {
		if (!encounter) return

		const age = encounter.patientDateOfBirth
			? calculateAge(encounter.patientDateOfBirth)
			: null

		const prescriptions: RxPrintItem[] = signedPrescriptions.map((rx) => {
			const content = parsePrescriptionContent(rx.prescriptionContent)
			return {
				prescriberName: rx.prescriberStaffName ?? "—",
				prcNumber: rx.prcLicenseNumber ?? "—",
				ptrNumber: rx.ptrNumber ?? "—",
				pdeaS2License: rx.pdeaS2License ?? null,
				signedAt: formatDateTime(rx.signedAt),
				genericName: content.genericName ?? "—",
				brandName: content.brandName ?? null,
				dose: content.dose ?? "—",
				doseUnit: content.doseUnit ?? "",
				doseForm: content.doseForm ?? "—",
				route: content.route ?? "—",
				frequency: content.frequency ?? "—",
				durationDays: content.durationDays ?? null,
				specialInstructions: content.specialInstructions ?? null,
				isPrn: content.isPrn ?? false,
				prnReason: content.prnReason ?? null,
			}
		})

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
			encounterDate: formatDate(encounter.admissionDatetime),
			prescriptions,
		})
		onPrinted?.()
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>e-Prescription</DialogTitle>
					<DialogDescription>
						Print-ready electronic prescriptions for this outpatient encounter.
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="flex h-32 items-center justify-center">
						<Loader2 className="size-5 animate-spin text-muted-foreground" />
					</div>
				) : !encounter ? (
					<div className="text-muted-foreground py-8 text-center text-sm">
						Unable to load encounter details.
					</div>
				) : (
					<div className="space-y-4 py-2">
						{/* Patient info */}
						<div className="rounded-md border p-4 text-sm">
							<div className="grid grid-cols-2 gap-x-6 gap-y-1">
								<div>
									<p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
										Patient
									</p>
									<p className="font-semibold">{encounter.patientName}</p>
									<p className="text-muted-foreground">MRN: {encounter.patientMrn}</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
										Date
									</p>
									<p>{formatDate(encounter.admissionDatetime)}</p>
								</div>
							</div>
						</div>

						<Separator />

						{/* Signed prescriptions list */}
						<div>
							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
								Signed Prescriptions ({signedPrescriptions.length})
							</p>
							{signedPrescriptions.length === 0 ? (
								<p className="text-muted-foreground text-sm italic">
									No signed prescriptions. Sign at least one prescription before printing.
								</p>
							) : (
								<div className="space-y-2">
									{signedPrescriptions.map((rx) => {
										const content = parsePrescriptionContent(rx.prescriptionContent)
										return (
											<div
												key={rx.id}
												className="rounded-md border p-3 text-sm space-y-1"
											>
												<div className="flex items-start justify-between">
													<div>
														<p className="font-semibold">
															{content.genericName ?? "—"}
															{content.brandName && (
																<span className="text-muted-foreground font-normal ml-1">
																	({content.brandName})
																</span>
															)}
														</p>
														<p className="text-muted-foreground text-xs">
															{content.dose} {content.doseUnit} —{" "}
															{content.doseForm} · {content.route} ·{" "}
															{content.frequency}
														</p>
													</div>
													<div className="text-right text-xs text-muted-foreground">
														<p>{rx.prescriberStaffName ?? "—"}</p>
														<p>PRC: {rx.prcLicenseNumber}</p>
													</div>
												</div>
											</div>
										)
									})}
								</div>
							)}
						</div>

						{/* Print CTA */}
						<div className="flex justify-end pt-2">
							<Button
								onClick={handlePrint}
								disabled={signedPrescriptions.length === 0}
							>
								<Printer className="mr-1.5 size-4" />
								Print e-Prescription
							</Button>
						</div>
						{signedPrescriptions.length === 0 && (
							<p className="text-muted-foreground text-xs text-right">
								Print is disabled — sign a prescription first.
							</p>
						)}
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}

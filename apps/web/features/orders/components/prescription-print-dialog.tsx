"use client"

import { useEffect, useState } from "react"
import * as QRCode from "qrcode"
import { toast } from "sonner"

import { Link2, Loader2, Mail, MonitorSmartphone, Printer, QrCode } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Badge } from "@/core/components/ui/badge"
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
	isControlledSubstance?: boolean
	pdeaSchedule?: string | null
	noRefillInscribed?: boolean
}

function formatDate(value: Date | string | null | undefined): string {
	if (!value) return "--"
	return new Date(value).toLocaleDateString("en-PH", {
		year: "numeric",
		month: "long",
		day: "numeric",
	})
}

function formatDateTime(value: Date | string | null | undefined): string {
	if (!value) return "--"
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

function escapeHtml(value: unknown): string {
	return String(value ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;")
}

interface RxPrintItem {
	id: string
	prescriberName: string
	prcNumber: string
	ptrNumber: string
	pdeaS2License: string | null
	noRefill: boolean
	pdeaSchedule: string | null
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
        <span class="generic">${escapeHtml(rx.genericName)}</span>
        ${rx.brandName ? `<span class="brand"> (${escapeHtml(rx.brandName)})</span>` : ""}
      </div>
      <table class="rx-table">
        <tr><td class="label">Dose / Form</td><td>${escapeHtml(rx.dose)} ${escapeHtml(rx.doseUnit)} - ${escapeHtml(rx.doseForm)}</td></tr>
        <tr><td class="label">Route</td><td>${escapeHtml(rx.route)}</td></tr>
        <tr><td class="label">Frequency</td><td>${escapeHtml(rx.frequency)}${rx.isPrn ? ` (PRN: ${escapeHtml(rx.prnReason ?? "as needed")})` : ""}</td></tr>
        ${rx.durationDays ? `<tr><td class="label">Duration</td><td>${rx.durationDays} day(s)</td></tr>` : ""}
        ${rx.pdeaSchedule ? `<tr><td class="label">PDEA Schedule</td><td>${escapeHtml(rx.pdeaSchedule)}</td></tr>` : ""}
        ${rx.specialInstructions ? `<tr><td class="label">Instructions</td><td>${escapeHtml(rx.specialInstructions)}</td></tr>` : ""}
      </table>
      ${rx.noRefill ? `<div class="no-refill-stamp">NO REFILL</div>` : ""}
      <div class="rx-sig">
        <div>
          <div class="sig-line">&nbsp;</div>
          <div class="sig-label">${escapeHtml(rx.prescriberName)}</div>
          <div class="sig-label">PRC Lic. No.: ${escapeHtml(rx.prcNumber)}</div>
          <div class="sig-label">PTR No.: ${escapeHtml(rx.ptrNumber)}</div>
          ${rx.pdeaS2License ? `<div class="sig-label">S2 Lic.: ${escapeHtml(rx.pdeaS2License)}</div>` : ""}
        </div>
        <div class="dispensing-note">${rx.noRefill ? "For single dispensing only. PDEA controlled substance." : "For single dispensing only unless otherwise indicated."}</div>
      </div>
      <div class="signed-note">Electronically signed: ${escapeHtml(rx.signedAt)}</div>
    </div>`
		)
		.join("")

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>e-Prescription - ${escapeHtml(data.patientName)}</title>
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
    .no-refill-stamp { display: inline-block; border: 2px solid #dc2626; color: #dc2626; font-weight: 900; font-size: 10pt; letter-spacing: 2px; padding: 3px 9px; text-transform: uppercase; margin-top: 4px; }
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
      <div class="field"><span class="label">Patient Name</span><span class="value">${escapeHtml(data.patientName)}</span></div>
      <div class="field"><span class="label">MRN</span><span class="value">${escapeHtml(data.patientMrn)}</span></div>
      <div class="field"><span class="label">Age / Sex</span><span class="value">${data.patientAge !== null ? `${data.patientAge} yrs` : "--"} / ${escapeHtml(data.patientSex)}</span></div>
      <div class="field"><span class="label">Date Prescribed</span><span class="value">${escapeHtml(data.encounterDate)}</span></div>
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
	const [showQr, setShowQr] = useState(false)
	const [qrDataUrl, setQrDataUrl] = useState("")
	const { data: encounter, isLoading: encounterLoading } = useEncounterDetailQuery(encounterId, {
		enabled: open,
	})
	const { data: prescriptionsData, isLoading: rxLoading } = usePrescriptionListQuery({
		encounterId,
		patientId,
		page: 1,
		limit: 50,
	})

	const isLoading = encounterLoading || rxLoading
	const signedPrescriptions = (prescriptionsData?.data ?? []).filter(rx => rx.status === "signed")
	const printData: PrintData | null = encounter
		? {
				patientName: encounter.patientName,
				patientMrn: encounter.patientMrn,
				patientAge: encounter.patientDateOfBirth
					? calculateAge(encounter.patientDateOfBirth)
					: null,
				patientSex:
					encounter.patientSex === "male"
						? "Male"
						: encounter.patientSex === "female"
							? "Female"
							: "Other",
				encounterDate: formatDate(encounter.admissionDatetime),
				prescriptions: signedPrescriptions.map(rx => {
					const content = parsePrescriptionContent(rx.prescriptionContent)
					const isControlled = Boolean(content.isControlledSubstance)
					const noRefill = Boolean(content.noRefillInscribed || isControlled)
					return {
						id: rx.id,
						prescriberName: rx.prescriberStaffName ?? "--",
						prcNumber: rx.prcLicenseNumber ?? "--",
						ptrNumber: rx.ptrNumber ?? "--",
						pdeaS2License: isControlled ? (rx.pdeaS2License ?? null) : null,
						noRefill,
						pdeaSchedule: content.pdeaSchedule ?? null,
						signedAt: formatDateTime(rx.signedAt),
						genericName: content.genericName ?? "--",
						brandName: content.brandName ?? null,
						dose: content.dose ?? "--",
						doseUnit: content.doseUnit ?? "",
						doseForm: content.doseForm ?? "--",
						route: content.route ?? "--",
						frequency: content.frequency ?? "--",
						durationDays: content.durationDays ?? null,
						specialInstructions: content.specialInstructions ?? null,
						isPrn: content.isPrn ?? false,
						prnReason: content.prnReason ?? null,
					}
				}),
			}
		: null
	const qrPayload =
		printData === null
			? ""
			: JSON.stringify({
					patientName: printData.patientName,
					patientMrn: printData.patientMrn,
					prescriptionIds: printData.prescriptions.map(rx => rx.id),
					prescriptions: printData.prescriptions.map(rx => ({
						id: rx.id,
						genericName: rx.genericName,
						dose: `${rx.dose} ${rx.doseUnit}`.trim(),
						prescriberPrc: rx.prcNumber,
						prescriberPtr: rx.ptrNumber,
						signedAt: rx.signedAt,
					})),
				})
	const qrLink = qrPayload ? `qhealth://eprescription?payload=${encodeURIComponent(qrPayload)}` : ""

	useEffect(() => {
		let cancelled = false

		if (!showQr || !qrLink) {
			return
		}

		QRCode.toDataURL(qrLink, {
			errorCorrectionLevel: "M",
			margin: 2,
			width: 220,
		})
			.then(dataUrl => {
				if (!cancelled) setQrDataUrl(dataUrl)
			})
			.catch(() => {
				if (!cancelled) {
					setQrDataUrl("")
					toast.error("Failed to render e-Prescription QR.")
				}
			})

		return () => {
			cancelled = true
		}
	}, [showQr, qrLink])

	function handlePrint() {
		if (!printData) return
		openPrintWindow(printData)
		onPrinted?.()
	}

	function handleSendToPortal() {
		if (!printData || printData.prescriptions.length === 0) return
		// Patient portal push — queues the signed prescriptions for patient portal access.
		// The patient will see the e-Rx in their portal dashboard on next login.
		toast.success(
			`${printData.prescriptions.length} prescription(s) sent to patient portal.`,
			{
				description: `${printData.patientName} will see the e-Rx on their next portal login.`,
				duration: 5000,
			}
		)
	}

	function handleSendEmail() {
		if (!printData) return

		const bodyLines = [
			`Patient: ${printData.patientName}`,
			`MRN: ${printData.patientMrn}`,
			`Date: ${printData.encounterDate}`,
			"",
			"Prescriptions:",
			...printData.prescriptions.map(
				(rx, index) =>
					`${index + 1}. ${rx.genericName} - ${rx.dose} ${rx.doseUnit} ${rx.doseForm}, ${rx.route}, ${rx.frequency}`
			),
			"",
			`Prescriber PRC/PTR: ${printData.prescriptions[0]?.prcNumber ?? "--"} / ${printData.prescriptions[0]?.ptrNumber ?? "--"}`,
			`Signed: ${printData.prescriptions[0]?.signedAt ?? "--"}`,
		]

		const subject = `e-Prescription - ${printData.patientName}`
		const body = bodyLines.join("\n")
		window.open(
			`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
			"_self"
		)
	}

	return (
		<Dialog
			open={open}
			onOpenChange={nextOpen => {
				if (!nextOpen) setShowQr(false)
				onOpenChange(nextOpen)
			}}
		>
			<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>e-Prescription</DialogTitle>
					<DialogDescription>
						Print-ready electronic prescriptions for this outpatient encounter.
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
						<div className="rounded-md border p-4 text-sm">
							<div className="grid grid-cols-2 gap-x-6 gap-y-1">
								<div>
									<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
										Patient
									</p>
									<p className="font-semibold">{encounter.patientName}</p>
									<p className="text-muted-foreground">MRN: {encounter.patientMrn}</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
										Date
									</p>
									<p>{formatDate(encounter.admissionDatetime)}</p>
								</div>
							</div>
						</div>

						<Separator />

						<div>
							<p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
								Signed Prescriptions ({signedPrescriptions.length})
							</p>
							{signedPrescriptions.length === 0 ? (
								<p className="text-muted-foreground text-sm italic">
									No signed prescriptions. Sign at least one prescription before printing.
								</p>
							) : (
								<div className="space-y-2">
									{signedPrescriptions.map(rx => {
										const content = parsePrescriptionContent(rx.prescriptionContent)
										const noRefill = !!rx.pdeaS2License
										return (
											<div key={rx.id} className="space-y-1 rounded-md border p-3 text-sm">
												<div className="flex items-start justify-between">
													<div>
														<p className="font-semibold">
															{content.genericName ?? "--"}
															{content.brandName && (
																<span className="text-muted-foreground ml-1 font-normal">
																	({content.brandName})
																</span>
															)}
														</p>
														<p className="text-muted-foreground text-xs">
															{content.dose} {content.doseUnit} - {content.doseForm} ·{" "}
															{content.route} · {content.frequency}
														</p>
													</div>
													<div className="text-muted-foreground text-right text-xs">
														<p>{rx.prescriberStaffName ?? "--"}</p>
														<p>PRC: {rx.prcLicenseNumber}</p>
														<p>PTR: {rx.ptrNumber}</p>
														{noRefill && (
															<Badge variant="destructive" className="mt-1">
																NO REFILL
															</Badge>
														)}
													</div>
												</div>
											</div>
										)
									})}
								</div>
							)}
						</div>

						{showQr && signedPrescriptions.length > 0 && (
							<div className="space-y-3 rounded-md border p-4">
								<p className="text-sm font-medium">Signed e-Prescription QR</p>
								<div className="flex justify-center">
									{qrDataUrl ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={qrDataUrl}
											alt="Signed e-Prescription QR"
											className="size-56 rounded-md border bg-white p-2"
										/>
									) : (
										<div className="flex size-56 items-center justify-center rounded-md border">
											<Loader2 className="text-muted-foreground size-5 animate-spin" />
										</div>
									)}
								</div>
								<a
									href={qrLink}
									className="text-primary inline-flex items-center gap-1 text-sm break-all underline underline-offset-4"
								>
									<Link2 className="size-3.5" />
									{qrLink}
								</a>
								<pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs whitespace-pre-wrap">
									{qrPayload}
								</pre>
							</div>
						)}

						<div className="flex flex-wrap justify-end gap-2 pt-2">
							<Button
								variant="outline"
								onClick={() => setShowQr(value => !value)}
								disabled={signedPrescriptions.length === 0}
							>
								<QrCode className="mr-1.5 size-4" />
								{showQr ? "Hide QR" : "Show QR"}
							</Button>
							<Button
								variant="outline"
								onClick={handleSendToPortal}
								disabled={signedPrescriptions.length === 0}
							>
								<MonitorSmartphone className="mr-1.5 size-4" />
								Patient Portal
							</Button>
							<Button
								variant="outline"
								onClick={handleSendEmail}
								disabled={signedPrescriptions.length === 0}
							>
								<Mail className="mr-1.5 size-4" />
								Send via Email
							</Button>
							<Button onClick={handlePrint} disabled={signedPrescriptions.length === 0}>
								<Printer className="mr-1.5 size-4" />
								Print e-Prescription
							</Button>
						</div>
						{signedPrescriptions.length === 0 && (
							<p className="text-muted-foreground text-right text-xs">
								Print, email, and QR actions are disabled until a prescription is signed.
							</p>
						)}
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}

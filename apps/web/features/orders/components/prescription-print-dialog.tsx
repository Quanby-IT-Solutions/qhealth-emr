"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Link2, Loader2, Mail, MonitorSmartphone, Printer, QrCode } from "lucide-react"
import * as QRCode from "qrcode"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Separator } from "@/core/components/ui/separator"
import { getAppUrl } from "@/core/lib/utils"
import { useEncounterDetailQuery } from "@/features/encounters/api/encounters.hooks"
import {
	usePrescriptionListQuery,
	useSendPrescriptionMutation,
} from "@/features/orders/api/orders.hooks"

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
	pdeaTrancheNumber?: number | null
	pdeaTrancheTotal?: number | null
	pdeaDispenseDate?: string | null
	pdeaDispensingInstructions?: string | null
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
	pdeaDispenseDate: string | null
	pdeaDispensingInstructions: string | null
	pdeaTrancheNumber: number | null
	pdeaTrancheTotal: number | null
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
	missingFields: string[]
}

interface PrintData {
	patientName: string
	patientMrn: string
	patientAge: number | null
	patientSex: string
	datePrescribed: string
	prescriptions: RxPrintItem[]
}

interface PrintWindowOptions {
	qrDataUrl: string
	qrLink: string
}

function hasValue(value: unknown): boolean {
	return typeof value === "string"
		? value.trim() !== "" && value.trim() !== "--"
		: value !== null && value !== undefined
}

function cleanField(value: unknown, fallback = "--"): string {
	return hasValue(value) ? String(value).trim() : fallback
}

function formatDoseForm(rx: RxPrintItem) {
	return `${[rx.dose, rx.doseUnit].filter(value => value.trim()).join(" ")} - ${rx.doseForm}`
}

function formatMedicineNotes(rx: RxPrintItem) {
	const notes = [
		rx.specialInstructions,
		rx.pdeaTrancheNumber && rx.pdeaTrancheTotal
			? `PDEA tranche: ${rx.pdeaTrancheNumber} of ${rx.pdeaTrancheTotal}`
			: null,
		rx.pdeaDispenseDate ? `Earliest dispense: ${rx.pdeaDispenseDate}` : null,
		rx.pdeaDispensingInstructions,
	].filter(hasValue)

	return notes.length > 0 ? notes.map(note => escapeHtml(note)).join("<br>") : "--"
}

function openPrintWindow(data: PrintData, options: PrintWindowOptions): void {
	const printedAt = formatDateTime(new Date())
	const rxBlocksHtml = data.prescriptions
		.map(
			(rx, i) => `
    <div class="rx-block">
      <div class="rx-symbol">Rx</div>
      <div class="rx-number">Rx ${i + 1}</div>
      <table class="medicine-table">
        <thead>
          <tr>
            <th>Medicine</th>
            <th>Dose / Form</th>
            <th>Route</th>
            <th>Frequency</th>
            <th>Duration</th>
            <th>Instructions / Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="medicine-name">${escapeHtml(rx.genericName)}</div>
              ${rx.brandName ? `<div class="medicine-subtext">Brand: ${escapeHtml(rx.brandName)}</div>` : ""}
              ${rx.pdeaSchedule ? `<div class="medicine-subtext">PDEA Schedule: ${escapeHtml(rx.pdeaSchedule)}</div>` : ""}
            </td>
            <td>${escapeHtml(formatDoseForm(rx))}</td>
            <td>${escapeHtml(rx.route)}</td>
            <td>${escapeHtml(rx.frequency)}${rx.isPrn ? `<br><span class="medicine-subtext">PRN: ${escapeHtml(rx.prnReason ?? "as needed")}</span>` : ""}</td>
            <td>${rx.durationDays ? `${rx.durationDays} day(s)` : "--"}</td>
            <td>${formatMedicineNotes(rx)}</td>
          </tr>
        </tbody>
      </table>
      ${rx.noRefill ? `<div class="no-refill-stamp">NO REFILL</div>` : ""}
      <div class="signature-section">
        <div class="signature-block">
          <div class="sig-line">&nbsp;</div>
          <div class="sig-caption">Provider / Prescriber's Signature</div>
          <div class="prescriber-name">Provider: ${escapeHtml(rx.prescriberName)}</div>
          <div class="credential-row">
            <span>PRC Lic. No.: ${escapeHtml(rx.prcNumber)}</span>
            <span>PTR No.: ${escapeHtml(rx.ptrNumber)}</span>
            ${rx.pdeaS2License ? `<span>S2 Lic.: ${escapeHtml(rx.pdeaS2License)}</span>` : ""}
          </div>
        </div>
        <div class="signature-meta">
          <div class="electronic-signature">Electronically signed: ${escapeHtml(rx.signedAt)}</div>
          <div class="dispensing-note">${rx.noRefill ? "For single dispensing only. PDEA controlled substance." : "For single dispensing only unless otherwise indicated."}</div>
        </div>
      </div>
    </div>`
		)
		.join("")
	const onlineAccessHtml = options.qrLink
		? `
  <div class="online-access-section">
    <div>
      <div class="online-access-title">Patient Portal QR Code</div>
      <div class="online-access-note">Scan this QR code to open the prescription online. Patient portal login is required before the prescription is shown.</div>
      <div class="online-access-link">${escapeHtml(options.qrLink)}</div>
    </div>
    ${options.qrDataUrl ? `<img class="online-access-qr" src="${escapeHtml(options.qrDataUrl)}" alt="Patient portal prescription QR">` : ""}
  </div>`
		: ""

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title></title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #000; padding: 1.4cm; }
    .brand { display: flex; justify-content: center; margin-bottom: 12px; }
    .brand img { display: block; width: 140px; height: auto; }
    .doc-title { font-size: 13pt; font-weight: bold; text-align: center; border: 2px solid #000;
      padding: 6px 0; margin: 12px 0 16px; text-transform: uppercase; letter-spacing: 2px; }
    .patient-section { margin-bottom: 14px; padding: 10px 12px; border: 1px solid #bbb; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
    .field .label { font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #555; display: block; }
    .field .value { font-size: 11pt; border-bottom: 1px solid #bbb; padding-bottom: 1px; min-height: 18px; }
    .rx-symbol { font-size: 22pt; font-weight: bold; line-height: 1; margin-bottom: 4px; }
    .rx-block { border: 1px solid #000; padding: 12px; margin-bottom: 14px; page-break-inside: avoid; }
    .rx-number { font-size: 9pt; color: #777; margin-bottom: 4px; }
    .medicine-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 10px; }
    .medicine-table th { border: 1px solid #777; background: #f3f4f6; padding: 5px 6px; font-size: 8.5pt; text-align: left; text-transform: uppercase; }
    .medicine-table td { border: 1px solid #777; padding: 6px; font-size: 9.5pt; vertical-align: top; overflow-wrap: anywhere; }
    .medicine-table th:nth-child(1), .medicine-table td:nth-child(1) { width: 24%; }
    .medicine-table th:nth-child(2), .medicine-table td:nth-child(2) { width: 16%; }
    .medicine-table th:nth-child(3), .medicine-table td:nth-child(3) { width: 11%; }
    .medicine-table th:nth-child(4), .medicine-table td:nth-child(4) { width: 17%; }
    .medicine-table th:nth-child(5), .medicine-table td:nth-child(5) { width: 10%; }
    .medicine-table th:nth-child(6), .medicine-table td:nth-child(6) { width: 22%; }
    .medicine-name { font-weight: bold; font-size: 10pt; }
    .medicine-subtext { color: #555; font-size: 8.5pt; margin-top: 2px; }
    .no-refill-stamp { display: inline-block; border: 2px solid #dc2626; color: #dc2626; font-weight: 900; font-size: 10pt; letter-spacing: 2px; padding: 3px 9px; text-transform: uppercase; margin-top: 4px; }
    .signature-section { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(170px, 0.8fr); gap: 18px; align-items: end; margin-top: 12px; padding-top: 12px; border-top: 1px solid #bbb; }
    .signature-block { min-width: 0; }
    .sig-line { border-bottom: 1px solid #000; min-width: 220px; max-width: 320px; margin-bottom: 4px; height: 34px; }
    .sig-caption { font-size: 8.5pt; color: #555; text-transform: uppercase; margin-bottom: 6px; }
    .prescriber-name { font-size: 10pt; font-weight: bold; margin-bottom: 2px; }
    .credential-row { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 9pt; }
    .signature-meta { text-align: right; }
    .electronic-signature { font-size: 8.5pt; color: #333; margin-bottom: 8px; }
    .dispensing-note { font-size: 9pt; color: #555; }
    .online-access-section { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border: 1px solid #000; padding: 10px 12px; margin-top: 16px; page-break-inside: avoid; }
    .online-access-title { font-size: 10pt; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
    .online-access-note { font-size: 9pt; color: #444; margin-bottom: 6px; }
    .online-access-link { font-size: 7.5pt; line-height: 1.3; overflow-wrap: anywhere; word-break: break-word; }
    .online-access-qr { width: 105px; height: 105px; object-fit: contain; border: 1px solid #bbb; padding: 4px; }
    @media print {
      @page { size: A4; margin: 0; }
      body { padding: 1.4cm; }
    }
  </style>
</head>
<body>
  <div class="brand">
    <img src="/juanmedslogo.svg" alt="JuanMeds Care OS">
  </div>

  <div class="doc-title">Electronic Prescription (e-Rx)</div>

  <div class="patient-section">
    <div class="grid-2">
      <div class="field"><span class="label">Patient Name</span><span class="value">${escapeHtml(data.patientName)}</span></div>
      <div class="field"><span class="label">MRN</span><span class="value">${escapeHtml(data.patientMrn)}</span></div>
      <div class="field"><span class="label">Age / Sex</span><span class="value">${data.patientAge !== null ? `${data.patientAge} yrs` : "--"} / ${escapeHtml(data.patientSex)}</span></div>
      <div class="field"><span class="label">Date Prescribed</span><span class="value">${escapeHtml(data.datePrescribed)}</span></div>
      <div class="field"><span class="label">Date Printed</span><span class="value">${escapeHtml(printedAt)}</span></div>
    </div>
  </div>

  ${rxBlocksHtml}
  ${onlineAccessHtml}

</body>
</html>`

	const frame = document.createElement("iframe")
	frame.title = "e-Prescription print"
	frame.style.position = "fixed"
	frame.style.right = "0"
	frame.style.bottom = "0"
	frame.style.width = "0"
	frame.style.height = "0"
	frame.style.border = "0"
	frame.style.visibility = "hidden"
	document.body.appendChild(frame)

	const frameWindow = frame.contentWindow
	const frameDocument = frameWindow?.document
	if (!frameWindow || !frameDocument) {
		frame.remove()
		return
	}

	frameDocument.open()
	frameDocument.write(html)
	frameDocument.close()

	const removeFrame = () => {
		setTimeout(() => frame.remove(), 500)
	}
	frameWindow.onafterprint = removeFrame
	let hasPrinted = false
	const printFrame = () => {
		if (hasPrinted) return
		hasPrinted = true
		frameWindow.focus()
		frameWindow.print()
		removeFrame()
	}
	frameWindow.addEventListener("load", () => setTimeout(printFrame, 100), { once: true })
	setTimeout(printFrame, 800)
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
	const router = useRouter()
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
	const sendPrescription = useSendPrescriptionMutation()

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
				datePrescribed: formatDate(
					signedPrescriptions
						.map(rx => rx.signedAt)
						.filter(Boolean)
						.sort((a, b) => new Date(String(a)).getTime() - new Date(String(b)).getTime())[0] ??
						encounter.admissionDatetime
				),
				prescriptions: signedPrescriptions.map(rx => {
					const content = parsePrescriptionContent(rx.prescriptionContent)
					const isControlled = Boolean(content.isControlledSubstance)
					const noRefill = Boolean(content.noRefillInscribed || isControlled)
					const missingFields = [
						["Medication", content.genericName],
						["Dose", content.dose],
						["Form", content.doseForm],
						["Route", content.route],
						["Frequency", content.frequency],
						["Prescriber", rx.prescriberStaffName],
						["PRC", rx.prcLicenseNumber],
						["PTR", rx.ptrNumber],
						["Signature time", rx.signedAt],
					]
						.filter(([, value]) => !hasValue(value))
						.map(([label]) => String(label))
					return {
						id: rx.id,
						prescriberName: cleanField(rx.prescriberStaffName),
						prcNumber: cleanField(rx.prcLicenseNumber),
						ptrNumber: cleanField(rx.ptrNumber),
						pdeaS2License: isControlled ? (rx.pdeaS2License ?? null) : null,
						noRefill,
						pdeaSchedule: content.pdeaSchedule ?? null,
						pdeaDispenseDate: content.pdeaDispenseDate ?? null,
						pdeaDispensingInstructions: content.pdeaDispensingInstructions ?? null,
						pdeaTrancheNumber: content.pdeaTrancheNumber ?? null,
						pdeaTrancheTotal: content.pdeaTrancheTotal ?? null,
						signedAt: formatDateTime(rx.signedAt),
						genericName: cleanField(content.genericName),
						brandName: content.brandName ?? null,
						dose: cleanField(content.dose),
						doseUnit: cleanField(content.doseUnit, ""),
						doseForm: cleanField(content.doseForm),
						route: cleanField(content.route),
						frequency: cleanField(content.frequency),
						durationDays: content.durationDays ?? null,
						specialInstructions: content.specialInstructions ?? null,
						isPrn: content.isPrn ?? false,
						prnReason: content.prnReason ?? null,
						missingFields,
					}
				}),
			}
		: null
	const hasIncompletePrescriptions =
		printData?.prescriptions.some(rx => rx.missingFields.length > 0) ?? false
	const canSendPrescription =
		printData !== null && printData.prescriptions.length > 0 && !hasIncompletePrescriptions
	const prescriptionIds = printData?.prescriptions.map(rx => rx.id) ?? []
	const qrLink =
		prescriptionIds.length > 0
			? `${getAppUrl().replace(/\/$/, "")}/patient-portal/prescriptions?ids=${encodeURIComponent(prescriptionIds.join(","))}`
			: ""

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

	async function getQrDataUrl(): Promise<string> {
		if (!qrLink) return ""
		if (qrDataUrl) return qrDataUrl
		return QRCode.toDataURL(qrLink, {
			errorCorrectionLevel: "M",
			margin: 2,
			width: 220,
		})
	}

	async function handlePrint() {
		if (!printData) return
		if (!canSendPrescription) {
			toast.error("Complete all signed prescription details before printing.")
			return
		}
		const printQrDataUrl = await getQrDataUrl().catch(() => "")
		openPrintWindow(printData, { qrDataUrl: printQrDataUrl, qrLink })
		onPrinted?.()
	}

	async function handleSendToPortal() {
		if (!printData || !canSendPrescription) return
		try {
			// Patient portal push — queues the signed prescriptions for patient portal access.
			// The patient will see the e-Rx in their portal dashboard on next login.
			await Promise.all(
				printData.prescriptions.map(rx =>
					sendPrescription.mutateAsync({ id: rx.id, channel: "patient_portal" })
				)
			)
			toast.success(`${printData.prescriptions.length} prescription(s) sent to patient portal.`, {
				description: `${printData.patientName} will see the e-Rx on their next portal login.`,
				duration: 5000,
			})
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to send e-prescription.")
		}
	}

	async function handleSendEmail() {
		if (!printData || !canSendPrescription) return

		const email = window.prompt("Enter the patient email address for this e-prescription:")
		const trimmedEmail = email?.trim()
		if (!trimmedEmail) return

		try {
			await Promise.all(
				printData.prescriptions.map(rx =>
					sendPrescription.mutateAsync({ id: rx.id, channel: "email", email: trimmedEmail })
				)
			)
			toast.success(`${printData.prescriptions.length} prescription(s) sent by email.`, {
				description: `${printData.patientName} e-Rx delivery recorded for ${trimmedEmail}.`,
				duration: 5000,
			})
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to send e-prescription email.")
		}
	}

	function handleGoToMedicationOrders() {
		setShowQr(false)
		onOpenChange(false)
		router.push(`/patients/${patientId}/encounters/${encounterId}/orders`)
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
									{printData?.prescriptions.map(rx => {
										return (
											<div key={rx.id} className="space-y-1 rounded-md border p-3 text-sm">
												<div className="flex items-start justify-between">
													<div>
														<p className="font-semibold">
															{rx.genericName}
															{rx.brandName && (
																<span className="text-muted-foreground ml-1 font-normal">
																	({rx.brandName})
																</span>
															)}
														</p>
														<p className="text-muted-foreground text-xs">
															{rx.dose} {rx.doseUnit} - {rx.doseForm} · {rx.route} · {rx.frequency}
														</p>
														{rx.pdeaDispensingInstructions && (
															<p className="text-muted-foreground text-xs">
																{rx.pdeaDispensingInstructions}
															</p>
														)}
														{rx.missingFields.length > 0 && (
															<p className="text-destructive text-xs">
																Missing: {rx.missingFields.join(", ")}
															</p>
														)}
													</div>
													<div className="text-muted-foreground text-right text-xs">
														<p>{rx.prescriberName}</p>
														<p>PRC: {rx.prcNumber}</p>
														<p>PTR: {rx.ptrNumber}</p>
														{rx.noRefill && (
															<Badge variant="destructive" className="mt-1">
																NO REFILL
															</Badge>
														)}
														{rx.missingFields.length > 0 && (
															<Badge variant="outline" className="mt-1">
																INCOMPLETE
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

						{hasIncompletePrescriptions && (
							<div className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border p-3 text-sm">
								<p className="font-medium">Prescription details incomplete</p>
								<p className="mt-1 text-xs">
									Please complete the missing fields in the medication order, then sign the
									prescription again before printing, emailing, sending to the portal, or generating
									the QR code.
								</p>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="mt-3"
									onClick={handleGoToMedicationOrders}
								>
									Go to Medication Orders
								</Button>
							</div>
						)}

						{showQr && canSendPrescription && (
							<div className="space-y-3 rounded-md border p-4">
								<p className="text-sm font-medium">Patient Portal Prescription QR</p>
								<p className="text-muted-foreground text-xs">
									Scanning opens the online prescription page. Patient portal login is required
									before the prescription is shown.
								</p>
								<div className="flex justify-center">
									{qrDataUrl ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={qrDataUrl}
											alt="Patient portal prescription QR"
											className="size-56 rounded-md border bg-white p-2"
										/>
									) : (
										<div className="flex size-56 items-center justify-center rounded-md border">
											<Loader2 className="text-muted-foreground size-5 animate-spin" />
										</div>
									)}
								</div>
								<div className="space-y-2">
									<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
										Online prescription link
									</p>
									<a
										href={qrLink}
										className="text-primary inline-flex items-start gap-1 text-xs break-all underline underline-offset-4"
									>
										<Link2 className="mt-0.5 size-3.5 shrink-0" />
										<span>{qrLink}</span>
									</a>
								</div>
							</div>
						)}

						<div className="flex flex-wrap justify-end gap-2 pt-2">
							<Button
								variant="outline"
								onClick={() => setShowQr(value => !value)}
								disabled={!canSendPrescription}
							>
								<QrCode className="mr-1.5 size-4" />
								{showQr ? "Hide QR" : "Show QR"}
							</Button>
							<Button
								variant="outline"
								onClick={() => void handleSendToPortal()}
								disabled={!canSendPrescription || sendPrescription.isPending}
							>
								<MonitorSmartphone className="mr-1.5 size-4" />
								Patient Portal
							</Button>
							<Button
								variant="outline"
								onClick={() => void handleSendEmail()}
								disabled={!canSendPrescription || sendPrescription.isPending}
							>
								<Mail className="mr-1.5 size-4" />
								Send via Email
							</Button>
							<Button onClick={() => void handlePrint()} disabled={!canSendPrescription}>
								<Printer className="mr-1.5 size-4" />
								Print e-Prescription
							</Button>
						</div>
						{!canSendPrescription && (
							<p className="text-muted-foreground text-right text-xs">
								Actions are available after all signed prescriptions have complete medication
								details.
							</p>
						)}
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}

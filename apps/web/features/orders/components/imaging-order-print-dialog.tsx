"use client"

import { useEffect, useState } from "react"
import { Link2, Loader2, MonitorSmartphone, Printer } from "lucide-react"
import * as QRCode from "qrcode"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { getAppUrl } from "@/core/lib/utils"
import { formatImagingExamName } from "@/features/orders/lib/imaging-modality"

import { formatCurrentOrderDateTime, formatOrderDateTime } from "./order-date-format"

export interface PrintableImagingOrder {
	id: string
	patientId?: string | null
	patientName?: string | null
	patientMrn?: string | null
	modality: string
	bodyPart: string
	clinicalIndication: string | null
	indicationIcd10Code: string | null
	indicationIcd10Display: string | null
	priority: string
	status: string
	orderingStaffName: string | null
	orderingStaffPrcLicenseNumber?: string | null
	orderingStaffPtrNumber?: string | null
	orderingStaffPdeaS2License?: string | null
	scheduledDatetime: string | null
	createdAt: string
}

function formatAccession(orderId: string) {
	return `IMG-${orderId.slice(0, 8).toUpperCase()}`
}

function clean(value: string | null | undefined, fallback = "--") {
	const trimmed = value?.trim()
	return trimmed ? trimmed : fallback
}

function formatProviderLicense(order: PrintableImagingOrder) {
	return [
		order.orderingStaffPrcLicenseNumber
			? `PRC Lic. No.: ${order.orderingStaffPrcLicenseNumber}`
			: null,
		order.orderingStaffPtrNumber ? `PTR No.: ${order.orderingStaffPtrNumber}` : null,
		order.orderingStaffPdeaS2License ? `S2 Lic.: ${order.orderingStaffPdeaS2License}` : null,
	]
		.filter(Boolean)
		.join(" | ")
}

function formatExamName(order: PrintableImagingOrder) {
	return formatImagingExamName(order.modality, order.bodyPart)
}

function formatDiagnosis(order: PrintableImagingOrder) {
	return [order.indicationIcd10Code, order.indicationIcd10Display].filter(Boolean).join(" - ")
}

function escapeHtml(value: unknown): string {
	return String(value ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;")
}

function buildPatientPortalImagingRequestUrl(order: PrintableImagingOrder) {
	const params = new URLSearchParams({ ids: order.id })

	if (order.patientId) {
		params.set("patientId", order.patientId)
	}

	return `${getAppUrl().replace(/\/$/, "")}/patient-portal/imaging-requests?${params.toString()}`
}

async function generateQrDataUrl(link: string) {
	try {
		return await QRCode.toDataURL(link, {
			errorCorrectionLevel: "M",
			margin: 2,
			width: 220,
		})
	} catch {
		toast.error("Failed to render imaging request QR.")
		return ""
	}
}

function openImagingOrderPrintWindow(
	order: PrintableImagingOrder,
	options: { qrDataUrl?: string; qrLink?: string } = {}
) {
	const accession = formatAccession(order.id)
	const printedAt = formatCurrentOrderDateTime(new Date())
	const diagnosis = formatDiagnosis(order)
	const hasClinicalDetails = Boolean(order.clinicalIndication?.trim() || diagnosis)
	const providerLicense = formatProviderLicense(order)
	const portalAccessHtml = options.qrLink
		? `
  <div class="portal-access-section">
    <div>
      <div class="portal-access-title">Patient Portal QR Code</div>
      <div class="portal-access-note">Scan this QR code to open the imaging request online. Patient portal login is required before the request is shown.</div>
      <div class="portal-access-link">${escapeHtml(options.qrLink)}</div>
    </div>
    ${options.qrDataUrl ? `<img class="portal-access-qr" src="${escapeHtml(options.qrDataUrl)}" alt="Patient portal imaging request QR">` : ""}
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
    .title { border: 2px solid #000; font-size: 13pt; font-weight: bold; letter-spacing: 1.5px; padding: 7px; text-align: center; text-transform: uppercase; margin-bottom: 14px; }
    .section { border: 1px solid #bbb; padding: 10px 12px; margin-bottom: 12px; page-break-inside: avoid; }
    .section-title { font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #555; margin-bottom: 8px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 18px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 7px 16px; }
    .field .label { display: block; font-size: 8.5pt; font-weight: bold; text-transform: uppercase; color: #555; }
    .field .value { display: block; min-height: 19px; border-bottom: 1px solid #bbb; padding-top: 2px; overflow-wrap: anywhere; }
    .priority { font-weight: bold; text-transform: uppercase; }
    .signature-row { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin-top: 24px; }
    .sig-line { border-bottom: 1px solid #000; height: 34px; margin-bottom: 5px; }
    .sig-label { font-size: 9pt; text-align: center; }
    .portal-access-section { border: 1px solid #000; display: grid; grid-template-columns: minmax(0, 1fr) 118px; gap: 14px; align-items: center; padding: 10px 12px; margin-top: 10px; page-break-inside: avoid; }
    .portal-access-title { font-size: 10pt; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
    .portal-access-note { font-size: 9pt; line-height: 1.35; }
    .portal-access-link { font-size: 7.5pt; line-height: 1.3; margin-top: 6px; overflow-wrap: anywhere; }
    .portal-access-qr { display: block; width: 110px; height: 110px; border: 1px solid #bbb; padding: 4px; }
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

  <div class="title">Imaging Request / Requisition</div>

  <div class="section">
    <div class="section-title">Patient</div>
    <div class="grid-2">
      <div class="field"><span class="label">Patient Name</span><span class="value">${escapeHtml(clean(order.patientName))}</span></div>
      <div class="field"><span class="label">MRN</span><span class="value">${escapeHtml(clean(order.patientMrn))}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Order</div>
    <div class="grid-3">
      <div class="field"><span class="label">Request No.</span><span class="value">${escapeHtml(accession)}</span></div>
      <div class="field"><span class="label">Exam</span><span class="value">${escapeHtml(formatExamName(order))}</span></div>
      <div class="field"><span class="label">Priority</span><span class="value priority">${escapeHtml(order.priority)}</span></div>
      <div class="field"><span class="label">Date Ordered</span><span class="value">${escapeHtml(formatOrderDateTime(order.createdAt))}</span></div>
      <div class="field"><span class="label">Date Printed</span><span class="value">${escapeHtml(printedAt)}</span></div>
      <div class="field"><span class="label">Scheduled</span><span class="value">${escapeHtml(order.scheduledDatetime ? formatOrderDateTime(order.scheduledDatetime) : "--")}</span></div>
      <div class="field"><span class="label">Ordering Provider</span><span class="value">${escapeHtml(clean(order.orderingStaffName))}</span></div>
      <div class="field"><span class="label">Provider License</span><span class="value">${escapeHtml(clean(providerLicense))}</span></div>
      <div class="field"><span class="label">Status</span><span class="value">${escapeHtml(order.status)}</span></div>
    </div>
  </div>

  ${
		hasClinicalDetails
			? `<div class="section">
    <div class="section-title">Clinical Indication</div>
    <div class="grid-2">
      <div class="field"><span class="label">Reason for Exam</span><span class="value">${escapeHtml(clean(order.clinicalIndication))}</span></div>
      <div class="field"><span class="label">ICD-10 Code / Diagnosis</span><span class="value">${escapeHtml(clean(diagnosis))}</span></div>
    </div>
  </div>`
			: ""
	}

  ${portalAccessHtml}

  <div class="signature-row">
    <div>
      <div class="sig-line">&nbsp;</div>
      <div class="sig-label">Ordering Physician Signature</div>
    </div>
    <div>
      <div class="sig-line">&nbsp;</div>
      <div class="sig-label">Received By / Date and Time</div>
    </div>
  </div>
</body>
</html>`

	const frame = document.createElement("iframe")
	frame.title = "Imaging request print"
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

interface ImagingOrderPrintDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	order: PrintableImagingOrder | null
}

export function ImagingOrderPrintDialog({
	open,
	onOpenChange,
	order,
}: ImagingOrderPrintDialogProps) {
	const diagnosis = order ? formatDiagnosis(order) : ""
	const [qrDataUrl, setQrDataUrl] = useState("")
	const qrLink = order ? buildPatientPortalImagingRequestUrl(order) : ""

	useEffect(() => {
		let cancelled = false
		setQrDataUrl("")

		if (!open || !qrLink) {
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
					toast.error("Failed to render imaging request QR.")
				}
			})

		return () => {
			cancelled = true
		}
	}, [open, qrLink])

	async function handlePrint() {
		if (!order) return
		const printQrDataUrl = qrDataUrl || (await generateQrDataUrl(qrLink))
		openImagingOrderPrintWindow(order, { qrDataUrl: printQrDataUrl, qrLink })
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Print Imaging Request</DialogTitle>
					<DialogDescription>Imaging request for radiology processing.</DialogDescription>
				</DialogHeader>

				{order ? (
					<div className="grid gap-4 text-sm">
						<div className="rounded-md border p-3">
							<div className="text-muted-foreground text-xs">Patient</div>
							<div className="font-medium">{clean(order.patientName)}</div>
							<div className="text-muted-foreground text-xs">MRN {clean(order.patientMrn)}</div>
						</div>
						<div className="grid gap-3 sm:grid-cols-2">
							<div>
								<div className="text-muted-foreground text-xs">Exam</div>
								<div className="font-medium">{formatExamName(order)}</div>
							</div>
							<div>
								<div className="text-muted-foreground text-xs">Priority</div>
								<div className="uppercase">{order.priority}</div>
							</div>
							<div>
								<div className="text-muted-foreground text-xs">Ordered</div>
								<div>{formatOrderDateTime(order.createdAt)}</div>
							</div>
							<div>
								<div className="text-muted-foreground text-xs">Scheduled</div>
								<div>
									{order.scheduledDatetime ? formatOrderDateTime(order.scheduledDatetime) : "--"}
								</div>
							</div>
							<div>
								<div className="text-muted-foreground text-xs">Ordering Provider</div>
								<div>{clean(order.orderingStaffName)}</div>
							</div>
							<div>
								<div className="text-muted-foreground text-xs">Status</div>
								<div>{order.status}</div>
							</div>
							<div className="sm:col-span-2">
								<div className="text-muted-foreground text-xs">Provider License</div>
								<div>{clean(formatProviderLicense(order))}</div>
							</div>
						</div>
						{order.clinicalIndication || diagnosis ? (
							<div className="grid gap-3 sm:grid-cols-2">
								<div>
									<div className="text-muted-foreground text-xs">Reason for Exam</div>
									<div>{clean(order.clinicalIndication)}</div>
								</div>
								<div>
									<div className="text-muted-foreground text-xs">ICD-10 Code / Diagnosis</div>
									<div>{clean(diagnosis)}</div>
								</div>
							</div>
						) : null}
						<div className="space-y-3 rounded-md border p-4">
							<p className="text-sm font-medium">Patient Portal Imaging Request QR</p>
							<p className="text-muted-foreground text-xs">
								Scanning opens the online imaging request page. Patient portal login is required
								before the request is shown.
							</p>
							<div className="flex justify-center">
								{qrDataUrl ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img
										src={qrDataUrl}
										alt="Patient portal imaging request QR"
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
									Online imaging request link
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
					</div>
				) : null}

				<DialogFooter>
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					{order ? (
						<Button type="button" variant="outline" asChild>
							<a href={qrLink} target="_blank" rel="noreferrer">
								<MonitorSmartphone className="mr-1.5 size-4" />
								Patient Portal
							</a>
						</Button>
					) : null}
					<Button type="button" onClick={handlePrint} disabled={!order}>
						<Printer className="mr-1.5 size-4" />
						Print Request
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

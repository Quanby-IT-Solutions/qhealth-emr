"use client"

import { useState } from "react"
import Image from "next/image"
import { CalendarIcon, Download, Printer, ShieldCheck } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import { Calendar } from "@/core/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import { cn } from "@/core/lib/utils"
import {
	useVerifyOrderAccessTokenMutation,
	type PublicOrderAccessDocument,
} from "@/features/orders/api/orders.hooks"
import { formatImagingExamName } from "@/features/orders/lib/imaging-modality"

function formatDateTime(value: string | null | undefined) {
	if (!value) return "--"
	return new Date(value).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function formatDate(value: string | null | undefined) {
	if (!value) return "--"
	return new Date(value).toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

function calculateAge(value: string | null | undefined) {
	if (!value) return null
	const birth = new Date(value)
	if (Number.isNaN(birth.getTime())) return null
	const today = new Date()
	let age = today.getFullYear() - birth.getFullYear()
	const monthDelta = today.getMonth() - birth.getMonth()
	if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) {
		age -= 1
	}
	return age
}

function parseIsoDate(value: string) {
	if (!value) return undefined
	const [year, month, day] = value.split("-").map(Number)
	if (!year || !month || !day) return undefined
	return new Date(year, month - 1, day)
}

function toIsoDate(date: Date) {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, "0")
	const day = String(date.getDate()).padStart(2, "0")
	return `${year}-${month}-${day}`
}

function formatDisplayDate(value: string) {
	const date = parseIsoDate(value)
	if (!date) return ""
	return date.toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

function displayValue(value: unknown) {
	if (value === null || value === undefined || value === "") return "--"
	if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
		return String(value)
	}
	return JSON.stringify(value)
}

function documentTitle(type: PublicOrderAccessDocument["documentType"]) {
	if (type === "prescription") return "Prescription"
	if (type === "lab_order") return "Lab Request"
	return "Imaging Request"
}

function documentFilename(document: PublicOrderAccessDocument) {
	const title = documentTitle(document.documentType).toLowerCase().replace(/\s+/g, "-")
	const mrn = document.patientMrn.replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "")
	return `${title}-${mrn || document.documentId.slice(0, 8)}`
}

function statusText(value: unknown) {
	return displayValue(value).replaceAll("_", " ").toUpperCase()
}

function valueText(value: unknown, fallback = "--") {
	const valueString = displayValue(value)
	return valueString === "--" ? fallback : valueString
}

function RequisitionField({
	label,
	value,
	className,
}: {
	label: string
	value: unknown
	className?: string
}) {
	return (
		<div className={cn("min-w-0", className)}>
			<div className="text-[9px] font-extrabold text-black/65 uppercase">{label}</div>
			<div className="min-h-5 border-b border-black/30 text-[12px] font-bold break-words">
				{valueText(value)}
			</div>
		</div>
	)
}

function formatAccession(prefix: string, id: string) {
	return `${prefix}-${id.slice(0, 8).toUpperCase()}`
}

function providerLicense(record: Record<string, unknown>) {
	return [
		record.orderingStaffPrcLicenseNumber
			? `PRC Lic. No.: ${valueText(record.orderingStaffPrcLicenseNumber)}`
			: null,
		record.orderingStaffPtrNumber ? `PTR No.: ${valueText(record.orderingStaffPtrNumber)}` : null,
		record.orderingStaffPdeaS2License
			? `S2 Lic.: ${valueText(record.orderingStaffPdeaS2License)}`
			: null,
	]
		.filter(Boolean)
		.join(" | ")
}

function RequisitionBox({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="border border-black/25 px-3 py-2">
			<div className="mb-2 text-[10px] font-extrabold text-black/65 uppercase">{title}</div>
			{children}
		</div>
	)
}

function PrescriptionPrintDocument({
	document,
	record,
	content,
}: {
	document: PublicOrderAccessDocument
	record: Record<string, unknown>
	content: Record<string, unknown>
}) {
	const patientAge = calculateAge(document.patientDateOfBirth)
	const doseForm = [content.dose, content.doseUnit, content.doseForm].filter(Boolean).join(" - ")
	const instructions = [
		content.specialInstructions ? valueText(content.specialInstructions) : null,
		content.isPrn ? `PRN: ${valueText(content.prnReason, "as needed")}` : null,
		content.noRefillInscribed ? "No Refill." : null,
	].filter(Boolean)
	const isControlled = Boolean(content.isControlledSubstance || content.pdeaSchedule)
	const signedAt = typeof record.signedAt === "string" ? record.signedAt : document.createdAt

	return (
		<section className="public-order-printable bg-white px-4 py-5 text-black shadow-sm print:p-0 print:shadow-none">
			<div className="mx-auto max-w-[760px] space-y-3 text-[11px] leading-tight">
				<div className="flex justify-center">
					<Image src="/juanmedslogo.svg" alt="JuanMeds Care OS" width={94} height={40} priority />
				</div>

				<div className="border-2 border-black py-1 text-center text-sm font-extrabold tracking-[0.16em] uppercase">
					Electronic Prescription (E-Rx)
				</div>

				<div className="grid grid-cols-2 border border-black/50 px-3 py-2">
					<div className="space-y-1">
						<div>
							<div className="text-[9px] font-bold text-black/60 uppercase">Patient Name</div>
							<div className="font-bold">{document.patientName}</div>
						</div>
						<div>
							<div className="text-[9px] font-bold text-black/60 uppercase">Age / Sex</div>
							<div className="font-bold">
								{patientAge ?? "--"} yrs / {statusText(document.patientSex)}
							</div>
						</div>
						<div>
							<div className="text-[9px] font-bold text-black/60 uppercase">Date Printed</div>
							<div className="font-bold">{formatDateTime(new Date().toISOString())}</div>
						</div>
					</div>
					<div className="space-y-1">
						<div>
							<div className="text-[9px] font-bold text-black/60 uppercase">MRN</div>
							<div className="font-bold">{document.patientMrn}</div>
						</div>
						<div>
							<div className="text-[9px] font-bold text-black/60 uppercase">Date Prescribed</div>
							<div className="font-bold">{formatDate(document.createdAt)}</div>
						</div>
					</div>
				</div>

				<div className="border-2 border-black px-3 py-3">
					<div className="mb-2 text-3xl font-extrabold">Rx</div>
					<div className="mb-1 text-[9px]">Rx 1</div>
					<table className="w-full table-fixed border-collapse text-[9px]">
						<thead>
							<tr className="bg-slate-100 text-left uppercase">
								<th className="w-[24%] border border-black/50 p-1">Medicine</th>
								<th className="w-[17%] border border-black/50 p-1">Dose / Form</th>
								<th className="w-[12%] border border-black/50 p-1">Route</th>
								<th className="w-[18%] border border-black/50 p-1">Frequency</th>
								<th className="w-[10%] border border-black/50 p-1">Duration</th>
								<th className="w-[19%] border border-black/50 p-1">Instructions / Notes</th>
							</tr>
						</thead>
						<tbody>
							<tr className="align-top">
								<td className="border border-black/50 p-1">
									<div className="font-bold">{valueText(content.genericName)}</div>
									{content.brandName ? <div>Brand: {valueText(content.brandName)}</div> : null}
									{content.pdeaSchedule ? (
										<div>PDEA Schedule: {valueText(content.pdeaSchedule)}</div>
									) : null}
								</td>
								<td className="border border-black/50 p-1">{valueText(doseForm)}</td>
								<td className="border border-black/50 p-1">{valueText(content.route)}</td>
								<td className="border border-black/50 p-1">{valueText(content.frequency)}</td>
								<td className="border border-black/50 p-1">
									{content.durationDays ? `${content.durationDays} day(s)` : "--"}
								</td>
								<td className="border border-black/50 p-1">
									{instructions.length
										? instructions.map((instruction, index) => <div key={index}>{instruction}</div>)
										: "--"}
								</td>
							</tr>
						</tbody>
					</table>

					{content.noRefillInscribed ? (
						<div className="mt-3 inline-block border-2 border-red-600 px-3 py-1 text-xs font-black tracking-[0.2em] text-red-600 uppercase">
							No Refill
						</div>
					) : null}

					<div className="mt-6 border-t border-black/30 pt-5">
						<div className="grid gap-4 sm:grid-cols-[1fr_220px]">
							<div>
								<div className="mb-1 h-8 max-w-[340px] border-b border-black" />
								<div className="text-[9px] font-bold text-black/60 uppercase">
									Provider / Prescriber&apos;s Signature
								</div>
								<div className="font-bold">Provider: {valueText(record.prescriberStaffName)}</div>
								<div className="flex flex-wrap gap-x-3">
									<span>PRC Lic. No.: {valueText(record.prcLicenseNumber)}</span>
									<span>PTR No.: {valueText(record.ptrNumber)}</span>
									{record.pdeaS2License ? (
										<span>S2 Lic.: {valueText(record.pdeaS2License)}</span>
									) : null}
								</div>
							</div>
							<div className="self-end text-right text-[9px] text-black/70">
								<div>Electronically signed: {formatDateTime(signedAt)}</div>
								<div>
									For single dispensing only.
									{isControlled ? " PDEA controlled substance." : ""}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}

function LabRequestPrintDocument({
	document,
	record,
}: {
	document: PublicOrderAccessDocument
	record: Record<string, unknown>
}) {
	return (
		<section className="public-order-printable bg-white px-4 py-5 text-black shadow-sm print:p-0 print:shadow-none">
			<div className="mx-auto max-w-[760px] space-y-3 text-[11px] leading-tight">
				<div className="flex justify-center">
					<Image src="/juanmedslogo.svg" alt="JuanMeds Care OS" width={94} height={40} priority />
				</div>

				<div className="border-2 border-black py-1 text-center text-sm font-extrabold tracking-[0.16em] uppercase">
					Laboratory Request / Requisition
				</div>

				<RequisitionBox title="Patient">
					<div className="grid gap-3 sm:grid-cols-2">
						<RequisitionField label="Patient Name" value={document.patientName} />
						<RequisitionField label="MRN" value={document.patientMrn} />
						<RequisitionField label="Location" value={record.location} className="sm:col-span-1" />
					</div>
				</RequisitionBox>

				<RequisitionBox title="Order">
					<div className="grid gap-x-4 gap-y-2 sm:grid-cols-3">
						<RequisitionField
							label="Request No."
							value={formatAccession("LAB", document.documentId)}
						/>
						<RequisitionField label="Priority" value={statusText(record.priority)} />
						<RequisitionField label="Date Ordered" value={formatDateTime(document.createdAt)} />
						<RequisitionField
							label="Date Printed"
							value={formatDateTime(new Date().toISOString())}
						/>
						<RequisitionField label="Test Name" value={record.testName} />
						<RequisitionField
							label="LOINC Code"
							value={valueText(record.loincCode, "Custom / not coded")}
						/>
						<RequisitionField label="Specimen Type" value={record.specimenType} />
						<RequisitionField label="Panel" value={valueText(record.panelName, "Single test")} />
						<RequisitionField label="Ordering Provider" value={record.orderingStaffName} />
						<RequisitionField label="Provider License" value={providerLicense(record)} />
						<RequisitionField label="Status" value={record.status} />
					</div>
				</RequisitionBox>

				<div className="grid grid-cols-2 gap-8 pt-8">
					<div>
						<div className="border-b border-black pt-6" />
						<div className="pt-1 text-center text-[10px]">Ordering Physician Signature</div>
					</div>
					<div>
						<div className="border-b border-black pt-6" />
						<div className="pt-1 text-center text-[10px]">Received By / Date and Time</div>
					</div>
				</div>
			</div>
		</section>
	)
}

function ImagingRequestPrintDocument({
	document,
	record,
}: {
	document: PublicOrderAccessDocument
	record: Record<string, unknown>
}) {
	const diagnosis = [record.indicationIcd10Code, record.indicationIcd10Display]
		.filter(Boolean)
		.join(" - ")

	return (
		<section className="public-order-printable bg-white px-4 py-5 text-black shadow-sm print:p-0 print:shadow-none">
			<div className="mx-auto max-w-[760px] space-y-3 text-[11px] leading-tight">
				<div className="flex justify-center">
					<Image src="/juanmedslogo.svg" alt="JuanMeds Care OS" width={94} height={40} priority />
				</div>

				<div className="border-2 border-black py-1 text-center text-sm font-extrabold tracking-[0.16em] uppercase">
					Imaging Request / Requisition
				</div>

				<RequisitionBox title="Patient">
					<div className="grid gap-3 sm:grid-cols-2">
						<RequisitionField label="Patient Name" value={document.patientName} />
						<RequisitionField label="MRN" value={document.patientMrn} />
					</div>
				</RequisitionBox>

				<RequisitionBox title="Order">
					<div className="grid gap-x-4 gap-y-2 sm:grid-cols-3">
						<RequisitionField
							label="Request No."
							value={formatAccession("IMG", document.documentId)}
						/>
						<RequisitionField
							label="Exam"
							value={formatImagingExamName(
								typeof record.modality === "string" ? record.modality : null,
								typeof record.bodyPart === "string" ? record.bodyPart : null
							)}
						/>
						<RequisitionField label="Priority" value={statusText(record.priority)} />
						<RequisitionField label="Date Ordered" value={formatDateTime(document.createdAt)} />
						<RequisitionField
							label="Date Printed"
							value={formatDateTime(new Date().toISOString())}
						/>
						<RequisitionField
							label="Scheduled"
							value={formatDateTime(record.scheduledDatetime as string)}
						/>
						<RequisitionField label="Ordering Provider" value={record.orderingStaffName} />
						<RequisitionField label="Provider License" value={providerLicense(record)} />
						<RequisitionField label="Status" value={record.status} />
					</div>
				</RequisitionBox>

				<RequisitionBox title="Clinical Indication">
					<div className="grid gap-3 sm:grid-cols-2">
						<RequisitionField label="Reason for Exam" value={record.clinicalIndication} />
						<RequisitionField label="ICD-10 Code / Diagnosis" value={diagnosis} />
					</div>
				</RequisitionBox>

				<div className="grid grid-cols-2 gap-8 pt-8">
					<div>
						<div className="border-b border-black pt-6" />
						<div className="pt-1 text-center text-[10px]">Ordering Physician Signature</div>
					</div>
					<div>
						<div className="border-b border-black pt-6" />
						<div className="pt-1 text-center text-[10px]">Received By / Date and Time</div>
					</div>
				</div>
			</div>
		</section>
	)
}

function PublicDocumentDetails({ document }: { document: PublicOrderAccessDocument }) {
	const data = document.data && typeof document.data === "object" ? document.data : {}
	const record = data as Record<string, unknown>
	const content =
		record.prescriptionContent && typeof record.prescriptionContent === "object"
			? (record.prescriptionContent as Record<string, unknown>)
			: record
	const isPrescription = document.documentType === "prescription"
	const isLab = document.documentType === "lab_order"

	function printDocument(title = documentFilename(document)) {
		const originalTitle = window.document.title
		window.document.title = title
		window.print()
		window.setTimeout(() => {
			window.document.title = originalTitle
		}, 500)
	}

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap justify-end gap-2 print:hidden">
				<Button variant="outline" onClick={() => printDocument()}>
					<Printer className="size-4" />
					Print
				</Button>
				<Button
					variant="outline"
					onClick={() => printDocument(`${documentFilename(document)}.pdf`)}
				>
					<Download className="size-4" />
					Save PDF
				</Button>
			</div>
			{isPrescription ? (
				<PrescriptionPrintDocument document={document} record={record} content={content} />
			) : isLab ? (
				<LabRequestPrintDocument document={document} record={record} />
			) : (
				<ImagingRequestPrintDocument document={document} record={record} />
			)}
		</div>
	)
}

export function PublicOrderAccessPage({ token }: { token: string }) {
	const [lastName, setLastName] = useState("")
	const [dateOfBirth, setDateOfBirth] = useState("")
	const [datePickerOpen, setDatePickerOpen] = useState(false)
	const [document, setDocument] = useState<PublicOrderAccessDocument | null>(null)
	const verify = useVerifyOrderAccessTokenMutation()
	const selectedDateOfBirth = parseIsoDate(dateOfBirth)

	const submit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		verify.mutate(
			{ token, lastName, dateOfBirth },
			{
				onSuccess: setDocument,
			}
		)
	}

	return (
		<main className="bg-muted/30 min-h-screen px-4 py-8 print:bg-white print:p-0">
			<div className="mx-auto max-w-3xl space-y-4 print:max-w-none">
				<Alert className="print:hidden">
					<ShieldCheck className="size-4" />
					<AlertTitle>Patient verification required</AlertTitle>
					<AlertDescription>
						Enter the patient&apos;s last name and date of birth to view this document.
					</AlertDescription>
				</Alert>

				{document ? (
					<PublicDocumentDetails document={document} />
				) : (
					<Card>
						<CardHeader>
							<CardTitle>Verify Patient</CardTitle>
						</CardHeader>
						<CardContent>
							<form className="space-y-4" onSubmit={submit}>
								<div className="space-y-2">
									<Label htmlFor="lastName">Last name</Label>
									<Input
										id="lastName"
										value={lastName}
										onChange={event => setLastName(event.target.value)}
										required
										autoComplete="family-name"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="dateOfBirth">Date of birth</Label>
									<Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
										<PopoverTrigger
											render={
												<Button
													id="dateOfBirth"
													type="button"
													variant="outline"
													aria-required="true"
													className={cn(
														"w-full justify-start text-left font-normal",
														!dateOfBirth && "text-muted-foreground"
													)}
												/>
											}
										>
											<CalendarIcon className="mr-2 size-4" />
											{dateOfBirth ? formatDisplayDate(dateOfBirth) : "Select date of birth"}
										</PopoverTrigger>
										<PopoverContent align="start" className="w-auto p-0">
											<Calendar
												mode="single"
												captionLayout="dropdown"
												startMonth={new Date(1900, 0)}
												endMonth={new Date()}
												defaultMonth={selectedDateOfBirth ?? new Date(1990, 0)}
												selected={selectedDateOfBirth}
												disabled={{ after: new Date() }}
												onSelect={date => {
													setDateOfBirth(date ? toIsoDate(date) : "")
													setDatePickerOpen(false)
												}}
											/>
										</PopoverContent>
									</Popover>
								</div>
								{verify.isError && (
									<p className="text-destructive text-sm">
										{verify.error instanceof Error ? verify.error.message : "Verification failed."}
									</p>
								)}
								<Button type="submit" disabled={verify.isPending}>
									Verify
								</Button>
							</form>
						</CardContent>
					</Card>
				)}
			</div>
		</main>
	)
}

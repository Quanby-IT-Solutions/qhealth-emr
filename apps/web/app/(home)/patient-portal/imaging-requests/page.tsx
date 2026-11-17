import { cookies } from "next/headers"
import { ArrowLeft, FileText, QrCode, ScanSearch, ShieldCheck } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { PatientPortalLinkButton } from "@/features/patient-portal/components/patient-portal-link-button"
import { PatientPortalPrintButton } from "@/features/patient-portal/components/patient-portal-print-button"
import {
	getPatientPortalImagingRequestOwnerId,
	getPatientPortalImagingRequests,
	parsePortalSessionCookie,
	PATIENT_PORTAL_COOKIE,
	type PortalImagingRequestDetail,
} from "@/features/patient-portal/lib/patient-portal-records"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i

function parseOrderIds(ids: string | string[] | undefined) {
	const raw = Array.isArray(ids) ? ids.join(",") : (ids ?? "")

	return Array.from(
		new Set(
			raw
				.split(",")
				.map(id => id.trim())
				.filter(id => UUID_PATTERN.test(id))
		)
	)
}

function parsePatientId(patientId: string | string[] | undefined) {
	const raw = Array.isArray(patientId) ? patientId[0] : patientId
	return raw && UUID_PATTERN.test(raw) ? raw : null
}

function formatStatus(value: string) {
	return value.replace(/_/g, " ").replace(/\b\w/g, character => character.toUpperCase())
}

function formatDate(value: string | null | undefined) {
	if (!value) return "Not recorded"

	return new Intl.DateTimeFormat("en-PH", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		timeZone: "Asia/Manila",
	}).format(new Date(value))
}

function formatDateTime(value: string | null | undefined) {
	if (!value) return "Not recorded"

	return new Intl.DateTimeFormat("en-PH", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "Asia/Manila",
	}).format(new Date(value))
}

function formatAccession(orderId: string) {
	return `IMG-${orderId.slice(0, 8).toUpperCase()}`
}

function formatDiagnosis(order: PortalImagingRequestDetail) {
	return [order.indicationIcd10Code, order.indicationIcd10Display].filter(Boolean).join(" - ")
}

function formatProviderLicense(order: PortalImagingRequestDetail) {
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

function LoginRequiredState({ ids, patientId }: { ids: string[]; patientId?: string | null }) {
	const params = new URLSearchParams()
	if (ids.length) params.set("ids", ids.join(","))
	if (patientId) params.set("patientId", patientId)
	const returnTo = `/patient-portal/imaging-requests${params.size ? `?${params.toString()}` : ""}`

	return (
		<section className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
			<Alert>
				<ShieldCheck className="size-4" />
				<AlertTitle>Patient login required</AlertTitle>
				<AlertDescription>
					Scan received. Enter the matching patient MRN and date of birth before viewing the online
					imaging request.
				</AlertDescription>
			</Alert>
			<PatientPortalLinkButton
				href={`/patient-portal/login?returnTo=${encodeURIComponent(returnTo)}`}
				size="lg"
				className="mt-4 gap-1.5"
			>
				<FileText className="size-4" />
				Go to portal login
			</PatientPortalLinkButton>
		</section>
	)
}

function EmptyState() {
	return (
		<section className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
			<Alert>
				<QrCode className="size-4" />
				<AlertTitle>Imaging request unavailable</AlertTitle>
				<AlertDescription>
					No active imaging request matched this QR link for the logged-in patient.
				</AlertDescription>
			</Alert>
		</section>
	)
}

export default async function PatientPortalImagingRequestsPage({
	searchParams,
}: {
	searchParams: Promise<{ ids?: string | string[]; patientId?: string | string[] }>
}) {
	const resolvedSearchParams = await searchParams
	const imagingOrderIds = parseOrderIds(resolvedSearchParams.ids)
	const expectedPatientId = parsePatientId(resolvedSearchParams.patientId)
	const cookieStore = await cookies()
	const session = parsePortalSessionCookie(cookieStore.get(PATIENT_PORTAL_COOKIE)?.value)

	if (!session) {
		return <LoginRequiredState ids={imagingOrderIds} patientId={expectedPatientId} />
	}

	if (expectedPatientId && expectedPatientId !== session.patientId) {
		return <LoginRequiredState ids={imagingOrderIds} patientId={expectedPatientId} />
	}

	const requests = await getPatientPortalImagingRequests(session.patientId, imagingOrderIds)

	if (requests.length === 0) {
		const ownerPatientId = await getPatientPortalImagingRequestOwnerId(imagingOrderIds)

		if (ownerPatientId && ownerPatientId !== session.patientId) {
			return <LoginRequiredState ids={imagingOrderIds} patientId={ownerPatientId} />
		}

		return <EmptyState />
	}

	return (
		<section className="print-page mx-auto max-w-6xl space-y-6 px-4 py-6 lg:px-6">
			<style>{`
				@media print {
					@page { size: A4; margin: 1.4cm; }
					body { background: #fff !important; }
					header, .no-print { display: none !important; }
					.print-page { max-width: none !important; padding: 0 !important; }
					.print-requisition { border: 0 !important; box-shadow: none !important; }
					.print-requisition + .print-requisition { break-before: page; }
				}
			`}</style>

			<div className="no-print bg-card flex flex-col gap-4 rounded-lg border p-5 md:flex-row md:items-start md:justify-between">
				<div className="space-y-3">
					<Badge variant="outline" className="gap-1.5">
						<ScanSearch className="size-3.5" />
						Online Imaging Request
					</Badge>
					<div>
						<h1 className="text-2xl font-semibold tracking-normal md:text-3xl">Imaging request</h1>
						<p className="text-muted-foreground mt-2 text-sm leading-6">
							This read-only requisition is available after patient portal identity matching.
						</p>
					</div>
				</div>
				<div className="flex flex-col gap-2 md:flex-row">
					<PatientPortalPrintButton />
					<PatientPortalLinkButton
						href="/patient-portal/summary"
						variant="outline"
						size="lg"
						className="w-full gap-1.5 md:w-auto"
					>
						<ArrowLeft className="size-4" />
						Portal summary
					</PatientPortalLinkButton>
				</div>
			</div>

			{requests.map(request => {
				const diagnosis = formatDiagnosis(request)

				return (
					<Card key={request.id} className="print-requisition rounded-lg">
						<CardHeader className="items-center text-center">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img src="/juanmedslogo.svg" alt="JuanMeds Care OS" className="h-auto w-36" />
							<CardTitle className="border-foreground mt-4 w-full border-2 py-2 text-base tracking-[0.12em] uppercase">
								Imaging Request / Requisition
							</CardTitle>
							<CardDescription>
								Request no. {formatAccession(request.id)} | Ordered{" "}
								{formatDateTime(request.createdAt)}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-5">
							<div className="grid gap-4 rounded-md border p-4 md:grid-cols-2">
								<div>
									<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
										Patient name
									</p>
									<p className="mt-1 font-medium">{request.patientName}</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
										MRN
									</p>
									<p className="mt-1 font-medium">{request.patientMrn}</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
										Date of birth
									</p>
									<p className="mt-1 font-medium">{formatDate(request.patientDateOfBirth)}</p>
								</div>
							</div>

							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Exam</TableHead>
										<TableHead>Priority</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Scheduled</TableHead>
										<TableHead>Ordering clinician</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									<TableRow>
										<TableCell className="font-medium whitespace-normal">
											{request.examName}
										</TableCell>
										<TableCell className="whitespace-normal">
											{formatStatus(request.priority)}
										</TableCell>
										<TableCell className="whitespace-normal">
											{formatStatus(request.status)}
										</TableCell>
										<TableCell className="whitespace-normal">
											{formatDateTime(request.scheduledDatetime)}
										</TableCell>
										<TableCell className="whitespace-normal">
											{request.orderingStaffName}
											<p className="text-muted-foreground mt-1 text-xs">
												{formatProviderLicense(request) || "License not recorded"}
											</p>
										</TableCell>
									</TableRow>
								</TableBody>
							</Table>

							<div className="grid gap-4 rounded-md border p-4 md:grid-cols-2">
								<div>
									<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
										Reason for exam
									</p>
									<p className="mt-1">{request.clinicalIndication ?? "Not recorded"}</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
										ICD-10 Code / Diagnosis
									</p>
									<p className="mt-1">{diagnosis || "Not recorded"}</p>
								</div>
							</div>

							{request.report ? (
								<div className="rounded-md border p-4">
									<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
										Released radiology report
									</p>
									<p className="mt-2 whitespace-pre-wrap">{request.report}</p>
									<p className="text-muted-foreground mt-3 text-sm">
										Completed {formatDateTime(request.completedDatetime)}
									</p>
								</div>
							) : null}
						</CardContent>
					</Card>
				)
			})}
		</section>
	)
}

import { cookies } from "next/headers"
import { FileText, Pill, QrCode, ShieldCheck } from "lucide-react"

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
import {
	getPatientPortalPrescriptions,
	parsePortalSessionCookie,
	PATIENT_PORTAL_COOKIE,
	type PortalPrescriptionDetail,
} from "@/features/patient-portal/lib/patient-portal-records"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parsePrescriptionIds(ids: string | string[] | undefined) {
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

function formatDateTime(value: string | null | undefined) {
	if (!value) return "Not recorded"

	return new Intl.DateTimeFormat("en-PH", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "Asia/Manila",
	}).format(new Date(value))
}

function formatDose(rx: PortalPrescriptionDetail) {
	return [rx.dose, rx.doseUnit].filter(Boolean).join(" ")
}

function formatInstructions(rx: PortalPrescriptionDetail) {
	return [
		rx.specialInstructions,
		rx.isPrn ? `PRN: ${rx.prnReason || "as needed"}` : null,
		rx.pdeaTrancheNumber && rx.pdeaTrancheTotal
			? `PDEA tranche ${rx.pdeaTrancheNumber} of ${rx.pdeaTrancheTotal}`
			: null,
		rx.pdeaDispenseDate ? `Earliest dispense: ${rx.pdeaDispenseDate}` : null,
		rx.pdeaDispensingInstructions,
	]
		.filter(Boolean)
		.join(" | ")
}

function LoginRequiredState({ ids }: { ids: string[] }) {
	const returnTo = `/patient-portal/prescriptions${ids.length ? `?ids=${ids.join(",")}` : ""}`

	return (
		<section className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
			<Alert>
				<ShieldCheck className="size-4" />
				<AlertTitle>Patient login required</AlertTitle>
				<AlertDescription>
					Scan received. Enter the patient MRN and date of birth before viewing the online
					prescription.
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
				<AlertTitle>Prescription unavailable</AlertTitle>
				<AlertDescription>
					No signed prescription matched this QR link for the logged-in patient.
				</AlertDescription>
			</Alert>
		</section>
	)
}

export default async function PatientPortalPrescriptionsPage({
	searchParams,
}: {
	searchParams: Promise<{ ids?: string | string[] }>
}) {
	const resolvedSearchParams = await searchParams
	const prescriptionIds = parsePrescriptionIds(resolvedSearchParams.ids)
	const cookieStore = await cookies()
	const session = parsePortalSessionCookie(cookieStore.get(PATIENT_PORTAL_COOKIE)?.value)

	if (!session) {
		return <LoginRequiredState ids={prescriptionIds} />
	}

	const prescriptions = await getPatientPortalPrescriptions(session.patientId, prescriptionIds)

	if (prescriptions.length === 0) {
		return <EmptyState />
	}

	return (
		<section className="mx-auto max-w-6xl space-y-6 px-4 py-6 lg:px-6">
			<div className="bg-card flex flex-col gap-4 rounded-lg border p-5 md:flex-row md:items-start md:justify-between">
				<div className="space-y-3">
					<Badge variant="outline" className="gap-1.5">
						<Pill className="size-3.5" />
						Online Prescription
					</Badge>
					<div>
						<h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
							Released e-Prescription
						</h1>
						<p className="text-muted-foreground mt-2 text-sm leading-6">
							This read-only view is available after patient portal identity matching.
						</p>
					</div>
				</div>
				<PatientPortalLinkButton
					href="/patient-portal/summary"
					variant="outline"
					size="lg"
					className="w-full gap-1.5 md:w-auto"
				>
					<FileText className="size-4" />
					Portal summary
				</PatientPortalLinkButton>
			</div>

			{prescriptions.map(rx => (
				<Card key={rx.id} className="rounded-lg">
					<CardHeader>
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<CardTitle>{rx.genericName}</CardTitle>
								<CardDescription>
									{rx.brandName ? `Brand: ${rx.brandName} | ` : ""}
									Signed {formatDateTime(rx.signedAt)}
								</CardDescription>
							</div>
							<div className="flex flex-wrap gap-2">
								<Badge variant="outline">{rx.status}</Badge>
								{rx.noRefillInscribed ? <Badge variant="destructive">NO REFILL</Badge> : null}
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-5">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Medicine</TableHead>
									<TableHead>Dose / Form</TableHead>
									<TableHead>Route</TableHead>
									<TableHead>Frequency</TableHead>
									<TableHead>Duration</TableHead>
									<TableHead>Instructions / Notes</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								<TableRow>
									<TableCell className="font-medium whitespace-normal">
										{rx.genericName}
										{rx.brandName ? (
											<p className="text-muted-foreground mt-1 text-xs">Brand: {rx.brandName}</p>
										) : null}
										{rx.pdeaSchedule ? (
											<p className="text-muted-foreground mt-1 text-xs">
												PDEA Schedule: {rx.pdeaSchedule}
											</p>
										) : null}
									</TableCell>
									<TableCell className="whitespace-normal">
										{formatDose(rx)} - {rx.doseForm}
									</TableCell>
									<TableCell className="whitespace-normal">{rx.route}</TableCell>
									<TableCell className="whitespace-normal">{rx.frequency}</TableCell>
									<TableCell className="whitespace-normal">
										{rx.durationDays ? `${rx.durationDays} day(s)` : "--"}
									</TableCell>
									<TableCell className="whitespace-normal">
										{formatInstructions(rx) || "--"}
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>

						<div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
							<div>
								<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
									Prescriber
								</p>
								<p className="mt-1 font-medium">{rx.prescriberName}</p>
								<p className="text-muted-foreground mt-1 text-sm">
									PRC Lic. No.: {rx.prcLicenseNumber}
								</p>
								<p className="text-muted-foreground text-sm">PTR No.: {rx.ptrNumber}</p>
								{rx.pdeaS2License ? (
									<p className="text-muted-foreground text-sm">S2 Lic.: {rx.pdeaS2License}</p>
								) : null}
							</div>
							<div>
								<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
									Electronic signature
								</p>
								<p className="mt-1 font-medium">{formatDateTime(rx.signedAt)}</p>
								<p className="text-muted-foreground mt-1 text-sm">Prescription ID: {rx.id}</p>
							</div>
						</div>
					</CardContent>
				</Card>
			))}
		</section>
	)
}

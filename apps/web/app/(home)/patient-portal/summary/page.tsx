import { cookies } from "next/headers"
import {
	AlertCircle,
	CalendarDays,
	CheckCircle2,
	Eye,
	FileText,
	HeartPulse,
	Pill,
	ShieldCheck,
	Stethoscope,
	TestTube2,
} from "lucide-react"

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
	buildPatientPortalDocuments,
	getPatientPortalRecord,
	parsePortalSessionCookie,
	PATIENT_PORTAL_COOKIE,
	type PortalDetailItem,
	type PortalSummaryItem,
} from "@/features/patient-portal/lib/patient-portal-records"

function StatusBadge({ status }: { status?: PortalSummaryItem["status"] }) {
	if (status === "attention") {
		return (
			<Badge variant="destructive" className="gap-1">
				<AlertCircle className="size-3" />
				Review
			</Badge>
		)
	}

	if (status === "released") {
		return (
			<Badge variant="outline" className="gap-1">
				<ShieldCheck className="size-3" />
				Released
			</Badge>
		)
	}

	return (
		<Badge variant="secondary" className="gap-1">
			<CheckCircle2 className="size-3" />
			Stable
		</Badge>
	)
}

function SummaryList({ items, emptyText }: { items: PortalSummaryItem[]; emptyText: string }) {
	if (items.length === 0) {
		return <p className="text-muted-foreground text-sm leading-6">{emptyText}</p>
	}

	return (
		<div className="divide-y">
			{items.map(item => (
				<div
					key={`${item.label}-${item.value}`}
					className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto]"
				>
					<div className="min-w-0">
						<p className="text-sm font-medium">{item.label}</p>
						<p className="mt-1 text-sm">{item.value}</p>
						{item.detail ? (
							<p className="text-muted-foreground mt-1 text-xs leading-5">{item.detail}</p>
						) : null}
					</div>
					<div className="sm:justify-self-end">
						<StatusBadge status={item.status} />
					</div>
				</div>
			))}
		</div>
	)
}

function RecordTable({ items, emptyText }: { items: PortalSummaryItem[]; emptyText: string }) {
	if (items.length === 0) {
		return <p className="text-muted-foreground text-sm leading-6">{emptyText}</p>
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Record</TableHead>
					<TableHead>Details</TableHead>
					<TableHead>Status</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{items.map(item => (
					<TableRow key={`${item.label}-${item.value}`}>
						<TableCell className="font-medium whitespace-normal">{item.label}</TableCell>
						<TableCell className="whitespace-normal">
							<div>{item.value}</div>
							{item.detail ? (
								<p className="text-muted-foreground mt-1 text-xs leading-5">{item.detail}</p>
							) : null}
						</TableCell>
						<TableCell className="whitespace-normal">
							<StatusBadge status={item.status} />
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}

function DetailGrid({ items }: { items: PortalDetailItem[] }) {
	return (
		<div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
			{items.map(item => (
				<div key={item.label} className="border-b pb-3">
					<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
						{item.label}
					</p>
					<p className="mt-1.5 text-sm font-medium break-words">{item.value}</p>
				</div>
			))}
		</div>
	)
}

function LoginRequiredState() {
	return (
		<section className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
			<Alert>
				<ShieldCheck className="size-4" />
				<AlertTitle>Patient match required</AlertTitle>
				<AlertDescription>
					Enter a valid MRN and date of birth before viewing the read-only portal summary.
				</AlertDescription>
			</Alert>
			<PatientPortalLinkButton href="/patient-portal/login" size="lg" className="mt-4 gap-1.5">
				<FileText className="size-4" />
				Go to portal login
			</PatientPortalLinkButton>
		</section>
	)
}

export default async function PatientSummaryDashboardPage() {
	const cookieStore = await cookies()
	const session = parsePortalSessionCookie(cookieStore.get(PATIENT_PORTAL_COOKIE)?.value)
	const record = session ? await getPatientPortalRecord(session.patientId) : null

	if (!record) {
		return <LoginRequiredState />
	}

	const documents = buildPatientPortalDocuments(record)

	return (
		<section className="mx-auto max-w-6xl space-y-6 px-4 py-6 lg:px-6">
			<div className="bg-card flex flex-col gap-4 rounded-lg border p-5 md:flex-row md:items-start md:justify-between">
				<div className="space-y-3">
					<Badge variant="outline" className="gap-1.5">
						<FileText className="size-3.5" />
						Patient Summary Dashboard
					</Badge>
					<div>
						<h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
							{record.patient.name}
						</h1>
						<p className="text-muted-foreground mt-2 text-sm leading-6">
							{record.snapshot.releasedThrough} This page is populated from the matched patient MRN
							and remains read-only for portal users.
						</p>
					</div>
				</div>
				<PatientPortalLinkButton
					href="/patient-portal/documents"
					size="lg"
					className="w-full gap-1.5 md:w-auto"
				>
					<Eye className="size-4" />
					View documents
				</PatientPortalLinkButton>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<div className="bg-card rounded-lg border p-4">
					<p className="text-muted-foreground text-xs font-medium uppercase">Patient MRN</p>
					<p className="mt-2 text-lg font-semibold">{record.patient.mrn}</p>
					<p className="text-muted-foreground mt-1 text-xs">Matched from patients table</p>
				</div>
				<div className="bg-card rounded-lg border p-4">
					<p className="text-muted-foreground text-xs font-medium uppercase">Date of birth</p>
					<p className="mt-2 text-lg font-semibold">{record.patient.dateOfBirth}</p>
					<p className="text-muted-foreground mt-1 text-xs">{record.patient.sex}</p>
				</div>
				<div className="bg-card rounded-lg border p-4">
					<p className="text-muted-foreground text-xs font-medium uppercase">Generated</p>
					<p className="mt-2 text-lg font-semibold">Portal snapshot</p>
					<p className="text-muted-foreground mt-1 text-xs">{record.snapshot.generatedAt}</p>
				</div>
				<div className="bg-card rounded-lg border p-4">
					<p className="text-muted-foreground text-xs font-medium uppercase">Documents</p>
					<p className="mt-2 text-lg font-semibold">{documents.length} released</p>
					<p className="text-muted-foreground mt-1 text-xs">Available as static downloads</p>
				</div>
			</div>

			<Card className="rounded-lg">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileText className="text-primary size-4" />
						Patient Database Record
					</CardTitle>
					<CardDescription>
						Patient-facing details loaded from the matched patients table record.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<DetailGrid items={record.patientDetails} />
				</CardContent>
			</Card>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card className="rounded-lg">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<HeartPulse className="text-primary size-4" />
							Snapshot Overview
						</CardTitle>
						<CardDescription>{record.patient.facilityName}</CardDescription>
					</CardHeader>
					<CardContent>
						<SummaryList items={record.overview} emptyText="No released overview found." />
					</CardContent>
				</Card>

				<Card className="rounded-lg">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<AlertCircle className="text-primary size-4" />
							Problems and Allergies
						</CardTitle>
						<CardDescription>Active and released safety information.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-5">
						<SummaryList items={record.problems} emptyText="No problem records found." />
						<div className="border-t pt-4">
							<SummaryList items={record.allergies} emptyText="No allergy records found." />
						</div>
					</CardContent>
				</Card>

				<Card className="rounded-lg">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Pill className="text-primary size-4" />
							Medication Records
						</CardTitle>
						<CardDescription>
							Medication orders linked to this patient&apos;s encounters.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<RecordTable items={record.medications} emptyText="No medication orders found." />
					</CardContent>
				</Card>

				<Card className="rounded-lg">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<TestTube2 className="text-primary size-4" />
							Laboratory Records
						</CardTitle>
						<CardDescription>Lab orders and released result details.</CardDescription>
					</CardHeader>
					<CardContent>
						<RecordTable items={record.labs} emptyText="No laboratory records found." />
					</CardContent>
				</Card>

				<Card className="rounded-lg">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Stethoscope className="text-primary size-4" />
							Imaging Records
						</CardTitle>
						<CardDescription>Radiology and imaging orders linked to this patient.</CardDescription>
					</CardHeader>
					<CardContent>
						<RecordTable items={record.imaging} emptyText="No imaging records found." />
					</CardContent>
				</Card>

				<Card className="rounded-lg">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<CalendarDays className="text-primary size-4" />
							Encounter History
						</CardTitle>
						<CardDescription>Recent encounters from the patient chart.</CardDescription>
					</CardHeader>
					<CardContent>
						<SummaryList items={record.encounters} emptyText="No encounter records found." />
					</CardContent>
				</Card>

				<Card className="rounded-lg">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<CalendarDays className="text-primary size-4" />
							Appointment History
						</CardTitle>
						<CardDescription>
							Appointments connected directly to this patient record.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<RecordTable items={record.appointments} emptyText="No appointments found." />
					</CardContent>
				</Card>

				<Card className="rounded-lg">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Pill className="text-primary size-4" />
							Released Prescriptions
						</CardTitle>
						<CardDescription>Signed and issued prescriptions for this patient.</CardDescription>
					</CardHeader>
					<CardContent>
						<RecordTable
							items={record.prescriptions}
							emptyText="No released prescriptions found."
						/>
					</CardContent>
				</Card>

				<Card className="rounded-lg">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FileText className="text-primary size-4" />
							Signed Clinical Notes
						</CardTitle>
						<CardDescription>
							Signed notes connected through this patient&apos;s encounters.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<RecordTable items={record.notes} emptyText="No signed clinical notes found." />
					</CardContent>
				</Card>

				<Card className="rounded-lg">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<ShieldCheck className="text-primary size-4" />
							Consent Records
						</CardTitle>
						<CardDescription>Signed consent records connected to this patient.</CardDescription>
					</CardHeader>
					<CardContent>
						<RecordTable items={record.consents} emptyText="No signed consent records found." />
					</CardContent>
				</Card>

				<Card className="rounded-lg">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FileText className="text-primary size-4" />
							Billing Records
						</CardTitle>
						<CardDescription>Finalized invoices connected to this patient record.</CardDescription>
					</CardHeader>
					<CardContent>
						<RecordTable items={record.billing} emptyText="No finalized invoices found." />
					</CardContent>
				</Card>

				<Card className="rounded-lg">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FileText className="text-primary size-4" />
							Medical Records Requests
						</CardTitle>
						<CardDescription>
							Chart and document requests connected to this patient.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<RecordTable items={record.recordsRequests} emptyText="No records requests found." />
					</CardContent>
				</Card>
			</div>
		</section>
	)
}

import { cookies } from "next/headers"
import { ArrowLeft, Download, FileText, LockKeyhole, ShieldCheck } from "lucide-react"

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
	PatientPortalDownloadButton,
	PatientPortalLinkButton,
} from "@/features/patient-portal/components/patient-portal-link-button"
import {
	buildPatientPortalDocuments,
	getPatientPortalRecord,
	parsePortalSessionCookie,
	PATIENT_PORTAL_COOKIE,
} from "@/features/patient-portal/lib/patient-portal-records"
import { createDocumentDownloadHref } from "@/features/patient-portal/lib/static-summary"

function LoginRequiredState() {
	return (
		<section className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
			<Alert>
				<ShieldCheck className="size-4" />
				<AlertTitle>Patient match required</AlertTitle>
				<AlertDescription>
					Enter a valid MRN and date of birth before downloading portal documents.
				</AlertDescription>
			</Alert>
			<PatientPortalLinkButton href="/patient-portal/login" size="lg" className="mt-4 gap-1.5">
				<FileText className="size-4" />
				Go to portal login
			</PatientPortalLinkButton>
		</section>
	)
}

export default async function PatientPortalDocumentsPage() {
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
						<Download className="size-3.5" />
						Document Download Page
					</Badge>
					<div>
						<h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
							Released portal documents
						</h1>
						<p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
							Documents are generated from the matched patient record for {record.patient.name} (
							{record.patient.mrn}). Each download is read-only and reflects released portal
							information.
						</p>
					</div>
				</div>
				<PatientPortalLinkButton
					href="/patient-portal/summary"
					variant="outline"
					size="lg"
					className="w-full gap-1.5 md:w-auto"
				>
					<ArrowLeft className="size-4" />
					Back to summary
				</PatientPortalLinkButton>
			</div>

			<Alert>
				<LockKeyhole className="size-4" />
				<AlertTitle>Read-only release snapshot</AlertTitle>
				<AlertDescription>
					Generated {record.snapshot.generatedAt} from {record.snapshot.source}.
				</AlertDescription>
			</Alert>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{documents.map(document => (
					<Card key={document.id} className="rounded-lg">
						<CardHeader>
							<div className="mb-3 flex items-center justify-between gap-3">
								<span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
									<FileText className="size-5" />
								</span>
								<Badge variant="secondary">{document.format}</Badge>
							</div>
							<CardTitle>{document.title}</CardTitle>
							<CardDescription>{document.description}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-3 text-sm">
								<div className="flex items-center justify-between gap-3 border-b pb-2">
									<span className="text-muted-foreground">Category</span>
									<span className="font-medium">{document.category}</span>
								</div>
								<div className="flex items-center justify-between gap-3 border-b pb-2">
									<span className="text-muted-foreground">Released</span>
									<span className="text-right font-medium">{document.releasedAt}</span>
								</div>
								<div className="flex items-center justify-between gap-3">
									<span className="text-muted-foreground">Access</span>
									<span className="inline-flex items-center gap-1 font-medium">
										<ShieldCheck className="text-primary size-3.5" />
										Read-only
									</span>
								</div>
							</div>
							<PatientPortalDownloadButton
								href={createDocumentDownloadHref(document)}
								download={document.fileName}
								size="lg"
								className="w-full gap-1.5"
							>
								<Download className="size-4" />
								Download document
							</PatientPortalDownloadButton>
						</CardContent>
					</Card>
				))}
			</div>
		</section>
	)
}

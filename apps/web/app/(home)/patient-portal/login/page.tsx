import { CalendarClock, Database, FileLock2, ShieldCheck } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { PatientPortalLoginForm } from "@/features/patient-portal/components/patient-portal-login-form"
import { patientPortalSnapshot } from "@/features/patient-portal/lib/static-summary"

const portalAssurances = [
	{
		icon: ShieldCheck,
		title: "Patient or proxy access",
		description: "Access is scoped to the released portal record for the selected patient.",
	},
	{
		icon: FileLock2,
		title: "Read-only summary",
		description: "Portal views do not edit medication, result, imaging, or encounter records.",
	},
	{
		icon: Database,
		title: "Static daily cache",
		description: "The summary is generated from released records once per daily portal cycle.",
	},
]

export default function PatientPortalLoginPage() {
	return (
		<section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl gap-8 px-4 py-8 md:grid-cols-[minmax(0,1fr)_420px] md:items-center lg:px-6">
			<div className="space-y-8">
				<div className="max-w-2xl space-y-4">
					<Badge variant="outline" className="gap-1.5">
						<CalendarClock className="size-3.5" />
						{patientPortalSnapshot.snapshotDate} portal snapshot
					</Badge>
					<div className="space-y-3">
						<h1 className="text-3xl font-semibold tracking-normal text-balance md:text-5xl">
							Secure access to released health information.
						</h1>
						<p className="text-muted-foreground max-w-xl text-base leading-7">
							Patients and authorized proxies can open a read-only daily summary of released medical
							records, including medications, results, imaging reports, and documents.
						</p>
					</div>
				</div>

				<div className="grid max-w-3xl gap-3">
					{portalAssurances.map(item => (
						<div key={item.title} className="bg-card flex gap-3 rounded-lg border p-4">
							<span className="bg-primary/10 text-primary mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg">
								<item.icon className="size-4" />
							</span>
							<div>
								<h2 className="text-sm font-medium">{item.title}</h2>
								<p className="text-muted-foreground mt-1 text-sm leading-6">{item.description}</p>
							</div>
						</div>
					))}
				</div>
			</div>

			<Card className="rounded-lg">
				<CardHeader>
					<CardTitle>Patient Portal Login</CardTitle>
					<CardDescription>
						Open the latest released static summary for the patient or authorized proxy.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<PatientPortalLoginForm />
					<p className="text-muted-foreground mt-4 text-xs leading-5">
						Snapshot source: {patientPortalSnapshot.source}. Generated{" "}
						{patientPortalSnapshot.generatedAt}.
					</p>
				</CardContent>
			</Card>
		</section>
	)
}

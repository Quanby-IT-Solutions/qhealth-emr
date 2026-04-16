"use client"

import { FileBadge, HeartHandshake, ShieldCheck, Tags } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"

const FEATURES = [
	{
		icon: HeartHandshake,
		title: "Financial Evaluation",
		description:
			"Conduct household income assessments and classify patients by financial capacity (Class A–D) for targeted assistance.",
	},
	{
		icon: FileBadge,
		title: "CoE Issuance",
		description:
			"Issue and track Certificates of Eligibility for Malasakit Center, PCSO, DSWD, OWWA, and Pag-IBIG programs.",
	},
	{
		icon: ShieldCheck,
		title: "Consent Forms (Annex A & B)",
		description:
			"Capture patient signatures for PhilHealth Informed Consent (Annex A) and Member Empowerment Form (Annex B).",
	},
	{
		icon: Tags,
		title: "Benefit Tags",
		description:
			"Tag encounters with applicable benefit programs: Konsulta, Z-Benefit, Malasakit, PCSO Assistance, and more.",
	},
]

export default function MSWPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Medical Social Work (MSW)</h1>
				<p className="text-sm text-muted-foreground">
					Financial evaluation, assistance coordination, and social work documentation
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				{FEATURES.map(({ icon: Icon, title, description }) => (
					<Card key={title}>
						<CardHeader className="flex flex-row items-center gap-3 pb-2">
							<div className="rounded-md bg-primary/10 p-2">
								<Icon className="size-5 text-primary" />
							</div>
							<CardTitle className="text-sm font-semibold">{title}</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">{description}</p>
						</CardContent>
					</Card>
				))}
			</div>

			<Card>
				<CardContent className="py-6 text-center text-sm text-muted-foreground">
					Access MSW services through a patient encounter via the{" "}
					<span className="font-medium text-foreground">MSW</span> tab in the patient chart.
				</CardContent>
			</Card>
		</div>
	)
}


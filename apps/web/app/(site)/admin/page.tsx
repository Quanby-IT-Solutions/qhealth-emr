import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"

const SECTIONS = [
	{
		title: "Users",
		description: "Manage staff accounts and their facility assignments.",
		href: "/admin/users",
	},
	{
		title: "Roles & Permissions",
		description: "Configure role bundles and module-level access control.",
		href: "/admin/roles",
	},
	{
		title: "Formulary",
		description: "Maintain the facility drug formulary and reference code sets.",
		href: "/admin/formulary",
	},
	{
		title: "SLA Configuration",
		description: "Configure SLA targets and escalation rules for turnaround times.",
		href: "/admin/sla",
	},
	{
		title: "FHIR Export",
		description: "Configure FHIR/NHDR data export settings and mapping rules.",
		href: "/admin/fhir",
	},
]

export default function AdminPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Administration</h1>
				<p className="text-muted-foreground text-sm">
					System configuration, user management, and facility settings
				</p>
			</div>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{SECTIONS.map(section => (
					<Link key={section.href} href={section.href}>
						<Card className="h-full transition-colors hover:bg-muted/50">
							<CardHeader className="pb-2">
								<CardTitle className="text-base">{section.title}</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground text-sm">{section.description}</p>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>
		</div>
	)
}

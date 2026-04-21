import Link from "next/link"

import { Badge } from "@/core/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"

const ADMIN_AREAS = [
	{
		title: "Access & Roles",
		description: "Identity lifecycle, staffing access, and permission governance.",
		pages: [
			{
				title: "Users",
				description: "Manage staff accounts, facility assignments, and account status.",
				href: "/admin/users",
			},
			{
				title: "Roles & Permissions",
				description: "Define role bundles and module-level access control.",
				href: "/admin/roles",
			},
		],
	},
	{
		title: "Platform Control",
		description: "Release controls, facility defaults, and institution-wide system behavior.",
		pages: [
			{
				title: "Feature Flags",
				description: "Gate high-risk workflows, phased rollouts, and preview-only features.",
				href: "/admin/feature-flags",
				status: "New",
			},
			{
				title: "System Settings",
				description: "Maintain facility identity, policy defaults, and integration settings.",
				href: "/admin/settings",
				status: "New",
			},
			{
				title: "Facility Profile",
				description: "Official facility identity used in reports, exports, and external submissions.",
				href: "/admin/facility-profile",
				status: "New",
			},
			{
				title: "Integration Registry",
				description: "Manage external system integrations, credential references, and sync status.",
				href: "/admin/integration-registry",
				status: "New",
			},
		],
	},
	{
		title: "Clinical Configuration",
		description: "Reference data and facility-approved clinical configuration used at runtime.",
		pages: [
			{
				title: "Formulary",
				description: "Maintain approved medications and formulary guidance.",
				href: "/admin/formulary",
			},
			{
				title: "Code Sets",
				description: "Review ICD-10, LOINC, RxNorm, and RVS reference code sets.",
				href: "/admin/formulary/code-sets",
			},
		],
	},
	{
		title: "Interoperability & Compliance",
		description: "External reporting, data exchange, and service-level governance.",
		pages: [
			{
				title: "FHIR Export",
				description: "Configure NHDR-aligned export behavior and submission monitoring.",
				href: "/admin/fhir",
			},
			{
				title: "SLA Configuration",
				description: "Manage charter turnaround targets and escalation thresholds.",
				href: "/admin/sla",
			},
		],
	},
] as const

export function AdminOverview() {
	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold">Administration</h1>
				<p className="text-muted-foreground max-w-3xl text-sm">
					The administrator workspace is organized around access governance, platform control,
					clinical configuration, and interoperability oversight. System administrators can
					manage configuration without gaining clinical authoring responsibilities.
				</p>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				{ADMIN_AREAS.map(area => (
					<Card key={area.title} className="h-full border-border/70">
						<CardHeader className="space-y-2">
							<div className="flex items-center justify-between gap-3">
								<CardTitle className="text-lg">{area.title}</CardTitle>
								<Badge variant="outline">{area.pages.length} pages</Badge>
							</div>
							<CardDescription>{area.description}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{area.pages.map(page => (
								<Link
									key={page.href}
									href={page.href}
									className="group block rounded-lg border border-border/70 px-4 py-3 transition-colors hover:bg-muted/50"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="space-y-1">
											<p className="text-sm font-medium group-hover:text-foreground">
												{page.title}
											</p>
											<p className="text-muted-foreground text-sm">{page.description}</p>
										</div>
										{page.status ? <Badge>{page.status}</Badge> : null}
									</div>
								</Link>
							))}
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	)
}
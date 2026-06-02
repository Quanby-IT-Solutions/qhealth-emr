"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/core/components/ui/breadcrumb"

const SEGMENT_LABELS: Record<string, string> = {
	admin: "Admin",
	users: "Users",
	new: "New",
	roles: "Roles",
	"feature-flags": "Feature Flags",
	"clinician-licenses": "Clinician Licenses",
	bor: "BOR & Census",
	census: "Census Report",
	"fhir-endpoints": "FHIR Endpoints",
	log: "Exchange Log",
	terminology: "Terminology",
	sla: "SLA",
	config: "Configuration",
	"status-log": "Status Log",
	turnaround: "Turnaround",
	bottleneck: "Bottleneck",
	facility: "Facility",
	departments: "Departments",
	wards: "Wards",
	"master-data": "Master Data",
	integrations: "Integrations",
	keys: "API Keys",
	settings: "Settings",
	"facility-profile": "Facility Profile",
	"integration-registry": "Integration Registry",
	fhir: "FHIR Export",
	formulary: "Formulary",
	"code-sets": "Code Sets",
	offline: "Offline",
	"config-history": "Config History",
	"data-quality": "Data Quality",
	"export-compliance": "Export Compliance",
	"civil-registry": "Civil Registry",
	"medication-compliance": "Medication Compliance",
	"him-ops": "HIM Operations",
	"_design": "Design System",
}

function labelFor(segment: string): string {
	return SEGMENT_LABELS[segment] ?? segment.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

export function AdminBreadcrumb() {
	const pathname = usePathname()
	const segments = pathname.split("/").filter(Boolean)

	const crumbs = segments.map((seg, i) => ({
		label: labelFor(seg),
		href: `/${segments.slice(0, i + 1).join("/")}`,
		isLast: i === segments.length - 1,
	}))

	return (
		<Breadcrumb>
			<BreadcrumbList>
				{crumbs.map((crumb, i) =>
					crumb.isLast ? (
						<BreadcrumbItem key={crumb.href}>
							<BreadcrumbPage>{crumb.label}</BreadcrumbPage>
						</BreadcrumbItem>
					) : (
						<React.Fragment key={crumb.href}>
							<BreadcrumbItem>
								<BreadcrumbLink render={<Link href={crumb.href} />}>
									{crumb.label}
								</BreadcrumbLink>
							</BreadcrumbItem>
							{i < crumbs.length - 1 && <BreadcrumbSeparator />}
						</React.Fragment>
					)
				)}
			</BreadcrumbList>
		</Breadcrumb>
	)
}

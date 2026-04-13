"use client"

import { use } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Badge } from "@/core/components/ui/badge"
import { Separator } from "@/core/components/ui/separator"
import { cn } from "@/core/lib/utils"
import { useEncounterDetailQuery } from "@/features/encounters/api/encounters.hooks"
import { ChartContext } from "@/features/encounters/context/chart-context"
import { usePatientSummaryQuery } from "@/features/problems-allergies/api/problems-allergies.hooks"

function calculateAge(dob: string) {
	const birth = new Date(dob)
	const now = new Date()
	return Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

export default function EncounterChartLayout({
	children,
	params,
}: {
	children: React.ReactNode
	params: Promise<{ patientId: string; encounterId: string }>
}) {
	const { patientId, encounterId } = use(params)
	const { data: encounter, isLoading } = useEncounterDetailQuery(encounterId)
	const { data: summary } = usePatientSummaryQuery(encounter?.patientId ?? "")
	const pathname = usePathname()

	const base = `/patients/${patientId}/encounters/${encounterId}`

	const tabs = [
		{ label: "Summary", href: base },
		{ label: "Documentation", href: `${base}/documentation` },
		{ label: "Orders", href: `${base}/orders` },
		{ label: "Nursing", href: `${base}/nursing` },
		{ label: "Problems & Allergies", href: `${base}/problems-allergies` },
		{ label: "Billing", href: `${base}/billing` },
		{ label: "Consents", href: `${base}/consents` },
		{ label: "Transfers", href: `${base}/transfers` },
		{ label: "Audit Trail", href: `${base}/audit-trail` },
		...(encounter?.status === "active" && encounter.encounterType !== "outpatient"
			? [{ label: "Transfer Patient", href: `${base}/transfer` }]
			: []),
		...(encounter?.status === "active"
			? [
					{
						label: encounter?.encounterType === "outpatient" ? "Close" : "Discharge",
						href: `${base}/discharge`,
					},
				]
			: []),
	]

	return (
		<ChartContext.Provider
			value={{
				encounterId,
				patientId,
				encounter,
				isLoading,
				facilityId: encounter?.facilityId,
				activeAllergyCount: summary?.activeAllergyCount ?? 0,
				hasSevereAllergies: summary?.hasSevereAllergies ?? false,
			}}
		>
			<div className="flex h-full flex-col">
				{/* Patient Banner */}
				<div className="border-b bg-background px-6 py-4">
					{isLoading ? (
						<div className="h-12 animate-pulse rounded bg-muted" />
					) : encounter ? (
						<div className="flex flex-wrap items-center gap-x-6 gap-y-2">
							<div>
								<p className="text-lg font-semibold">{encounter.patientName}</p>
								<p className="text-muted-foreground text-sm">MRN: {encounter.patientMrn}</p>
							</div>
							<Separator orientation="vertical" className="hidden h-10 sm:block" />
							<div className="flex flex-wrap gap-4 text-sm">
								{encounter.patientDateOfBirth && (
									<span>
										<span className="text-muted-foreground">Age: </span>
										{calculateAge(encounter.patientDateOfBirth)}
									</span>
								)}
								<span>
									<span className="text-muted-foreground">Sex: </span>
									<span className="capitalize">{encounter.patientSex}</span>
								</span>
								<span>
									<span className="text-muted-foreground">Type: </span>
									<span className="capitalize">{encounter.encounterType}</span>
								</span>
								{encounter.attendingStaffName && (
									<span>
										<span className="text-muted-foreground">Attending: </span>
										{encounter.attendingStaffName}
									</span>
								)}
								{encounter.wardName && (
									<span>
										<span className="text-muted-foreground">Ward: </span>
										{encounter.wardName}
										{encounter.bedNumber ? ` / Bed ${encounter.bedNumber}` : ""}
									</span>
								)}
							</div>
							{(summary?.activeAllergyCount ?? 0) > 0 && (
								<Badge
									variant={summary?.hasSevereAllergies ? "destructive" : "secondary"}
									className="ml-auto"
								>
									{summary?.hasSevereAllergies ? "⚠ " : ""}
									{summary?.activeAllergyCount} Allerg
									{summary?.activeAllergyCount === 1 ? "y" : "ies"}
								</Badge>
							)}
						</div>
					) : null}
				</div>

				{/* Tab Bar */}
				<div className="border-b bg-background">
					<nav className="flex overflow-x-auto px-6" aria-label="Encounter chart tabs">
						{tabs.map(tab => {
							const isActive =
								tab.href === base
									? pathname === base || pathname === `${base}/`
									: pathname.startsWith(tab.href)
							return (
								<Link
									key={tab.href}
									href={tab.href}
									className={cn(
										"whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
										isActive
											? "border-primary text-foreground"
											: "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
									)}
									aria-current={isActive ? "page" : undefined}
								>
									{tab.label}
								</Link>
							)
						})}
					</nav>
				</div>

				{/* Page content */}
				<main className="flex-1 overflow-auto p-6">{children}</main>
			</div>
		</ChartContext.Provider>
	)
}

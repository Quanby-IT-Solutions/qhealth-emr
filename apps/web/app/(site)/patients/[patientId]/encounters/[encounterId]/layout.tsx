"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, ShieldAlert, WifiOff } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/core/components/ui/dialog"
import { Separator } from "@/core/components/ui/separator"
import { cn } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useMyActiveBreakGlassQuery } from "@/features/audit/api/audit.hooks"
import { BreakGlassCountdown, BreakGlassForm } from "@/features/audit/components/break-glass-form"
import { useEncounterDetailQuery } from "@/features/encounters/api/encounters.hooks"
import { ChartContext } from "@/features/encounters/context/chart-context"
import { useOfflineSync } from "@/features/offline-cache/lib/use-offline-sync"
import { usePatientSummaryQuery } from "@/features/problems-allergies/api/problems-allergies.hooks"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(
		permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
	)
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

function calculateAge(dob: string) {
	const birth = new Date(dob)
	const now = new Date()
	return Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

const BREAK_GLASS_REQUIRED_MESSAGE = "Break-glass required for this patient chart."

function getActiveStaffProfile(
	profile:
		| {
				staffProfiles?: Array<{ id: string; facilityId: string; roles: Array<{ id: string }> }>
				activeRole?: { id: string } | null
		  }
		| undefined
) {
	return (
		profile?.staffProfiles?.find(staffProfile =>
			staffProfile.roles.some(role => role.id === profile?.activeRole?.id)
		) ?? profile?.staffProfiles?.[0]
	)
}

export default function EncounterChartLayout({
	children,
	params,
}: {
	children: React.ReactNode
	params: Promise<{ patientId: string; encounterId: string }>
}) {
	const { patientId, encounterId } = use(params)
	const encounterQuery = useEncounterDetailQuery(encounterId)
	const { data: encounter, isLoading, isError, error, refetch: refetchEncounter } = encounterQuery
	const pathname = usePathname()
	const permSet = usePermissionSet()
	const { data: profile } = useMyProfile()
	const activeRoleName = (profile?.activeRole?.name ?? "").toLowerCase()
	const isAnesthesiologist = activeRoleName === "anesthesiologist"
	const canViewClinicalSummary = can(permSet, "clinical_docs", "view")
	const canViewVitals = can(permSet, "nursing", "view") || can(permSet, "surgical", "view")
	const { isOnline } = useOfflineSync()
	const activeStaffProfile = getActiveStaffProfile(profile)
	const activeFacilityId = activeStaffProfile?.facilityId
	const [breakGlassExpired, setBreakGlassExpired] = useState(false)
	const breakGlassRequired =
		error?.message?.includes(BREAK_GLASS_REQUIRED_MESSAGE) ||
		String(error).includes(BREAK_GLASS_REQUIRED_MESSAGE)
	const base = `/patients/${patientId}/encounters/${encounterId}`
	const isDeathReportRoute = pathname.startsWith(`${base}/death-report`)

	// Break-Glass state
	const [breakGlassOpen, setBreakGlassOpen] = useState(false)
	// Clinicians with audit:create can invoke break-glass
	const canInvokeBreakGlass = can(permSet, "audit", "create")
	const { data: activeBreakGlass, refetch: refetchActiveBreakGlass } = useMyActiveBreakGlassQuery({
		facilityId: encounter?.facilityId ?? activeFacilityId,
		patientId: encounter?.patientId ?? patientId,
		enabled: canInvokeBreakGlass,
	})
	const chartAccessBlocked = breakGlassRequired || (breakGlassExpired && !activeBreakGlass)
	const visibleEncounter = chartAccessBlocked ? undefined : encounter
	const { data: summary } = usePatientSummaryQuery(visibleEncounter?.patientId ?? "", {
		enabled: !!visibleEncounter?.patientId && canViewClinicalSummary,
	})

	useEffect(() => {
		if (breakGlassRequired && activeBreakGlass) {
			void refetchEncounter()
		}
	}, [activeBreakGlass, breakGlassRequired, refetchEncounter])

	useEffect(() => {
		if (!activeBreakGlass?.accessExpiresAt) {
			return
		}

		const expiresAtMs = new Date(activeBreakGlass.accessExpiresAt).getTime()
		const refreshDelayMs = expiresAtMs - Date.now() + 1000

		if (refreshDelayMs <= 0) {
			const timeoutId = window.setTimeout(() => {
				setBreakGlassExpired(true)
				void refetchActiveBreakGlass()
				void refetchEncounter().then(result => {
					if (result.status === "success") {
						setBreakGlassExpired(false)
					}
				})
			}, 0)
			return () => window.clearTimeout(timeoutId)
		}

		const timeoutId = window.setTimeout(() => {
			setBreakGlassExpired(true)
			void refetchActiveBreakGlass()
			void refetchEncounter().then(result => {
				if (result.status === "success") {
					setBreakGlassExpired(false)
				}
			})
		}, refreshDelayMs)

		return () => window.clearTimeout(timeoutId)
	}, [activeBreakGlass?.accessExpiresAt, refetchActiveBreakGlass, refetchEncounter])

	// Each tab declares which permission it needs. Summary is always shown.
	// Tabs are omitted entirely when the role lacks the required permission —
	// the backend still enforces access; this is a UX-only filter.
	const tabs = [
		{ label: "Summary", href: base, show: true },
		{
			label: "Problems & Allergies",
			href: `${base}/problems-allergies`,
			// Problem list and allergy management is for all clinicians who author clinical documentation
			// (Physicians, Nurses, Surgeons, Anesthesiologists). Ancillary and billing staff are excluded.
			show:
				(can(permSet, "clinical_docs", "view") || can(permSet, "orders", "view")) &&
				!can(permSet, "radiology", "view") &&
				!can(permSet, "laboratory", "view") &&
				!can(permSet, "billing", "create"), // Exclude Billers - they review CF4, not problem lists
		},
		{
			label: "Documentation",
			href: `${base}/documentation`,
			// Documentation is for clinical staff, not ancillary (Lab/Rad) staff
			show:
				can(permSet, "clinical_docs", "view") &&
				!can(permSet, "radiology", "view") &&
				!can(permSet, "laboratory", "view"),
		},
		{
			label: "Orders",
			href: `${base}/orders`,
			// Orders tab is for clinical staff and ancillary staff (Lab/Rad view imaging/lab orders)
			show:
				can(permSet, "orders", "view") ||
				can(permSet, "radiology", "view") ||
				can(permSet, "laboratory", "view"),
		},
		{
			label: "e-Prescription",
			href: `${base}/e-prescription`,
			// Surgeons may author post-op prescriptions; anesthesiologists stay in surgical workflows.
			show: can(permSet, "orders", "sign") && !isAnesthesiologist,
		},
		{
			label: "Surgical",
			href: `${base}/surgical`,
			show: can(permSet, "surgical", "view"),
		},
		{
			label: "Nursing",
			href: `${base}/nursing`,
			// Nursing workflows are nurse-owned. Clinicians get vitals/clinical
			// context from Summary, Orders, and Documentation instead.
			show:
				can(permSet, "nursing", "view") &&
				!can(permSet, "surgical", "view") &&
				!can(permSet, "clinical_docs", "sign"),
		},
		{
			label: "Nutrition",
			href: `${base}/nutrition`,
			show: can(permSet, "nutrition", "view"),
		},
		{
			label: "Billing",
			href: `${base}/billing`,
			// Billing workspace belongs to Billing/MSW/Auditor-style review roles, not
			// clinicians documenting care. Physicians trigger clinical completion and
			// May Go Home from the Discharge tab.
			show: can(permSet, "billing", "view") && !can(permSet, "clinical_docs", "sign"),
		},
		{
			label: "MSW",
			href: `${base}/msw`,
			show: can(permSet, "msw", "view"),
		},
		{
			label: "Consents",
			href: `${base}/consents`,
			// Consent tracking is for HIM/records staff, not clinical or ancillary staff
			// HIM has clinical_docs:edit but NOT sign - they review, not author
			show:
				(can(permSet, "clinical_docs", "edit") || can(permSet, "adt", "view")) &&
				!can(permSet, "clinical_docs", "sign") && // Exclude clinicians who sign notes
				!can(permSet, "radiology", "view") &&
				!can(permSet, "laboratory", "view") &&
				!can(permSet, "billing", "create"), // Exclude Billers
		},
		{
			label: "Death Report",
			href: `${base}/death-report`,
			// Death reporting is triggered by a deceased/expired disposition.
			// Keep the tab visible while completing the required modal-launched route.
			show:
				can(permSet, "death_reporting", "view") &&
				(visibleEncounter?.disposition === "deceased" || isDeathReportRoute),
		},
		{
			label: "Transfers",
			href: `${base}/transfers`,
			// Transfer history viewing is administrative - requires adt:edit (not just view)
			show: can(permSet, "adt", "edit"),
		},
		{
			label: "Audit Trail",
			href: `${base}/audit-trail`,
			show: can(permSet, "audit", "view"),
		},
		...(visibleEncounter?.status === "active" &&
		visibleEncounter?.encounterType !== "outpatient" &&
		can(permSet, "adt", "edit")
			? [{ label: "Transfer Patient", href: `${base}/transfer`, show: true }]
			: []),
		...((visibleEncounter?.status === "active" || visibleEncounter?.status === "pending_discharge") &&
		(can(permSet, "adt", "edit") || can(permSet, "clinical_docs", "sign"))
			? [
					{
						label: visibleEncounter?.encounterType === "outpatient" ? "Close" : "Discharge",
						href: `${base}/discharge`,
						show: true,
					},
				]
			: []),
	].filter(tab => tab.show)
	const canRenderEncounterContent = Boolean(visibleEncounter && !chartAccessBlocked && !isError)

	return (
		<ChartContext.Provider
			value={{
				encounterId,
				patientId,
				encounter: visibleEncounter,
				isLoading,
				facilityId: visibleEncounter?.facilityId,
				activeAllergyCount: summary?.activeAllergyCount ?? 0,
				hasSevereAllergies: summary?.hasSevereAllergies ?? false,
				canViewClinicalSummary,
				canViewVitals,
			}}
		>
			<div className="flex h-full min-w-0 flex-col">
				<div className="px-3 sm:px-6">
					<Button
						variant="ghost"
						size="sm"
						className="h-8 px-2"
						nativeButton={false}
						render={<Link href={`/patients/${patientId}`} />}
					>
						<ArrowLeft className="mr-2 size-4" />
						Back to Profile
					</Button>
				</div>
				{/* Patient Banner */}
				<div className="bg-background border-b px-3 py-4 sm:px-6">
					{isLoading ? (
						<div className="bg-muted h-12 animate-pulse rounded" />
					) : chartAccessBlocked || isError ? (
						chartAccessBlocked && canInvokeBreakGlass && activeFacilityId ? (
							<div className="w-full max-w-lg space-y-4">
								<div>
									<p className="text-foreground text-sm font-medium">Break-Glass Required</p>
									<p className="text-muted-foreground text-sm">
										This encounter is outside your regular access scope. Submit an emergency
										override request to unlock temporary access without leaving this encounter
										route.
									</p>
								</div>
								<div className="flex flex-wrap items-center gap-3">
									<Button
										variant="outline"
										className="border-orange-300 text-orange-700 hover:bg-orange-50"
										onClick={() => setBreakGlassOpen(true)}
									>
										<ShieldAlert className="size-4" />
										{activeBreakGlass ? "Break-Glass Active" : "Request Break-Glass"}
									</Button>
									{activeBreakGlass?.accessExpiresAt ? (
										<BreakGlassCountdown accessExpiresAt={activeBreakGlass.accessExpiresAt} />
									) : null}
								</div>
								<Dialog open={breakGlassOpen} onOpenChange={setBreakGlassOpen}>
									<DialogContent className="max-w-lg">
										<DialogHeader>
											<DialogTitle>Emergency Override Access</DialogTitle>
											<DialogDescription>
												Request temporary access to this restricted encounter. Access is timeboxed
												and reviewed through the audit trail.
											</DialogDescription>
										</DialogHeader>
										<BreakGlassForm
											patientId={patientId}
											facilityId={activeFacilityId}
											entityType="encounter"
											entityId={encounterId}
											activeEvent={activeBreakGlass}
											onSuccess={() => {
												setBreakGlassOpen(false)
												void refetchEncounter()
											}}
											onCancel={() => setBreakGlassOpen(false)}
										/>
									</DialogContent>
								</Dialog>
							</div>
						) : (
							<p className="text-destructive text-sm">
								You do not have permission to view this encounter.
							</p>
						)
					) : visibleEncounter ? (
						<div className="flex flex-wrap items-center gap-x-6 gap-y-2">
							<div>
								<p className="text-lg font-semibold">{visibleEncounter.patientName}</p>
								<p className="text-muted-foreground text-sm">MRN: {visibleEncounter.patientMrn}</p>
							</div>
							<Separator orientation="vertical" className="hidden h-10 sm:block" />
							<div className="flex flex-wrap gap-4 text-sm">
								{visibleEncounter.patientDateOfBirth && (
									<span>
										<span className="text-muted-foreground">Age: </span>
										{calculateAge(visibleEncounter.patientDateOfBirth)}
									</span>
								)}
								<span>
									<span className="text-muted-foreground">Sex: </span>
									<span className="capitalize">{visibleEncounter.patientSex}</span>
								</span>
								<span>
									<span className="text-muted-foreground">Type: </span>
									<span className="capitalize">{visibleEncounter.encounterType}</span>
								</span>
								{visibleEncounter.attendingStaffName && (
									<span>
										<span className="text-muted-foreground">Attending: </span>
										{visibleEncounter.attendingStaffName}
									</span>
								)}
								{visibleEncounter.wardName && (
									<span>
										<span className="text-muted-foreground">Ward: </span>
										{visibleEncounter.wardName}
										{visibleEncounter.bedNumber ? ` / Bed ${visibleEncounter.bedNumber}` : ""}
									</span>
								)}
							</div>
							{(summary?.activeAllergyCount ?? 0) > 0 && (
								<Badge
									variant={summary?.hasSevereAllergies ? "destructive" : "secondary"}
									className={canInvokeBreakGlass ? "" : "ml-auto"}
								>
									{summary?.hasSevereAllergies ? "⚠ " : ""}
									{summary?.activeAllergyCount} Allerg
									{summary?.activeAllergyCount === 1 ? "y" : "ies"}
								</Badge>
							)}
							{!isOnline && (
								<Badge
									variant="secondary"
									className="gap-1 border-amber-300 bg-amber-100 text-amber-800"
								>
									<WifiOff className="size-3" />
									Cached
								</Badge>
							)}

							{/* Break-Glass Button - for clinicians */}
							{canInvokeBreakGlass &&
								visibleEncounter?.facilityId &&
								visibleEncounter?.patientId &&
								(breakGlassRequired || !!activeBreakGlass) && (
									<div className="ml-auto flex flex-wrap items-center justify-end gap-2">
										{activeBreakGlass?.accessExpiresAt ? (
											<>
												<span className="text-xs font-medium text-orange-700">
													Temporary access only
												</span>
												<BreakGlassCountdown accessExpiresAt={activeBreakGlass.accessExpiresAt} />
											</>
										) : null}
										<Dialog open={breakGlassOpen} onOpenChange={setBreakGlassOpen}>
											<DialogTrigger
												render={
													<Button
														variant={activeBreakGlass ? "default" : "outline"}
														size="sm"
														className={cn(
															"gap-2",
															activeBreakGlass
																? "bg-orange-500 text-white hover:bg-orange-600"
																: "border-orange-300 text-orange-700 hover:bg-orange-50"
														)}
													>
														<ShieldAlert className="size-4" />
														{activeBreakGlass ? "Break-Glass Active" : "Request Break-Glass"}
													</Button>
												}
											/>
											<DialogContent className="max-w-lg">
												<DialogHeader>
													<DialogTitle>Emergency Override Access</DialogTitle>
													<DialogDescription>
														Request emergency access to this patient&apos;s chart when you do not
														have standard authorization. Access remains temporary and expires
														automatically.
													</DialogDescription>
												</DialogHeader>
												<BreakGlassForm
													patientId={visibleEncounter.patientId}
													facilityId={visibleEncounter.facilityId}
													entityType="encounter"
													entityId={encounterId}
													activeEvent={activeBreakGlass}
													onSuccess={() => {
														setBreakGlassExpired(false)
														setBreakGlassOpen(false)
														void refetchEncounter()
													}}
													onCancel={() => setBreakGlassOpen(false)}
												/>
											</DialogContent>
										</Dialog>
									</div>
								)}
						</div>
					) : null}
				</div>

				{canRenderEncounterContent ? (
					<>
						{/* Tab Bar */}
						<div className="bg-background border-b">
							<nav className="flex overflow-x-auto px-3 sm:px-6" aria-label="Encounter chart tabs">
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
												"border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
												isActive
													? "border-primary text-foreground"
													: "text-muted-foreground hover:border-border hover:text-foreground border-transparent"
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
						<main className="min-w-0 flex-1 overflow-auto p-3 sm:p-6">{children}</main>
					</>
				) : null}
			</div>
		</ChartContext.Provider>
	)
}

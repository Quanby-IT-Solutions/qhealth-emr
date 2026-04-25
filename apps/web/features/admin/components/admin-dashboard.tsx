"use client"

import Link from "next/link"
import {
	Alert02FreeIcons,
	ArrowRight01FreeIcons,
	Building04FreeIcons,
	ChartFreeIcons,
	CheckmarkSquare01FreeIcons,
	Database02FreeIcons,
	DashboardSquare01FreeIcons,
	FileEditFreeIcons,
	FlagFreeIcons,
	FlashFreeIcons,
	Plug01FreeIcons,
	LockFreeIcons,
	News01FreeIcons,
	Settings02FreeIcons,
	UserAddFreeIcons,
	UserCircleFreeIcons,
	UserGroup02FreeIcons,
	UserBlock02FreeIcons,
	Timer02FreeIcons,
	Shield01FreeIcons,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { buttonVariants } from "@/core/components/ui/button"
import { cn } from "@/core/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"

import { useAdminDashboardSummaryQuery } from "@/features/admin/api/admin-dashboard.hooks"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import type {
	AdminDashboardSummary,
	AdminDashboardAlert,
	AdminSummaryCard,
	AccessGovernanceSection,
	ArtaSlaSection,
	AuditSummarySection,
	DataQualitySection,
	IntegrationHealthSection,
	OfflineReadinessSection,
	PlatformControlSection,
	RecentChange,
	StatutoryOpsSection,
	StatutoryReadinessSection,
} from "@repo/contracts"

// ── Quick Actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
	{ label: "Create User", href: "/admin/users/new", icon: UserAddFreeIcons },
	{ label: "Inactive Users", href: "/admin/users?isActive=false", icon: UserBlock02FreeIcons },
	{ label: "Roles & Permissions", href: "/admin/roles", icon: LockFreeIcons },
	{ label: "Feature Flags", href: "/admin/feature-flags", icon: FlagFreeIcons },
	{ label: "System Settings", href: "/admin/settings", icon: Settings02FreeIcons },
	{ label: "Facility Profile", href: "/admin/facility-profile", icon: Building04FreeIcons },
	{ label: "Integration Registry", href: "/admin/integration-registry", icon: Plug01FreeIcons },
	{ label: "HIM Operations", href: "/admin/him-ops", icon: CheckmarkSquare01FreeIcons },
	{ label: "Audit Trail", href: "/audit", icon: FileEditFreeIcons },
	{ label: "ARTA / SLA", href: "/admin/sla", icon: Timer02FreeIcons },
] as const

function QuickActions() {
	return (
		<div>
			<h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
				Quick Actions
			</h2>
			<div className="flex flex-wrap gap-2">
				{QUICK_ACTIONS.map(action => (
					<Link
						key={action.href}
						href={action.href}
						className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex items-center gap-1.5")}
					>
						<HugeiconsIcon icon={action.icon} className="size-4" />
						{action.label}
					</Link>
				))}
			</div>
		</div>
	)
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCardRow({ cards }: { cards: AdminSummaryCard[] }) {
	return (
		<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
			{cards.map(card => (
				<Card key={card.id} className="relative overflow-hidden">
					{card.severity === "critical" && (
						<div className="absolute inset-x-0 top-0 h-0.5 bg-destructive" />
					)}
					{card.severity === "warning" && (
						<div className="absolute inset-x-0 top-0 h-0.5 bg-yellow-500" />
					)}
					<CardContent className="pt-4">
						<div className="text-3xl font-bold tabular-nums">{card.value}</div>
						<div className="text-sm text-muted-foreground">{card.label}</div>
						{card.link && (
							<Link
								href={card.link}
								className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
							>
								View <HugeiconsIcon icon={ArrowRight01FreeIcons} className="size-3" />
							</Link>
						)}
					</CardContent>
				</Card>
			))}
		</div>
	)
}

// ── Alert List ────────────────────────────────────────────────────────────────

function AlertList({ alerts }: { alerts: AdminDashboardAlert[] }) {
	if (alerts.length === 0) {
		return (
			<Alert>
				<HugeiconsIcon icon={Shield01FreeIcons} className="size-4" />
				<AlertTitle>No active alerts</AlertTitle>
				<AlertDescription>All governance signals are within acceptable ranges.</AlertDescription>
			</Alert>
		)
	}

	return (
		<div className="space-y-2">
			{alerts.map(alert => (
				<Alert
					key={alert.id}
					variant={alert.severity === "critical" ? "destructive" : "default"}
					className={alert.severity === "warning" ? "border-yellow-500" : undefined}
				>
					<HugeiconsIcon icon={Alert02FreeIcons} className="size-4" />
					<AlertTitle className="flex items-center justify-between">
						{alert.title}
						{alert.link && (
							<Link href={alert.link} className="text-xs font-normal hover:underline">
								View →
							</Link>
						)}
					</AlertTitle>
					<AlertDescription>{alert.description}</AlertDescription>
				</Alert>
			))}
		</div>
	)
}

// ── Access Governance Widget ─────────────────────────────────────────────────

function AccessGovernanceWidget({ data }: { data: AccessGovernanceSection }) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
				<HugeiconsIcon icon={UserGroup02FreeIcons} className="size-5 text-muted-foreground" />
				<CardTitle className="text-sm font-medium">Access Governance</CardTitle>
				<Link href="/admin/users" className="ml-auto text-xs text-primary hover:underline">
					Manage users →
				</Link>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="grid grid-cols-2 gap-3">
					<StatBlock label="Active Users" value={data.activeUsers} href="/admin/users?isActive=true" />
					<StatBlock
						label="Inactive Users"
						value={data.inactiveUsers}
						href="/admin/users?isActive=false"
						severity={data.inactiveUsers > 0 ? "warning" : undefined}
					/>
					<StatBlock
						label="No Role Assigned"
						value={data.usersWithoutRole}
						severity={data.usersWithoutRole > 0 ? "critical" : undefined}
						href="/admin/users"
					/>
					<StatBlock
						label="Multi-Facility"
						value={data.multiFacilityUsers}
						href="/admin/users"
					/>
				</div>
				{data.recentRoleChanges.length > 0 && (
					<div>
						<p className="mb-1 text-xs font-medium text-muted-foreground">Recent role changes</p>
						<RecentChangeList items={data.recentRoleChanges} />
					</div>
				)}
				<div className="flex gap-2 pt-1">
					<Link href="/admin/users/new" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex items-center gap-1.5")}>
						<HugeiconsIcon icon={UserAddFreeIcons} className="size-4" />
						New User
					</Link>
					<Link href="/admin/roles" className={buttonVariants({ variant: "outline", size: "sm" })}>Roles & Permissions</Link>
				</div>
			</CardContent>
		</Card>
	)
}

// ── Platform Control Widget ───────────────────────────────────────────────────

function PlatformControlWidget({ data }: { data: PlatformControlSection }) {
	const profileBadge =
		data.facilityProfileCompleteness < 50
			? "critical"
			: data.facilityProfileCompleteness < 80
				? "warning"
				: "ok"

	return (
		<Card>
			<CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
				<HugeiconsIcon icon={Settings02FreeIcons} className="size-5 text-muted-foreground" />
				<CardTitle className="text-sm font-medium">Platform Control</CardTitle>
				<Link href="/admin/feature-flags" className="ml-auto text-xs text-primary hover:underline">
					Feature flags →
				</Link>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="grid grid-cols-2 gap-3">
					<StatBlock
						label="High-Risk Flags Active"
						value={data.highRiskFlagsEnabled}
						severity={data.highRiskFlagsEnabled > 0 ? "warning" : undefined}
						href="/admin/feature-flags"
					/>
					<div className="space-y-1">
						<p className="text-xs text-muted-foreground">Facility Profile</p>
						<div className="flex items-center gap-2">
							<div className="flex-1 bg-muted rounded-full h-2">
								<div
									className="h-2 rounded-full bg-primary"
									style={{ width: `${data.facilityProfileCompleteness}%` }}
								/>
							</div>
							<span className="text-xs tabular-nums">{data.facilityProfileCompleteness}%</span>
						</div>
						<SeverityBadge severity={profileBadge} />
					</div>
				</div>
				{data.missingCriticalSettings.length > 0 && (
					<div className="rounded-md border border-yellow-200 bg-yellow-50 p-2 dark:border-yellow-900 dark:bg-yellow-950">
						<p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
							Missing critical settings
						</p>
						<ul className="mt-0.5 list-disc list-inside space-y-0.5">
							{data.missingCriticalSettings.map(s => (
								<li key={s} className="text-xs text-yellow-700 dark:text-yellow-300">
									{s}
								</li>
							))}
						</ul>
					</div>
				)}
				{data.recentFlagChanges.length > 0 && (
					<div>
						<p className="mb-1 text-xs font-medium text-muted-foreground">Recent flag changes</p>
						<RecentChangeList items={data.recentFlagChanges} />
					</div>
				)}
				<div className="flex gap-2 pt-1">
					<Link href="/admin/settings" className={buttonVariants({ variant: "outline", size: "sm" })}>Settings</Link>
					<Link href="/admin/facility-profile" className={buttonVariants({ variant: "outline", size: "sm" })}>Facility Profile</Link>
				</div>
			</CardContent>
		</Card>
	)
}

// ── Integration Health Widget ─────────────────────────────────────────────────

function IntegrationsWidget({ data, canViewFhir }: { data: IntegrationHealthSection; canViewFhir: boolean }) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
				<HugeiconsIcon icon={Plug01FreeIcons} className="size-5 text-muted-foreground" />
				<CardTitle className="text-sm font-medium">Integrations</CardTitle>
				<Link
					href="/admin/integration-registry"
					className="ml-auto text-xs text-primary hover:underline"
				>
					Registry →
				</Link>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="grid grid-cols-2 gap-3">
					<StatBlock
						label="Failed"
						value={data.failedCount}
						severity={data.failedCount > 0 ? "critical" : undefined}
						href="/admin/integration-registry"
					/>
					<StatBlock
						label="Disabled"
						value={data.disabledCount}
						severity={data.disabledCount > 0 ? "warning" : undefined}
						href="/admin/integration-registry"
					/>
					<StatBlock
						label="Missing Credentials"
						value={data.missingCredentialsCount}
						severity={data.missingCredentialsCount > 0 ? "warning" : undefined}
						href="/admin/integration-registry"
					/>
					<StatBlock
						label="Stale Sync (24h)"
						value={data.staleCount}
						severity={data.staleCount > 0 ? "warning" : undefined}
						href="/admin/integration-registry"
					/>
				</div>
				{data.fhirFailures > 0 && (
					<div className="rounded-md border border-destructive/30 bg-destructive/10 p-2">
						<p className="text-xs font-medium text-destructive">
							FHIR/NHDR export failures: {data.fhirFailures}
						</p>
						{canViewFhir && (
							<Link href="/admin/fhir" className="text-xs text-destructive hover:underline">
								View FHIR status →
							</Link>
						)}
					</div>
				)}
				<Link href="/admin/integration-registry" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-1")}>Manage Integrations</Link>
			</CardContent>
		</Card>
	)
}

// ── Audit & Break-Glass Widget ────────────────────────────────────────────────

function AuditWidget({ data }: { data: AuditSummarySection }) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
				<HugeiconsIcon icon={FileEditFreeIcons} className="size-5 text-muted-foreground" />
				<CardTitle className="text-sm font-medium">Privacy & Audit</CardTitle>
				<Link href="/audit" className="ml-auto text-xs text-primary hover:underline">
					Full audit trail →
				</Link>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="grid grid-cols-2 gap-3">
					<StatBlock
						label="Break-Glass (7d)"
						value={data.breakGlassEventCount}
						severity={data.breakGlassEventCount > 0 ? "warning" : undefined}
						href="/audit/break-glass"
					/>
					<StatBlock
						label="Audit Events (7d)"
						value={data.highSeverityEventCount}
						href="/audit"
					/>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<StatBlock
						label="Pending Reviews"
						value={data.pendingBreakGlassReviews}
						severity={data.pendingBreakGlassReviews > 0 ? "warning" : undefined}
						href="/audit/break-glass"
					/>
					<StatBlock
						label="Flagged Events (7d)"
						value={data.flaggedBreakGlassEvents}
						severity={data.flaggedBreakGlassEvents > 0 ? "critical" : undefined}
						href="/audit/break-glass"
					/>
				</div>
				{!data.consentEnforced && (
					<div className="rounded-md border border-yellow-400/40 bg-yellow-50 px-3 py-2 dark:bg-yellow-900/20">
						<p className="text-xs text-yellow-800 dark:text-yellow-200">
							DPA consent enforcement is disabled — exports are not gated by patient consent.
						</p>
					</div>
				)}
				{data.recentPrivilegedChanges.length > 0 && (
					<div>
						<p className="mb-1 text-xs font-medium text-muted-foreground">
							Recent privileged changes
						</p>
						<RecentChangeList items={data.recentPrivilegedChanges} />
					</div>
				)}
				<div className="flex gap-2 pt-1">
					<Link href="/audit/break-glass" className={buttonVariants({ variant: "outline", size: "sm" })}>Break-Glass Review</Link>
					<Link href="/audit" className={buttonVariants({ variant: "outline", size: "sm" })}>Audit Trail</Link>
					<Link href="/admin/export-compliance" className={buttonVariants({ variant: "outline", size: "sm" })}>Export Audit</Link>
				</div>
			</CardContent>
		</Card>
	)
}

// ── ARTA / SLA Widget ─────────────────────────────────────────────────────────

function ArtaSlaWidget({ data }: { data: ArtaSlaSection }) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
				<HugeiconsIcon icon={Timer02FreeIcons} className="size-5 text-muted-foreground" />
				<CardTitle className="text-sm font-medium">ARTA / SLA Monitoring</CardTitle>
				<Link href="/admin/sla" className="ml-auto text-xs text-primary hover:underline">
					SLA admin →
				</Link>
			</CardHeader>
			<CardContent>
				{!data.dataAvailable ? (
					<div className="flex h-24 flex-col items-center justify-center rounded-md bg-muted/50 text-center">
						<HugeiconsIcon icon={ChartFreeIcons} className="mb-1 size-5 text-muted-foreground" />
						<p className="text-sm text-muted-foreground">
							SLA event data not yet available
						</p>
						<p className="text-xs text-muted-foreground">
							Configure SLA targets for this facility to enable monitoring
						</p>
					</div>
				) : (
					<div className="space-y-3">
						<div className="grid grid-cols-2 gap-3">
							<StatBlock
								label="Active Breaches"
								value={data.activeBreaches}
								severity={data.activeBreaches > 0 ? "critical" : undefined}
							href="/admin/sla"
						/>
						<StatBlock
							label="Overdue Queues"
							value={data.overdueQueues}
							severity={data.overdueQueues > 0 ? "warning" : undefined}
							href="/admin/sla"
							/>
						</div>
						{data.queueBreakdown.length > 0 && (
							<div className="space-y-1.5">
								<p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
									Queue breakdown
								</p>
								<div className="space-y-1">
									{data.queueBreakdown.map(q => (
										<div key={q.workflow} className="flex flex-col gap-0.5">
											<div className="flex items-center justify-between text-xs">
												<span className="text-muted-foreground capitalize truncate max-w-[100px]" title={q.label}>
													{q.label}
												</span>
												<div className="flex items-center gap-1 text-[10px] font-medium">
													{!q.instrumented && (
														<span className="rounded px-1 bg-muted text-muted-foreground italic">
															Pipeline pending
														</span>
													)}
													{q.instrumented && q.onTime > 0 && (
														<span className="rounded px-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
															{q.onTime} on-time
														</span>
													)}
													{q.instrumented && q.approaching > 0 && (
														<span className="rounded px-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
															{q.approaching} approaching
														</span>
													)}
													{q.instrumented && q.exceeded > 0 && (
														<span className="rounded px-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
															{q.exceeded} exceeded
														</span>
													)}
													{q.instrumented && q.onTime === 0 && q.approaching === 0 && q.exceeded === 0 && (
														<span className="text-muted-foreground">—</span>
													)}
												</div>
											</div>
											{/* AD-014: Show open steps from encounterStatusEvents */}
											{q.openSteps && q.openSteps.length > 0 && (
												<div className="pl-2 border-l border-muted ml-1 space-y-0.5">
													{q.openSteps.map(s => (
														<div key={s.step} className="flex items-center justify-between text-[10px] text-muted-foreground">
															<span className="capitalize">{s.step.replaceAll("_", " ")}</span>
															<span className="font-medium">{s.count} open</span>
														</div>
													))}
												</div>
											)}
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				)}
				<Link href="/admin/sla" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}>ARTA / SLA Admin</Link>
			</CardContent>
		</Card>
	)
}

// ── Offline Readiness Widget ──────────────────────────────────────────────────

function OfflineReadinessWidget({ data }: { data: OfflineReadinessSection }) {
	const statusConfig = {
		healthy: { label: "Healthy", badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
		disabled: { label: "Disabled", badgeClass: "bg-muted text-muted-foreground" },
		stale: { label: "Stale", badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
		degraded: { label: "Degraded", badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
	}[data.status]

	return (
		<Card>
			<CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
				<HugeiconsIcon icon={Database02FreeIcons} className="size-5 text-muted-foreground" />
				<CardTitle className="text-sm font-medium">Offline Continuity</CardTitle>
				<Badge className={`ml-auto text-[10px] px-1.5 ${statusConfig.badgeClass}`}>
					{statusConfig.label}
				</Badge>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="space-y-1.5 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">Cache enabled</span>
						<span className="font-medium">{data.enabled ? "Yes" : "No"}</span>
					</div>
					{data.maxOfflineDays !== null && (
						<div className="flex justify-between">
							<span className="text-muted-foreground">Max offline days</span>
							<span className="font-medium">{data.maxOfflineDays}d</span>
						</div>
					)}
					<div className="flex justify-between">
						<span className="text-muted-foreground">Last cache prepared</span>
						<span className="font-medium text-muted-foreground italic">
							{data.lastCachePreparedAt
								? new Date(data.lastCachePreparedAt).toLocaleDateString("en-PH")
								: "Not tracked"}
						</span>
					</div>
				</div>
				{data.status === "disabled" && (
					<p className="text-xs text-muted-foreground">
						Enable offline cache in System Settings to support continuity during outages.
					</p>
				)}
				<div className="flex gap-2 pt-1">
					<Link
						href="/admin/offline"
						className={cn(buttonVariants({ variant: "default", size: "sm" }), "flex-1")}
					>
						View Details
					</Link>
					<Link
						href="/admin/settings"
						className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}
					>
						Configure
					</Link>
				</div>
			</CardContent>
		</Card>
	)
}

// ── Statutory Reporting Widget ────────────────────────────────────────────────

function StatutoryReadinessWidget({ data, canViewFhir }: { data: StatutoryReadinessSection; canViewFhir: boolean }) {
	const domains = [data.fhirNhdr, data.philhealth, data.hai, data.pidsr, data.civilRegistry]

	const statusBadge = (status: StatutoryReadinessSection["fhirNhdr"]["status"]) => {
		switch (status) {
			case "ready":
				return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-[10px] px-1">Ready</Badge>
			case "warning":
				return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-[10px] px-1">Warning</Badge>
			case "blocked":
				return <Badge variant="destructive" className="text-[10px] px-1">Blocked</Badge>
			case "degraded":
				return <Badge variant="destructive" className="text-[10px] px-1">Degraded</Badge>
			case "not_configured":
				return <Badge variant="outline" className="text-[10px] px-1">Not Configured</Badge>
		}
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
				<HugeiconsIcon icon={Shield01FreeIcons} className="size-5 text-muted-foreground" />
				<CardTitle className="text-sm font-medium">Statutory Reporting</CardTitle>
				<Link href="/admin/integration-registry" className="ml-auto text-xs text-primary hover:underline">
					Integrations →
				</Link>
			</CardHeader>
			<CardContent className="space-y-2">
				{domains.map(domain => (
					<div key={domain.name} className="flex items-center justify-between gap-2">
						<div className="min-w-0 flex-1">
							<span className="text-sm truncate">{domain.name}</span>
							{domain.detail && (
								<p className="text-xs text-muted-foreground truncate">{domain.detail}</p>
							)}
						</div>
						{statusBadge(domain.status)}
					</div>
				))}
				<div className="flex gap-2 pt-1">
					{canViewFhir && (
						<Link
							href="/admin/fhir"
							className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
						>
							FHIR Export
						</Link>
					)}
					<Link
						href="/admin/civil-registry"
						className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
					>
						Civil Registry
					</Link>
				</div>
			</CardContent>
		</Card>
	)
}

// ── Statutory Operations Widget (AD-001) ──────────────────────────────────────

function StatutoryOpsWidget({ data }: { data: StatutoryOpsSection }) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
				<HugeiconsIcon icon={News01FreeIcons} className="size-5 text-muted-foreground" />
				<CardTitle className="text-sm font-medium">Statutory Reporting Ops</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* PIDSR */}
				<div>
					<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
						PIDSR
					</p>
					<div className="grid grid-cols-2 gap-2">
						<StatBlock label="Category 1" value={data.pidsr.category1Count} href="/reporting/pidsr" />
						<StatBlock label="Category 2" value={data.pidsr.category2Count} href="/reporting/pidsr" />
						<StatBlock
							label="Draft"
							value={data.pidsr.draftCount}
							severity={data.pidsr.draftCount > 5 ? "warning" : undefined}
							href="/reporting/pidsr"
						/>
						<StatBlock label="Submitted" value={data.pidsr.submittedCount} href="/reporting/pidsr" />
					</div>
					{data.pidsr.blockedOrRejected && (
						<div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
							<HugeiconsIcon icon={FlashFreeIcons} className="size-3.5" />
							<span>One or more PIDSR reports are blocked / rejected</span>
						</div>
					)}
					{data.pidsr.lastSubmittedAt && (
						<p className="mt-1.5 text-[11px] text-muted-foreground">
							Last submitted: {new Date(data.pidsr.lastSubmittedAt).toLocaleDateString("en-PH")}
						</p>
					)}
				</div>

				{/* AHSR (AD-002 + AD-003) */}
				<div>
					<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
						AHSR
					</p>
					<div className="grid grid-cols-3 gap-2">
						<StatBlock label="Snapshots" value={data.ahsr.snapshotCount} href="/reporting" />
						<div className="space-y-0.5 p-1">
							<div className="text-xs text-muted-foreground">Last snapshot</div>
							<div className="text-sm font-medium">{data.ahsr.lastSnapshotMonth ?? "—"}</div>
						</div>
						<div className="space-y-0.5 p-1">
							<div className="text-xs text-muted-foreground">This month</div>
							<div className={cn(
								"text-sm font-medium",
								data.ahsr.currentMonthReady
									? "text-green-600 dark:text-green-400"
									: "text-muted-foreground"
							)}>
								{data.ahsr.currentMonthReady ? "Ready" : "Not ready"}
							</div>
						</div>
					</div>
					{/* AD-003: Current-year statutory metrics */}
					{(data.ahsr.currentYearBor !== null || data.ahsr.currentYearGrossDeathRate !== null) && (
						<div className="mt-2 space-y-1">
							{data.ahsr.currentYearBor !== null && (
								<div className="flex justify-between text-xs">
									<span className="text-muted-foreground">Bed Occupancy Rate</span>
									<span className="font-medium">{data.ahsr.currentYearBor.toFixed(1)}%</span>
								</div>
							)}
							{data.ahsr.currentYearGrossDeathRate !== null && (
								<div className="flex justify-between text-xs">
									<span className="text-muted-foreground">Gross Death Rate</span>
									<span className="font-medium">{data.ahsr.currentYearGrossDeathRate.toFixed(2)}‰</span>
								</div>
							)}
							{data.ahsr.currentYearNetDeathRate !== null && (
								<div className="flex justify-between text-xs">
									<span className="text-muted-foreground">Net Death Rate</span>
									<span className="font-medium">{data.ahsr.currentYearNetDeathRate.toFixed(2)}‰</span>
								</div>
							)}
						</div>
					)}
					{data.ahsr.topMorbidities.length > 0 && (
						<div className="mt-2">
							<p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Top Morbidities</p>
							<div className="space-y-0.5">
								{data.ahsr.topMorbidities.slice(0, 5).map(item => (
									<div key={item.icdCode} className="flex items-center justify-between text-xs">
										<span className="text-muted-foreground truncate max-w-[130px]" title={item.diseaseName}>{item.diseaseName}</span>
										<span className="font-medium">{item.count}</span>
									</div>
								))}
							</div>
						</div>
					)}
					{data.ahsr.topMortalities.length > 0 && (
						<div className="mt-2">
							<p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Top Mortalities</p>
							<div className="space-y-0.5">
								{data.ahsr.topMortalities.slice(0, 5).map(item => (
									<div key={item.icdCode} className="flex items-center justify-between text-xs">
										<span className="text-muted-foreground truncate max-w-[130px]" title={item.diseaseName}>{item.diseaseName}</span>
										<span className="font-medium">{item.count}</span>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* HAI */}
				<div>
					<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
						HAI Surveillance
					</p>
					<div className="grid grid-cols-3 gap-2">
						<StatBlock label="Open" value={data.hai.openSurveillanceCount} />
						<StatBlock label="Reviewed" value={data.hai.reviewedCount} />
						<StatBlock
							label="Pending"
							value={data.hai.pendingCount}
							severity={data.hai.pendingCount > 0 ? "warning" : undefined}
						/>
					</div>
					{data.hai.byType.length > 0 && (
						<div className="mt-2 space-y-1">
							{data.hai.byType.slice(0, 3).map(t => (
								<div key={t.type} className="flex justify-between text-xs">
									<span className="text-muted-foreground capitalize">{t.type.replaceAll("_", " ")}</span>
									<span className="font-medium">{t.count}</span>
								</div>
							))}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	)
}

// ── Data Quality Widget (AD-002) ──────────────────────────────────────────────

function DataQualityWidget({ data }: { data: DataQualitySection }) {
	const hasIssues = data.missingIcd10Count > 0 || data.missingRvsCount > 0 || data.cf4DraftCount > 10

	return (
		<Card>
			<CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
				<HugeiconsIcon icon={CheckmarkSquare01FreeIcons} className="size-5 text-muted-foreground" />
				<CardTitle className="text-sm font-medium">Clinical Data Quality</CardTitle>
				{hasIssues && (
					<Badge className="ml-auto text-[10px] px-1.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
						Issues
					</Badge>
				)}
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="space-y-1.5 text-sm">
					<div className="flex justify-between items-center">
						<span className="text-muted-foreground text-xs">Missing ICD-10</span>
						<span className={cn("font-medium text-sm", data.missingIcd10Count > 0 && "text-yellow-600 dark:text-yellow-400")}>
							{data.missingIcd10Count}
						</span>
					</div>
					<div className="flex justify-between items-center">
						<span className="text-muted-foreground text-xs">Missing RVS code</span>
						<span className={cn("font-medium text-sm", data.missingRvsCount > 0 && "text-yellow-600 dark:text-yellow-400")}>
							{data.missingRvsCount}
						</span>
					</div>
					<div className="flex justify-between items-center">
						<span className="text-muted-foreground text-xs">CF4 drafts</span>
						<span className={cn("font-medium text-sm", data.cf4DraftCount > 10 && "text-yellow-600 dark:text-yellow-400")}>
							{data.cf4DraftCount}
						</span>
					</div>
					<div className="flex justify-between items-center">
						<span className="text-muted-foreground text-xs">CF4 submitted (this month)</span>
						<span className="font-medium text-sm">{data.cf4SubmittedThisMonth}</span>
					</div>
				</div>

				<div className="rounded-md bg-muted/50 p-2 space-y-1">
					<p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">AHSR</p>
					<div className="flex justify-between items-center text-xs">
						<span className="text-muted-foreground">Last snapshot</span>
						<span className="font-medium">{data.ahsrLastSnapshotMonth ?? "None"}</span>
					</div>
					<div className="flex justify-between items-center text-xs">
						<span className="text-muted-foreground">Current month ready</span>
						<span className={cn("font-medium", data.ahsrCurrentMonthReady ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}>
							{data.ahsrCurrentMonthReady ? "Yes" : "No"}
						</span>
					</div>
				</div>

				<Link href="/admin/data-quality" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}>
					Review Data Quality
				</Link>
				<Link href="/admin/medication-compliance" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}>
					Medication Compliance
				</Link>
			</CardContent>
		</Card>
	)
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function StatBlock({
	label,
	value,
	href,
	severity,
}: {
	label: string
	value: number
	href?: string
	severity?: "ok" | "warning" | "critical"
}) {
	const valueClass =
		severity === "critical"
			? "text-destructive"
			: severity === "warning"
				? "text-yellow-600 dark:text-yellow-400"
				: ""

	const content = (
		<div className="space-y-0.5">
			<div className={`text-2xl font-bold tabular-nums ${valueClass}`}>{value}</div>
			<div className="text-xs text-muted-foreground">{label}</div>
		</div>
	)

	if (href) {
		return (
			<Link href={href} className="block rounded-md p-1 hover:bg-muted/50 transition-colors">
				{content}
			</Link>
		)
	}
	return <div className="p-1">{content}</div>
}

function SeverityBadge({ severity }: { severity: "ok" | "warning" | "critical" }) {
	if (severity === "ok") return <Badge variant="secondary">Complete</Badge>
	if (severity === "warning") return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200">Incomplete</Badge>
	return <Badge variant="destructive">Incomplete</Badge>
}

function RecentChangeList({ items }: { items: RecentChange[] }) {
	return (
		<ul className="space-y-1">
			{items.slice(0, 3).map(item => (
				<li key={item.id} className="flex items-start gap-1.5 text-xs">
					<span className="mt-0.5 size-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
					<span className="text-foreground/80 line-clamp-1">{item.description}</span>
				</li>
			))}
		</ul>
	)
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function AdminDashboardSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} className="h-24 rounded-lg" />
				))}
			</div>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={i} className="h-52 rounded-lg" />
				))}
			</div>
		</div>
	)
}

// ── Root component ────────────────────────────────────────────────────────────

export function AdminDashboard() {
	const { data, isLoading, isError } = useAdminDashboardSummaryQuery()
	const { data: profile } = useMyProfile()

	const permissions = profile?.activeRole?.permissions ?? []
	const permSet = new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
	const canViewFhir = permSet.has("fhir:view")

	if (isLoading) return <AdminDashboardSkeleton />

	if (isError || !data) {
		return (
			<Alert variant="destructive">
				<HugeiconsIcon icon={Alert02FreeIcons} className="size-4" />
				<AlertTitle>Failed to load dashboard</AlertTitle>
				<AlertDescription>
					Could not fetch admin summary data. Check your connection and try refreshing.
				</AlertDescription>
			</Alert>
		)
	}

	return (
		<div className="space-y-6">
			{/* Quick actions rail */}
			<QuickActions />

			{/* Summary cards */}
			<SummaryCardRow cards={data.summaryCards} />

			{/* Alerts */}
			{data.alerts.length > 0 && (
				<div>
					<h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
						Active Alerts
					</h2>
					<AlertList alerts={data.alerts} />
				</div>
			)}

			{/* Governance widgets grid */}
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				<AccessGovernanceWidget data={data.accessGovernance} />
				<PlatformControlWidget data={data.platformControl} />
				<IntegrationsWidget data={data.integrations} canViewFhir={canViewFhir} />
				<AuditWidget data={data.audit} />
				<ArtaSlaWidget data={data.artaSla} />
				<OfflineReadinessWidget data={data.offlineReadiness} />
				<StatutoryReadinessWidget data={data.statutoryReadiness} canViewFhir={canViewFhir} />
				<StatutoryOpsWidget data={data.statutoryOps} />
				<DataQualityWidget data={data.dataQuality} />
			</div>
		</div>
	)
}

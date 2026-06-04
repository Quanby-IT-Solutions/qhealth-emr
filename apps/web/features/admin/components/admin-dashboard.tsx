"use client"

import Link from "next/link"
import {
	Alert02FreeIcons,
	ArrowRight01FreeIcons,
	Building04FreeIcons,
	ChartFreeIcons,
	DashboardSquare01FreeIcons,
	Database02FreeIcons,
	FileEditFreeIcons,
	FlagFreeIcons,
	LockFreeIcons,
	Plug01FreeIcons,
	Settings02FreeIcons,
	Shield01FreeIcons,
	Timer02FreeIcons,
	UserAddFreeIcons,
	UserBlock02FreeIcons,
	UserCircleFreeIcons,
	UserGroup02FreeIcons,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import type {
	AccessGovernanceSection,
	AdminDashboardAlert,
	AdminDashboardSummary,
	AdminSummaryCard,
	ArtaSlaSection,
	AuditSummarySection,
	IntegrationHealthSection,
	OfflineReadinessSection,
	PlatformControlSection,
	RecentChange,
} from "@repo/contracts"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { buttonVariants } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import { cn } from "@/core/lib/utils"
import { useAdminDashboardSummaryQuery } from "@/features/admin/api/admin-dashboard.hooks"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

// ── Quick Actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
	{ label: "Create User", href: "/admin/users/new", icon: UserAddFreeIcons },
	{ label: "Inactive Users", href: "/admin/users?isActive=false", icon: UserBlock02FreeIcons },
	{ label: "Roles & Permissions", href: "/admin/roles", icon: LockFreeIcons },
	{ label: "Feature Flags", href: "/admin/feature-flags", icon: FlagFreeIcons },
	{ label: "System Settings", href: "/admin/settings", icon: Settings02FreeIcons },
	{ label: "Facility Profile", href: "/admin/facility-profile", icon: Building04FreeIcons },
	{ label: "Integration Registry", href: "/admin/integration-registry", icon: Plug01FreeIcons },
	{ label: "Audit Trail", href: "/audit", icon: FileEditFreeIcons },
	{ label: "ARTA / SLA", href: "/admin/sla", icon: Timer02FreeIcons },
] as const

function QuickActions() {
	return (
		<div>
			<h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
				Quick Actions
			</h2>
			<div className="flex flex-wrap gap-2">
				{QUICK_ACTIONS.map(action => (
					<Link
						key={action.href}
						href={action.href}
						className={cn(
							buttonVariants({ variant: "outline", size: "sm" }),
							"flex items-center gap-1.5"
						)}
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
						<div className="bg-destructive absolute inset-x-0 top-0 h-0.5" />
					)}
					{card.severity === "warning" && (
						<div className="absolute inset-x-0 top-0 h-0.5 bg-yellow-500" />
					)}
					<CardContent className="pt-4">
						<div className="text-3xl font-bold tabular-nums">{card.value}</div>
						<div className="text-muted-foreground text-sm">{card.label}</div>
						{card.link && (
							<Link
								href={card.link}
								className="text-primary mt-1 flex items-center gap-1 text-xs hover:underline"
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
				<HugeiconsIcon icon={UserGroup02FreeIcons} className="text-muted-foreground size-5" />
				<CardTitle className="text-sm font-medium">Access Governance</CardTitle>
				<Link href="/admin/users" className="text-primary ml-auto text-xs hover:underline">
					Manage users →
				</Link>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="grid grid-cols-2 gap-3">
					<StatBlock
						label="Active Users"
						value={data.activeUsers}
						href="/admin/users?isActive=true"
					/>
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
					<StatBlock label="Multi-Facility" value={data.multiFacilityUsers} href="/admin/users" />
				</div>
				{data.recentRoleChanges.length > 0 && (
					<div>
						<p className="text-muted-foreground mb-1 text-xs font-medium">Recent role changes</p>
						<RecentChangeList items={data.recentRoleChanges} />
					</div>
				)}
				<div className="flex gap-2 pt-1">
					<Link
						href="/admin/users/new"
						className={cn(
							buttonVariants({ variant: "outline", size: "sm" }),
							"flex items-center gap-1.5"
						)}
					>
						<HugeiconsIcon icon={UserAddFreeIcons} className="size-4" />
						New User
					</Link>
					<Link href="/admin/roles" className={buttonVariants({ variant: "outline", size: "sm" })}>
						Roles & Permissions
					</Link>
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
				<HugeiconsIcon icon={Settings02FreeIcons} className="text-muted-foreground size-5" />
				<CardTitle className="text-sm font-medium">Platform Control</CardTitle>
				<Link href="/admin/feature-flags" className="text-primary ml-auto text-xs hover:underline">
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
						<p className="text-muted-foreground text-xs">Facility Profile</p>
						<div className="flex items-center gap-2">
							<div className="bg-muted h-2 flex-1 rounded-full">
								<div
									className="bg-primary h-2 rounded-full"
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
						<ul className="mt-0.5 list-inside list-disc space-y-0.5">
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
						<p className="text-muted-foreground mb-1 text-xs font-medium">Recent flag changes</p>
						<RecentChangeList items={data.recentFlagChanges} />
					</div>
				)}
				<div className="flex gap-2 pt-1">
					<Link
						href="/admin/settings"
						className={buttonVariants({ variant: "outline", size: "sm" })}
					>
						Settings
					</Link>
					<Link
						href="/admin/facility-profile"
						className={buttonVariants({ variant: "outline", size: "sm" })}
					>
						Facility Profile
					</Link>
				</div>
			</CardContent>
		</Card>
	)
}

// ── Integration Health Widget ─────────────────────────────────────────────────

function IntegrationsWidget({
	data,
	canViewFhir,
}: {
	data: IntegrationHealthSection
	canViewFhir: boolean
}) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
				<HugeiconsIcon icon={Plug01FreeIcons} className="text-muted-foreground size-5" />
				<CardTitle className="text-sm font-medium">Integrations</CardTitle>
				<Link
					href="/admin/integration-registry"
					className="text-primary ml-auto text-xs hover:underline"
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
					<div className="border-destructive/30 bg-destructive/10 rounded-md border p-2">
						<p className="text-destructive text-xs font-medium">
							FHIR/NHDR export failures: {data.fhirFailures}
						</p>
						{canViewFhir && (
							<Link href="/admin/fhir" className="text-destructive text-xs hover:underline">
								View FHIR status →
							</Link>
						)}
					</div>
				)}
				<Link
					href="/admin/integration-registry"
					className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-1")}
				>
					Manage Integrations
				</Link>
			</CardContent>
		</Card>
	)
}

// ── Audit & Break-Glass Widget ────────────────────────────────────────────────

function AuditWidget({ data }: { data: AuditSummarySection }) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
				<HugeiconsIcon icon={FileEditFreeIcons} className="text-muted-foreground size-5" />
				<CardTitle className="text-sm font-medium">Privacy & Audit</CardTitle>
				<Link href="/audit" className="text-primary ml-auto text-xs hover:underline">
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
					<StatBlock label="Audit Events (7d)" value={data.highSeverityEventCount} href="/audit" />
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
						<p className="text-muted-foreground mb-1 text-xs font-medium">
							Recent privileged changes
						</p>
						<RecentChangeList items={data.recentPrivilegedChanges} />
					</div>
				)}
				<div className="flex gap-2 pt-1">
					<Link
						href="/audit/break-glass"
						className={buttonVariants({ variant: "outline", size: "sm" })}
					>
						Break-Glass Review
					</Link>
					<Link href="/audit" className={buttonVariants({ variant: "outline", size: "sm" })}>
						Audit Trail
					</Link>
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
				<HugeiconsIcon icon={Timer02FreeIcons} className="text-muted-foreground size-5" />
				<CardTitle className="text-sm font-medium">ARTA / SLA Monitoring</CardTitle>
				<Link href="/admin/sla" className="text-primary ml-auto text-xs hover:underline">
					SLA admin →
				</Link>
			</CardHeader>
			<CardContent>
				{!data.dataAvailable ? (
					<div className="bg-muted/50 flex h-24 flex-col items-center justify-center rounded-md text-center">
						<HugeiconsIcon icon={ChartFreeIcons} className="text-muted-foreground mb-1 size-5" />
						<p className="text-muted-foreground text-sm">SLA event data not yet available</p>
						<p className="text-muted-foreground text-xs">
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
								<p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
									Queue breakdown
								</p>
								<div className="space-y-1">
									{data.queueBreakdown.map(q => (
										<div key={q.workflow} className="flex flex-col gap-0.5">
											<div className="flex items-center justify-between text-xs">
												<span
													className="text-muted-foreground max-w-[100px] truncate capitalize"
													title={q.label}
												>
													{q.label}
												</span>
												<div className="flex items-center gap-1 text-[10px] font-medium">
													{!q.instrumented && (
														<span className="bg-muted text-muted-foreground rounded px-1 italic">
															Pipeline pending
														</span>
													)}
													{q.instrumented && q.onTime > 0 && (
														<span className="rounded bg-green-100 px-1 text-green-700 dark:bg-green-900/30 dark:text-green-400">
															{q.onTime} on-time
														</span>
													)}
													{q.instrumented && q.approaching > 0 && (
														<span className="rounded bg-yellow-100 px-1 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
															{q.approaching} approaching
														</span>
													)}
													{q.instrumented && q.exceeded > 0 && (
														<span className="rounded bg-red-100 px-1 text-red-700 dark:bg-red-900/30 dark:text-red-400">
															{q.exceeded} exceeded
														</span>
													)}
													{q.instrumented &&
														q.onTime === 0 &&
														q.approaching === 0 &&
														q.exceeded === 0 && <span className="text-muted-foreground">—</span>}
												</div>
											</div>
											{/* AD-014: Show open steps from encounterStatusEvents */}
											{q.openSteps && q.openSteps.length > 0 && (
												<div className="border-muted ml-1 space-y-0.5 border-l pl-2">
													{q.openSteps.map(s => (
														<div
															key={s.step}
															className="text-muted-foreground flex items-center justify-between text-[10px]"
														>
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
				<Link
					href="/admin/sla"
					className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}
				>
					ARTA / SLA Admin
				</Link>
			</CardContent>
		</Card>
	)
}

// ── Offline Readiness Widget ──────────────────────────────────────────────────

function OfflineReadinessWidget({ data }: { data: OfflineReadinessSection }) {
	const statusConfig = {
		healthy: {
			label: "Healthy",
			badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
		},
		disabled: { label: "Disabled", badgeClass: "bg-muted text-muted-foreground" },
		stale: {
			label: "Stale",
			badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
		},
		degraded: {
			label: "Degraded",
			badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
		},
	}[data.status]

	return (
		<Card>
			<CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
				<HugeiconsIcon icon={Database02FreeIcons} className="text-muted-foreground size-5" />
				<CardTitle className="text-sm font-medium">Offline Continuity</CardTitle>
				<Badge className={`ml-auto px-1.5 text-[10px] ${statusConfig.badgeClass}`}>
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
						<span className="text-muted-foreground font-medium italic">
							{data.lastCachePreparedAt
								? new Date(data.lastCachePreparedAt).toLocaleDateString("en-PH")
								: "Not tracked"}
						</span>
					</div>
				</div>
				{data.status === "disabled" && (
					<p className="text-muted-foreground text-xs">
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
			<div className="text-muted-foreground text-xs">{label}</div>
		</div>
	)

	if (href) {
		return (
			<Link href={href} className="hover:bg-muted/50 block rounded-md p-1 transition-colors">
				{content}
			</Link>
		)
	}
	return <div className="p-1">{content}</div>
}

function SeverityBadge({ severity }: { severity: "ok" | "warning" | "critical" }) {
	if (severity === "ok") return <Badge variant="secondary">Complete</Badge>
	if (severity === "warning")
		return (
			<Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200">
				Incomplete
			</Badge>
		)
	return <Badge variant="destructive">Incomplete</Badge>
}

function RecentChangeList({ items }: { items: RecentChange[] }) {
	return (
		<ul className="space-y-1">
			{items.slice(0, 3).map(item => (
				<li key={item.id} className="flex items-start gap-1.5 text-xs">
					<span className="bg-muted-foreground/40 mt-0.5 size-1.5 flex-shrink-0 rounded-full" />
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
	const permSet = new Set(
		permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
	)
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
					<h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
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
			</div>
		</div>
	)
}

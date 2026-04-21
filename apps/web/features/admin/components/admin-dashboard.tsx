"use client"

import Link from "next/link"
import {
	Alert02FreeIcons,
	ArrowRight01FreeIcons,
	Building04FreeIcons,
	ChartFreeIcons,
	Database02FreeIcons,
	DashboardSquare01FreeIcons,
	FileEditFreeIcons,
	FlagFreeIcons,
	Plug01FreeIcons,
	LockFreeIcons,
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
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"

import { useAdminDashboardSummaryQuery } from "@/features/admin/api/admin-dashboard.hooks"
import type {
	AdminDashboardSummary,
	AdminDashboardAlert,
	AdminSummaryCard,
	AccessGovernanceSection,
	PlatformControlSection,
	IntegrationHealthSection,
	AuditSummarySection,
	ArtaSlaSection,
	RecentChange,
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
	{ label: "Audit Trail", href: "/audit", icon: FileEditFreeIcons },
	{ label: "SLA Dashboard", href: "/sla", icon: Timer02FreeIcons },
] as const

function QuickActions() {
	return (
		<div>
			<h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
				Quick Actions
			</h2>
			<div className="flex flex-wrap gap-2">
				{QUICK_ACTIONS.map(action => (
					<Button key={action.href} variant="outline" size="sm" asChild>
						<Link href={action.href} className="flex items-center gap-1.5">
							<HugeiconsIcon icon={action.icon} className="size-4" />
							{action.label}
						</Link>
					</Button>
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
					<Button variant="outline" size="sm" asChild>
						<Link href="/admin/users/new">
							<HugeiconsIcon icon={UserAddFreeIcons} className="size-4" />
							New User
						</Link>
					</Button>
					<Button variant="outline" size="sm" asChild>
						<Link href="/admin/roles">Roles & Permissions</Link>
					</Button>
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
					<Button variant="outline" size="sm" asChild>
						<Link href="/admin/settings">Settings</Link>
					</Button>
					<Button variant="outline" size="sm" asChild>
						<Link href="/admin/facility-profile">Facility Profile</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}

// ── Integration Health Widget ─────────────────────────────────────────────────

function IntegrationsWidget({ data }: { data: IntegrationHealthSection }) {
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
						<Link href="/admin/fhir" className="text-xs text-destructive hover:underline">
							View FHIR status →
						</Link>
					</div>
				)}
				<Button variant="outline" size="sm" asChild className="mt-1">
					<Link href="/admin/integration-registry">Manage Integrations</Link>
				</Button>
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
				{data.recentPrivilegedChanges.length > 0 && (
					<div>
						<p className="mb-1 text-xs font-medium text-muted-foreground">
							Recent privileged changes
						</p>
						<RecentChangeList items={data.recentPrivilegedChanges} />
					</div>
				)}
				<div className="flex gap-2 pt-1">
					<Button variant="outline" size="sm" asChild>
						<Link href="/audit/break-glass">Break-Glass Review</Link>
					</Button>
					<Button variant="outline" size="sm" asChild>
						<Link href="/audit">Audit Trail</Link>
					</Button>
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
				<Link href="/sla" className="ml-auto text-xs text-primary hover:underline">
					SLA dashboard →
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
							Workflow timing instrumentation pending
						</p>
					</div>
				) : (
					<div className="grid grid-cols-2 gap-3">
						<StatBlock
							label="Active Breaches"
							value={data.activeBreaches}
							severity={data.activeBreaches > 0 ? "critical" : undefined}
							href="/sla"
						/>
						<StatBlock
							label="Overdue Queues"
							value={data.overdueQueues}
							severity={data.overdueQueues > 0 ? "warning" : undefined}
							href="/sla"
						/>
					</div>
				)}
				<Button variant="outline" size="sm" asChild className="mt-3">
					<Link href="/admin/sla">SLA Configuration</Link>
				</Button>
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
				<IntegrationsWidget data={data.integrations} />
				<AuditWidget data={data.audit} />
				<ArtaSlaWidget data={data.artaSla} />
			</div>
		</div>
	)
}

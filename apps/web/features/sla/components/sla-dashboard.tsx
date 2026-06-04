"use client"

import { useCallback, useState } from "react"
import Link from "next/link"

import type { SlaEvent, SlaKpiTile } from "@repo/contracts"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Progress } from "@/core/components/ui/progress"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useSlaDashboardQuery, useSlaEventsOrpcQuery } from "@/features/sla/api/sla-orpc.hooks"
import { WORKFLOW_LABELS, type SlaStatus, type SlaWorkflowType } from "@/features/sla/api/sla.hooks"

// ============================================================================
// Helpers
// ============================================================================

function formatMinutes(minutes: number): string {
	if (minutes < 60) return `${Math.round(minutes)}m`
	const h = Math.floor(minutes / 60)
	const m = Math.round(minutes % 60)
	return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// SLA-007/SLA-008: Map TOR step codes to concise labels for the monitoring table
const MONITORING_STEP_LABELS: Record<string, string> = {
	records_request: "Request",
	records_payment: "Payment",
	records_processing_release: "Processing & Release",
	// Encounter steps (condensed)
	triaged: "Triage",
	registered: "Registration",
	vitals_recorded: "Vitals",
	in_consultation: "Consultation",
	in_progress: "In Progress",
	completed: "Completed",
	discharged: "Discharged",
	admitted: "Admitted",
	may_go_home: "May Go Home",
	chart_completed: "Chart Done",
	cleared: "Cleared",
	billed: "Billed",
	gate_pass_issued: "Gate Pass",
	rx_verified: "Rx Verified",
	cleared_for_dispensing: "Cleared",
	dispensed: "Dispensed",
}

function formatCurrentStep(step: string | null | undefined): string {
	if (!step) return "—"
	return (
		MONITORING_STEP_LABELS[step] ?? step.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
	)
}

function formatDateTime(val: Date | string | null | undefined): string {
	if (!val) return "—"
	return new Date(val).toLocaleString("en-PH", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function getSlaProgressPct(elapsed: number, target: number): number {
	return Math.min(Math.round((elapsed / target) * 100), 100)
}

// ============================================================================
// Status Badge
// ============================================================================

function SlaStatusBadge({ status }: { status: SlaStatus }) {
	switch (status) {
		case "on_time":
			return (
				<Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
					On Time
				</Badge>
			)
		case "approaching":
			return (
				<Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
					Approaching
				</Badge>
			)
		case "exceeded":
			return <Badge variant="destructive">Exceeded</Badge>
	}
}

// ============================================================================
// Progress Bar
// ============================================================================

function SlaProgressBar({
	elapsed,
	target,
	status,
}: {
	elapsed: number
	target: number
	status: SlaStatus
}) {
	const pct = getSlaProgressPct(elapsed, target)
	const colorClass =
		status === "exceeded"
			? "bg-red-500"
			: status === "approaching"
				? "bg-amber-500"
				: "bg-green-500"

	return (
		<div className="flex items-center gap-2">
			<div className="bg-muted relative h-2 w-24 overflow-hidden rounded-full">
				<div
					className={`absolute inset-y-0 left-0 rounded-full transition-all ${colorClass}`}
					style={{ width: `${pct}%` }}
				/>
			</div>
			<span className="text-muted-foreground w-10 text-right text-xs">{pct}%</span>
		</div>
	)
}

// ============================================================================
// Summary Cards
// ============================================================================

function SummaryCards({ events }: { events: SlaEvent[] }) {
	const total = events.length
	const onTime = events.filter(e => e.status === "on_time").length
	const approaching = events.filter(e => e.status === "approaching").length
	const exceeded = events.filter(e => e.status === "exceeded").length

	return (
		<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
			<Card>
				<CardContent className="pt-4">
					<p className="text-2xl font-bold">{total}</p>
					<p className="text-muted-foreground text-sm">Total Active</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="pt-4">
					<p className="text-2xl font-bold text-green-600">{onTime}</p>
					<p className="text-muted-foreground text-sm">On Time</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="pt-4">
					<p className="text-2xl font-bold text-amber-600">{approaching}</p>
					<p className="text-muted-foreground text-sm">Approaching</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="pt-4">
					<p className="text-2xl font-bold text-red-600">{exceeded}</p>
					<p className="text-muted-foreground text-sm">Exceeded</p>
				</CardContent>
			</Card>
		</div>
	)
}

// ============================================================================
// ARTA Flow KPI Tiles (ADM-FE-10)
// ============================================================================

function FlowKpiTiles({ tiles }: { tiles: SlaKpiTile[] }) {
	if (tiles.length === 0) return null
	return (
		<div>
			<p className="text-muted-foreground mb-2 text-sm font-medium">ARTA Flows (30-day window)</p>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{tiles.map(tile => {
					const colorClass =
						tile.statusColor === "red"
							? "text-red-600"
							: tile.statusColor === "amber"
								? "text-amber-600"
								: "text-green-600"
					return (
						<Card key={tile.workflowType}>
							<CardContent className="pt-4 pb-3">
								<p className="text-muted-foreground truncate text-xs font-medium">
									{tile.workflowLabel}
								</p>
								<p className={`text-2xl font-bold tabular-nums ${colorClass}`}>
									{tile.withinSLAPct.toFixed(0)}%
								</p>
								<div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
									<span>{tile.totalCases} cases</span>
									{tile.breachCount > 0 && (
										<span className="text-red-500">{tile.breachCount} breaches</span>
									)}
								</div>
								<p className="text-muted-foreground mt-0.5 text-xs">
									Avg TAT: {tile.avgTatMinutes}m
								</p>
							</CardContent>
						</Card>
					)
				})}
			</div>
		</div>
	)
}

// ============================================================================
// Main Dashboard
// ============================================================================

export function SlaDashboard() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles[0]?.facilityId ?? ""
	const [statusFilter, setStatusFilter] = useState<SlaStatus | "all">("all")
	const [workflowFilter, setWorkflowFilter] = useState<SlaWorkflowType | "all">("all")
	const [page, setPage] = useState(1)
	const [isPaused, setIsPaused] = useState(false)

	const { data: dashboardData } = useSlaDashboardQuery(facilityId, !!facilityId)

	const { data, isLoading, error, refetch, isFetching } = useSlaEventsOrpcQuery(
		{
			facilityId,
			status: statusFilter !== "all" ? statusFilter : undefined,
			workflowType: workflowFilter !== "all" ? workflowFilter : undefined,
			page,
		},
		!isPaused
	)

	const handleStatusFilter = useCallback((val: string | null) => {
		if (val) setStatusFilter(val as SlaStatus | "all")
		setPage(1)
	}, [])

	const handleWorkflowFilter = useCallback((val: string | null) => {
		if (val) setWorkflowFilter(val as SlaWorkflowType | "all")
		setPage(1)
	}, [])

	const events = data?.data ?? []

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold">SLA Tracking Dashboard</h1>
					<p className="text-muted-foreground text-sm">
						Active work items across all workflows — auto-refreshes every 30s
					</p>
				</div>
				<div className="flex items-center gap-2">
					{!isPaused && (
						<div className="text-muted-foreground flex items-center gap-1.5 text-xs">
							<span className="inline-block size-2 animate-pulse rounded-full bg-green-500" />
							Live
						</div>
					)}
					<Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
						Refresh
					</Button>
					<Button
						size="sm"
						variant={isPaused ? "default" : "outline"}
						onClick={() => setIsPaused(p => !p)}
					>
						{isPaused ? "Resume" : "Pause"}
					</Button>
					<Link
						href="/admin/sla"
						className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium"
					>
						Compliance Report
					</Link>
				</div>
			</div>

			{/* ARTA Flow KPI Tiles */}
			{dashboardData?.tiles && dashboardData.tiles.length > 0 && (
				<FlowKpiTiles tiles={dashboardData.tiles} />
			)}

			{/* Summary */}
			{!isLoading && <SummaryCards events={events} />}

			{/* Filters */}
			<div className="flex flex-wrap gap-3">
				<Select value={statusFilter} onValueChange={handleStatusFilter}>
					<SelectTrigger className="w-40">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Statuses</SelectItem>
						<SelectItem value="on_time">On Time</SelectItem>
						<SelectItem value="approaching">Approaching</SelectItem>
						<SelectItem value="exceeded">Exceeded</SelectItem>
					</SelectContent>
				</Select>

				<Select value={workflowFilter} onValueChange={handleWorkflowFilter}>
					<SelectTrigger className="w-52">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Workflows</SelectItem>
						{(Object.keys(WORKFLOW_LABELS) as SlaWorkflowType[]).map(wt => (
							<SelectItem key={wt} value={wt}>
								{WORKFLOW_LABELS[wt]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Table */}
			<Card>
				<CardHeader>
					<CardTitle>Active SLA Events</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					{error && (
						<div className="text-destructive p-6 text-sm">
							Failed to load SLA events. The SLA module may not be enabled on this server.
						</div>
					)}
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Workflow</TableHead>
									<TableHead>Current Step</TableHead>
									<TableHead>Started</TableHead>
									<TableHead>Elapsed</TableHead>
									<TableHead>Target</TableHead>
									<TableHead>Progress</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Escalated</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{isLoading && (
									<TableRow>
										<TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
											Loading…
										</TableCell>
									</TableRow>
								)}

								{!isLoading && events.length === 0 && (
									<TableRow>
										<TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
											No SLA events found for the selected filters.
										</TableCell>
									</TableRow>
								)}

								{events.map(event => (
									<TableRow
										key={event.id}
										className={event.status === "exceeded" ? "bg-red-50/50 dark:bg-red-900/10" : ""}
									>
										<TableCell className="text-xs">
											<div className="text-foreground font-medium">
												{WORKFLOW_LABELS[event.workflowType]}
											</div>
											{event.notes && (
												<div
													className="text-muted-foreground mt-0.5 max-w-48 truncate"
													title={event.notes}
												>
													{event.notes}
												</div>
											)}
										</TableCell>
										<TableCell className="text-muted-foreground text-xs">
											{formatCurrentStep(event.currentStep)}
										</TableCell>
										<TableCell className="text-xs">{formatDateTime(event.startedAt)}</TableCell>
										<TableCell className="text-sm font-medium">
											{formatMinutes(event.elapsedMinutes)}
										</TableCell>
										<TableCell className="text-muted-foreground text-xs">
											{formatMinutes(event.targetMinutes)}
										</TableCell>
										<TableCell>
											<SlaProgressBar
												elapsed={event.elapsedMinutes}
												target={event.targetMinutes}
												status={event.status}
											/>
										</TableCell>
										<TableCell>
											{event.status === "exceeded" ? (
												<Tooltip>
													<TooltipTrigger>
														<SlaStatusBadge status={event.status} />
													</TooltipTrigger>
													<TooltipContent>
														+{formatMinutes(event.elapsedMinutes - event.targetMinutes)} over target
													</TooltipContent>
												</Tooltip>
											) : (
												<SlaStatusBadge status={event.status} />
											)}
										</TableCell>
										<TableCell className="text-xs">
											{event.escalatedAt ? (
												<Badge variant="outline" className="border-orange-300 text-orange-600">
													Escalated
												</Badge>
											) : (
												<span className="text-muted-foreground">—</span>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{data && data.totalPages > 1 && (
						<div className="flex items-center justify-between p-4">
							<p className="text-muted-foreground text-sm">
								Page {data.page} of {data.totalPages} ({data.total} events)
							</p>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={data.page <= 1}
									onClick={() => setPage(p => p - 1)}
								>
									Previous
								</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={data.page >= data.totalPages}
									onClick={() => setPage(p => p + 1)}
								>
									Next
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

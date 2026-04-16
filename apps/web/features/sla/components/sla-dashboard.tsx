"use client"

import { useState, useCallback, useEffect } from "react"

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
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	type SlaEvent,
	type SlaStatus,
	type SlaWorkflowType,
	WORKFLOW_LABELS,
	useSlaEventsQuery,
} from "@/features/sla/api/sla.hooks"

// ============================================================================
// Helpers
// ============================================================================

function formatMinutes(minutes: number): string {
	if (minutes < 60) return `${Math.round(minutes)}m`
	const h = Math.floor(minutes / 60)
	const m = Math.round(minutes % 60)
	return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatDateTime(val: string | null | undefined): string {
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

function SlaProgressBar({ elapsed, target, status }: { elapsed: number; target: number; status: SlaStatus }) {
	const pct = getSlaProgressPct(elapsed, target)
	const colorClass =
		status === "exceeded"
			? "bg-red-500"
			: status === "approaching"
				? "bg-amber-500"
				: "bg-green-500"

	return (
		<div className="flex items-center gap-2">
			<div className="relative h-2 w-24 overflow-hidden rounded-full bg-muted">
				<div
					className={`absolute inset-y-0 left-0 rounded-full transition-all ${colorClass}`}
					style={{ width: `${pct}%` }}
				/>
			</div>
			<span className="w-10 text-right text-xs text-muted-foreground">{pct}%</span>
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
					<p className="text-sm text-muted-foreground">Total Active</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="pt-4">
					<p className="text-2xl font-bold text-green-600">{onTime}</p>
					<p className="text-sm text-muted-foreground">On Time</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="pt-4">
					<p className="text-2xl font-bold text-amber-600">{approaching}</p>
					<p className="text-sm text-muted-foreground">Approaching</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="pt-4">
					<p className="text-2xl font-bold text-red-600">{exceeded}</p>
					<p className="text-sm text-muted-foreground">Exceeded</p>
				</CardContent>
			</Card>
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
	const [tick, setTick] = useState(0)

	// Live refresh every 30 seconds
	useEffect(() => {
		const id = setInterval(() => setTick(t => t + 1), 30_000)
		return () => clearInterval(id)
	}, [])

	const { data, isLoading, error } = useSlaEventsQuery({
		facilityId,
		status: statusFilter,
		workflowType: workflowFilter !== "all" ? workflowFilter : undefined,
		page,
	})

	const handleStatusFilter = useCallback((val: string) => {
		setStatusFilter(val as SlaStatus | "all")
		setPage(1)
	}, [])

	const handleWorkflowFilter = useCallback((val: string) => {
		setWorkflowFilter(val as SlaWorkflowType | "all")
		setPage(1)
	}, [])

	const events = data?.data ?? []

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold">SLA Tracking Dashboard</h1>
					<p className="text-sm text-muted-foreground">
						Real-time turnaround time monitoring — Citizen's Charter compliance
					</p>
				</div>
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<span className="inline-block size-2 animate-pulse rounded-full bg-green-500" />
					Live (last updated {new Date().toLocaleTimeString("en-PH")})
				</div>
			</div>

			{/* Summary */}
			{!isLoading && <SummaryCards events={events} />}

			{/* Filters */}
			<div className="flex flex-wrap gap-3">
				<Select value={statusFilter} onValueChange={handleStatusFilter}>
					<SelectTrigger className="w-40">
						<SelectValue placeholder="All Statuses" />
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
						<SelectValue placeholder="All Workflows" />
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
						<div className="p-6 text-sm text-destructive">
							Failed to load SLA events. The SLA module may not be enabled on this server.
						</div>
					)}
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Patient</TableHead>
									<TableHead>Workflow</TableHead>
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
										<TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
											Loading…
										</TableCell>
									</TableRow>
								)}

								{!isLoading && events.length === 0 && (
									<TableRow>
										<TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
											No SLA events found for the selected filters.
										</TableCell>
									</TableRow>
								)}

								{events.map(event => (
									<TableRow
										key={event.id}
										className={event.status === "exceeded" ? "bg-red-50/50 dark:bg-red-900/10" : ""}
									>
										<TableCell className="font-medium text-sm">{event.patientName}</TableCell>
										<TableCell className="text-xs text-muted-foreground">
											{WORKFLOW_LABELS[event.workflowType]}
										</TableCell>
										<TableCell className="text-xs">{formatDateTime(event.startedAt)}</TableCell>
										<TableCell className="text-sm font-medium">
											{formatMinutes(event.elapsedMinutes)}
										</TableCell>
										<TableCell className="text-xs text-muted-foreground">
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
											<SlaStatusBadge status={event.status} />
										</TableCell>
										<TableCell className="text-xs">
											{event.escalatedAt ? (
												<Badge variant="outline" className="text-orange-600 border-orange-300">
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
							<p className="text-sm text-muted-foreground">
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

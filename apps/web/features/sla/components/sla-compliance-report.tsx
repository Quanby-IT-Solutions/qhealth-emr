"use client"

import { useState } from "react"
import { Download } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
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
	WORKFLOW_LABELS,
	useSlaComplianceReportQuery,
	type SlaComplianceMetric,
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

function today(): string {
	return new Date().toISOString().slice(0, 10)
}

function thirtyDaysAgo(): string {
	const d = new Date()
	d.setDate(d.getDate() - 30)
	return d.toISOString().slice(0, 10)
}

function ComplianceBadge({ pct }: { pct: number }) {
	if (pct >= 90) {
		return (
			<Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
				{pct.toFixed(1)}%
			</Badge>
		)
	}
	if (pct >= 70) {
		return (
			<Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
				{pct.toFixed(1)}%
			</Badge>
		)
	}
	return <Badge variant="destructive">{pct.toFixed(1)}%</Badge>
}

// ============================================================================
// Overall Gauge
// ============================================================================

function OverallGauge({ pct }: { pct: number }) {
	const color =
		pct >= 90 ? "bg-green-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500"
	const label =
		pct >= 90 ? "Compliant" : pct >= 70 ? "Needs Improvement" : "Non-Compliant"

	return (
		<Card>
			<CardContent className="pt-6">
				<div className="flex flex-col items-center gap-3">
					<p className="text-sm font-medium text-muted-foreground">Overall Compliance</p>
					<p className="text-5xl font-bold">{pct.toFixed(1)}%</p>
					<Badge
						className={
							pct >= 90
								? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
								: pct >= 70
									? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
									: ""
						}
						variant={pct < 70 ? "destructive" : "secondary"}
					>
						{label}
					</Badge>
					<div className="relative h-3 w-full max-w-xs overflow-hidden rounded-full bg-muted">
						<div
							className={`absolute inset-y-0 left-0 rounded-full transition-all ${color}`}
							style={{ width: `${pct}%` }}
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

// ============================================================================
// Metric Row
// ============================================================================

function MetricRow({ metric }: { metric: SlaComplianceMetric }) {
	const pct = getSlaProgressBarPct(metric.onTimeCount, metric.totalCount)

	return (
		<TableRow>
			<TableCell className="font-medium">{WORKFLOW_LABELS[metric.workflowType]}</TableCell>
			<TableCell className="text-center">{metric.totalCount}</TableCell>
			<TableCell className="text-center text-green-700 dark:text-green-400">
				{metric.onTimeCount}
			</TableCell>
			<TableCell className="text-center text-amber-700 dark:text-amber-400">
				{metric.approachingCount}
			</TableCell>
			<TableCell className="text-center text-red-700 dark:text-red-400">
				{metric.exceededCount}
			</TableCell>
			<TableCell>
				<ComplianceBadge pct={metric.compliancePct} />
			</TableCell>
			<TableCell className="text-sm">
				{formatMinutes(metric.avgElapsedMinutes)} / {formatMinutes(metric.avgTargetMinutes)}
			</TableCell>
		</TableRow>
	)
}

function getSlaProgressBarPct(onTime: number, total: number): number {
	if (total === 0) return 0
	return Math.round((onTime / total) * 100)
}

// ============================================================================
// Export CSV utility
// ============================================================================

function exportCsv(data: SlaComplianceMetric[], periodStart: string, periodEnd: string) {
	const headers = [
		"Workflow Type",
		"Total",
		"On Time",
		"Approaching",
		"Exceeded",
		"Compliance %",
		"Avg Elapsed",
		"Avg Target",
	]
	const rows = data.map(m => [
		WORKFLOW_LABELS[m.workflowType],
		String(m.totalCount),
		String(m.onTimeCount),
		String(m.approachingCount),
		String(m.exceededCount),
		m.compliancePct.toFixed(1) + "%",
		formatMinutes(m.avgElapsedMinutes),
		formatMinutes(m.avgTargetMinutes),
	])
	const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
	const url = URL.createObjectURL(blob)
	const a = document.createElement("a")
	a.href = url
	a.download = `sla-compliance-${periodStart}-to-${periodEnd}.csv`
	a.click()
	URL.revokeObjectURL(url)
}

// ============================================================================
// Main Component
// ============================================================================

export function SlaComplianceReport() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles[0]?.facilityId ?? ""

	const [periodStart, setPeriodStart] = useState(thirtyDaysAgo())
	const [periodEnd, setPeriodEnd] = useState(today())

	const { data, isLoading, error } = useSlaComplianceReportQuery({
		facilityId,
		periodStart,
		periodEnd,
	})

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold">Citizen's Charter Compliance Report</h1>
					<p className="text-sm text-muted-foreground">
						SLA compliance by workflow type for the selected period.
					</p>
				</div>
				{data && (
					<Button
						variant="outline"
						size="sm"
						onClick={() => exportCsv(data.metrics, periodStart, periodEnd)}
					>
						<Download className="mr-1 size-4" />
						Export CSV
					</Button>
				)}
			</div>

			{/* Period Selector */}
			<Card>
				<CardContent className="flex flex-wrap items-end gap-4 pt-4">
					<div className="space-y-1">
						<Label htmlFor="period-start">From</Label>
						<Input
							id="period-start"
							type="date"
							value={periodStart}
							max={periodEnd}
							onChange={e => setPeriodStart(e.target.value)}
							className="w-44"
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="period-end">To</Label>
						<Input
							id="period-end"
							type="date"
							value={periodEnd}
							min={periodStart}
							max={today()}
							onChange={e => setPeriodEnd(e.target.value)}
							className="w-44"
						/>
					</div>
				</CardContent>
			</Card>

			{/* Error */}
			{error && (
				<div className="text-sm text-destructive">
					Failed to load compliance report. The SLA module may not be enabled on this server.
				</div>
			)}

			{/* Overall gauge */}
			{data && <OverallGauge pct={data.overallCompliancePct} />}

			{/* Metrics table */}
			<Card>
				<CardHeader>
					<CardTitle>Compliance by Workflow</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Workflow</TableHead>
									<TableHead className="text-center">Total</TableHead>
									<TableHead className="text-center">On Time</TableHead>
									<TableHead className="text-center">Approaching</TableHead>
									<TableHead className="text-center">Exceeded</TableHead>
									<TableHead>Compliance</TableHead>
									<TableHead>Avg Elapsed / Target</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{isLoading && (
									<TableRow>
										<TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
											Loading…
										</TableCell>
									</TableRow>
								)}
								{!isLoading && !error && !data && (
									<TableRow>
										<TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
											Select a date range to view the report.
										</TableCell>
									</TableRow>
								)}
								{data?.metrics.map(metric => (
									<MetricRow key={metric.workflowType} metric={metric} />
								))}
								{data?.metrics.length === 0 && (
									<TableRow>
										<TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
											No data for this period.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Download, Info } from "lucide-react"

import type { SlaComplianceMetric, SlaStepMetric } from "@repo/contracts"

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
import { useSlaComplianceReportOrpcQuery } from "@/features/sla/api/sla-orpc.hooks"
import { WORKFLOW_LABELS, type SlaWorkflowType } from "@/features/sla/api/sla.hooks"

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
	if (pct >= 95) {
		return (
			<Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
				{pct.toFixed(1)}%
			</Badge>
		)
	}
	if (pct >= 85) {
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

interface ComplianceGaugesProps {
	authoritativePct: number
	authoritativeCount: number
	operationalPct: number
}

function ComplianceGauges({
	authoritativePct,
	authoritativeCount,
	operationalPct,
}: ComplianceGaugesProps) {
	const authColor =
		authoritativePct >= 95 ? "bg-green-500" : authoritativePct >= 85 ? "bg-amber-500" : "bg-red-500"
	const authLabel =
		authoritativePct >= 95
			? "Compliant"
			: authoritativePct >= 85
				? "Needs Improvement"
				: "Non-Compliant"
	const opColor =
		operationalPct >= 95 ? "bg-green-500" : operationalPct >= 85 ? "bg-amber-500" : "bg-red-500"

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
			{/* ARTA-Authoritative — primary, checkpoint-backed only */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex flex-col items-center gap-3">
						<div className="flex items-center gap-1.5">
							<p className="text-muted-foreground text-sm font-semibold">
								ARTA-Authoritative Compliance
							</p>
							<span title="Includes only workflows with verified checkpoint timestamps — suitable for Citizen's Charter evidence submission.">
								<Info className="text-muted-foreground size-3.5 cursor-help" />
							</span>
						</div>
						<p className="text-5xl font-bold">{authoritativePct.toFixed(1)}%</p>
						<Badge
							className={
								authoritativePct >= 95
									? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
									: authoritativePct >= 85
										? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
										: ""
							}
							variant={authoritativePct < 85 ? "destructive" : "secondary"}
						>
							{authLabel}
						</Badge>
						<div className="bg-muted relative h-3 w-full max-w-xs overflow-hidden rounded-full">
							<div
								className={`absolute inset-y-0 left-0 rounded-full transition-all ${authColor}`}
								style={{ width: `${authoritativePct}%` }}
							/>
						</div>
						<p className="text-muted-foreground text-xs">
							Based on {authoritativeCount.toLocaleString()} checkpoint-verified records
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Operational SLA Score — secondary, all workflows */}
			<Card className="border-dashed">
				<CardContent className="pt-6">
					<div className="flex flex-col items-center gap-3">
						<div className="flex items-center gap-1.5">
							<p className="text-muted-foreground text-sm font-medium">Operational SLA Score</p>
							<span title="Includes all workflows — including those using proxy or partial-checkpoint timing. Not suitable as standalone ARTA compliance evidence.">
								<Info className="text-muted-foreground size-3.5 cursor-help" />
							</span>
						</div>
						<p className="text-muted-foreground text-4xl font-semibold">
							{operationalPct.toFixed(1)}%
						</p>
						<Badge variant="outline" className="text-muted-foreground">
							All workflows (incl. proxy)
						</Badge>
						<div className="bg-muted relative h-2 w-full max-w-xs overflow-hidden rounded-full">
							<div
								className={`absolute inset-y-0 left-0 rounded-full opacity-60 transition-all ${opColor}`}
								style={{ width: `${operationalPct}%` }}
							/>
						</div>
						<p className="text-muted-foreground text-xs">
							Includes proxy-timed and partial-checkpoint workflows
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

// ============================================================================
// Step label helper
// ============================================================================

const STEP_LABELS: Record<string, string> = {
	// OPD
	triaged: "Triage",
	registered: "Registration",
	vitals_recorded: "Vitals Recorded",
	in_progress: "Consultation / Procedure",
	completed: "Completed",
	discharged: "Discharged",
	// ED
	admitted: "Admitted",
	// Admission
	bed_reserved: "Bed Reserved",
	bed_assigned: "Bed Assigned",
	oriented: "Financial Orientation",
	transferred_to_ward: "Transferred to Ward",
	// Discharge
	may_go_home: "May Go Home Order",
	discharge_ordered: "Discharge Ordered",
	chart_completed: "Chart Completion",
	cleared: "Clearance",
	billed: "Bill Generation",
	gate_pass_issued: "Gate Pass Issued",
	// Pharmacy
	rx_verified: "Rx Verified",
	cleared_for_dispensing: "Cleared for Dispensing",
	dispensed: "Dispensed",
	// Ancillary
	lab_ordered: "Lab Ordered",
	imaging_ordered: "Imaging Ordered",
	cleared_for_procedure: "Cleared for Procedure",
	resulted: "Resulted / Released",
	released: "Released",
}

function getSlaStepLabel(step: SlaStepMetric): string {
	if (step.stepLabel) return step.stepLabel
	return (
		STEP_LABELS[step.stepStatus] ??
		step.stepStatus.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
	)
}

// ============================================================================
// Metric Row
// ============================================================================

function StepMetricRow({ step }: { step: SlaStepMetric }) {
	return (
		<TableRow className="bg-muted/30">
			<TableCell className="text-muted-foreground pl-10 text-sm">{getSlaStepLabel(step)}</TableCell>
			<TableCell className="text-center text-sm">{step.totalCount}</TableCell>
			<TableCell className="text-center text-sm text-green-700 dark:text-green-400">
				{step.onTimeCount}
			</TableCell>
			<TableCell className="text-center text-sm text-amber-700 dark:text-amber-400">
				{step.approachingCount}
			</TableCell>
			<TableCell className="text-center text-sm text-red-700 dark:text-red-400">
				{step.exceededCount}
			</TableCell>
			<TableCell>
				<ComplianceBadge pct={step.compliancePct} />
			</TableCell>
			<TableCell className="text-sm">
				{formatMinutes(step.avgElapsedMinutes)} / {formatMinutes(step.avgTargetMinutes)}
			</TableCell>
		</TableRow>
	)
}

function MetricRow({ metric }: { metric: SlaComplianceMetric }) {
	const hasSteps = (metric.stepMetrics?.length ?? 0) > 0
	const [expanded, setExpanded] = useState(false)
	const isProxy = metric.timingAccuracy === "proxy"
	const isPartial = metric.timingAccuracy === "partial"

	return (
		<>
			<TableRow
				className={hasSteps ? "hover:bg-muted/50 cursor-pointer" : undefined}
				onClick={hasSteps ? () => setExpanded(e => !e) : undefined}
			>
				<TableCell className="font-medium">
					<span className="flex items-center gap-1">
						{hasSteps &&
							(expanded ? (
								<ChevronDown className="text-muted-foreground size-4 shrink-0" />
							) : (
								<ChevronRight className="text-muted-foreground size-4 shrink-0" />
							))}
						{WORKFLOW_LABELS[metric.workflowType]}
						{isProxy && (
							<Badge
								variant="outline"
								className="ml-1 border-amber-400 text-xs text-amber-600 dark:border-amber-500 dark:text-amber-400"
							>
								Proxy timing
							</Badge>
						)}
						{isPartial && (
							<Badge
								variant="outline"
								className="ml-1 border-sky-400 text-xs text-sky-600 dark:border-sky-500 dark:text-sky-400"
							>
								Partial checkpoints
							</Badge>
						)}
					</span>
				</TableCell>
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
			{expanded &&
				metric.stepMetrics?.map(step => <StepMetricRow key={step.stepStatus} step={step} />)}
		</>
	)
}

// ============================================================================
// Export HTML utility
// ============================================================================

function exportHtml(
	data: SlaComplianceMetric[],
	facilityName: string,
	periodStart: string,
	periodEnd: string,
	authoritativeCompliancePct: number,
	overallCompliancePct: number
) {
	const rows = data
		.map(
			m => `
		<tr>
			<td>${WORKFLOW_LABELS[m.workflowType as SlaWorkflowType]}</td>
			<td>${m.totalCount}</td>
			<td>${m.onTimeCount}</td>
			<td>${m.approachingCount}</td>
			<td>${m.exceededCount}</td>
			<td>${m.compliancePct.toFixed(1)}%</td>
			<td>${formatMinutes(m.avgElapsedMinutes)} / ${formatMinutes(m.avgTargetMinutes)}</td>
		</tr>`
		)
		.join("")

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>SLA Compliance Report</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; margin: 32px; color: #111; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 20px; }
  .summary { margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
  th { background: #f0f0f0; font-weight: 600; }
  .signature { margin-top: 48px; }
  .signature-line { display: inline-block; border-bottom: 1px solid #333; width: 240px; }
</style>
</head>
<body>
<h1>Citizen's Charter Compliance Report</h1>
<div class="meta">
  Facility: <strong>${facilityName}</strong> &nbsp;&middot;&nbsp;
  Period: <strong>${periodStart}</strong> to <strong>${periodEnd}</strong>
</div>
<div class="summary">
  <strong>ARTA-Authoritative Compliance:</strong> ${authoritativeCompliancePct.toFixed(1)}% &nbsp;&nbsp;
  <strong>Operational SLA Score:</strong> ${overallCompliancePct.toFixed(1)}%
</div>
<table>
  <thead>
    <tr>
      <th>Workflow</th>
      <th>Total</th>
      <th>On Time</th>
      <th>Approaching</th>
      <th>Exceeded</th>
      <th>Compliance %</th>
      <th>Avg Elapsed / Target</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<div class="signature">
  <p>Authorized by: <span class="signature-line"></span> &nbsp;&nbsp; Date: <span class="signature-line"></span></p>
</div>
</body>
</html>`

	const blob = new Blob([html], { type: "text/html;charset=utf-8;" })
	const url = URL.createObjectURL(blob)
	const a = document.createElement("a")
	a.href = url
	a.download = `sla-export-${periodStart}.html`
	a.click()
	URL.revokeObjectURL(url)
}

// ============================================================================
// Export CSV utility
// ============================================================================

function timingAccuracyCaveat(accuracy: string | undefined): string {
	if (accuracy === "proxy")
		return "Uses record creation as substitute for workflow checkpoint — excluded from authoritative ARTA evidence until instrumented"
	if (accuracy === "partial")
		return "Uses checkpoint when available, falls back to record creation otherwise"
	return ""
}

function escapeCsvCell(value: string): string {
	return `"${value.replace(/"/g, '""')}"`
}

function exportCsv(
	data: SlaComplianceMetric[],
	facilityId: string,
	periodStart: string,
	periodEnd: string,
	authoritativeCompliancePct: number,
	overallCompliancePct: number
) {
	const headers = [
		"Facility ID",
		"Report Period",
		"ARTA-Authoritative Compliance %",
		"Operational SLA Score %",
		"Workflow Type",
		"Step",
		"Total",
		"On Time",
		"Approaching",
		"Exceeded",
		"Compliance %",
		"Avg Elapsed",
		"Avg Target",
		"Timing Accuracy",
		"Timing Caveat",
	]
	const rows: string[][] = []
	const reportPeriod = `${periodStart} to ${periodEnd}`

	for (const m of data) {
		rows.push([
			facilityId,
			reportPeriod,
			`${authoritativeCompliancePct.toFixed(1)}%`,
			`${overallCompliancePct.toFixed(1)}%`,
			WORKFLOW_LABELS[m.workflowType],
			"(total)",
			String(m.totalCount),
			String(m.onTimeCount),
			String(m.approachingCount),
			String(m.exceededCount),
			`${m.compliancePct.toFixed(1)}%`,
			formatMinutes(m.avgElapsedMinutes),
			formatMinutes(m.avgTargetMinutes),
			m.timingAccuracy ?? "checkpoint",
			timingAccuracyCaveat(m.timingAccuracy),
		])
		if (m.stepMetrics) {
			for (const s of m.stepMetrics) {
				rows.push([
					facilityId,
					reportPeriod,
					`${authoritativeCompliancePct.toFixed(1)}%`,
					`${overallCompliancePct.toFixed(1)}%`,
					WORKFLOW_LABELS[m.workflowType],
					getSlaStepLabel(s),
					String(s.totalCount),
					String(s.onTimeCount),
					String(s.approachingCount),
					String(s.exceededCount),
					`${s.compliancePct.toFixed(1)}%`,
					formatMinutes(s.avgElapsedMinutes),
					formatMinutes(s.avgTargetMinutes),
					m.timingAccuracy ?? "checkpoint",
					timingAccuracyCaveat(m.timingAccuracy),
				])
			}
		}
	}
	const csv = [headers, ...rows].map(r => r.map(escapeCsvCell).join(",")).join("\n")
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
	const url = URL.createObjectURL(blob)
	const a = document.createElement("a")
	a.href = url
	a.download = `sla-compliance-${periodStart}-to-${periodEnd}.csv`
	a.click()
	URL.revokeObjectURL(url)
}

// ============================================================================
// ARTA Flow KPI Tiles
// ============================================================================

const ARTA_FLOW_WORKFLOWS: { label: string; workflows: string[] }[] = [
	{ label: "Flow 1 — OPD", workflows: ["opd_consultation"] },
	{ label: "Flow 2 — Emergency", workflows: ["emergency_triage"] },
	{ label: "Flow 3 — Ancillary", workflows: ["lab_result", "radiology_result"] },
	{ label: "Flow 4 — Admission", workflows: ["admission"] },
	{ label: "Flow 5 — Discharge", workflows: ["discharge", "billing_processing"] },
	{ label: "Flow 6 — Pharmacy", workflows: ["medication_dispensing"] },
	{ label: "Flow 7 — Records", workflows: ["medical_records", "certificate_issuance"] },
]

function ArtaFlowTiles({ metrics }: { metrics: SlaComplianceMetric[] }) {
	const byWorkflow = new Map(metrics.map(m => [m.workflowType, m.compliancePct]))

	return (
		<div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
			{ARTA_FLOW_WORKFLOWS.map(flow => {
				const pcts = flow.workflows
					.map(w => byWorkflow.get(w as SlaWorkflowType))
					.filter((p): p is number => p != null)
				const avgPct = pcts.length > 0 ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null

				const colorClass =
					avgPct == null
						? "text-muted-foreground"
						: avgPct >= 95
							? "text-green-600"
							: avgPct >= 85
								? "text-amber-600"
								: "text-red-600"

				return (
					<Card key={flow.label}>
						<CardContent className="pt-4 pb-3">
							<p className="text-muted-foreground text-xs leading-tight">{flow.label}</p>
							<p className={`mt-1 text-xl font-bold tabular-nums ${colorClass}`}>
								{avgPct != null ? `${avgPct.toFixed(1)}%` : "—"}
							</p>
						</CardContent>
					</Card>
				)
			})}
		</div>
	)
}

// ============================================================================
// Main Component
// ============================================================================

export function SlaComplianceReport() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles[0]?.facilityId ?? ""
	const facilityName = profile?.staffProfiles[0]?.facility?.name ?? "Quanby"

	const [periodStart, setPeriodStart] = useState(thirtyDaysAgo())
	const [periodEnd, setPeriodEnd] = useState(today())

	const { data, isLoading, error } = useSlaComplianceReportOrpcQuery({
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
					<p className="text-muted-foreground text-sm">
						SLA compliance by workflow type for the selected period.
					</p>
				</div>
				{data && (
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								exportCsv(
									data.metrics,
									facilityId,
									periodStart,
									periodEnd,
									data.authoritativeCompliancePct,
									data.overallCompliancePct
								)
							}
						>
							<Download className="mr-1 size-4" />
							Export CSV
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								exportHtml(
									data.metrics,
									facilityName,
									periodStart,
									periodEnd,
									data.authoritativeCompliancePct,
									data.overallCompliancePct
								)
							}
						>
							<Download className="mr-1 size-4" />
							Export PDF
						</Button>
					</div>
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
				<div className="text-destructive text-sm">
					Failed to load compliance report. The SLA module may not be enabled on this server.
				</div>
			)}

			{/* Overall gauges */}
			{data && (
				<ComplianceGauges
					authoritativePct={data.authoritativeCompliancePct}
					authoritativeCount={data.authoritativeCount}
					operationalPct={data.overallCompliancePct}
				/>
			)}

			{/* 7 ARTA Flow KPI tiles */}
			{data && <ArtaFlowTiles metrics={data.metrics} />}

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
										<TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
											Loading…
										</TableCell>
									</TableRow>
								)}
								{!isLoading && !error && !data && (
									<TableRow>
										<TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
											Select a date range to view the report.
										</TableCell>
									</TableRow>
								)}
								{data?.metrics.map(metric => (
									<MetricRow key={metric.workflowType} metric={metric} />
								))}
								{data?.metrics.length === 0 && (
									<TableRow>
										<TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
											No data for this period.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
					{data &&
						data.metrics.some(
							m => m.timingAccuracy === "proxy" || m.timingAccuracy === "partial"
						) && (
							<div className="text-muted-foreground border-t px-4 py-3 text-xs">
								<span className="font-medium">Timing accuracy legend: </span>
								<Badge
									variant="outline"
									className="mr-1 border-amber-400 text-xs text-amber-600 dark:border-amber-500 dark:text-amber-400"
								>
									Proxy timing
								</Badge>
								uses record creation as a substitute for a real workflow checkpoint — excluded from
								authoritative ARTA evidence until instrumented.{" "}
								<Badge
									variant="outline"
									className="mr-1 border-sky-400 text-xs text-sky-600 dark:border-sky-500 dark:text-sky-400"
								>
									Partial checkpoints
								</Badge>
								uses the checkpoint when available, falls back to record creation otherwise.
							</div>
						)}
				</CardContent>
			</Card>
		</div>
	)
}

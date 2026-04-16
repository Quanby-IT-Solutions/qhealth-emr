"use client"

import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Info } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	type FhirValidationReport,
	type ValidationIssue,
	type ValidationResourceSummary,
	useValidationReportQuery,
} from "@/features/fhir/api/fhir.hooks"

// ============================================================================
// Helpers
// ============================================================================

function IssueSeverityIcon({ severity }: { severity: ValidationIssue["severity"] }) {
	switch (severity) {
		case "error":
			return <AlertCircle className="size-3.5 text-red-500" />
		case "warning":
			return <AlertTriangle className="size-3.5 text-amber-500" />
		case "information":
			return <Info className="size-3.5 text-blue-500" />
	}
}

function SeverityBadge({ severity, count }: { severity: ValidationIssue["severity"]; count: number }) {
	if (count === 0) return null
	const cls =
		severity === "error"
			? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
			: severity === "warning"
				? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
				: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
	return <Badge className={cls}>{count}</Badge>
}

// ============================================================================
// Resource Row (expandable)
// ============================================================================

function ResourceRow({ resource }: { resource: ValidationResourceSummary }) {
	const [expanded, setExpanded] = useState(false)
	const hasIssues = resource.issues.length > 0

	return (
		<>
			<tr className="border-b">
				<td className="p-3">
					<button
						className="flex items-center gap-1.5 font-medium text-sm"
						onClick={() => hasIssues && setExpanded(e => !e)}
						disabled={!hasIssues}
					>
						{hasIssues ? (
							expanded ? (
								<ChevronDown className="size-4 text-muted-foreground" />
							) : (
								<ChevronRight className="size-4 text-muted-foreground" />
							)
						) : (
							<span className="size-4" />
						)}
						{resource.resourceType}
					</button>
				</td>
				<td className="p-3 text-center text-sm">{resource.total}</td>
				<td className="p-3 text-center">
					<span className="text-sm text-green-700 dark:text-green-400">{resource.valid}</span>
				</td>
				<td className="p-3 text-center">
					<SeverityBadge severity="error" count={resource.errorCount} />
					{resource.errorCount === 0 && (
						<span className="text-xs text-muted-foreground">—</span>
					)}
				</td>
				<td className="p-3 text-center">
					<SeverityBadge severity="warning" count={resource.warningCount} />
					{resource.warningCount === 0 && (
						<span className="text-xs text-muted-foreground">—</span>
					)}
				</td>
				<td className="p-3 text-center">
					{resource.errorCount === 0 ? (
						<CheckCircle2 className="mx-auto size-4 text-green-500" />
					) : (
						<AlertCircle className="mx-auto size-4 text-red-500" />
					)}
				</td>
			</tr>
			{expanded && resource.issues.length > 0 && (
				<tr className="border-b bg-muted/30">
					<td colSpan={6} className="px-6 py-3">
						<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Issues
						</p>
						<div className="space-y-1.5">
							{resource.issues.map((issue, i) => (
								<div key={i} className="flex items-start gap-2 text-sm">
									<IssueSeverityIcon severity={issue.severity} />
									<span className="font-mono text-xs text-muted-foreground">[{issue.code}]</span>
									<span className="flex-1">{issue.message}</span>
									<Badge variant="outline" className="text-xs">
										×{issue.count}
									</Badge>
								</div>
							))}
						</div>
					</td>
				</tr>
			)}
		</>
	)
}

// ============================================================================
// Summary Gauges
// ============================================================================

function SummaryGauges({ report }: { report: FhirValidationReport }) {
	const pct =
		report.totalResources > 0
			? Math.round((report.totalValid / report.totalResources) * 100)
			: 0

	return (
		<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
			<Card>
				<CardContent className="pt-4">
					<p className="text-2xl font-bold">{report.totalResources}</p>
					<p className="text-sm text-muted-foreground">Total Resources</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="pt-4">
					<p className="text-2xl font-bold text-green-600">{pct}%</p>
					<p className="text-sm text-muted-foreground">Valid</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="pt-4">
					<p className="text-2xl font-bold text-red-600">{report.totalErrors}</p>
					<p className="text-sm text-muted-foreground">Errors</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="pt-4">
					<p className="text-2xl font-bold text-amber-600">{report.totalWarnings}</p>
					<p className="text-sm text-muted-foreground">Warnings</p>
				</CardContent>
			</Card>
		</div>
	)
}

// ============================================================================
// Validation Report Panel
// ============================================================================

interface ValidationReportPanelProps {
	exportId: string
	onClose: () => void
}

export function ValidationReportPanel({ exportId, onClose }: ValidationReportPanelProps) {
	const { data, isLoading, error } = useValidationReportQuery(exportId)

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Validation Report</h2>
				<Button variant="outline" size="sm" onClick={onClose}>
					Close
				</Button>
			</div>

			{isLoading && (
				<div className="py-8 text-center text-sm text-muted-foreground">
					Loading validation report…
				</div>
			)}

			{error && (
				<div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
					Validation report not available. The export may still be processing, or no validation was
					run.
				</div>
			)}

			{data && (
				<>
					{/* Overall result */}
					<div
						className={`flex items-center gap-3 rounded-lg border p-4 ${
							data.isValid
								? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
								: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
						}`}
					>
						{data.isValid ? (
							<CheckCircle2 className="size-5 text-green-600" />
						) : (
							<AlertCircle className="size-5 text-red-600" />
						)}
						<div>
							<p className="font-semibold text-sm">
								{data.isValid ? "Passed — ready for NHDR submission" : "Validation failed — review errors before submitting"}
							</p>
							<p className="text-xs text-muted-foreground">
								Validated {new Date(data.validatedAt).toLocaleString("en-PH")}
							</p>
						</div>
					</div>

					<SummaryGauges report={data} />

					{/* Per-resource table */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Per-Resource Results</CardTitle>
						</CardHeader>
						<CardContent className="p-0">
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b text-left">
											<th className="p-3 font-medium">Resource Type</th>
											<th className="p-3 text-center font-medium">Total</th>
											<th className="p-3 text-center font-medium">Valid</th>
											<th className="p-3 text-center font-medium">Errors</th>
											<th className="p-3 text-center font-medium">Warnings</th>
											<th className="p-3 text-center font-medium">Status</th>
										</tr>
									</thead>
									<tbody>
										{data.resources.map(resource => (
											<ResourceRow key={resource.resourceType} resource={resource} />
										))}
									</tbody>
								</table>
							</div>
						</CardContent>
					</Card>
				</>
			)}
		</div>
	)
}

// ============================================================================
// Standalone ValidationReport (used when export id comes from props)
// ============================================================================

interface ValidationReportProps {
	exportId: string
}

export function ValidationReport({ exportId }: ValidationReportProps) {
	return (
		<ValidationReportPanel exportId={exportId} onClose={() => {}} />
	)
}

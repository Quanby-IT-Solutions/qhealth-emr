"use client"

import Link from "next/link"
import {
	AlertCircleFreeIcons,
	CheckmarkSquare01FreeIcons,
	ArrowLeft01FreeIcons,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { buttonVariants } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import { cn } from "@/core/lib/utils"

import type { DataQualitySection } from "@repo/contracts"

import { useAdminDashboardSummaryQuery } from "@/features/admin/api/admin-dashboard.hooks"

// ── Metric Row ────────────────────────────────────────────────────────────────

function MetricRow({
	label,
	description,
	value,
	isIssue,
}: {
	label: string
	description: string
	value: string | number
	isIssue?: boolean
}) {
	return (
		<div className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">{label}</span>
					{isIssue && (
						<Badge className="text-[10px] px-1.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
							Action needed
						</Badge>
					)}
				</div>
				<p className="text-xs text-muted-foreground mt-0.5">{description}</p>
			</div>
			<span
				className={cn(
					"text-2xl font-bold tabular-nums flex-shrink-0",
					isIssue ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"
				)}
			>
				{value}
			</span>
		</div>
	)
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DataQualityPanel() {
	const { data, isLoading, isError } = useAdminDashboardSummaryQuery()
	const dq = (data as (typeof data & { dataQuality?: DataQualitySection }) | undefined)?.dataQuality

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Link
					href="/admin"
					className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}
				>
					<HugeiconsIcon icon={ArrowLeft01FreeIcons} className="size-4" />
					Admin Dashboard
				</Link>
			</div>

			<div className="flex items-center gap-3">
				<HugeiconsIcon icon={CheckmarkSquare01FreeIcons} className="size-6 text-muted-foreground" />
				<div>
					<h1 className="text-xl font-semibold">Clinical Data Quality Oversight</h1>
					<p className="text-sm text-muted-foreground">
						Read-only governance view of HIM, PhilHealth, ICD-10, CF4, RVS, and AHSR readiness
					</p>
				</div>
			</div>

			{isLoading && (
				<div className="space-y-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-40 w-full rounded-lg" />
					))}
				</div>
			)}

			{isError && (
				<Alert variant="destructive">
					<HugeiconsIcon icon={AlertCircleFreeIcons} className="size-4" />
					<AlertTitle>Failed to load data quality metrics</AlertTitle>
					<AlertDescription>Check your connection and refresh.</AlertDescription>
				</Alert>
			)}

			{dq && (
				<div className="space-y-6">
					{/* ICD-10 Coding Completeness */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">ICD-10 Coding Completeness</CardTitle>
							<p className="text-xs text-muted-foreground">
								Resolved diagnoses that still have no ICD-10 code assigned. These affect PhilHealth
								billing accuracy and statutory disease reporting.
							</p>
						</CardHeader>
						<CardContent>
							<MetricRow
								label="Resolved problems without ICD-10"
								description="Diagnoses marked resolved but never codified — a direct indicator of incomplete HIM coding workflow."
								value={dq.missingIcd10Count}
								isIssue={dq.missingIcd10Count > 0}
							/>
							<div className="pt-3">
								<p className="text-xs text-muted-foreground">
									<strong>What this means:</strong> Each uncodified resolved problem represents a completed
									clinical encounter where the diagnosis was not coded. For PhilHealth Konsulta and CF4
									claims, ICD-10 codes are required. Coding officers should review these records in the
									HIM module.
								</p>
							</div>
						</CardContent>
					</Card>

					{/* CF4 / PhilHealth Claims */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">CF4 / PhilHealth Claims</CardTitle>
							<p className="text-xs text-muted-foreground">
								Status of PhilHealth CF4 claim records for this facility.
							</p>
						</CardHeader>
						<CardContent>
							<MetricRow
								label="CF4 drafts (all time)"
								description="Claims in draft state that have not been submitted. A high count may indicate bottlenecks in the billing workflow."
								value={dq.cf4DraftCount}
								isIssue={dq.cf4DraftCount > 10}
							/>
							<MetricRow
								label="CF4 submitted this month"
								description="Claims successfully submitted to PhilHealth in the current calendar month."
								value={dq.cf4SubmittedThisMonth}
							/>
							<div className="pt-3">
								<p className="text-xs text-muted-foreground">
									<strong>What this means:</strong> Drafts older than the current billing period should be
									reviewed and submitted or voided. The submitted count for the current month indicates
									billing throughput.
								</p>
							</div>
						</CardContent>
					</Card>

					{/* AD-016: CF4 Extraction Completeness */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">CF4 Clinical Extraction Completeness</CardTitle>
							<p className="text-xs text-muted-foreground">
								Whether auto-extracted clinical content in submitted and approved CF4 claims is complete
								enough for compliant PhilHealth submission. A claim can be submitted with an incomplete
								extraction payload, leading to rejection or manual re-entry by billing staff.
							</p>
						</CardHeader>
						<CardContent>
							<MetricRow
								label="Non-draft claims with extracted data"
								description="Submitted, approved, or rejected CF4 claims where clinical content was successfully auto-extracted from the finalized note."
								value={dq.cf4WithExtractedData}
							/>
							<MetricRow
								label="Non-draft claims missing extracted data"
								description="Claims where extractedData is null — clinical content was not captured from the finalized note. These claims rely entirely on manual entry."
								value={dq.cf4MissingExtractedData}
								isIssue={dq.cf4MissingExtractedData > 0}
							/>
							<MetricRow
								label="Extraction coverage rate"
								description="Percentage of non-draft CF4 claims that have a populated clinical extraction payload."
								value={`${dq.cf4ExtractionCompletePct}%`}
								isIssue={dq.cf4ExtractionCompletePct < 80}
							/>
							{dq.cf4SectionCompleteness.some(s => s.missingCount > 0) && (
								<div className="pt-3 space-y-1.5">
									<p className="text-xs font-medium">Missing required CF4 sections (in extracted claims)</p>
									{dq.cf4SectionCompleteness.map(s => (
										<div key={s.section} className="flex items-center justify-between text-xs">
											<span className="text-muted-foreground">{s.section}</span>
											<span className={s.missingCount > 0 ? "font-medium text-yellow-600 dark:text-yellow-400" : "text-muted-foreground"}>
												{s.missingCount} missing
											</span>
										</div>
									))}
								</div>
							)}
							<div className="pt-3">
								<p className="text-xs text-muted-foreground">
									<strong>What this means:</strong> The TOR requires automatic CF4 extraction from
									finalized clinical notes. Claims with null or incomplete extractions rely on manual
									data entry, increasing rejection risk and billing staff workload. Resolve extraction
									gaps by finalizing clinical notes before generating CF4 claims.
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Surgical RVS */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">Surgical RVS Assignment</CardTitle>
							<p className="text-xs text-muted-foreground">
								Surgical operations that have not been assigned a Relative Value Scale (RVS) code.
							</p>
						</CardHeader>
						<CardContent>
							<MetricRow
								label="Operations missing RVS code"
								description="Surgical procedures recorded in the OR module without a corresponding RVS billing code."
								value={dq.missingRvsCount}
								isIssue={dq.missingRvsCount > 0}
							/>
							<div className="pt-3">
								<p className="text-xs text-muted-foreground">
									<strong>What this means:</strong> RVS codes are required for correct PhilHealth surgical
									benefit claims. Operations without codes cannot be billed and may be rejected by
									PhilHealth auditors.
								</p>
							</div>
						</CardContent>
					</Card>

					{/* AHSR */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">
								Annual Hospital Statistical Report (AHSR)
							</CardTitle>
							<p className="text-xs text-muted-foreground">
								DOH-required monthly hospital activity snapshots that feed the AHSR submission.
							</p>
						</CardHeader>
						<CardContent>
							<MetricRow
								label="Last snapshot month"
								description="The most recent month for which an AHSR snapshot has been generated."
								value={dq.ahsrLastSnapshotMonth ?? "None"}
								isIssue={!dq.ahsrLastSnapshotMonth}
							/>
							<MetricRow
								label="Current month ready"
								description="Whether a snapshot for the current calendar month has been generated."
								value={dq.ahsrCurrentMonthReady ? "Yes" : "No"}
								isIssue={!dq.ahsrCurrentMonthReady}
							/>
							<div className="pt-3">
								<p className="text-xs text-muted-foreground">
									<strong>What this means:</strong> AHSR snapshots must be generated monthly as part of the
									DOH reporting workflow. A missing current-month snapshot indicates the monthly close
									process has not been run. Contact the reporting officer to generate the snapshot in the
									Reporting module.
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Guidance */}
					<Card className="border-dashed">
						<CardContent className="pt-4">
							<p className="text-xs text-muted-foreground">
								<strong>This is a read-only oversight view.</strong> To resolve data quality issues,
								use the HIM module for ICD-10 coding, the Billing module for CF4 claims, the Surgical
								module for RVS assignments, and the Reporting module for AHSR snapshots. Administrators
								can use this page to monitor overall readiness without accessing clinical workflows
								directly.
							</p>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	)
}

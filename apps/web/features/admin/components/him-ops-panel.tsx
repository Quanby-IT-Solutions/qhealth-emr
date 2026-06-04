"use client"

import Link from "next/link"
import {
	AlertCircleFreeIcons,
	ArrowLeft01FreeIcons,
	FileEditFreeIcons,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { buttonVariants } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import { cn } from "@/core/lib/utils"
import { useHimOpsQuery } from "@/features/admin/api/admin-dashboard.hooks"

// ── Metric Row ────────────────────────────────────────────────────────────────

function MetricRow({
	label,
	description,
	value,
	isIssue,
}: {
	label: string
	description: string
	value: number
	isIssue?: boolean
}) {
	return (
		<div className="flex items-start justify-between gap-4 border-b py-3 last:border-0">
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">{label}</span>
					{isIssue && (
						<Badge className="bg-yellow-100 px-1.5 text-[10px] text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
							Action needed
						</Badge>
					)}
				</div>
				<p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
			</div>
			<span
				className={cn(
					"flex-shrink-0 text-2xl font-bold tabular-nums",
					isIssue ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"
				)}
			>
				{value}
			</span>
		</div>
	)
}

// ── Main Component ────────────────────────────────────────────────────────────

export function HimOpsPanel() {
	const { data, isLoading, isError } = useHimOpsQuery()

	return (
		<div className="space-y-6">
			{/* Back nav */}
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
				<HugeiconsIcon icon={FileEditFreeIcons} className="text-muted-foreground size-6" />
				<div>
					<h1 className="text-xl font-semibold">HIM Operations Oversight</h1>
					<p className="text-muted-foreground text-sm">
						Pending discharge summaries, ICD-10 coding backlogs, and medical records release
						requests
					</p>
				</div>
			</div>

			{isLoading && (
				<div className="space-y-4">
					{Array.from({ length: 2 }).map((_, i) => (
						<Skeleton key={i} className="h-40 w-full rounded-lg" />
					))}
				</div>
			)}

			{isError && (
				<Alert variant="destructive">
					<HugeiconsIcon icon={AlertCircleFreeIcons} className="size-4" />
					<AlertTitle>Failed to load HIM operations data</AlertTitle>
					<AlertDescription>Check your connection and refresh.</AlertDescription>
				</Alert>
			)}

			{data && (
				<div className="space-y-6">
					{/* Discharge Documentation */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">Discharge Documentation</CardTitle>
							<p className="text-muted-foreground text-xs">
								Completed encounters still requiring discharge summaries or ICD-10 coding.
							</p>
						</CardHeader>
						<CardContent>
							<MetricRow
								label="Pending discharge summaries (draft)"
								description="Discharge summary notes still in draft status for encounters where the patient has already been discharged. HIM coding officers must finalize these before claims submission."
								value={data.pendingDischargeSummaryCount}
								isIssue={data.pendingDischargeSummaryCount > 0}
							/>
							<MetricRow
								label="Encounters pending ICD-10 coding"
								description="Distinct discharged encounters with at least one unresolved problem missing an ICD-10 code. Each encounter is counted once, regardless of how many uncoded diagnoses it contains. These block PhilHealth billing and statutory reporting."
								value={data.pendingCodingCount}
								isIssue={data.pendingCodingCount > 0}
							/>
							<div className="pt-3">
								<p className="text-muted-foreground text-xs">
									<strong>Action:</strong> Assign coding officers to review each discharged
									encounter and assign ICD-10 codes using the ICD-10-CM/PCS code set. Finalize all
									draft discharge summaries before end-of-month billing cycle.
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Medical Records Requests */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">Medical Records Release</CardTitle>
							<p className="text-muted-foreground text-xs">
								Pending requests for records release, discharge summary copies, and medical
								certificates.
							</p>
						</CardHeader>
						<CardContent>
							<MetricRow
								label="Pending records release requests"
								description="Approved chart release, discharge summary copy, and laboratory result requests awaiting processing."
								value={data.pendingRecordsReleaseCount}
								isIssue={data.pendingRecordsReleaseCount > 5}
							/>
							<MetricRow
								label="Pending medical certificate requests"
								description="Medical certificate requests awaiting physician countersignature or HIM processing."
								value={data.pendingMedCertCount}
								isIssue={data.pendingMedCertCount > 3}
							/>
							<div className="pt-3">
								<p className="text-muted-foreground text-xs">
									<strong>Action:</strong> Medical records officer should process pending requests
									within the facility&apos;s SLA window. Delays in records release may trigger ARTA
									complaints.
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	)
}

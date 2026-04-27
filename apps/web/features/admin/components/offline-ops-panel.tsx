"use client"

import Link from "next/link"
import {
	AlertCircleFreeIcons,
	ArrowLeft01FreeIcons,
	ArrowReloadHorizontalFreeIcons,
	WifiOffFreeIcons,
	CheckmarkCircle01FreeIcons,
	CancelCircleFreeIcons,
	Loading01FreeIcons,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button, buttonVariants } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import { cn } from "@/core/lib/utils"

import { useAdminDashboardSummaryQuery } from "@/features/admin/api/admin-dashboard.hooks"
import { useTriggerOfflineCacheJobMutation } from "@/features/system-settings/api/system-settings.hooks"
import type { OfflineReadinessSection } from "@repo/contracts"

type OfflineCacheJob = OfflineReadinessSection["recentJobs"][number]

// ── Status badge helpers ──────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OfflineReadinessSection["status"] }) {
	const map: Record<OfflineReadinessSection["status"], { label: string; className: string }> = {
		healthy: {
			label: "Healthy",
			className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
		},
		disabled: {
			label: "Disabled",
			className: "bg-muted text-muted-foreground",
		},
		stale: {
			label: "Stale",
			className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
		},
		degraded: {
			label: "Degraded",
			className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
		},
	}
	const { label, className } = map[status]
	return <Badge className={cn("text-[10px] px-1.5", className)}>{label}</Badge>
}

function JobStatusIcon({ status }: { status: OfflineCacheJob["status"] }) {
	if (status === "completed") {
		return <HugeiconsIcon icon={CheckmarkCircle01FreeIcons} className="size-4 text-green-500 flex-shrink-0" />
	}
	if (status === "failed") {
		return <HugeiconsIcon icon={CancelCircleFreeIcons} className="size-4 text-red-500 flex-shrink-0" />
	}
	return <HugeiconsIcon icon={Loading01FreeIcons} className="size-4 text-yellow-500 flex-shrink-0 animate-spin" />
}

function JobStatusBadge({ status }: { status: OfflineCacheJob["status"] }) {
	const map: Record<OfflineCacheJob["status"], { label: string; className: string }> = {
		completed: { label: "Completed", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
		failed: { label: "Failed", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
		running: { label: "Running", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
	}
	const { label, className } = map[status]
	return <Badge className={cn("text-[10px] px-1.5", className)}>{label}</Badge>
}

// ── Main Component ────────────────────────────────────────────────────────────

export function OfflineOpsPanel() {
	const { data, isLoading, isError } = useAdminDashboardSummaryQuery()
	const offline = data?.offlineReadiness
	const triggerMutation = useTriggerOfflineCacheJobMutation()

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
				<HugeiconsIcon icon={WifiOffFreeIcons} className="size-6 text-muted-foreground" />
				<div>
					<h1 className="text-xl font-semibold">Offline Operations</h1>
					<p className="text-sm text-muted-foreground">
						Offline cache readiness, job history, and continuity status for disconnected operations
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
					<AlertTitle>Failed to load offline operations data</AlertTitle>
					<AlertDescription>Check your connection and refresh.</AlertDescription>
				</Alert>
			)}

			{offline && (
				<div className="space-y-6">
					{/* Current status */}
					<Card>
						<CardHeader className="pb-2">
							<div className="flex items-center justify-between">
								<CardTitle className="text-sm font-medium">Current Readiness</CardTitle>
								<div className="flex items-center gap-2">
									<StatusBadge status={offline.status} />
									{offline.enabled && (
										<Button
											variant="outline"
											size="sm"
											className="h-7 gap-1.5 text-xs"
											disabled={triggerMutation.isPending}
											onClick={() => triggerMutation.mutate(undefined)}
										>
											<HugeiconsIcon
											icon={ArrowReloadHorizontalFreeIcons}
												className={cn("size-3", triggerMutation.isPending && "animate-spin")}
											/>
											{triggerMutation.isPending ? "Running…" : "Trigger Now"}
										</Button>
									)}
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
								<div>
									<p className="text-xs text-muted-foreground">Offline enabled</p>
									<p className="font-medium">{offline.enabled ? "Yes" : "No"}</p>
								</div>
								<div>
									<p className="text-xs text-muted-foreground">Max offline days</p>
									<p className="font-medium">{offline.maxOfflineDays ?? "—"}</p>
								</div>
								<div>
									<p className="text-xs text-muted-foreground">Cached patients</p>
									<p className="font-medium">{offline.activePatientsCount.toLocaleString()}</p>
								</div>
								<div>
									<p className="text-xs text-muted-foreground">Last cache prepared</p>
									<p className="font-medium">
										{offline.lastCachePreparedAt
											? new Date(offline.lastCachePreparedAt).toLocaleString("en-PH")
											: "Never"}
									</p>
								</div>
							</div>

							{offline.lastFailedAt && offline.lastFailureMessage && (
								<Alert variant="destructive" className="mt-4">
									<HugeiconsIcon icon={AlertCircleFreeIcons} className="size-4" />
									<AlertTitle>
										Last failure:{" "}
										{new Date(offline.lastFailedAt).toLocaleString("en-PH")}
									</AlertTitle>
									<AlertDescription className="text-xs">{offline.lastFailureMessage}</AlertDescription>
								</Alert>
							)}

							{offline.status === "disabled" && (
								<div className="mt-4 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
									Offline caching is currently disabled. Enable it in{" "}
									<Link href="/admin/settings" className="underline underline-offset-2">
										System Settings
									</Link>{" "}
									to allow this facility to operate during network outages.
								</div>
							)}
						</CardContent>
					</Card>

					{/* Recent jobs */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">Recent Cache Jobs</CardTitle>
							<p className="text-xs text-muted-foreground">
								Last {offline.recentJobs.length} cache preparation jobs, most recent first
							</p>
						</CardHeader>
						<CardContent>
							{offline.recentJobs.length === 0 ? (
								<p className="text-sm text-muted-foreground py-4 text-center">
									No cache jobs have been run yet.
								</p>
							) : (
								<div className="space-y-3">
									{offline.recentJobs.map(job => (
										<div key={job.id} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
											<JobStatusIcon status={job.status} />
											<div className="flex-1 min-w-0">
												<div className="flex items-center justify-between gap-2 flex-wrap">
													<JobStatusBadge status={job.status} />
													<span className="text-xs text-muted-foreground flex-shrink-0">
														{new Date(job.startedAt).toLocaleString("en-PH")}
													</span>
												</div>
												<div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
													{job.cachedPatientCount !== null && (
														<span>{job.cachedPatientCount.toLocaleString()} patients cached</span>
													)}
													{job.completedAt && (
														<span>
															Duration:{" "}
															{Math.round(
																(new Date(job.completedAt).getTime() -
																	new Date(job.startedAt).getTime()) /
																	1000
															)}
															s
														</span>
													)}
													<span>Triggered by: {job.triggeredBy}</span>
												</div>
												{job.errorMessage && (
													<p className="mt-1 text-xs text-destructive truncate" title={job.errorMessage}>
														{job.errorMessage}
													</p>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Guidance */}
					<Card className="border-dashed">
						<CardContent className="pt-4">
							<p className="text-xs text-muted-foreground">
								Cache jobs run automatically every hour for all facilities with offline mode enabled.
								You can also trigger a manual run using the <strong>Trigger Now</strong> button above.
								If jobs are failing consistently, check server disk space, database connectivity, and
								the system logs for root cause analysis. A stale cache (no job in &gt;24h) means
								patients seen offline may not have their latest records pre-loaded.
							</p>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	)
}

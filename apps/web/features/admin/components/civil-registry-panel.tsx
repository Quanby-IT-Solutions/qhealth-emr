"use client"

import Link from "next/link"
import {
	AlertCircleFreeIcons,
	ArrowLeft01FreeIcons,
	Certificate01FreeIcons,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { buttonVariants } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { cn } from "@/core/lib/utils"
import { useCivilRegistryOpsQuery } from "@/features/admin/api/admin-dashboard.hooks"

// ── Status Chip ───────────────────────────────────────────────────────────────

function StatusChip({
	label,
	count,
	variant,
}: {
	label: string
	count: number
	variant: "draft" | "completed" | "submitted"
}) {
	const variantMap = {
		draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
		completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
		submitted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
	}
	return (
		<div className="flex items-center gap-2">
			<Badge className={cn("px-1.5 text-[10px] font-medium", variantMap[variant])}>{label}</Badge>
			<span className="text-sm font-semibold tabular-nums">{count}</span>
		</div>
	)
}

// ── Main Component ────────────────────────────────────────────────────────────

export function CivilRegistryPanel() {
	const { data, isLoading, isError } = useCivilRegistryOpsQuery()

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
				<HugeiconsIcon icon={Certificate01FreeIcons} className="text-muted-foreground size-6" />
				<div>
					<h1 className="text-xl font-semibold">Civil Registry Operations</h1>
					<p className="text-muted-foreground text-sm">
						Birth and death certificate tracking — FMDRF/FNDRF death reports and live birth
						registrations
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
					<AlertTitle>Failed to load civil registry data</AlertTitle>
					<AlertDescription>Check your connection and refresh.</AlertDescription>
				</Alert>
			)}

			{data && (
				<div className="space-y-6">
					{/* Summary counts */}
					<div className="grid grid-cols-3 gap-4">
						<Card>
							<CardContent className="pt-4">
								<p className="text-muted-foreground text-xs">Draft / pending certificate</p>
								<p className="text-2xl font-bold text-yellow-600 tabular-nums">
									{data.pendingCertificateCount}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-4">
								<p className="text-muted-foreground text-xs">Completed, not yet submitted</p>
								<p className="text-2xl font-bold text-blue-600 tabular-nums">
									{data.completedNotSubmittedCount}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-4">
								<p className="text-muted-foreground text-xs">Submitted to civil registrar</p>
								<p className="text-2xl font-bold text-green-700 tabular-nums">
									{data.submittedCount}
								</p>
							</CardContent>
						</Card>
					</div>

					{/* FMDRF / FNDRF Breakdown */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">Report Breakdown by Type</CardTitle>
							<p className="text-muted-foreground text-xs">
								FMDRF = Fetal/Maternal Death Report Form · FNDRF = Fetal/Neonatal Death Report Form.
								Both must be submitted to the local civil registrar within 30 days of death.
							</p>
						</CardHeader>
						<CardContent className="p-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="pl-4">Report type</TableHead>
										<TableHead>Draft</TableHead>
										<TableHead>Completed</TableHead>
										<TableHead>Submitted</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									<TableRow>
										<TableCell className="pl-4 font-medium">FMDRF (Maternal / Fetal)</TableCell>
										<TableCell>
											<StatusChip label="Draft" count={data.fmdrf.draft} variant="draft" />
										</TableCell>
										<TableCell>
											<StatusChip
												label="Completed"
												count={data.fmdrf.completed}
												variant="completed"
											/>
										</TableCell>
										<TableCell>
											<StatusChip
												label="Submitted"
												count={data.fmdrf.submitted}
												variant="submitted"
											/>
										</TableCell>
									</TableRow>
									<TableRow>
										<TableCell className="pl-4 font-medium">FNDRF (Neonatal / Fetal)</TableCell>
										<TableCell>
											<StatusChip label="Draft" count={data.fndrf.draft} variant="draft" />
										</TableCell>
										<TableCell>
											<StatusChip
												label="Completed"
												count={data.fndrf.completed}
												variant="completed"
											/>
										</TableCell>
										<TableCell>
											<StatusChip
												label="Submitted"
												count={data.fndrf.submitted}
												variant="submitted"
											/>
										</TableCell>
									</TableRow>
								</TableBody>
							</Table>
						</CardContent>
					</Card>

					{/* Last submission date */}
					{data.lastSubmittedAt && (
						<p className="text-muted-foreground text-xs">
							Last submitted to civil registrar:{" "}
							<strong>
								{new Date(data.lastSubmittedAt).toLocaleDateString("en-PH", {
									dateStyle: "long",
								})}
							</strong>
						</p>
					)}

					{/* Compliance note */}
					<Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
						<CardContent className="pt-4">
							<p className="text-xs text-blue-800 dark:text-blue-300">
								<strong>Compliance note:</strong> Under the Civil Registration Law (Act 3753) and
								DOH Administrative Order No. 2012-0011, all births and deaths must be registered
								within 30 days. Reports in <em>completed</em> status are ready to transmit — ensure
								your civil registry liaison submits them promptly.
							</p>
						</CardContent>
					</Card>

					{/* Birth Certificate Tracking — sourced from civil registry records (AD-005) */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">Birth Certificate Tracking</CardTitle>
							<p className="text-muted-foreground text-xs">
								Live birth certificates registered at this facility in the civil registry system.
								Status reflects whether the certificate has been completed and transmitted to the
								local civil registrar or PSA. This is sourced from civil registry records, not
								newborn screening data.
							</p>
						</CardHeader>
						<CardContent>
							<div className="mb-4 grid grid-cols-3 gap-4">
								<div className="space-y-0.5">
									<p className="text-muted-foreground text-xs">Draft</p>
									<p className="text-2xl font-bold text-yellow-600 tabular-nums">
										{data.birthCertificate.draftCount}
									</p>
								</div>
								<div className="space-y-0.5">
									<p className="text-muted-foreground text-xs">Completed, not submitted</p>
									<p className="text-2xl font-bold text-blue-600 tabular-nums">
										{data.birthCertificate.completedCount}
									</p>
								</div>
								<div className="space-y-0.5">
									<p className="text-muted-foreground text-xs">Submitted to registrar</p>
									<p className="text-2xl font-bold text-green-700 tabular-nums">
										{data.birthCertificate.submittedCount}
									</p>
								</div>
							</div>
							{data.birthCertificate.lastSubmittedAt && (
								<p className="text-muted-foreground text-xs">
									Most recent birth certificate submitted to civil registrar:{" "}
									<strong>
										{new Date(data.birthCertificate.lastSubmittedAt).toLocaleDateString("en-PH", {
											dateStyle: "long",
										})}
									</strong>
								</p>
							)}
							{data.birthCertificate.draftCount === 0 &&
								data.birthCertificate.completedCount === 0 &&
								data.birthCertificate.submittedCount === 0 && (
									<p className="text-muted-foreground py-2 text-xs">
										No birth certificates recorded at this facility yet.
									</p>
								)}
						</CardContent>
					</Card>

					{/* Newborn Screening — NBS pipeline data, distinct from civil registry certificates (AD-005 / AD-012) */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">
								Newborn Screening (NBS) Programme
							</CardTitle>
							<p className="text-muted-foreground text-xs">
								Newborn screening entries from the NBS pipeline. This data tracks the screening
								programme status only — it is not a proxy for civil registry birth certificate
								registration.
							</p>
						</CardHeader>
						<CardContent className="space-y-6">
							{/* Volume overview */}
							<div className="grid grid-cols-3 gap-4">
								<div className="space-y-0.5">
									<p className="text-muted-foreground text-xs">Total live births (NBS)</p>
									<p className="text-2xl font-bold tabular-nums">
										{data.nbsScreening.totalLiveBirths}
									</p>
								</div>
								<div className="space-y-0.5">
									<p className="text-muted-foreground text-xs">Screening pending</p>
									<p className="text-2xl font-bold text-yellow-600 tabular-nums">
										{data.nbsScreening.pendingScreeningCount}
									</p>
								</div>
								<div className="space-y-0.5">
									<p className="text-muted-foreground text-xs">Screened / progressed</p>
									<p className="text-2xl font-bold text-green-700 tabular-nums">
										{data.nbsScreening.screenedCount}
									</p>
								</div>
							</div>
							{data.nbsScreening.lastScreeningAt && (
								<p className="text-muted-foreground text-xs">
									Most recent NBS birth datetime:{" "}
									<strong>
										{new Date(data.nbsScreening.lastScreeningAt).toLocaleDateString("en-PH", {
											dateStyle: "long",
										})}
									</strong>
								</p>
							)}
							{data.nbsScreening.totalLiveBirths === 0 && (
								<p className="text-muted-foreground py-2 text-xs">
									No newborn screening entries recorded at this facility yet.
								</p>
							)}

							{data.nbsScreening.totalLiveBirths > 0 && (
								<>
									{/* AD-012: Timing-window compliance */}
									<div className="border-t pt-4">
										<p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
											Screening Timing Compliance (RA 9288 — 24–48h post-birth window)
										</p>
										<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
											<div className="border-border/70 space-y-0.5 rounded-md border p-3">
												<p className="text-muted-foreground text-[11px]">On-time (24–48h)</p>
												<p className="text-xl font-bold text-green-700 tabular-nums dark:text-green-400">
													{data.nbsScreening.onTimeCount}
												</p>
											</div>
											<div className="border-border/70 space-y-0.5 rounded-md border p-3">
												<p className="text-muted-foreground text-[11px]">Early (&lt;24h)</p>
												<p className="text-xl font-bold text-blue-600 tabular-nums dark:text-blue-400">
													{data.nbsScreening.earlyCount}
												</p>
											</div>
											<div className="border-border/70 space-y-0.5 rounded-md border p-3">
												<p className="text-muted-foreground text-[11px]">Late (&gt;48h)</p>
												<p
													className={`text-xl font-bold tabular-nums ${data.nbsScreening.lateScreenedCount > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"}`}
												>
													{data.nbsScreening.lateScreenedCount}
												</p>
											</div>
											<div className="border-destructive/30 bg-destructive/5 space-y-0.5 rounded-md border p-3">
												<p className="text-muted-foreground text-[11px]">Urgently overdue</p>
												<p
													className={`text-xl font-bold tabular-nums ${data.nbsScreening.overdueCount > 0 ? "text-destructive" : "text-foreground"}`}
												>
													{data.nbsScreening.overdueCount}
												</p>
											</div>
										</div>
										{data.nbsScreening.overdueCount > 0 && (
											<p className="text-destructive mt-2 text-xs">
												<strong>{data.nbsScreening.overdueCount}</strong> newborn
												{data.nbsScreening.overdueCount === 1 ? "" : "s"} born more than 48h ago
												with no screening recorded. Coordinate with nursing/midwifery immediately.
											</p>
										)}
									</div>

									{/* AD-012: Consent / waiver status */}
									<div className="border-t pt-4">
										<p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
											Consent &amp; Waiver Status
										</p>
										<div className="grid grid-cols-3 gap-3">
											<div className="border-border/70 space-y-0.5 rounded-md border p-3">
												<p className="text-muted-foreground text-[11px]">Consented</p>
												<p className="text-xl font-bold text-green-700 tabular-nums dark:text-green-400">
													{data.nbsScreening.consentedCount}
												</p>
											</div>
											<div className="border-border/70 space-y-0.5 rounded-md border p-3">
												<p className="text-muted-foreground text-[11px]">Waived</p>
												<p className="text-muted-foreground text-xl font-bold tabular-nums">
													{data.nbsScreening.waivedCount}
												</p>
											</div>
											<div className="border-border/70 space-y-0.5 rounded-md border p-3">
												<p className="text-muted-foreground text-[11px]">Pending consent</p>
												<p
													className={`text-xl font-bold tabular-nums ${data.nbsScreening.pendingConsentCount > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"}`}
												>
													{data.nbsScreening.pendingConsentCount}
												</p>
											</div>
										</div>
									</div>

									{/* AD-012: Referral follow-through for positive / abnormal results */}
									<div className="border-t pt-4">
										<p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
											Referral Follow-through (Positive / Abnormal Results)
										</p>
										<div className="grid grid-cols-3 gap-3">
											<div className="border-border/70 space-y-0.5 rounded-md border p-3">
												<p className="text-muted-foreground text-[11px]">Positive / abnormal</p>
												<p
													className={`text-xl font-bold tabular-nums ${data.nbsScreening.positiveOrBorderlineCount > 0 ? "text-destructive" : "text-foreground"}`}
												>
													{data.nbsScreening.positiveOrBorderlineCount}
												</p>
											</div>
											<div className="border-border/70 space-y-0.5 rounded-md border p-3">
												<p className="text-muted-foreground text-[11px]">Referral pending</p>
												<p
													className={`text-xl font-bold tabular-nums ${data.nbsScreening.referralPendingCount > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"}`}
												>
													{data.nbsScreening.referralPendingCount}
												</p>
											</div>
											<div className="border-border/70 space-y-0.5 rounded-md border p-3">
												<p className="text-muted-foreground text-[11px]">Referral completed</p>
												<p className="text-xl font-bold text-green-700 tabular-nums dark:text-green-400">
													{data.nbsScreening.referralCompletedCount}
												</p>
											</div>
										</div>
										{data.nbsScreening.referralPendingCount > 0 && (
											<p className="mt-2 text-xs text-yellow-700 dark:text-yellow-400">
												<strong>{data.nbsScreening.referralPendingCount}</strong> referral
												{data.nbsScreening.referralPendingCount === 1 ? "" : "s"} initiated but not
												yet completed. Follow up with the receiving facility to confirm completion.
											</p>
										)}
									</div>
								</>
							)}
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	)
}

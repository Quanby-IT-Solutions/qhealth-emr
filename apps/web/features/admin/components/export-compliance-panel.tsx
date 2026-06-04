"use client"

import Link from "next/link"
import {
	AlertCircleFreeIcons,
	AlertDiamondFreeIcons,
	ArrowLeft01FreeIcons,
	Cancel01FreeIcons,
	CheckmarkCircle01FreeIcons,
	DatabaseExportFreeIcons,
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
import { useExportComplianceQuery } from "@/features/admin/api/admin-dashboard.hooks"

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
	const map: Record<
		string,
		{ label: string; className: string; icon: typeof CheckmarkCircle01FreeIcons }
	> = {
		completed: {
			label: "Completed",
			className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
			icon: CheckmarkCircle01FreeIcons,
		},
		failed: {
			label: "Failed",
			className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
			icon: Cancel01FreeIcons,
		},
		rejected: {
			label: "Rejected",
			className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
			icon: AlertDiamondFreeIcons,
		},
	}
	const cfg = map[status] ?? { label: status, className: "", icon: CheckmarkCircle01FreeIcons }
	return (
		<Badge className={cn("gap-1 px-1.5 text-[10px] font-medium", cfg.className)}>
			<HugeiconsIcon icon={cfg.icon} className="size-3" />
			{cfg.label}
		</Badge>
	)
}

// ── Consent Gate Badge (AD-008) ──────────────────────────────────────────────

function ConsentGateBadge({ gated }: { gated: boolean }) {
	if (gated) {
		return (
			<Badge className="gap-1 bg-blue-100 px-1.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
				Gated
			</Badge>
		)
	}
	return (
		<Badge className="bg-gray-100 px-1.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
			Not gated
		</Badge>
	)
}

// ── Consent Outcome Badge ─────────────────────────────────────────────────────

function ConsentBadge({ gated, outcome }: { gated: boolean; outcome: string | null }) {
	// AD-008: highlight bypass on a gated export — highest privacy concern
	if (gated && outcome === "bypassed") {
		return (
			<span className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">bypassed ⚠</span>
		)
	}
	if (!outcome) return <span className="text-muted-foreground text-xs">N/A</span>
	const map: Record<string, string> = {
		granted: "text-green-700 dark:text-green-400",
		denied: "text-red-700 dark:text-red-400",
		bypassed: "text-yellow-700 dark:text-yellow-400",
	}
	return (
		<span className={cn("text-xs font-medium capitalize", map[outcome] ?? "text-foreground")}>
			{outcome}
		</span>
	)
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ExportCompliancePanel() {
	const { data, isLoading, isError } = useExportComplianceQuery({ page: 1, limit: 50 })

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
				<HugeiconsIcon icon={DatabaseExportFreeIcons} className="text-muted-foreground size-6" />
				<div>
					<h1 className="text-xl font-semibold">Data Export Compliance Audit</h1>
					<p className="text-muted-foreground text-sm">
						Consent-gated data export log — evidence for DOH, PhilHealth, and DPA compliance reviews
					</p>
				</div>
			</div>

			{isLoading && (
				<div className="space-y-4">
					<Skeleton className="h-12 w-full rounded-lg" />
					<Skeleton className="h-64 w-full rounded-lg" />
				</div>
			)}

			{isError && (
				<Alert variant="destructive">
					<HugeiconsIcon icon={AlertCircleFreeIcons} className="size-4" />
					<AlertTitle>Failed to load export audit log</AlertTitle>
					<AlertDescription>Check your connection and refresh.</AlertDescription>
				</Alert>
			)}

			{data && (
				<div className="space-y-4">
					{/* Summary counts */}
					<div className="grid grid-cols-3 gap-4">
						<Card>
							<CardContent className="pt-4">
								<p className="text-muted-foreground text-xs">Total exports</p>
								<p className="text-2xl font-bold tabular-nums">{data.total}</p>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-4">
								<p className="text-muted-foreground text-xs">Consent-gated exports</p>
								<p className="text-2xl font-bold text-blue-600 tabular-nums">
									{data.items.filter(i => i.consentGated).length}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-4">
								<p className="text-muted-foreground text-xs">Rejected / failed</p>
								<p className="text-2xl font-bold text-red-600 tabular-nums">
									{data.items.filter(i => i.status === "rejected" || i.status === "failed").length}
								</p>
							</CardContent>
						</Card>
					</div>

					{/* Compliance explanation */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">
								Audit Trail — Most Recent 50 Exports
							</CardTitle>
							<p className="text-muted-foreground text-xs">
								Every patient data export is logged here with the consent outcome, transmission
								scope, and rejection rationale. Regulators (DOH, PhilHealth, NPC) may request this
								log as evidence of Data Privacy Act compliance. Exports with{" "}
								<strong>bypassed</strong> consent must have a documented clinical or legal
								justification.
							</p>
						</CardHeader>
						<CardContent className="p-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="pl-4">Exported at</TableHead>
										<TableHead>Entity type</TableHead>
										<TableHead>Actor (user)</TableHead>
										<TableHead>Actor staff</TableHead>
										<TableHead>Entity ID</TableHead>
										<TableHead>Source IP</TableHead>
										<TableHead>Destination</TableHead>
										<TableHead>Scope</TableHead>
										<TableHead>Consent gate</TableHead>
										<TableHead>Consent outcome</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Rejection reason</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{data.items.length === 0 && (
										<TableRow>
											<TableCell
												colSpan={12}
												className="text-muted-foreground py-8 text-center text-sm"
											>
												No data exports recorded yet.
											</TableCell>
										</TableRow>
									)}
									{data.items.map(row => (
										<TableRow key={row.id}>
											<TableCell className="text-muted-foreground pl-4 text-xs whitespace-nowrap tabular-nums">
												{row.exportedAt
													? new Date(row.exportedAt).toLocaleString("en-PH", {
															dateStyle: "short",
															timeStyle: "short",
														})
													: "—"}
											</TableCell>
											<TableCell className="text-xs capitalize">
												{row.entityType?.replaceAll("_", " ") ?? "—"}
											</TableCell>
											<TableCell className="text-muted-foreground max-w-[120px] truncate font-mono text-xs">
												{row.actor ?? "—"}
											</TableCell>
											<TableCell className="text-muted-foreground max-w-[120px] truncate font-mono text-xs">
												{row.actorStaffId ? (
													<span title={row.actorStaffId}>{row.actorStaffId.slice(0, 8)}…</span>
												) : (
													<span className="text-muted-foreground">—</span>
												)}
											</TableCell>
											<TableCell className="text-muted-foreground max-w-[120px] truncate font-mono text-xs">
												{row.entityId ? (
													<span title={row.entityId}>{row.entityId.slice(0, 8)}…</span>
												) : (
													<span className="text-muted-foreground">—</span>
												)}
											</TableCell>
											<TableCell className="text-muted-foreground font-mono text-xs">
												{row.ipAddress ?? <span className="text-muted-foreground">—</span>}
											</TableCell>
											<TableCell className="text-xs">
												{row.destination ?? <span className="text-muted-foreground">Internal</span>}
											</TableCell>
											<TableCell className="text-xs capitalize">
												{row.transmissionScope?.replaceAll("_", " ") ?? (
													<span className="text-muted-foreground">—</span>
												)}
											</TableCell>
											{/* AD-008: consent gate state — is this export consent-gated at all? */}
											<TableCell>
												<ConsentGateBadge gated={row.consentGated} />
											</TableCell>
											<TableCell>
												<ConsentBadge gated={row.consentGated} outcome={row.consentOutcome} />
											</TableCell>
											<TableCell>
												<StatusBadge status={row.status} />
											</TableCell>
											<TableCell className="text-muted-foreground max-w-[160px] text-xs">
												{row.rejectionReason ? (
													<span className="text-red-600 dark:text-red-400">
														{row.rejectionReason}
													</span>
												) : (
													<span>—</span>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	)
}

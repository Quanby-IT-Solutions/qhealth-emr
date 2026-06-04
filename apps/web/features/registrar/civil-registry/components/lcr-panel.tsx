"use client"

import Link from "next/link"
import {
	AlertCircleFreeIcons,
	ArrowRight01FreeIcons,
	Certificate01FreeIcons,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { buttonVariants } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import { cn } from "@/core/lib/utils"
import { useCivilRegistryOpsQuery } from "@/features/admin/api/admin-dashboard.hooks"

function StatusBadge({
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

export function LcrPanel() {
	const { data, isLoading, isError } = useCivilRegistryOpsQuery()

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<HugeiconsIcon icon={Certificate01FreeIcons} className="text-muted-foreground size-6" />
				<div>
					<h1 className="text-xl font-semibold">Local Civil Registry</h1>
					<p className="text-muted-foreground text-sm">
						Birth and death certificate generation, payment tracking, and release — SLA-017 &amp;
						SLA-021
					</p>
				</div>
			</div>

			{isLoading && (
				<div className="space-y-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-28 w-full rounded-lg" />
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
								<p className="text-muted-foreground text-xs">Draft / pending</p>
								<p className="text-2xl font-bold text-yellow-600 tabular-nums">
									{data.pendingCertificateCount}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-4">
								<p className="text-muted-foreground text-xs">Completed, not submitted</p>
								<p className="text-2xl font-bold text-blue-600 tabular-nums">
									{data.completedNotSubmittedCount}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-4">
								<p className="text-muted-foreground text-xs">Submitted to registrar</p>
								<p className="text-2xl font-bold text-green-700 tabular-nums">
									{data.submittedCount}
								</p>
							</CardContent>
						</Card>
					</div>

					{/* Action sections */}
					<div className="grid gap-4 sm:grid-cols-2">
						{/* Birth Certificates */}
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-sm font-semibold">Birth Certificates</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex gap-3">
									<StatusBadge
										label="Draft"
										count={data.birthCertificate.draftCount}
										variant="draft"
									/>
									<StatusBadge
										label="Completed"
										count={data.birthCertificate.completedCount}
										variant="completed"
									/>
									<StatusBadge
										label="Submitted"
										count={data.birthCertificate.submittedCount}
										variant="submitted"
									/>
								</div>
								<Link
									href="/registrar/civil-registry/birth"
									className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
								>
									New Birth Certificate
									<HugeiconsIcon icon={ArrowRight01FreeIcons} className="size-3.5" />
								</Link>
							</CardContent>
						</Card>

						{/* Death Certificates */}
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-sm font-semibold">Death Certificates</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<Link
									href="/registrar/civil-registry/death"
									className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1.5")}
								>
									New Death Certificate
									<HugeiconsIcon icon={ArrowRight01FreeIcons} className="size-3.5" />
								</Link>
							</CardContent>
						</Card>
					</div>

					{/* LCR Tracking link */}
					<div className="border-border/70 flex items-center justify-between rounded-lg border p-4">
						<div>
							<p className="text-sm font-medium">LCR Tracking</p>
							<p className="text-muted-foreground text-xs">
								View all certificates, SLA checkpoints, and payment / release status
							</p>
						</div>
						<Link
							href="/registrar/civil-registry/tracking"
							className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
						>
							View Tracking
							<HugeiconsIcon icon={ArrowRight01FreeIcons} className="size-3.5" />
						</Link>
					</div>

					{/* Compliance note */}
					<Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
						<CardContent className="pt-4">
							<p className="text-xs text-blue-800 dark:text-blue-300">
								<strong>Compliance note:</strong> Under the Civil Registration Law (Act 3753) and
								DOH Administrative Order No. 2012-0011, all births and deaths must be registered
								within 30 days. Ensure certificates in <em>completed</em> status are submitted
								promptly.
							</p>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	)
}

"use client"

import Link from "next/link"

import { AlertTriangle, Clock3, Pill, RefreshCw, ShieldAlert, Syringe } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

import {
	type PharmacyQueueItem,
	useOpdPrescriptionQueueQuery,
	usePharmacyQueueQuery,
} from "../api/pharmacy.hooks"

const PRIORITY_WEIGHT = {
	stat: 0,
	urgent: 1,
	routine: 2,
} as const

function minutesSince(dateStr: string) {
	return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000))
}

function formatWait(minutes: number) {
	if (minutes < 60) return `${minutes}m`
	const hours = Math.floor(minutes / 60)
	return `${hours}h ${minutes % 60}m`
}

function priorityBadge(item: PharmacyQueueItem) {
	if (item.priority === "stat") {
		return <Badge variant="destructive">STAT</Badge>
	}

	if (item.priority === "urgent") {
		return (
			<Badge variant="secondary" className="border-amber-400 text-amber-700">
				Urgent
			</Badge>
		)
	}

	return <Badge variant="outline">Routine</Badge>
}

function StatCard({
	title,
	value,
	subtitle,
	icon,
}: {
	title: string
	value: number | string
	subtitle: string
	icon: React.ReactNode
}) {
	return (
		<Card className="h-full">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{title}</CardTitle>
				<span className="text-muted-foreground">{icon}</span>
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{value}</div>
				<p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>
			</CardContent>
		</Card>
	)
}

export function PharmacyDashboard() {
	const { data: profile, isLoading } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const queue = usePharmacyQueueQuery({
		facilityId,
		status: "all",
		limit: 100,
	})
	const opdQueue = useOpdPrescriptionQueueQuery({
		facilityId,
		status: "signed",
		limit: 50,
	})

	const queueItems = queue.data?.data ?? []
	const pendingItems = queueItems.filter(item => item.status === "pending_verification")
	const statCount = pendingItems.filter(item => item.priority === "stat").length
	const urgentCount = pendingItems.filter(item => item.priority === "urgent").length
	const criticalCount = pendingItems.reduce((sum, item) => sum + item.criticalAlertCount, 0)
	const controlledCount = pendingItems.filter(item => item.isControlledSubstance).length
	const signedOpdCount = opdQueue.data?.data?.length ?? 0

	const avgWaitMinutes =
		pendingItems.length === 0
			? 0
			: Math.round(
					pendingItems.reduce((sum, item) => sum + minutesSince(item.receivedAt), 0) /
						pendingItems.length
				)

	const nextForReview = [...pendingItems]
		.sort((a, b) => {
			const priorityDelta = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]
			if (priorityDelta !== 0) return priorityDelta
			return new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
		})
		.slice(0, 6)

	const highRiskItems = [...pendingItems]
		.filter(item => item.criticalAlertCount > 0 || item.alertCount >= 3)
		.sort((a, b) => {
			const criticalDelta = b.criticalAlertCount - a.criticalAlertCount
			if (criticalDelta !== 0) return criticalDelta
			return b.alertCount - a.alertCount
		})
		.slice(0, 5)

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-semibold">Pharmacy Dashboard</h1>
					<p className="text-muted-foreground text-sm">Loading dashboard...</p>
				</div>
			</div>
		)
	}

	if (!facilityId) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-semibold">Pharmacy Dashboard</h1>
					<p className="text-muted-foreground text-sm">Viewing as Pharmacist</p>
				</div>
				<Card>
					<CardContent className="py-8 text-center">
						<p className="text-muted-foreground text-sm">
							No facility assignment found for this account.
						</p>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold">Pharmacy Dashboard</h1>
					<p className="text-muted-foreground text-sm">
						Verification queue, safety alerts, and dispensing readiness
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => {
						void queue.refetch()
						void opdQueue.refetch()
					}}
					disabled={queue.isFetching || opdQueue.isFetching}
				>
					<RefreshCw
						className={`mr-1.5 size-4 ${
							queue.isFetching || opdQueue.isFetching ? "animate-spin" : ""
						}`}
					/>
					Refresh
				</Button>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title="Pending Verification"
					value={pendingItems.length}
					subtitle={`${statCount} STAT, ${urgentCount} urgent`}
					icon={<Pill className="size-4" />}
				/>
				<StatCard
					title="Critical Alerts"
					value={criticalCount}
					subtitle="Hard-stop checks requiring review"
					icon={<ShieldAlert className="size-4" />}
				/>
				<StatCard
					title="Controlled Substances"
					value={controlledCount}
					subtitle="Pending regulated medications"
					icon={<Syringe className="size-4" />}
				/>
				<StatCard
					title="OPD Prescriptions"
					value={signedOpdCount}
					subtitle="Signed and ready for dispensing"
					icon={<Clock3 className="size-4" />}
				/>
			</div>

			<div className="grid gap-4 xl:grid-cols-3">
				<Card className="xl:col-span-2">
					<CardHeader className="flex flex-row items-center justify-between gap-2">
						<CardTitle className="text-base">Next Orders For Review</CardTitle>
						<div className="text-muted-foreground text-xs">
							Avg wait: {formatWait(avgWaitMinutes)}
						</div>
					</CardHeader>
					<CardContent>
						{queue.isLoading ? (
							<p className="text-muted-foreground py-6 text-center text-sm">Loading queue...</p>
						) : nextForReview.length === 0 ? (
							<p className="text-muted-foreground py-6 text-center text-sm">
								No pending verification orders right now.
							</p>
						) : (
							<div className="space-y-2">
								{nextForReview.map(item => (
									<div
										key={item.id}
										className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2"
									>
										<div className="min-w-0">
											<p className="truncate text-sm font-medium">{item.patientName}</p>
											<p className="text-muted-foreground truncate text-xs">
												{item.genericName} {item.dose} {item.doseUnit} · MRN {item.patientMrn}
											</p>
										</div>
										<div className="flex items-center gap-2">
											{priorityBadge(item)}
											{item.criticalAlertCount > 0 && (
												<Badge variant="destructive" className="text-xs">
													{item.criticalAlertCount} critical
												</Badge>
											)}
											<span className="text-muted-foreground text-xs">
												{formatWait(minutesSince(item.receivedAt))}
											</span>
										</div>
									</div>
								))}
							</div>
						)}
						<div className="mt-4">
							<Button asChild size="sm" variant="outline">
								<Link href="/pharmacy">Open Verification Queue</Link>
							</Button>
						</div>
					</CardContent>
				</Card>

				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">High-Risk Orders</CardTitle>
						</CardHeader>
						<CardContent>
							{highRiskItems.length === 0 ? (
								<p className="text-muted-foreground text-sm">No high-risk flags in queue.</p>
							) : (
								<div className="space-y-2">
									{highRiskItems.map(item => (
										<div key={item.id} className="rounded-md border px-3 py-2">
											<p className="text-sm font-medium">{item.patientName}</p>
											<p className="text-muted-foreground text-xs">{item.genericName}</p>
											<div className="mt-1 flex items-center gap-2">
												<AlertTriangle className="size-3.5 text-amber-600" />
												<span className="text-xs text-amber-600">
													{item.alertCount} alerts · {item.criticalAlertCount} critical
												</span>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">Quick Actions</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<Button asChild variant="outline" className="w-full justify-start">
								<Link href="/pharmacy/opd">Open OPD Dispensing ({signedOpdCount})</Link>
							</Button>
							<Button asChild variant="outline" className="w-full justify-start">
								<Link href="/pharmacy/formulary">Manage Formulary Notes</Link>
							</Button>
							<Button asChild variant="outline" className="w-full justify-start">
								<Link href="/patients/search">Open Patient Search</Link>
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}

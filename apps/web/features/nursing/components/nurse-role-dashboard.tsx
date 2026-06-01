"use client"

import Link from "next/link"
import { useMemo } from "react"

import {
	AlertTriangle,
	ClipboardCheck,
	Clock3,
	HeartPulse,
	RefreshCw,
	Stethoscope,
	Users,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

import { useHaiTagsQuery, useVitalsQuery } from "@/features/nursing/api/nursing.hooks"

const DASHBOARD_VITALS_LIMIT = 50
const DASHBOARD_HAI_LIMIT = 50
const IMMEDIATE_ESCALATIONS_LIMIT = 4
const RECENT_VITALS_LIMIT = 3

function formatDateTime(iso: string) {
	return new Date(iso).toLocaleString("en-PH", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function hoursSince(iso: string) {
	const ms = Date.now() - new Date(iso).getTime()
	return Math.max(0, Math.floor(ms / (1000 * 60 * 60)))
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
		<Card>
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

export function NurseRoleDashboard() {
	const { data: profile, isLoading: profileLoading } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const vitals = useVitalsQuery({ facilityId, page: 1, limit: DASHBOARD_VITALS_LIMIT })
	const haiTags = useHaiTagsQuery({ facilityId, page: 1, limit: DASHBOARD_HAI_LIMIT })

	const vitalsRows = vitals.data?.data ?? []
	const haiRows = haiTags.data?.data ?? []

	const todayStart = new Date()
	todayStart.setHours(0, 0, 0, 0)

	const summary = useMemo(() => {
		const vitalsToday = vitalsRows.filter(v => new Date(v.recordedAt) >= todayStart).length
		const escalations = vitalsRows.filter(
			v => v.newsRiskLevel === "high" || (v.newsScore !== null && v.newsScore >= 5)
		)
		const escalationsRecent = escalations.filter(v => hoursSince(v.recordedAt) <= 4).length
		const unresolvedHai = haiRows.filter(h => h.status !== "resolved").length

		return {
			vitalsToday,
			escalations,
			escalationsRecent,
			unresolvedHai,
		}
	}, [haiRows, vitalsRows, todayStart])

	const immediateEscalations = useMemo(() => {
		return [...summary.escalations]
			.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
			.slice(0, IMMEDIATE_ESCALATIONS_LIMIT)
	}, [summary.escalations])

	const recentVitals = useMemo(() => {
		return [...vitalsRows]
			.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
			.slice(0, RECENT_VITALS_LIMIT)
	}, [vitalsRows])

	if (profileLoading) {
		return (
			<div className="space-y-4">
				<div>
					<h1 className="text-2xl font-semibold">Nurse Shift Dashboard</h1>
					<p className="text-sm text-muted-foreground">Loading dashboard...</p>
				</div>
			</div>
		)
	}

	if (!facilityId) {
		return (
			<div className="space-y-4">
				<div>
					<h1 className="text-2xl font-semibold">Nurse Shift Dashboard</h1>
					<p className="text-sm text-muted-foreground">Viewing as Nurse</p>
				</div>
				<Card>
					<CardContent className="py-8 text-center text-sm text-muted-foreground">
						No facility assignment found for this account.
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold">Nurse Shift Dashboard</h1>
					<p className="text-sm text-muted-foreground">
						Role-level overview for this shift. Open the Nursing module for full clinical workflows.
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => {
						void vitals.refetch()
						void haiTags.refetch()
					}}
					disabled={vitals.isFetching || haiTags.isFetching}
				>
					<RefreshCw
						className={`mr-1.5 size-4 ${vitals.isFetching || haiTags.isFetching ? "animate-spin" : ""}`}
					/>
					Refresh
				</Button>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title="Escalations Needed"
					value={summary.escalations.length}
					subtitle="NEWS score >= 5"
					icon={<AlertTriangle className="size-4" />}
				/>
				<StatCard
					title="Recent Critical (4h)"
					value={summary.escalationsRecent}
					subtitle="High-risk vitals in last 4 hours"
					icon={<HeartPulse className="size-4" />}
				/>
				<StatCard
					title="Vitals Today"
					value={summary.vitalsToday}
					subtitle="All units and encounters"
					icon={<ClipboardCheck className="size-4" />}
				/>
				<StatCard
					title="Active HAI Flags"
					value={summary.unresolvedHai}
					subtitle="Suspected or confirmed"
					icon={<Users className="size-4" />}
				/>
			</div>

			<div className="grid gap-4 xl:grid-cols-3">
				<Card className="xl:col-span-2">
					<CardHeader className="flex flex-row items-center justify-between gap-3">
						<CardTitle className="text-base">Immediate Escalations</CardTitle>
						<Button asChild size="sm" variant="outline">
							<Link href="/nursing">Open Nursing Workspace</Link>
						</Button>
					</CardHeader>
					<CardContent>
						{vitals.isLoading ? (
							<p className="py-8 text-center text-sm text-muted-foreground">Loading alerts...</p>
						) : immediateEscalations.length === 0 ? (
							<p className="py-8 text-center text-sm text-muted-foreground">
								No immediate escalations. Continue routine monitoring.
							</p>
						) : (
							<div className="space-y-2">
								{immediateEscalations.map(item => (
									<div
										key={item.id}
										className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-900/50 bg-red-950/20 px-3 py-2"
									>
										<div className="min-w-0">
											<p className="truncate text-sm font-medium">
												Encounter {item.encounterId ?? "-"}
											</p>
											<p className="truncate text-xs text-muted-foreground">
												BP {item.bpSystolic ?? "-"}/{item.bpDiastolic ?? "-"} · HR {item.heartRate ?? "-"} · SpO2 {item.spo2 ?? "-"}%
												{` · ${formatDateTime(item.recordedAt)}`}
											</p>
										</div>
										<Badge variant="destructive">NEWS {item.newsScore ?? "-"}</Badge>
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
							<Link href="/nursing">Go to Nursing Module</Link>
						</Button>
						<Button asChild variant="outline" className="w-full justify-start">
							<Link href="/patients/search">Open Patient List</Link>
						</Button>
						<Button asChild variant="outline" className="w-full justify-start">
							<Link href="/nursing/transfers">Pending Transfers</Link>
						</Button>
						<Button asChild variant="outline" className="w-full justify-start">
							<Link href="/nbs">NBS Logbook</Link>
						</Button>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Recent Vitals Activity</CardTitle>
				</CardHeader>
				<CardContent>
					{recentVitals.length === 0 ? (
						<p className="text-sm text-muted-foreground">No recent vitals recorded.</p>
					) : (
						<div className="space-y-2">
							{recentVitals.map(item => (
								<div key={item.id} className="flex items-center justify-between rounded-md border px-3 py-2">
									<div>
										<p className="text-sm font-medium">Encounter {item.encounterId ?? "-"}</p>
										<p className="text-xs text-muted-foreground">
											{formatDateTime(item.recordedAt)} · NEWS {item.newsScore ?? "-"}
										</p>
									</div>
									<Button asChild size="sm" variant="ghost">
										<Link href="/nursing">
											<Stethoscope className="mr-1 size-3.5" />
											Review
										</Link>
									</Button>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

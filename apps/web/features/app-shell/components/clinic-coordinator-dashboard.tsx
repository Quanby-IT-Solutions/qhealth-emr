"use client"

import Link from "next/link"
import { BadgeCheck, ClipboardList, Clock3, RefreshCw, UserPlus, Users, UserX } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useClinicQueueQuery } from "@/features/scheduling/api/scheduling.hooks"
import { todayIsoInManila } from "@/features/scheduling/lib/queue-date"

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

function formatCheckIn(iso: string | null) {
	if (!iso) return "—"
	return new Date(iso).toLocaleTimeString("en-PH", {
		hour: "2-digit",
		minute: "2-digit",
	})
}

export function ClinicCoordinatorDashboard() {
	const { data: profile, isLoading: profileLoading } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	const roleName = profile?.activeRole?.name ?? "Clinic Coordinator"

	const queue = useClinicQueueQuery(
		{ facilityId, date: todayIsoInManila() },
		{ refetchInterval: 20_000 }
	)

	const stats = queue.data?.stats
	const entries = queue.data?.entries ?? []
	const waitingEntries = [...entries]
		.filter(entry => entry.status === "waiting")
		.sort((a, b) => (a.queueNumber ?? 9999) - (b.queueNumber ?? 9999))
		.slice(0, 6)
	const activeEntry = queue.data?.activeCoordinatorEntry ?? null

	if (profileLoading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-semibold">Coordinator Dashboard</h1>
					<p className="text-muted-foreground text-sm">Loading dashboard...</p>
				</div>
			</div>
		)
	}

	if (!facilityId) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-semibold">Coordinator Dashboard</h1>
					<p className="text-muted-foreground text-sm">Viewing as {roleName}</p>
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
					<h1 className="text-2xl font-semibold">Coordinator Dashboard</h1>
					<p className="text-muted-foreground text-sm">
						Mission registration, clinic queue, and license status
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => {
						void queue.refetch()
					}}
					disabled={queue.isFetching}
				>
					<RefreshCw className={`mr-1.5 size-4 ${queue.isFetching ? "animate-spin" : ""}`} />
					Refresh
				</Button>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title="Waiting"
					value={stats?.waiting ?? 0}
					subtitle="Checked in and not yet called"
					icon={<Clock3 className="size-4" />}
				/>
				<StatCard
					title="In Progress"
					value={stats?.inProgress ?? 0}
					subtitle="Currently being seen"
					icon={<Users className="size-4" />}
				/>
				<StatCard
					title="Completed"
					value={stats?.completed ?? 0}
					subtitle="Finished today"
					icon={<ClipboardList className="size-4" />}
				/>
				<StatCard
					title="No-Show"
					value={stats?.noShow ?? 0}
					subtitle="Marked no-show today"
					icon={<UserX className="size-4" />}
				/>
			</div>

			<div className="grid gap-4 xl:grid-cols-3">
				<Card className="xl:col-span-2">
					<CardHeader className="flex flex-row items-center justify-between gap-2">
						<CardTitle className="text-base">Next In Queue</CardTitle>
						<Button asChild size="sm" variant="outline">
							<Link href="/scheduling/queue">Open OPD Queue</Link>
						</Button>
					</CardHeader>
					<CardContent>
						{activeEntry && (
							<div className="mb-3 rounded-md border border-emerald-700/40 bg-emerald-950/10 px-3 py-2">
								<p className="text-xs font-medium tracking-wide text-emerald-800 uppercase dark:text-emerald-300">
									Your active patient
								</p>
								<p className="truncate text-sm font-medium">
									{activeEntry.patientName ?? "Patient"}
									{activeEntry.queueNumber != null ? ` · #${activeEntry.queueNumber}` : ""}
								</p>
								<p className="text-muted-foreground truncate text-xs">
									{activeEntry.patientMrn ? `MRN ${activeEntry.patientMrn}` : "Walk-in"}
									{" · "}
									called {formatCheckIn(activeEntry.calledAt)}
								</p>
							</div>
						)}

						{queue.isLoading ? (
							<p className="text-muted-foreground py-6 text-center text-sm">Loading queue...</p>
						) : waitingEntries.length === 0 ? (
							<p className="text-muted-foreground py-6 text-center text-sm">
								No patients waiting right now.
							</p>
						) : (
							<div className="space-y-2">
								{waitingEntries.map(entry => (
									<div
										key={entry.id}
										className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2"
									>
										<div className="min-w-0">
											<p className="truncate text-sm font-medium">
												{entry.patientName ?? "Patient"}
											</p>
											<p className="text-muted-foreground truncate text-xs">
												{entry.patientMrn ? `MRN ${entry.patientMrn}` : "Walk-in"}
												{" · "}
												checked in {formatCheckIn(entry.checkInTime)}
											</p>
										</div>
										<div className="flex items-center gap-2">
											{entry.queueNumber != null && (
												<Badge variant="outline">#{entry.queueNumber}</Badge>
											)}
											<Badge variant="secondary">
												{entry.entryType === "walk_in" ? "Walk-in" : "Appointment"}
											</Badge>
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
						<Button asChild className="w-full justify-start" variant="default">
							<Link href="/patients/register">
								<UserPlus className="mr-2 size-4" />
								Register Walk-in
							</Link>
						</Button>
						<Button asChild className="w-full justify-start" variant="outline">
							<Link href="/scheduling/queue">
								<ClipboardList className="mr-2 size-4" />
								Manage OPD Queue
							</Link>
						</Button>
						<Button asChild className="w-full justify-start" variant="outline">
							<Link href="/account/licenses">
								<BadgeCheck className="mr-2 size-4" />
								My Licenses
							</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}

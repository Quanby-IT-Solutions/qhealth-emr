"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Loader2, Search, UserRound } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useClinicQueueQuery,
	type UnifiedQueueEntry,
} from "@/features/scheduling/api/scheduling.hooks"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(
		permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
	)
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

function getActiveStaffProfile(
	profile:
		| {
				staffProfiles?: Array<{ id: string; facilityId: string; roles: Array<{ id: string }> }>
				activeRole?: { id: string } | null
		  }
		| undefined
) {
	return (
		profile?.staffProfiles?.find(sp => sp.roles.some(r => r.id === profile?.activeRole?.id)) ??
		profile?.staffProfiles?.[0]
	)
}

function todayIso() {
	return new Date().toISOString().slice(0, 10)
}

function formatTime(time: string | null | undefined) {
	if (!time) return "-"
	const parts = time.includes("T") ? time.slice(11, 16) : time.slice(0, 5)
	const [h, m] = parts.split(":").map(Number)
	const period = (h ?? 0) >= 12 ? "PM" : "AM"
	const hour = ((h ?? 0) % 12 || 12).toString()
	return `${hour}:${(m ?? 0).toString().padStart(2, "0")} ${period}`
}

function queueStatusLabel(status: UnifiedQueueEntry["status"]) {
	if (status === "in_progress") return "With Doctor"
	if (status === "completed") return "Done"
	return "Waiting"
}

function canStartConsultation(entry: UnifiedQueueEntry) {
	return entry.status === "in_progress" && !!entry.encounterId
}

function entryHref(entry: UnifiedQueueEntry) {
	const base = `/patients/${entry.patientId}/encounters/${entry.encounterId}`
	return canStartConsultation(entry) ? `${base}/documentation` : base
}

function entryActionLabel(entry: UnifiedQueueEntry) {
	return canStartConsultation(entry) ? "Start consultation" : "View chart"
}

export default function OpdPage() {
	const permSet = usePermissionSet()
	const { data: profile } = useMyProfile()
	const activeStaffProfile = getActiveStaffProfile(profile)
	const facilityId = activeStaffProfile?.facilityId ?? ""
	const clinicianStaffId = activeStaffProfile?.id

	const [search, setSearch] = useState("")
	const trimmedSearch = search.trim().toLowerCase()
	const queueQuery = useClinicQueueQuery(
		{ facilityId, clinicianStaffId, date: todayIso() },
		{ refetchInterval: 20_000 }
	)

	const visibleEntries = useMemo(() => {
		const entries = queueQuery.data?.entries ?? []
		return entries
			.filter(entry => !!entry.encounterId)
			.filter(entry => entry.status === "waiting" || entry.status === "in_progress")
			.filter(entry => {
				if (!trimmedSearch) return true
				return `${entry.patientName ?? ""} ${entry.patientMrn ?? ""}`
					.toLowerCase()
					.includes(trimmedSearch)
			})
			.sort((a, b) => (a.queueNumber ?? 9999) - (b.queueNumber ?? 9999))
	}, [queueQuery.data?.entries, trimmedSearch])

	if (!can(permSet, "opd", "view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access OPD.
			</div>
		)
	}

	const isLoading = queueQuery.isLoading
	const isFetching = queueQuery.isFetching

	return (
		<div className="flex h-full flex-col p-3 md:p-4">
			<Card className="border-border/60 bg-card shadow-sm">
				<CardHeader className="border-border/60 border-b pb-3">
					<div className="flex items-start gap-3">
						<div className="bg-secondary/60 text-muted-foreground flex size-10 items-center justify-center rounded-xl">
							<UserRound className="size-4" />
						</div>
						<div className="space-y-1">
							<CardTitle className="tracking-tight">Patient List</CardTitle>
							<CardDescription>
								Select a checked-in OPD patient assigned to your clinic.
							</CardDescription>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-3 pt-3">
					<div className="relative">
						<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
						<Input
							placeholder="Filter by name or MRN..."
							value={search}
							onChange={e => setSearch(e.target.value)}
							className="border-border/60 bg-background h-9 rounded-xl pl-9"
							autoFocus
						/>
						{isFetching && (
							<Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
						)}
					</div>

					{isLoading ? (
						<div className="border-border/60 bg-secondary/40 text-muted-foreground rounded-2xl border border-dashed px-6 py-10 text-center text-sm">
							Loading checked-in patients...
						</div>
					) : visibleEntries.length === 0 ? (
						<div className="border-border/60 bg-secondary/40 text-muted-foreground rounded-2xl border border-dashed px-6 py-10 text-center text-sm">
							{trimmedSearch
								? `No checked-in OPD patients match "${search}".`
								: "No checked-in OPD patients are assigned to your clinic."}
						</div>
					) : (
						<>
							<p className="text-muted-foreground px-0.5 text-xs">
								Showing {visibleEntries.length} checked-in{" "}
								{visibleEntries.length === 1 ? "patient" : "patients"}
								{isFetching && " - Updating..."}
							</p>

							<div className="border-border/60 bg-background divide-border/60 divide-y overflow-hidden rounded-2xl border">
								{visibleEntries.map(entry => (
									<div
										key={entry.id}
										className="hover:bg-secondary/30 flex flex-col gap-2 px-4 py-2.5 transition-colors md:flex-row md:items-center md:justify-between"
									>
										<div className="min-w-0 space-y-1.5">
											<div className="flex flex-wrap items-center gap-2">
												<span className="text-foreground text-sm font-semibold tracking-tight">
													{entry.patientName ?? "Unnamed patient"}
												</span>
												<Badge
													variant="secondary"
													className="border-border/60 bg-secondary/60 text-foreground rounded-full border px-2 py-0.5 font-mono text-[0.68rem] tracking-[0.14em]"
												>
													{entry.patientMrn ?? "No MRN"}
												</Badge>
												<Badge
													variant="outline"
													className="rounded-full px-2 py-0.5 text-[0.68rem]"
												>
													Queue #{entry.queueNumber ?? "-"}
												</Badge>
												<Badge
													variant="outline"
													className="rounded-full px-2 py-0.5 text-[0.68rem]"
												>
													{queueStatusLabel(entry.status)}
												</Badge>
											</div>
											<p className="text-muted-foreground text-xs">
												{entry.entryType === "appointment" ? "Appointment" : "Walk-in"}
												{" - "}
												{entry.slotTime
													? `Scheduled ${formatTime(entry.slotTime)}`
													: "No scheduled time"}
												{" - "}
												Checked in {formatTime(entry.checkInTime)}
											</p>
										</div>

										<Button
											variant="ghost"
											size="sm"
											className="shrink-0 justify-between gap-2"
											nativeButton={false}
											render={<Link href={entryHref(entry)} />}
										>
											{entryActionLabel(entry)}
											<ArrowRight className="size-4" />
										</Button>
									</div>
								))}
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

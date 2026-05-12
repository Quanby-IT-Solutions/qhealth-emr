"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, Clock, Stethoscope } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/core/components/ui/dialog"
import { Skeleton } from "@/core/components/ui/skeleton"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useEdQueueQuery } from "@/features/ed/api/ed.hooks"
import { TriageForm } from "@/features/ed/components/triage-form"
import { TraumaAliasBadge } from "@/features/ed/components/trauma-alias-badge"
import { acuityColor, acuityLabel } from "@/features/ed/lib/acuity-utils"
import { cn } from "@/core/lib/utils"

const ACUITY_COLUMNS = [1, 2, 3, 4, 5] as const

interface TriageQueueItem {
	id: string
	type: "pre_encounter" | "encounter"
	patientName: string
	traumaAlias: string | null
	acuityLevel: number | null
	acuityScale: "esi" | "ats" | "ctas" | null
	chiefComplaint: string | null
	arrivalTime: string | Date
	queueStatus: "waiting" | "triage" | "being_seen" | "disposition"
}

function formatElapsed(arrivalTime: string | Date, now: number) {
	const minutes = Math.max(0, Math.floor((now - new Date(arrivalTime).getTime()) / 60_000))
	const hours = Math.floor(minutes / 60)
	const remainingMinutes = minutes % 60

	if (hours > 0) {
		return `${hours}h ${remainingMinutes}m`
	}

	return `${remainingMinutes}m`
}

function formatArrival(arrivalTime: string | Date) {
	return new Date(arrivalTime).toLocaleTimeString("en-PH", {
		hour: "2-digit",
		minute: "2-digit",
	})
}

function AcuityColumn({
	level,
	items,
	now,
}: {
	level: number
	items: TriageQueueItem[]
	now: number
}) {
	return (
		<div className="min-w-64 space-y-3">
			<Card className="border-t-4" style={{ borderTopColor: "transparent" }}>
				<CardHeader className={cn("rounded-t-lg py-3", acuityColor(level))}>
					<CardTitle className="flex items-center justify-between text-sm">
						<span>
							Level {level} · {acuityLabel(level)}
						</span>
						<Badge variant="secondary">{items.length}</Badge>
					</CardTitle>
				</CardHeader>
			</Card>

			<div className="space-y-3">
				{items.length === 0 ? (
					<Card>
						<CardContent className="text-muted-foreground py-8 text-center text-sm">
							No patients
						</CardContent>
					</Card>
				) : (
					items.map(item => (
						<Card key={`${item.type}-${item.id}`} className="border-border/70">
							<CardContent className="space-y-3 p-3">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<p className="truncate text-sm font-semibold">
											{item.type === "pre_encounter"
												? item.traumaAlias ?? "Unregistered"
												: item.patientName}
										</p>
										<p className="text-muted-foreground text-xs">
											{item.acuityScale?.toUpperCase() ?? "No scale"} · {formatArrival(item.arrivalTime)}
										</p>
									</div>
									<Badge className={acuityColor(item.acuityLevel)}>{item.acuityLevel}</Badge>
								</div>

								{item.chiefComplaint ? (
									<p className="text-muted-foreground line-clamp-2 text-xs">
										{item.chiefComplaint}
									</p>
								) : null}

								<div className="flex items-center justify-between text-xs">
									<span className="text-muted-foreground flex items-center gap-1">
										<Clock className="size-3" />
										{formatElapsed(item.arrivalTime, now)}
									</span>
									<Badge variant="outline">{item.queueStatus.replace("_", " ")}</Badge>
								</div>

								{item.type === "pre_encounter" ? (
									<TraumaAliasBadge
										alias={item.traumaAlias ?? item.id}
										acuityLevel={item.acuityLevel}
									/>
								) : null}
							</CardContent>
						</Card>
					))
				)}
			</div>
		</div>
	)
}

export default function TriageDashboardPage() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	const staffProfileId = profile?.staffProfiles?.[0]?.id ?? ""
	const [now, setNow] = useState(() => Date.now())
	const [triageOpen, setTriageOpen] = useState(false)

	const { data: queue, isLoading } = useEdQueueQuery(facilityId)

	useEffect(() => {
		const interval = window.setInterval(() => setNow(Date.now()), 30_000)
		return () => window.clearInterval(interval)
	}, [])

	const itemsByAcuity = useMemo(() => {
		const grouped = new Map<number, TriageQueueItem[]>()
		for (const level of ACUITY_COLUMNS) {
			grouped.set(level, [])
		}

		for (const item of queue?.items ?? []) {
			const level = item.acuityLevel ?? 5
			grouped.get(level)?.push(item)
		}

		return grouped
	}, [queue?.items])

	const total = queue?.summary.total ?? 0

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Triage Queue Dashboard</h1>
					<p className="text-muted-foreground text-sm">
						{total} patient{total === 1 ? "" : "s"} sorted by acuity and elapsed time.
					</p>
				</div>
				<Dialog open={triageOpen} onOpenChange={setTriageOpen}>
					<DialogTrigger
						render={
							<Button disabled={!facilityId || !staffProfileId}>
								<Activity className="size-4" />
								New ER Triage
							</Button>
						}
					/>
					<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
						<DialogHeader>
							<DialogTitle>New ER Triage Assessment</DialogTitle>
						</DialogHeader>
						<TriageForm
							facilityId={facilityId}
							triageStaffId={staffProfileId}
							onSuccess={() => setTriageOpen(false)}
						/>
					</DialogContent>
				</Dialog>
			</div>

			{isLoading ? (
				<div className="grid gap-4 md:grid-cols-5">
					{ACUITY_COLUMNS.map(level => (
						<Skeleton key={level} className="h-80 w-full" />
					))}
				</div>
			) : (
				<div className="flex gap-4 overflow-x-auto pb-4 xl:grid xl:grid-cols-5 xl:overflow-visible">
					{ACUITY_COLUMNS.map(level => (
						<AcuityColumn
							key={level}
							level={level}
							items={itemsByAcuity.get(level) ?? []}
							now={now}
						/>
					))}
				</div>
			)}

			<Card className="border-dashed">
				<CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
					<Stethoscope className="mt-0.5 size-4 shrink-0" />
					<span>
						Level 1 and 2 cases receive trauma aliases through the existing ED pre-encounter
						workflow. Elapsed time updates automatically while the board is open.
					</span>
				</CardContent>
			</Card>
		</div>
	)
}

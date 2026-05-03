"use client"

import { useCallback, useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"

import { useListKonsultaActivitiesQuery } from "../api/konsulta.hooks"
import { getCapitationTag, getCapitationTooltip } from "../lib/capitation-rules"
import { ActivityTimeline } from "./activity-timeline"

interface KonsultaTrackerPageProps {
	facilityId: string
	patientId?: string
}

const TAG_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	Eligible: "default",
	Pending: "secondary",
	Lapsed: "destructive",
}

const ACTIVITY_TYPES = [
	{ value: "all", label: "All Types" },
	{ value: "FPE", label: "First Primary Encounter (FPE)" },
	{ value: "Follow-up", label: "Follow-up" },
	{ value: "Lab", label: "Lab" },
]

const STUB_PATIENT_ID = "00000000-0000-0000-0000-000000000001"

export function KonsultaTrackerPage({ facilityId, patientId }: KonsultaTrackerPageProps) {
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()

	const page = Number(searchParams.get("page") ?? "1")
	const filterType = (searchParams.get("type") ?? "all") as "all" | "FPE" | "Follow-up" | "Lab"
	const filterFrom = searchParams.get("from") ?? ""
	const filterTo = searchParams.get("to") ?? ""

	const { data, isLoading } = useListKonsultaActivitiesQuery({
		patientId: patientId ?? STUB_PATIENT_ID,
		facilityId,
		page,
		limit: 20,
		activityType: filterType !== "all" ? filterType : undefined,
		periodStart: filterFrom || undefined,
		periodEnd: filterTo || undefined,
	})

	function updateParam(key: string, value: string) {
		const params = new URLSearchParams(searchParams.toString())
		if (value && value !== "all") {
			params.set(key, value)
		} else {
			params.delete(key)
		}
		if (key !== "page") params.set("page", "1")
		router.replace(`${pathname}?${params.toString()}`, { scroll: false })
	}

	const setPage = useCallback(
		(next: number) => {
			const params = new URLSearchParams(searchParams.toString())
			params.set("page", String(next))
			router.push(`${pathname}?${params.toString()}`)
		},
		[router, pathname, searchParams]
	)

	const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null)

	const activities = data?.activities ?? []
	const totalPages = data?.totalPages ?? 1

	return (
		<div className="space-y-4 px-4">
			<h1 className="text-lg font-semibold">Konsulta Capitation Tracker</h1>

			{/* URL-synced filter bar */}
			<div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 p-3">
				<div className="flex flex-col gap-1">
					<Label htmlFor="filter-type" className="text-xs">Activity Type</Label>
					<Select value={filterType} onValueChange={v => updateParam("type", v ?? "all")}>
						<SelectTrigger id="filter-type" className="h-8 w-48 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{ACTIVITY_TYPES.map(t => (
								<SelectItem key={t.value} value={t.value} className="text-xs">
									{t.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex flex-col gap-1">
					<Label htmlFor="filter-from" className="text-xs">Period From</Label>
					<Input
						id="filter-from"
						type="date"
						value={filterFrom}
						onChange={e => updateParam("from", e.target.value)}
						className="h-8 w-36 text-xs"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<Label htmlFor="filter-to" className="text-xs">Period To</Label>
					<Input
						id="filter-to"
						type="date"
						value={filterTo}
						onChange={e => updateParam("to", e.target.value)}
						className="h-8 w-36 text-xs"
					/>
				</div>
			</div>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm">Activities</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading && (
						<div className="space-y-2 py-2">
							{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
						</div>
					)}
					{!isLoading && activities.length === 0 && (
						<p className="text-sm text-muted-foreground py-4 text-center">No activities match the current filters.</p>
					)}
					{activities.length > 0 && (
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b text-left text-xs text-muted-foreground">
									<th className="pb-1 pr-4">Patient</th>
									<th className="pb-1 pr-4">Activity Type</th>
									<th className="pb-1 pr-4">Date</th>
									<th className="pb-1">Tag</th>
								</tr>
							</thead>
							<tbody>
								{activities.map(activity => {
									const consultationsUsed = activities.filter(
										a => a.patientId === activity.patientId && (a.activityType === "FPE" || a.activityType === "Follow-up")
									).length
									const tag = getCapitationTag({
										consultationsUsed,
										consultationsAllowed: 3,
										status: "active",
									})
									const isExpanded = expandedPatientId === activity.patientId
									return (
										<>
											<tr
												key={activity.id}
												className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
												onClick={() => setExpandedPatientId(isExpanded ? null : activity.patientId)}
												aria-expanded={isExpanded}
											>
												<td className="py-1.5 pr-4 font-mono text-xs">{activity.patientId.slice(0, 8)}...</td>
												<td className="py-1.5 pr-4">{activity.activityType}</td>
												<td className="py-1.5 pr-4 tabular-nums">{activity.activityDate}</td>
												<td className="py-1.5">
													<Badge
														variant={TAG_VARIANT[tag]}
														title={getCapitationTooltip(tag)}
													>
														{tag}
													</Badge>
												</td>
											</tr>
											{isExpanded && (
												<tr key={`${activity.id}-timeline`} className="border-b">
													<td colSpan={4} className="py-2 px-1">
														<ActivityTimeline patientId={activity.patientId} facilityId={facilityId} />
													</td>
												</tr>
											)}
										</>
									)
								})}
							</tbody>
						</table>
					)}
				</CardContent>
			</Card>

			<div className="flex items-center gap-2 justify-end text-sm">
				<span className="text-muted-foreground text-xs">Page {page} of {totalPages}</span>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setPage(page - 1)}
					disabled={page <= 1}
				>
					Previous
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setPage(page + 1)}
					disabled={page >= totalPages}
				>
					Next
				</Button>
			</div>
		</div>
	)
}

"use client"

import { useCallback, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

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

import { useListKonsultaTrackerRowsQuery } from "../api/konsulta.hooks"
import { ActivityTimeline } from "./activity-timeline"

interface KonsultaTrackerPageProps {
	facilityId: string
}

const TAG_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	Eligible: "default",
	Pending: "secondary",
	Lapsed: "destructive",
	Active: "default",
	Exhausted: "destructive",
	Inactive: "outline",
}

const MEMBER_STATUS_OPTIONS = [
	{ value: "all", label: "All Members" },
	{ value: "active", label: "Active" },
	{ value: "exhausted", label: "Exhausted" },
	{ value: "inactive", label: "Inactive" },
]

export function KonsultaTrackerPage({ facilityId }: KonsultaTrackerPageProps) {
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()

	const page = Number(searchParams.get("page") ?? "1")
	const filterStatus = (searchParams.get("status") ?? "all") as
		"all" | "active" | "exhausted" | "inactive"
	const filterFrom = searchParams.get("from") ?? ""
	const filterTo = searchParams.get("to") ?? ""

	const { data, isLoading } = useListKonsultaTrackerRowsQuery({
		facilityId,
		page,
		limit: 20,
		memberStatus: filterStatus !== "all" ? filterStatus : undefined,
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

	const rows = data?.rows ?? []
	const totalPages = data?.totalPages ?? 1

	return (
		<div className="space-y-4 px-4">
			<h1 className="text-lg font-semibold">Konsulta Capitation Tracker</h1>

			{/* URL-synced filter bar */}
			<div className="bg-muted/30 flex flex-wrap items-end gap-3 rounded-md border p-3">
				<div className="flex flex-col gap-1">
					<Label htmlFor="filter-status" className="text-xs">
						Member Status
					</Label>
					<Select value={filterStatus} onValueChange={v => updateParam("status", v ?? "all")}>
						<SelectTrigger id="filter-status" className="h-8 w-40 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{MEMBER_STATUS_OPTIONS.map(t => (
								<SelectItem key={t.value} value={t.value} className="text-xs">
									{t.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex flex-col gap-1">
					<Label htmlFor="filter-from" className="text-xs">
						Period From
					</Label>
					<Input
						id="filter-from"
						type="date"
						value={filterFrom}
						onChange={e => updateParam("from", e.target.value)}
						className="h-8 w-36 text-xs"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<Label htmlFor="filter-to" className="text-xs">
						Period To
					</Label>
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
					<CardTitle className="text-sm">Patients</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading && (
						<div className="space-y-2 py-2">
							{[...Array(5)].map((_, i) => (
								<Skeleton key={i} className="h-9 w-full" />
							))}
						</div>
					)}
					{!isLoading && rows.length === 0 && (
						<p className="text-muted-foreground py-4 text-center text-sm">
							No patients match the current filters.
						</p>
					)}
					{rows.length > 0 && (
						<table className="w-full text-sm">
							<thead>
								<tr className="text-muted-foreground border-b text-left text-xs">
									<th className="pr-4 pb-1">Patient</th>
									<th className="pr-4 pb-1">PIN</th>
									<th className="pr-4 pb-1">FPE Date</th>
									<th className="pr-4 pb-1">Last Follow-up</th>
									<th className="pr-4 pb-1">Labs</th>
									<th className="pb-1">Tag</th>
								</tr>
							</thead>
							<tbody>
								{rows.map(row => {
									const isExpanded = expandedPatientId === row.patientId
									return (
										<>
											<tr
												key={row.patientId}
												className="hover:bg-muted/30 cursor-pointer border-b transition-colors last:border-0"
												onClick={() => setExpandedPatientId(isExpanded ? null : row.patientId)}
												aria-expanded={isExpanded}
											>
												<td className="py-1.5 pr-4 font-medium">{row.patientName}</td>
												<td className="py-1.5 pr-4 font-mono text-xs">{row.memberPin ?? "—"}</td>
												<td className="py-1.5 pr-4 text-xs tabular-nums">{row.fpeDate ?? "—"}</td>
												<td className="py-1.5 pr-4 text-xs tabular-nums">
													{row.lastFollowUp ?? "—"}
												</td>
												<td className="py-1.5 pr-4 tabular-nums">{row.labsCount}</td>
												<td className="py-1.5">
													<Badge variant={TAG_VARIANT[row.capitationTag] ?? "outline"}>
														{row.capitationTag}
													</Badge>
												</td>
											</tr>
											{isExpanded && (
												<tr key={`${row.patientId}-timeline`} className="border-b">
													<td colSpan={6} className="px-1 py-2">
														<ActivityTimeline patientId={row.patientId} facilityId={facilityId} />
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

			<div className="flex items-center justify-end gap-2 text-sm">
				<span className="text-muted-foreground text-xs">
					Page {page} of {totalPages}
				</span>
				<Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>
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

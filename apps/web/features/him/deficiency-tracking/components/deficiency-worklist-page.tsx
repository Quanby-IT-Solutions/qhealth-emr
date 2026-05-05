"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"
import { cn } from "@/core/lib/utils"

import { EmptyState, ErrorState, SkeletonRows } from "@/features/admin/components/state-views"
import { FilterBar, FilterField } from "@/features/admin/components/filter-bar"
import { TableToolbar } from "@/features/admin/components/table-toolbar"
import { useDeficienciesQuery, useNotifyDeficiencyMutation, useScanDeficienciesMutation } from "../api/deficiencies.hooks"

interface DeficiencyWorklistPageProps {
	facilityId: string
}

const AGE_BUCKET_OPTIONS = [
	{ value: "all", label: "All" },
	{ value: "lt_7", label: "< 7 days" },
	{ value: "d7_14", label: "7-14 days" },
	{ value: "d14_30", label: "14-30 days" },
	{ value: "gt_30", label: "> 30 days" },
] as const

const SORT_OPTIONS = [
	{ value: "dischargeDatetime", label: "Discharge date" },
	{ value: "ageDays", label: "Age" },
	{ value: "status", label: "Status" },
	{ value: "deficiencyType", label: "Deficiency type" },
	{ value: "patientName", label: "Patient" },
] as const

function normalizeDeficiencyLabel(deficiencyType: string) {
	return deficiencyType === "missing_diagnosis_code"
		? "undocumented procedure"
		: deficiencyType.replace(/_/g, " ")
}

function ageBadge(ageDays: number) {
	const variant = ageDays > 30 ? "destructive" : ageDays >= 7 ? "secondary" : "outline"

	return (
		<Badge variant={variant} className="text-[10px]">
			{ageDays}d
		</Badge>
	)
}

function DeficiencyAgingChart({ items }: { items: Array<{ ageDays: number }> }) {
	const buckets = useMemo(() => {
		const counts = {
			lt7: 0,
			d7_14: 0,
			d15_30: 0,
			gt30: 0,
		}

		for (const item of items) {
			if (item.ageDays < 7) counts.lt7 += 1
			else if (item.ageDays <= 14) counts.d7_14 += 1
			else if (item.ageDays <= 30) counts.d15_30 += 1
			else counts.gt30 += 1
		}

		return [
			{ label: "<7d", value: counts.lt7, tone: "bg-emerald-500" },
			{ label: "7-14d", value: counts.d7_14, tone: "bg-amber-500" },
			{ label: "14-30d", value: counts.d15_30, tone: "bg-orange-500" },
			{ label: ">30d", value: counts.gt30, tone: "bg-destructive" },
		]
	}, [items])

	const maxValue = Math.max(...buckets.map(bucket => bucket.value), 1)

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="text-base">Aging Distribution</CardTitle>
				<CardDescription>Open deficiencies by days since discharge.</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid gap-3 sm:grid-cols-4">
					{buckets.map(bucket => (
						<div key={bucket.label} className="space-y-2">
							<div className="flex items-center justify-between text-xs text-muted-foreground">
								<span>{bucket.label}</span>
								<span>{bucket.value}</span>
							</div>
							<div className="flex h-28 items-end rounded-md border bg-muted/20 p-2">
								<div
									className={cn("w-full rounded-sm transition-all", bucket.tone)}
									style={{ height: `${Math.max(8, (bucket.value / maxValue) * 100)}%` }}
								/>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	)
}

export function DeficiencyWorklistPage({ facilityId }: DeficiencyWorklistPageProps) {
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const [_busy, setBusy] = useState(false)
	void _busy

	const filterType = (searchParams.get("type") ?? "all") as "all" | "missing_discharge_summary" | "missing_signature" | "undocumented_procedure"
	const filterStatus = (searchParams.get("status") ?? "open") as "all" | "open" | "notified" | "resolved" | "dismissed"
	const filterAge = (searchParams.get("age") ?? "all") as "all" | "lt_7" | "d7_14" | "d14_30" | "gt_30"
	const filterOwner = searchParams.get("owner") ?? ""
	const page = Number(searchParams.get("page") ?? "1")
	const limit = Number(searchParams.get("limit") ?? "25")
	const sortBy = (searchParams.get("sortBy") ?? "dischargeDatetime") as "dischargeDatetime" | "ageDays" | "status" | "deficiencyType" | "patientName"
	const sortDirection = (searchParams.get("sortDirection") ?? "desc") as "asc" | "desc"

	const { data, isLoading, isError, refetch, error } = useDeficienciesQuery({
		facilityId,
		page,
		limit,
		deficiencyType: filterType !== "all" ? filterType : undefined,
		status: filterStatus !== "all" ? filterStatus : undefined,
		ageBucket: filterAge !== "all" ? filterAge : undefined,
		ownerQuery: filterOwner || undefined,
		sortBy,
		sortDirection,
	})

	const notifyMutation = useNotifyDeficiencyMutation()
	const { mutate: scan, isPending: scanning } = useScanDeficienciesMutation()

	const updateParam = useCallback(
		(key: string, value: string, resetPage = true) => {
			const params = new URLSearchParams(searchParams.toString())
			if (value && value !== "all") params.set(key, value)
			else params.delete(key)
			if (resetPage && key !== "page") params.set("page", "1")
			router.replace(`${pathname}?${params.toString()}`, { scroll: false })
		},
		[router, pathname, searchParams]
	)

	const worklistItems = data?.deficiencies ?? []
	const totalPages = data?.totalPages ?? 1

	return (
		<div className="space-y-3 px-4 py-3">
			<TableToolbar
				title="Chart Deficiencies"
				description="Track missing discharge summaries, signatures, and diagnosis codes."
				actions={
					<Button
						size="sm"
						variant="outline"
						onClick={() => {
							setBusy(true)
							scan({ facilityId }, { onSettled: () => setBusy(false) })
						}}
						disabled={scanning}
					>
						{scanning ? "Scanning…" : "Scan Encounters"}
					</Button>
				}
			/>

			<FilterBar>
				<FilterField label="Type" htmlFor="type-f">
					<Select value={filterType} onValueChange={v => updateParam("type", v ?? "")}>
						<SelectTrigger id="type-f" className="h-8 w-56 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All types</SelectItem>
							<SelectItem value="missing_discharge_summary">Missing discharge summary</SelectItem>
							<SelectItem value="missing_signature">Missing signature</SelectItem>
							<SelectItem value="undocumented_procedure">Undocumented procedure</SelectItem>
						</SelectContent>
					</Select>
				</FilterField>
				<FilterField label="Status" htmlFor="status-f">
					<Select value={filterStatus} onValueChange={v => updateParam("status", v ?? "")}>
						<SelectTrigger id="status-f" className="h-8 w-36 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All</SelectItem>
							<SelectItem value="open">Open</SelectItem>
							<SelectItem value="notified">Notified</SelectItem>
							<SelectItem value="resolved">Resolved</SelectItem>
							<SelectItem value="dismissed">Dismissed</SelectItem>
						</SelectContent>
					</Select>
				</FilterField>
				<FilterField label="Age" htmlFor="age-f">
					<Select value={filterAge} onValueChange={v => updateParam("age", v ?? "")}>
						<SelectTrigger id="age-f" className="h-8 w-32 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{AGE_BUCKET_OPTIONS.map(option => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FilterField>
				<FilterField label="Owner" htmlFor="owner-f">
					<Input
						id="owner-f"
						value={filterOwner}
						onChange={e => updateParam("owner", e.target.value)}
						placeholder="Search owner"
						className="h-8 w-48 text-xs"
					/>
				</FilterField>
				<FilterField label="Sort by" htmlFor="sort-by-f">
					<Select value={sortBy} onValueChange={v => updateParam("sortBy", v ?? "")}>
						<SelectTrigger id="sort-by-f" className="h-8 w-40 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{SORT_OPTIONS.map(option => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FilterField>
				<FilterField label="Direction" htmlFor="sort-direction-f">
					<Select value={sortDirection} onValueChange={v => updateParam("sortDirection", v ?? "") }>
						<SelectTrigger id="sort-direction-f" className="h-8 w-28 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="asc">Ascending</SelectItem>
							<SelectItem value="desc">Descending</SelectItem>
						</SelectContent>
					</Select>
				</FilterField>
			</FilterBar>

			{!isLoading && <DeficiencyAgingChart items={worklistItems} />}

			{isLoading && <SkeletonRows count={6} />}
			{isError && <ErrorState error={error} retry={refetch} />}
			{data && worklistItems.length === 0 && !isLoading && (
				<EmptyState title="No deficiencies match your filters" description="Try adjusting filters or run a scan." />
			)}

			{data && worklistItems.length > 0 && (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Patient</TableHead>
							<TableHead>Encounter</TableHead>
							<TableHead>Discharge Date</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Owner</TableHead>
							<TableHead className="w-24">Age</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="w-44 text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{worklistItems.map(d => (
							<TableRow
								key={d.id}
								className="cursor-pointer hover:bg-muted/40"
								onClick={() => router.push(`/him/deficiencies/${d.id}`)}
							>
								<TableCell>
									<div className="space-y-0.5">
										<p className="text-sm font-medium">{d.patientName}</p>
										<p className="text-xs text-muted-foreground">MRN {d.patientMrn}</p>
									</div>
								</TableCell>
								<TableCell className="font-mono text-xs">{d.encounterId.slice(0, 8)}…</TableCell>
								<TableCell className="text-xs text-muted-foreground">
									{d.dischargeDatetime ? new Date(d.dischargeDatetime).toLocaleDateString("en-PH") : "Pending"}
								</TableCell>
								<TableCell className="text-xs capitalize">{normalizeDeficiencyLabel(d.deficiencyType)}</TableCell>
								<TableCell className="text-xs text-muted-foreground">{d.ownerDisplayName ?? "Unassigned"}</TableCell>
								<TableCell>{ageBadge(d.ageDays)}</TableCell>
								<TableCell>
									<Badge
										variant={
											d.status === "open"
												? "destructive"
												: d.status === "resolved"
													? "default"
													: "secondary"
										}
										className="capitalize text-[10px]"
									>
										{d.status}
									</Badge>
								</TableCell>
								<TableCell className="text-right">
									<Button
										size="sm"
										variant="ghost"
										onClick={async e => {
											e.stopPropagation()
											await notifyMutation.mutateAsync({ id: d.id, channel: "in_app" })
											await notifyMutation.mutateAsync({ id: d.id, channel: "email" })
										}}
										aria-label={`Notify owner for ${d.id}`}
										disabled={notifyMutation.isPending}
									>
										{notifyMutation.isPending ? "Notifying…" : "Notify Owner"}
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}

			<div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<span>
						Page {page} of {totalPages}
					</span>
					<span>•</span>
					<span>{data?.total ?? 0} total cases</span>
				</div>
				<div className="flex items-center gap-2">
					<Select value={String(limit)} onValueChange={value => updateParam("limit", value ?? String(limit))}>
						<SelectTrigger className="h-8 w-24 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="10">10 / page</SelectItem>
							<SelectItem value="25">25 / page</SelectItem>
							<SelectItem value="50">50 / page</SelectItem>
						</SelectContent>
					</Select>
					<Button variant="outline" size="sm" onClick={() => updateParam("page", String(Math.max(1, page - 1)), false)} disabled={page <= 1}>
						Previous
					</Button>
					<Button variant="outline" size="sm" onClick={() => updateParam("page", String(Math.min(totalPages, page + 1)), false)} disabled={page >= totalPages}>
						Next
					</Button>
				</div>
			</div>
		</div>
	)
}

"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"

import { useBorCensusQuery } from "../api/bor.hooks"
import { ExportModal } from "./export-modal"

export function CensusReportPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const facilityId = useActiveFacilityId()
	const [exportOpen, setExportOpen] = useState(false)
	const [sortCol, setSortCol] = useState<string | null>(null)
	const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

	function handleSort(col: string) {
		if (sortCol === col) {
			setSortDir(d => (d === "asc" ? "desc" : "asc"))
		} else {
			setSortCol(col)
			setSortDir("asc")
		}
	}

	function sortIndicator(col: string) {
		if (sortCol !== col) return " ↕"
		return sortDir === "asc" ? " ↑" : " ↓"
	}

	const date = searchParams.get("date") ?? ""

	function setDate(value: string) {
		const params = new URLSearchParams(searchParams.toString())
		if (value) params.set("date", value)
		else params.delete("date")
		router.replace(`?${params.toString()}`, { scroll: false })
	}

	const { data, isLoading, isError } = useBorCensusQuery({
		facilityId: facilityId ?? "",
		date: date || undefined,
	})

	if (!facilityId) return <p className="text-muted-foreground text-sm">No facility selected.</p>

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
				{date && (
					<Button variant="outline" size="sm" onClick={() => setDate("")}>
						Clear
					</Button>
				)}
				<Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
					Export
				</Button>
			</div>

			<ExportModal open={exportOpen} onOpenChange={setExportOpen} defaultTitle="Census Report" />

			{isLoading && <Skeleton className="h-48 w-full" />}
			{isError && <p className="text-destructive text-sm">Failed to load census data.</p>}

			{!isLoading && !isError && !data && (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<p className="text-muted-foreground text-sm">No census data for the selected date.</p>
					<p className="text-muted-foreground mt-1 text-xs">
						Try selecting a different date or check if the midnight snapshot has run.
					</p>
				</div>
			)}

			{!isLoading && !isError && data && (
				<>
					<div className="text-muted-foreground text-sm">
						Date: {data.date} &middot; Facility: {data.facilityId}
					</div>
					<div className="text-sm">
						Overall BOR: <strong>{data.overall.borPercentage}%</strong> &mdash;{" "}
						{data.overall.occupiedBeds} / {data.overall.totalBeds} beds
					</div>

					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead
										className="cursor-pointer select-none"
										onClick={() => handleSort("wardName")}
									>
										Ward{sortIndicator("wardName")}
									</TableHead>
									<TableHead
										className="cursor-pointer text-right select-none"
										onClick={() => handleSort("totalBeds")}
									>
										Total Beds{sortIndicator("totalBeds")}
									</TableHead>
									<TableHead
										className="cursor-pointer text-right select-none"
										onClick={() => handleSort("occupiedBeds")}
									>
										Midnight Census{sortIndicator("occupiedBeds")}
									</TableHead>
									<TableHead className="text-right">Admissions</TableHead>
									<TableHead className="text-right">Discharges</TableHead>
									<TableHead className="text-right">Deaths Gross (≤48h)</TableHead>
									<TableHead className="text-right">Deaths Net (&gt;48h)</TableHead>
									<TableHead
										className="cursor-pointer text-right select-none"
										onClick={() => handleSort("borPercentage")}
									>
										BOR %{sortIndicator("borPercentage")}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.byWard.length === 0 && (
									<TableRow>
										<TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
											No ward data available.
										</TableCell>
									</TableRow>
								)}
								{[...data.byWard]
									.sort((a, b) => {
										if (!sortCol) return 0
										const aVal = a[sortCol as keyof typeof a] ?? ""
										const bVal = b[sortCol as keyof typeof b] ?? ""
										if (typeof aVal === "number" && typeof bVal === "number") {
											return sortDir === "asc" ? aVal - bVal : bVal - aVal
										}
										return sortDir === "asc"
											? String(aVal).localeCompare(String(bVal))
											: String(bVal).localeCompare(String(aVal))
									})
									.map(row => (
										<TableRow key={row.wardId}>
											<TableCell>{row.wardName}</TableCell>
											<TableCell className="text-right">{row.totalBeds}</TableCell>
											<TableCell className="text-right">{row.occupiedBeds}</TableCell>
											<TableCell className="text-right">—</TableCell>
											<TableCell className="text-right">—</TableCell>
											<TableCell className="text-right">—</TableCell>
											<TableCell className="text-right">—</TableCell>
											<TableCell className="text-right">
												{row.borPercentage != null ? `${row.borPercentage}%` : "—"}
											</TableCell>
										</TableRow>
									))}
							</TableBody>
						</Table>
					</div>
					<p className="text-muted-foreground text-xs">
						Gross (≤48h) and Net (&gt;48h) death rate columns will be populated once ADM-BE-06
						midnight snapshot is active.
					</p>
				</>
			)}
		</div>
	)
}

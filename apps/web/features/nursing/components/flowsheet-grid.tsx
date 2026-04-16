"use client"

import { useMemo, useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Label } from "@/core/components/ui/label"
import { useFlowsheetsQuery } from "@/features/nursing/api/nursing.hooks"

interface FlowsheetGridProps {
	encounterId: string
	facilityId: string
}

const INTERVALS = [
	{ label: "1 hr", hours: 1 },
	{ label: "4 hr", hours: 4 },
	{ label: "8 hr", hours: 8 },
	{ label: "24 hr", hours: 24 },
] as const

type IntervalHours = (typeof INTERVALS)[number]["hours"]

function buildTimeColumns(entries: { recordedAt: string }[], intervalHours: IntervalHours) {
	if (!entries.length) return []
	const times = entries.map(e => new Date(e.recordedAt).getTime())
	const latest = Math.max(...times)
	const earliest = Math.min(...times)
	const stepMs = intervalHours * 60 * 60 * 1000

	const cols: Date[] = []
	let t = latest
	while (t >= earliest) {
		cols.push(new Date(t))
		t -= stepMs
	}
	return cols
}

function findClosestEntry<T extends { recordedAt: string; parameterName: string }>(
	entries: T[],
	paramName: string,
	targetTime: Date,
	toleranceMs: number
) {
	const target = targetTime.getTime()
	return entries
		.filter(e => e.parameterName === paramName)
		.reduce<T | null>((best, e) => {
			const diff = Math.abs(new Date(e.recordedAt).getTime() - target)
			if (diff > toleranceMs) return best
			if (!best) return e
			return diff < Math.abs(new Date(best.recordedAt).getTime() - target) ? e : best
		}, null)
}

export function FlowsheetGrid({ encounterId, facilityId }: FlowsheetGridProps) {
	const [intervalHours, setIntervalHours] = useState<IntervalHours>(4)
	const flowsheets = useFlowsheetsQuery({ encounterId, facilityId, limit: 500 })

	const { paramNames, timeColumns } = useMemo(() => {
		const entries = flowsheets.data?.data ?? []
		const names = [...new Set(entries.map(e => e.parameterName))].sort()
		const cols = buildTimeColumns(entries, intervalHours)
		return { paramNames: names, timeColumns: cols }
	}, [flowsheets.data, intervalHours])

	const entries = flowsheets.data?.data ?? []
	const toleranceMs = (intervalHours * 60 * 60 * 1000) / 2

	if (flowsheets.isLoading) {
		return (
			<div className="text-muted-foreground py-8 text-center text-sm">Loading…</div>
		)
	}

	if (!entries.length) {
		return (
			<div className="text-muted-foreground py-8 text-center text-sm">
				No flowsheet entries yet.
			</div>
		)
	}

	return (
		<div className="space-y-4">
			{/* Interval selector */}
			<div className="flex items-center gap-3">
				<Label className="text-sm font-medium">Time Interval:</Label>
				<div className="flex gap-1">
					{INTERVALS.map(iv => (
						<Button
							key={iv.hours}
							size="sm"
							variant={intervalHours === iv.hours ? "default" : "outline"}
							onClick={() => setIntervalHours(iv.hours)}
						>
							{iv.label}
						</Button>
					))}
				</div>
			</div>

			{/* Grid */}
			<div className="overflow-auto rounded-md border">
				<table className="min-w-full text-sm">
					<thead>
						<tr className="bg-muted/50 border-b">
							<th className="text-muted-foreground sticky left-0 min-w-[160px] bg-inherit px-3 py-2 text-left font-medium">
								Parameter
							</th>
							<th className="text-muted-foreground min-w-[120px] px-3 py-2 text-left font-medium">
								Unit
							</th>
							{timeColumns.map(col => (
								<th
									key={col.getTime()}
									className="text-muted-foreground min-w-[100px] px-3 py-2 text-center font-medium"
								>
									{col.toLocaleString("en-PH", {
										month: "short",
										day: "numeric",
										hour: "2-digit",
										minute: "2-digit",
									})}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{paramNames.map((paramName, idx) => {
							const sample = entries.find(e => e.parameterName === paramName)
							return (
								<tr key={paramName} className={idx % 2 === 0 ? "" : "bg-muted/20"}>
									<td className="sticky left-0 bg-inherit px-3 py-2 font-medium">
										{paramName}
									</td>
									<td className="text-muted-foreground px-3 py-2">
										{sample?.unit ?? "—"}
									</td>
									{timeColumns.map(col => {
										const entry = findClosestEntry(
											entries,
											paramName,
											col,
											toleranceMs
										)
										return (
											<td
												key={col.getTime()}
												className="px-3 py-2 text-center"
											>
												{entry ? (
													<Badge variant="outline" className="font-mono">
														{entry.parameterValue}
													</Badge>
												) : (
													<span className="text-muted-foreground">—</span>
												)}
											</td>
										)
									})}
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>
		</div>
	)
}

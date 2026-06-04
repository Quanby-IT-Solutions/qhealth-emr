"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip"
import { ErrorState, SkeletonRows } from "@/features/admin/components/state-views"

import { useHaiExportMutation, useHaiReportQuery } from "../api/hai.hooks"

interface HaiReportPageProps {
	facilityId: string
}

export function HaiReportPage({ facilityId }: HaiReportPageProps) {
	const today = new Date()
	const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
	const todayStr = today.toISOString().slice(0, 10)

	const [periodStart, setPeriodStart] = useState(monthStart)
	const [periodEnd, setPeriodEnd] = useState(todayStr)

	const { data, isLoading, isError, refetch, error } = useHaiReportQuery({
		facilityId,
		periodStart,
		periodEnd,
	})
	const { mutate: exportReport, isPending: exporting } = useHaiExportMutation()

	const handleExport = (format: "pdf" | "csv") => {
		exportReport(
			{ facilityId, periodStart, periodEnd, format },
			{
				onSuccess: result => {
					if (typeof window !== "undefined" && result.uri) {
						window.open(result.uri, "_blank")
					}
				},
			}
		)
	}

	return (
		<div className="space-y-3 px-4 py-3">
			<h1 className="text-lg font-semibold">HAI Surveillance Report</h1>

			<div className="bg-muted/30 flex flex-wrap items-end gap-3 rounded-md border p-3">
				<div className="space-y-1">
					<Label htmlFor="ps">Period Start</Label>
					<Input
						id="ps"
						type="date"
						value={periodStart}
						onChange={e => setPeriodStart(e.target.value)}
						className="h-8 w-36 text-xs"
					/>
				</div>
				<div className="space-y-1">
					<Label htmlFor="pe">Period End</Label>
					<Input
						id="pe"
						type="date"
						value={periodEnd}
						onChange={e => setPeriodEnd(e.target.value)}
						className="h-8 w-36 text-xs"
					/>
				</div>
				<div className="ml-auto flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => handleExport("pdf")}
						disabled={exporting}
					>
						Export PDF
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => handleExport("csv")}
						disabled={exporting}
					>
						Export CSV
					</Button>
				</div>
			</div>

			{isLoading && <SkeletonRows count={4} />}
			{isError && <ErrorState error={error} retry={refetch} />}
			{data && (
				<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-muted-foreground text-xs uppercase">Total tags</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-3xl font-bold tabular-nums">{data.totalTags}</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-muted-foreground text-xs uppercase">
								Patient days
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-3xl font-bold tabular-nums">{data.patientDays}</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<Tooltip>
								<TooltipTrigger>
									<CardTitle className="text-muted-foreground cursor-help text-xs uppercase underline decoration-dotted">
										Per 1000 patient days
									</CardTitle>
								</TooltipTrigger>
								<TooltipContent>
									<p className="max-w-xs text-xs">
										AHSR formula: (total HAI cases ÷ patient days) × 1000
									</p>
								</TooltipContent>
							</Tooltip>
						</CardHeader>
						<CardContent>
							<p className="text-3xl font-bold tabular-nums">{data.incidencePer1000PatientDays}</p>
							<p className="text-muted-foreground text-[10px]">DOH AHSR formula</p>
						</CardContent>
					</Card>
					<Card className="md:col-span-3">
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">By Type</CardTitle>
						</CardHeader>
						<CardContent>
							<dl className="grid grid-cols-2 gap-1 text-xs sm:grid-cols-5">
								{Object.entries(data.byType).map(([type, count]) => (
									<div key={type} className="flex justify-between rounded border px-2 py-1">
										<dt className="uppercase">{type}</dt>
										<dd className="font-semibold tabular-nums">{count}</dd>
									</div>
								))}
							</dl>
						</CardContent>
					</Card>
					<Card className="md:col-span-3">
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">By Ward</CardTitle>
						</CardHeader>
						<CardContent>
							{Object.keys(data.byWard).length > 0 ? (
								<dl className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
									{Object.entries(data.byWard).map(([ward, count]) => (
										<div key={ward} className="flex justify-between rounded border px-2 py-1">
											<dt>{ward}</dt>
											<dd className="font-semibold tabular-nums">{count}</dd>
										</div>
									))}
								</dl>
							) : (
								<p className="text-muted-foreground text-xs">
									No ward-level HAI tags matched the selected period.
								</p>
							)}
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	)
}

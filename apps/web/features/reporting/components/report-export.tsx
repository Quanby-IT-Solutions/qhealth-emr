"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { useExportAhsrMutation } from "@/features/reporting/api/reporting.hooks"

interface ReportExportProps {
	facilityId: string
}

export function ReportExport({ facilityId }: ReportExportProps) {
	const currentYear = new Date().getFullYear()
	const [year, setYear] = useState(currentYear)
	const [month, setMonth] = useState<string>("all")
	const [resultMsg, setResultMsg] = useState<string | null>(null)
	const [snapshotId, setSnapshotId] = useState<string | null>(null)

	const { mutate: exportAhsr, isPending } = useExportAhsrMutation()

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setResultMsg(null)
		setSnapshotId(null)
		exportAhsr(
			{
				facilityId,
				year,
				month: month === "all" ? undefined : Number(month),
			},
			{
				onSuccess: (data) => {
					setResultMsg(data.message)
					setSnapshotId(data.snapshotId)
				},
				onError: () => {
					setResultMsg("Export request failed. Please try again.")
				},
			}
		)
	}

	const months = [
		{ value: "all", label: "All months (full year)" },
		{ value: "1", label: "January" },
		{ value: "2", label: "February" },
		{ value: "3", label: "March" },
		{ value: "4", label: "April" },
		{ value: "5", label: "May" },
		{ value: "6", label: "June" },
		{ value: "7", label: "July" },
		{ value: "8", label: "August" },
		{ value: "9", label: "September" },
		{ value: "10", label: "October" },
		{ value: "11", label: "November" },
		{ value: "12", label: "December" },
	]

	return (
		<Card className="max-w-lg">
			<CardHeader>
				<CardTitle>Generate AHSR Export</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-muted-foreground mb-4 text-sm">
					Export a snapshot of Annual Hospital Statistical Report (AHSR) data for the selected
					period. PIDSR and HAI exports are available to the Reporting Officer.
				</p>
				<form className="space-y-4" onSubmit={handleSubmit}>
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<Label>Year</Label>
							<Select
								value={String(year)}
								onValueChange={(v) => {
									if (v) setYear(Number(v))
								}}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{[currentYear, currentYear - 1, currentYear - 2].map((y) => (
										<SelectItem key={y} value={String(y)}>
											{y}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1">
							<Label>Month (optional)</Label>
							<Select
								value={month}
								onValueChange={(v) => {
									if (v) setMonth(v)
								}}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{months.map((m) => (
										<SelectItem key={m.value} value={m.value}>
											{m.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<Button type="submit" className="w-full" disabled={isPending}>
						{isPending ? "Requesting snapshot…" : "Generate AHSR Snapshot"}
					</Button>
				</form>

				{resultMsg && (
					<div className="mt-4 rounded-md border p-3 text-sm space-y-1">
						<p>{resultMsg}</p>
						{snapshotId && (
							<p className="text-muted-foreground text-xs">Snapshot ID: {snapshotId}</p>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	)
}

"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"

import { useGenerateKonsultaReportMutation } from "../api/konsulta.hooks"

interface CapitationReportPageProps {
	facilityId: string
}

export function CapitationReportPage({ facilityId }: CapitationReportPageProps) {
	const [periodStart, setPeriodStart] = useState("")
	const [periodEnd, setPeriodEnd] = useState("")

	const { mutate: generateReport, isPending, data: report } = useGenerateKonsultaReportMutation()

	function handleGenerate() {
		generateReport({ facilityId, period: "monthly", periodStart, periodEnd })
	}

	const canGenerate = !!periodStart && !!periodEnd && !!facilityId

	return (
		<div className="space-y-4 px-4 max-w-xl">
			<h1 className="text-lg font-semibold">Konsulta Capitation Report</h1>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm">Report Period</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<Label htmlFor="period-start" className="text-xs">Start Date</Label>
							<Input
								id="period-start"
								type="date"
								value={periodStart}
								onChange={e => setPeriodStart(e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="period-end" className="text-xs">End Date</Label>
							<Input
								id="period-end"
								type="date"
								value={periodEnd}
								onChange={e => setPeriodEnd(e.target.value)}
							/>
						</div>
					</div>
					<Button onClick={handleGenerate} disabled={!canGenerate || isPending}>
						{isPending ? "Generating..." : "Generate Report"}
					</Button>
				</CardContent>
			</Card>

			{report && (
				<>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Aggregate Counts</CardTitle>
						</CardHeader>
						<CardContent className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
							<div className="rounded border p-2 text-center">
								<p className="text-2xl font-bold tabular-nums">{report.totalFpe}</p>
								<p className="text-xs text-muted-foreground">FPE</p>
							</div>
							<div className="rounded border p-2 text-center">
								<p className="text-2xl font-bold tabular-nums">{report.totalFollowUp}</p>
								<p className="text-xs text-muted-foreground">Follow-up</p>
							</div>
							<div className="rounded border p-2 text-center">
								<p className="text-2xl font-bold tabular-nums">{report.totalLab}</p>
								<p className="text-xs text-muted-foreground">Lab</p>
							</div>
							<div className="rounded border p-2 text-center">
								<p className="text-2xl font-bold tabular-nums">
									{report.totalFpe + report.totalFollowUp + report.totalLab}
								</p>
								<p className="text-xs text-muted-foreground">Total</p>
							</div>
						</CardContent>
					</Card>

					<div className="flex gap-3">
						{report.xmlUri && (
							<a
								href={report.xmlUri}
								download={`konsulta-report-${report.periodStart}.xml`}
								className="text-sm underline text-primary"
							>
								Download XML
							</a>
						)}
						{report.csvUri && (
							<a
								href={report.csvUri}
								download={`konsulta-report-${report.periodStart}.csv`}
								className="text-sm underline text-primary"
							>
								Download CSV
							</a>
						)}
					</div>
				</>
			)}
		</div>
	)
}

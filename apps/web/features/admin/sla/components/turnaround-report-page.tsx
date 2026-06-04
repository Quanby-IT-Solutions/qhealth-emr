"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
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
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useSlaTurnaroundQuery } from "@/features/sla/api/sla-orpc.hooks"

interface TurnaroundReportPageProps {
	workflowId: string
}

const WORKFLOW_LABELS: Record<string, string> = {
	"opd-triage": "OPD Triage",
	"lab-results": "Lab Results",
	"radiology": "Radiology",
	"admission": "Admission",
	"discharge": "Discharge",
	"emergency": "Emergency",
	"pharmacy": "Pharmacy Dispensing",
}

export function TurnaroundReportPage({ workflowId }: TurnaroundReportPageProps) {
	const facilityId = useActiveFacilityId()
	const { data: profile } = useMyProfile()
	const [dateFrom, setDateFrom] = useState("")
	const [dateTo, setDateTo] = useState("")
	const [compareFrom, setCompareFrom] = useState("")
	const [compareTo, setCompareTo] = useState("")
	const [showCompare, setShowCompare] = useState(false)
	const [isExporting, setIsExporting] = useState(false)

	async function handlePdfExport() {
		if (!hasDateRange) return
		setIsExporting(true)
		try {
			// Wire to admin.sla.export endpoint once ADM-BE-10 is complete
			// Expected to return a PDF blob with facility name, DOH license number, period, signature line
			await new Promise(r => setTimeout(r, 600))
			toast.success("PDF export ready (backend ADM-BE-10 required for full implementation).")
		} catch {
			toast.error("Export failed.")
		} finally {
			setIsExporting(false)
		}
	}

	const hasDateRange = !!dateFrom && !!dateTo
	const { data, isLoading } = useSlaTurnaroundQuery(
		{
			facilityId: facilityId ?? "",
			workflowType: workflowId,
			startDate: dateFrom,
			endDate: dateTo,
			compareStartDate: showCompare && compareFrom ? compareFrom : undefined,
			compareEndDate: showCompare && compareTo ? compareTo : undefined,
		},
		!!facilityId && hasDateRange
	)

	const rows = data?.primary ?? []
	const compareRows = data?.comparison ?? []
	const label = WORKFLOW_LABELS[workflowId] ?? workflowId

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-medium">{label} Turnaround Report</h2>
				<div className="flex items-center gap-3">
					<button
						type="button"
						className="text-primary text-sm underline"
						onClick={() => setShowCompare(v => !v)}
					>
						{showCompare ? "Hide comparison" : "Compare date ranges"}
					</button>
					{hasDateRange && (
						<Button variant="outline" size="sm" onClick={handlePdfExport} disabled={isExporting}>
							{isExporting ? "Exporting..." : "Export PDF"}
						</Button>
					)}
				</div>
			</div>
			{hasDateRange && (
				<p className="text-muted-foreground text-xs">
					{profile?.staffProfiles[0] && `Facility: ${profile.staffProfiles[0].facilityId} · `}
					Period: {dateFrom} to {dateTo}
				</p>
			)}

			<div className="flex flex-wrap gap-6">
				<div className="space-y-1">
					<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
						Primary period
					</p>
					<div className="flex items-center gap-2">
						<Input
							type="date"
							value={dateFrom}
							onChange={e => setDateFrom(e.target.value)}
							className="w-40"
						/>
						<span className="text-muted-foreground text-sm">to</span>
						<Input
							type="date"
							value={dateTo}
							onChange={e => setDateTo(e.target.value)}
							className="w-40"
						/>
					</div>
				</div>
				{showCompare && (
					<div className="space-y-1">
						<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
							Compare with
						</p>
						<div className="flex items-center gap-2">
							<Input
								type="date"
								value={compareFrom}
								onChange={e => setCompareFrom(e.target.value)}
								className="w-40"
							/>
							<span className="text-muted-foreground text-sm">to</span>
							<Input
								type="date"
								value={compareTo}
								onChange={e => setCompareTo(e.target.value)}
								className="w-40"
							/>
						</div>
					</div>
				)}
			</div>

			{!hasDateRange && (
				<p className="text-muted-foreground py-4 text-center text-sm">
					Select a date range to load turnaround data.
				</p>
			)}

			{hasDateRange && isLoading && <Skeleton className="h-48 w-full" />}

			{hasDateRange && !isLoading && rows.length === 0 && (
				<p className="text-muted-foreground py-8 text-center text-sm">
					No turnaround data available for this period.
				</p>
			)}

			{hasDateRange && !isLoading && rows.length > 0 && (
				<div className="space-y-4">
					<div className="grid grid-cols-3 gap-3">
						<Card>
							<CardContent className="pt-4">
								<p className="text-muted-foreground text-xs">Median TAT</p>
								<p className="text-2xl font-semibold">
									{(rows.reduce((s, r) => s + r.medianTAT, 0) / rows.length).toFixed(0)}m
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-4">
								<p className="text-muted-foreground text-xs">P95 TAT</p>
								<p className="text-2xl font-semibold">
									{(rows.reduce((s, r) => s + r.p95TAT, 0) / rows.length).toFixed(0)}m
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-4">
								<p className="text-muted-foreground text-xs">Within SLA</p>
								<p className="text-2xl font-semibold">
									{(rows.reduce((s, r) => s + r.withinSLAPct, 0) / rows.length).toFixed(1)}%
								</p>
							</CardContent>
						</Card>
					</div>

					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Date</TableHead>
								<TableHead className="text-right">Cases</TableHead>
								<TableHead className="text-right">Median TAT</TableHead>
								<TableHead className="text-right">P95 TAT</TableHead>
								<TableHead className="text-right">Within SLA</TableHead>
								<TableHead className="text-right">Breaches</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map(row => (
								<TableRow key={row.date}>
									<TableCell>{row.date}</TableCell>
									<TableCell className="text-right">{row.cases}</TableCell>
									<TableCell className="text-right">{row.medianTAT}m</TableCell>
									<TableCell className="text-right">{row.p95TAT}m</TableCell>
									<TableCell className="text-right">{row.withinSLAPct.toFixed(1)}%</TableCell>
									<TableCell
										className={`text-right ${row.breachCount > 0 ? "text-destructive" : ""}`}
									>
										{row.breachCount}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>

					{compareRows.length > 0 && (
						<div>
							<p className="text-muted-foreground mb-2 text-sm font-medium">Comparison period</p>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Date</TableHead>
										<TableHead className="text-right">Cases</TableHead>
										<TableHead className="text-right">Median TAT</TableHead>
										<TableHead className="text-right">P95 TAT</TableHead>
										<TableHead className="text-right">Within SLA</TableHead>
										<TableHead className="text-right">Breaches</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{compareRows.map(row => (
										<TableRow key={row.date}>
											<TableCell>{row.date}</TableCell>
											<TableCell className="text-right">{row.cases}</TableCell>
											<TableCell className="text-right">{row.medianTAT}m</TableCell>
											<TableCell className="text-right">{row.p95TAT}m</TableCell>
											<TableCell className="text-right">{row.withinSLAPct.toFixed(1)}%</TableCell>
											<TableCell
												className={`text-right ${row.breachCount > 0 ? "text-destructive" : ""}`}
											>
												{row.breachCount}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			)}
		</div>
	)
}

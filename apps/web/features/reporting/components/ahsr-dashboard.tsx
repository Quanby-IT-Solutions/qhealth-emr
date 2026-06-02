"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Progress } from "@/core/components/ui/progress"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip"
import {
	useAhsrDrilldownQuery,
	useAhsrMetricsQuery,
	useExportAhsrMutation,
} from "@/features/reporting/api/reporting.hooks"

function formatDate(d: string | null | undefined) {
	if (!d) return "—"
	return new Date(d).toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

interface AhsrDashboardProps {
	facilityId: string
	canEdit?: boolean
	canExport?: boolean
}

export function AhsrDashboard({
	facilityId,
	canEdit = false,
	canExport = false,
}: AhsrDashboardProps) {
	const currentYear = new Date().getFullYear()
	const [year, setYear] = useState(currentYear)
	const [quarter, setQuarter] = useState<string>("all")

	const {
		data: metrics,
		isLoading,
		refetch,
	} = useAhsrMetricsQuery({
		facilityId,
		year,
		quarter: quarter === "all" ? undefined : (Number(quarter) as 1 | 2 | 3 | 4),
	})

	const exportMut = useExportAhsrMutation()

	const [drillMetric, setDrillMetric] = useState("")
	const [drillIcd, setDrillIcd] = useState<string | undefined>()
	const [drillHai, setDrillHai] = useState<string | undefined>()
	const [drillOpen, setDrillOpen] = useState(false)

	const { data: drilldown } = useAhsrDrilldownQuery(
		{
			facilityId,
			year,
			month: quarter === "all" ? undefined : Number(quarter) * 3,
			metric: drillMetric,
			icdCode: drillIcd,
			haiType: drillHai,
			limit: 20,
		},
		drillOpen && !!drillMetric
	)

	function openDrilldown(metric: string, icdCode?: string, haiType?: string) {
		setDrillMetric(metric)
		setDrillIcd(icdCode)
		setDrillHai(haiType)
		setDrillOpen(true)
	}

	function handleExport() {
		exportMut.mutate({
			facilityId,
			year,
			month: quarter === "all" ? undefined : Number(quarter) * 3,
		})
	}

	const quarters = [
		{ value: "all", label: "Annual" },
		{ value: "1", label: "Q1 (Jan–Mar)" },
		{ value: "2", label: "Q2 (Apr–Jun)" },
		{ value: "3", label: "Q3 (Jul–Sep)" },
		{ value: "4", label: "Q4 (Oct–Dec)" },
	]

	return (
		<div className="space-y-4">
			{/* Filters */}
			<Card>
				<CardHeader>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<CardTitle>AHSR Dashboard</CardTitle>
						<div className="flex gap-2">
							<Select
								value={String(year)}
								onValueChange={v => {
									if (v) setYear(Number(v))
								}}
							>
								<SelectTrigger className="w-28">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{[currentYear, currentYear - 1, currentYear - 2].map(y => (
										<SelectItem key={y} value={String(y)}>
											{y}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select
								value={quarter}
								onValueChange={v => {
									if (v) setQuarter(v)
								}}
							>
								<SelectTrigger className="w-40">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{quarters.map(q => (
										<SelectItem key={q.value} value={q.value}>
											{q.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Button variant="ghost" size="sm" onClick={() => void refetch()} disabled={isLoading}>
								{isLoading ? "Refreshing…" : "Refresh"}
							</Button>
							{canExport && (
								<Button variant="outline" onClick={handleExport} disabled={exportMut.isPending}>
									{exportMut.isPending ? "Exporting…" : "Export Snapshot"}
								</Button>
							)}
						</div>
					</div>
				</CardHeader>
			</Card>

			{isLoading ? (
				<p className="text-muted-foreground py-8 text-center">Loading AHSR metrics…</p>
			) : !metrics ? (
				<p className="text-muted-foreground py-8 text-center">No data available.</p>
			) : (
				<>
					{/* Summary Cards */}
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						<MetricCard
							title="Admissions"
							value={metrics.totalAdmissions}
							onClick={canEdit ? () => openDrilldown("admissions") : undefined}
						/>
						<MetricCard
							title="Discharges"
							value={metrics.totalDischarges}
							onClick={canEdit ? () => openDrilldown("discharges") : undefined}
						/>
						<MetricCard
							title="Deaths"
							value={metrics.totalDeaths}
							onClick={canEdit ? () => openDrilldown("deaths") : undefined}
						/>
						<MetricCard
							title="Bed Occupancy Rate"
							value={
								metrics.bedOccupancyRate != null ? `${metrics.bedOccupancyRate.toFixed(1)}%` : "—"
							}
						/>
					</div>

					{/* Readiness tile */}
					<Card>
						<CardContent className="pt-4">
							<div className="flex items-center justify-between">
								<div className="text-muted-foreground text-sm">AHSR Data Readiness</div>
								<Tooltip>
									<TooltipTrigger>
										<span className="text-muted-foreground cursor-help text-xs underline decoration-dotted">
											What is this?
										</span>
									</TooltipTrigger>
									<TooltipContent className="max-w-xs">
										<p className="mb-1 font-medium">What lowers readiness:</p>
										<ul className="list-inside list-disc space-y-0.5 text-xs">
											<li>Encounters missing ICD-10 codes</li>
											<li>Deprecated ICD-10 codes used</li>
											<li>Encounters without finalized notes</li>
										</ul>
										<p className="text-muted-foreground mt-1 text-xs">
											Below 95% blocks export. See Validation page for details.
										</p>
									</TooltipContent>
								</Tooltip>
							</div>
							<div className="mt-1 text-3xl font-bold">
								{metrics.readinessPercent != null ? `${metrics.readinessPercent}%` : "—"}
							</div>
							{metrics.readinessPercent != null && (
								<Progress
									value={metrics.readinessPercent}
									className={`mt-2 h-2 ${metrics.readinessPercent < 95 ? "[&>div]:bg-destructive" : ""}`}
								/>
							)}
							{metrics.readinessPercent != null && metrics.readinessPercent < 95 && (
								<p className="text-destructive mt-1 text-xs">
									Below 95% threshold — export blocked. Resolve missing ICD-10 codes.
								</p>
							)}
						</CardContent>
					</Card>

					{/* Death Rates */}
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<Card>
							<CardContent className="pt-4">
								<div className="text-muted-foreground text-sm">Gross Death Rate</div>
								<div className="text-3xl font-bold">
									{metrics.grossDeathRate != null ? `${metrics.grossDeathRate.toFixed(2)}%` : "—"}
								</div>
								<p className="text-muted-foreground mt-1 text-xs">
									Deaths per 100 discharges (including &lt;48h)
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-4">
								<div className="text-muted-foreground text-sm">Net Death Rate</div>
								<div className="text-3xl font-bold">
									{metrics.netDeathRate != null ? `${metrics.netDeathRate.toFixed(2)}%` : "—"}
								</div>
								<p className="text-muted-foreground mt-1 text-xs">
									Deaths per 100 discharges (excluding &lt;48h)
								</p>
							</CardContent>
						</Card>
					</div>

					{/* Top 10 Morbidities */}
					<Card>
						<CardHeader>
							<CardTitle>Top 10 Morbidities</CardTitle>
						</CardHeader>
						<CardContent>
							{metrics.topMorbidities.length === 0 ? (
								<p className="text-muted-foreground py-4 text-center text-sm">No data</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-12">#</TableHead>
											<TableHead>Disease</TableHead>
											<TableHead>ICD-10</TableHead>
											<TableHead className="text-right">Count</TableHead>
											<TableHead className="text-right">%</TableHead>
											{canEdit && <TableHead />}
										</TableRow>
									</TableHeader>
									<TableBody>
										{metrics.topMorbidities.map(m => (
											<TableRow key={m.icdCode}>
												<TableCell>{m.rank}</TableCell>
												<TableCell>{m.diseaseName}</TableCell>
												<TableCell className="text-muted-foreground">{m.icdCode}</TableCell>
												<TableCell className="text-right">{m.count}</TableCell>
												<TableCell className="text-right">{m.percentage.toFixed(1)}%</TableCell>
												<TableCell className="text-right">
													{canEdit && (
														<Button
															size="sm"
															variant="ghost"
															onClick={() => openDrilldown("morbidity", m.icdCode)}
														>
															Drilldown
														</Button>
													)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>

					{/* Top 10 Mortalities */}
					<Card>
						<CardHeader>
							<CardTitle>Top 10 Mortalities</CardTitle>
						</CardHeader>
						<CardContent>
							{metrics.topMortalities.length === 0 ? (
								<p className="text-muted-foreground py-4 text-center text-sm">No data</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-12">#</TableHead>
											<TableHead>Disease</TableHead>
											<TableHead>ICD-10</TableHead>
											<TableHead className="text-right">Count</TableHead>
											<TableHead className="text-right">%</TableHead>
											{canEdit && <TableHead />}
										</TableRow>
									</TableHeader>
									<TableBody>
										{metrics.topMortalities.map(m => (
											<TableRow key={m.icdCode}>
												<TableCell>{m.rank}</TableCell>
												<TableCell>{m.diseaseName}</TableCell>
												<TableCell className="text-muted-foreground">{m.icdCode}</TableCell>
												<TableCell className="text-right">{m.count}</TableCell>
												<TableCell className="text-right">{m.percentage.toFixed(1)}%</TableCell>
												<TableCell className="text-right">
													{canEdit && (
														<Button
															size="sm"
															variant="ghost"
															onClick={() => openDrilldown("mortality", m.icdCode)}
														>
															Drilldown
														</Button>
													)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>

					{/* HAI Metrics */}
					<Card>
						<CardHeader>
							<CardTitle>Healthcare-Associated Infections</CardTitle>
						</CardHeader>
						<CardContent>
							{metrics.haiMetrics.length === 0 ? (
								<p className="text-muted-foreground py-4 text-center text-sm">No HAI data</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>HAI Type</TableHead>
											<TableHead className="text-right">Count</TableHead>
											<TableHead className="text-right">Rate / 1000 Admissions</TableHead>
											{canEdit && <TableHead />}
										</TableRow>
									</TableHeader>
									<TableBody>
										{metrics.haiMetrics.map(h => (
											<TableRow key={h.haiType}>
												<TableCell className="font-medium uppercase">{h.haiType}</TableCell>
												<TableCell className="text-right">{h.count}</TableCell>
												<TableCell className="text-right">{h.rate.toFixed(2)}</TableCell>
												<TableCell className="text-right">
													{canEdit && (
														<Button
															size="sm"
															variant="ghost"
															onClick={() => openDrilldown("hai", undefined, h.haiType)}
														>
															Drilldown
														</Button>
													)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</>
			)}

			{/* Drilldown Dialog */}
			<Dialog open={drillOpen} onOpenChange={setDrillOpen}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>
							AHSR Drilldown — {drillMetric}
							{drillIcd ? ` (${drillIcd})` : ""}
							{drillHai ? ` (${drillHai.toUpperCase()})` : ""}
						</DialogTitle>
					</DialogHeader>

					{drilldown?.encounters?.length ? (
						<div className="max-h-96 overflow-y-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Patient</TableHead>
										<TableHead>MRN</TableHead>
										<TableHead>Type</TableHead>
										<TableHead>Admitted</TableHead>
										<TableHead>Discharged</TableHead>
										<TableHead>Disposition</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{drilldown.encounters.map(enc => (
										<TableRow key={enc.encounterId}>
											<TableCell>{enc.patientName}</TableCell>
											<TableCell>{enc.patientMrn}</TableCell>
											<TableCell>{enc.encounterType}</TableCell>
											<TableCell>{formatDate(enc.admissionDate)}</TableCell>
											<TableCell>{formatDate(enc.dischargeDate)}</TableCell>
											<TableCell>{enc.disposition ?? "—"}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					) : (
						<p className="text-muted-foreground py-4 text-center text-sm">No encounters found.</p>
					)}

					<DialogFooter>
						<Button variant="outline" onClick={() => setDrillOpen(false)}>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

function MetricCard({
	title,
	value,
	onClick,
}: {
	title: string
	value: string | number
	onClick?: () => void
}) {
	return (
		<Card
			className={onClick ? "cursor-pointer transition-shadow hover:shadow-md" : ""}
			onClick={onClick}
		>
			<CardContent className="pt-4">
				<div className="text-muted-foreground text-sm">{title}</div>
				<div className="text-2xl font-bold">{value}</div>
			</CardContent>
		</Card>
	)
}

"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
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
import { useHaiCasesQuery, useHaiReportQuery } from "@/features/reporting/api/reporting.hooks"

function formatDate(d: string | null | undefined) {
	if (!d) return "—"
	return new Date(d).toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

const HAI_LABELS: Record<string, string> = {
	vap: "Ventilator-Associated Pneumonia (VAP)",
	bsi: "Bloodstream Infection (BSI/CLABSI)",
	uti: "Urinary Tract Infection (CAUTI)",
	ssi: "Surgical Site Infection (SSI)",
}

interface HaiReportProps {
	facilityId: string
}

export function HaiReport({ facilityId }: HaiReportProps) {
	const currentYear = new Date().getFullYear()
	const [year, setYear] = useState(currentYear)
	const [month, setMonth] = useState<string>("all")
	const [selectedType, setSelectedType] = useState<string | null>(null)
	const [casePage, setCasePage] = useState(1)

	const { data: report, isLoading } = useHaiReportQuery({
		facilityId,
		year,
		month: month === "all" ? undefined : Number(month),
	})

	const casesQuery = useHaiCasesQuery(
		{
			facilityId,
			year,
			month: month === "all" ? undefined : Number(month),
			haiType: selectedType ?? undefined,
			page: casePage,
			limit: 20,
		},
		!!selectedType
	)

	const months = [
		{ value: "all", label: "Full Year" },
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
		<div className="space-y-4">
			{/* Filters */}
			<Card>
				<CardHeader>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<CardTitle>HAI Surveillance Report</CardTitle>
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
								value={month}
								onValueChange={v => {
									if (v) setMonth(v)
								}}
							>
								<SelectTrigger className="w-36">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{months.map(m => (
										<SelectItem key={m.value} value={m.value}>
											{m.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardHeader>
			</Card>

			{isLoading ? (
				<p className="text-muted-foreground py-8 text-center">Loading HAI report…</p>
			) : !report ? (
				<p className="text-muted-foreground py-8 text-center">No HAI data available.</p>
			) : (
				<>
					{/* Summary cards */}
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<Card>
							<CardContent className="pt-4">
								<div className="text-muted-foreground text-sm">Total HAI Cases</div>
								<div className="text-3xl font-bold">{report.totalHaiCases}</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-4">
								<div className="text-muted-foreground text-sm">Overall HAI Rate</div>
								<div className="text-3xl font-bold">
									{report.haiRate.toFixed(2)}
									<span className="ml-1 text-base font-normal">per 1,000 admissions</span>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* By HAI Type */}
					<Card>
						<CardHeader>
							<CardTitle>HAI Metrics by Type</CardTitle>
						</CardHeader>
						<CardContent>
							{report.byType.length === 0 ? (
								<p className="text-muted-foreground py-4 text-center text-sm">No data</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>HAI Type</TableHead>
											<TableHead className="text-right">Cases</TableHead>
											<TableHead className="text-right">Rate / 1,000</TableHead>
											<TableHead className="text-right">Trend Periods</TableHead>
											<TableHead />
										</TableRow>
									</TableHeader>
									<TableBody>
										{report.byType.map(h => (
											<TableRow
												key={h.haiType}
												className={selectedType === h.haiType ? "bg-muted/50" : ""}
											>
												<TableCell>
													<div className="font-medium uppercase">{h.haiType}</div>
													<div className="text-muted-foreground text-xs">
														{HAI_LABELS[h.haiType] ?? h.label}
													</div>
												</TableCell>
												<TableCell className="text-right">{h.count}</TableCell>
												<TableCell className="text-right">{h.rate.toFixed(2)}</TableCell>
												<TableCell className="text-right">
													{h.trend.length > 0 ? (
														<span className="text-muted-foreground text-xs">
															{h.trend.map(t => t.count).join(" → ")}
														</span>
													) : (
														<span className="text-muted-foreground text-xs">—</span>
													)}
												</TableCell>
												<TableCell className="text-right">
													<Button
														size="sm"
														variant={selectedType === h.haiType ? "default" : "ghost"}
														onClick={() => {
															setSelectedType(selectedType === h.haiType ? null : h.haiType)
															setCasePage(1)
														}}
													>
														{selectedType === h.haiType ? "Hide Cases" : "View Cases"}
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>

					{/* Trend table for selected type */}
					{selectedType &&
						(() => {
							const typeData = report.byType.find(h => h.haiType === selectedType)
							return typeData && typeData.trend.length > 0 ? (
								<Card>
									<CardHeader>
										<CardTitle>
											{HAI_LABELS[selectedType] ?? selectedType.toUpperCase()} — Trend
										</CardTitle>
									</CardHeader>
									<CardContent>
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>Period</TableHead>
													<TableHead className="text-right">Cases</TableHead>
													<TableHead className="text-right">Rate</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{typeData.trend.map(t => (
													<TableRow key={t.period}>
														<TableCell>{t.period}</TableCell>
														<TableCell className="text-right">{t.count}</TableCell>
														<TableCell className="text-right">{t.rate.toFixed(2)}</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</CardContent>
								</Card>
							) : null
						})()}

					{/* Cases list for selected type */}
					{selectedType && (
						<Card>
							<CardHeader>
								<CardTitle>
									{HAI_LABELS[selectedType] ?? selectedType.toUpperCase()} — Cases
								</CardTitle>
							</CardHeader>
							<CardContent>
								{casesQuery.isLoading ? (
									<p className="text-muted-foreground py-4 text-center">Loading cases…</p>
								) : !casesQuery.data?.cases?.length ? (
									<p className="text-muted-foreground py-4 text-center">No cases found.</p>
								) : (
									<>
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>Patient</TableHead>
													<TableHead>HAI Type</TableHead>
													<TableHead>Onset Date</TableHead>
													<TableHead>Diagnosis Date</TableHead>
													<TableHead>Disposition</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{casesQuery.data.cases.map(c => (
													<TableRow key={c.encounterId}>
														<TableCell>
															<div className="font-medium">{c.patientName}</div>
															<div className="text-muted-foreground text-xs">{c.patientMrn}</div>
														</TableCell>
														<TableCell>
															<Badge variant="secondary" className="uppercase">
																{c.haiType}
															</Badge>
														</TableCell>
														<TableCell>{formatDate(c.onsetDate)}</TableCell>
														<TableCell>{formatDate(c.diagnosisDate)}</TableCell>
														<TableCell>{c.disposition ?? "—"}</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
										{(casesQuery.data.totalPages ?? 0) > 1 && (
											<div className="mt-4 flex justify-center gap-2">
												<Button
													size="sm"
													variant="outline"
													disabled={casePage <= 1}
													onClick={() => setCasePage(p => p - 1)}
												>
													Previous
												</Button>
												<span className="text-muted-foreground self-center text-sm">
													Page {casePage} of {casesQuery.data.totalPages}
												</span>
												<Button
													size="sm"
													variant="outline"
													disabled={casePage >= casesQuery.data.totalPages}
													onClick={() => setCasePage(p => p + 1)}
												>
													Next
												</Button>
											</div>
										)}
									</>
								)}
							</CardContent>
						</Card>
					)}
				</>
			)}
		</div>
	)
}

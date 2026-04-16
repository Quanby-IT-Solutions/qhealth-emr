"use client"

import { useState } from "react"

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
import { useExportReportMutation } from "@/features/reporting/api/reporting.hooks"

interface ReportExportProps {
	facilityId: string
}

export function ReportExport({ facilityId }: ReportExportProps) {
	const currentYear = new Date().getFullYear()
	const [reportType, setReportType] = useState<"ahsr" | "pidsr" | "hai">("ahsr")
	const [format, setFormat] = useState<"csv" | "pdf" | "xml">("csv")
	const [year, setYear] = useState(currentYear)
	const [month, setMonth] = useState<string>("all")
	const [dateFrom, setDateFrom] = useState("")
	const [dateTo, setDateTo] = useState("")
	const [resultMsg, setResultMsg] = useState<string | null>(null)
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
	const [fileName, setFileName] = useState<string | null>(null)

	const { mutate: exportReport, isPending } = useExportReportMutation()

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setResultMsg(null)
		setDownloadUrl(null)
		setFileName(null)
		exportReport(
			{
				facilityId,
				reportType,
				format,
				year,
				month: month === "all" ? undefined : Number(month),
				dateFrom: dateFrom || undefined,
				dateTo: dateTo || undefined,
			},
			{
				onSuccess: (data) => {
					setResultMsg(data.message)
					setDownloadUrl(data.downloadUrl ?? null)
					setFileName(data.fileName ?? null)
				},
				onError: () => {
					setResultMsg("Export failed. Please try again.")
				},
			}
		)
	}

	const months = [
		{ value: "all", label: "All months" },
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
				<CardTitle>Generate Report Export</CardTitle>
			</CardHeader>
			<CardContent>
				<form className="space-y-4" onSubmit={handleSubmit}>
					<div className="space-y-1">
						<Label>Report Type</Label>
						<Select
							value={reportType}
							onValueChange={(v) => {
								if (v) setReportType(v as "ahsr" | "pidsr" | "hai")
							}}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ahsr">AHSR — Annual Hospital Statistical Report</SelectItem>
								<SelectItem value="pidsr">PIDSR — Philippine Integrated Disease Surveillance</SelectItem>
								<SelectItem value="hai">HAI — Healthcare-Associated Infections</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1">
						<Label>Format</Label>
						<Select
							value={format}
							onValueChange={(v) => {
								if (v) setFormat(v as "csv" | "pdf" | "xml")
							}}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="csv">CSV</SelectItem>
								<SelectItem value="pdf">PDF</SelectItem>
								<SelectItem value="xml">XML</SelectItem>
							</SelectContent>
						</Select>
					</div>

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

					{(reportType === "pidsr" || reportType === "hai") && (
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label>Date From (optional)</Label>
								<Input
									type="date"
									value={dateFrom}
									onChange={(e) => setDateFrom(e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label>Date To (optional)</Label>
								<Input
									type="date"
									value={dateTo}
									onChange={(e) => setDateTo(e.target.value)}
								/>
							</div>
						</div>
					)}

					<Button type="submit" className="w-full" disabled={isPending}>
						{isPending ? "Generating…" : "Generate Export"}
					</Button>
				</form>

				{resultMsg && (
					<div className="mt-4 space-y-1 rounded-md border p-3 text-sm">
						<p>{resultMsg}</p>
						{downloadUrl && (
							<a
								href={downloadUrl}
								download={fileName ?? undefined}
								className="text-primary font-medium underline"
							>
								{fileName ? `Download ${fileName}` : "Download file"}
							</a>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	)
}

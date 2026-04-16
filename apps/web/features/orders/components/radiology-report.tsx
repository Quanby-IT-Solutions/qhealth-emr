"use client"

import { Clock, FileText } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Separator } from "@/core/components/ui/separator"

interface StructuredReport {
	technique?: string
	findings?: string
	impression?: string
	recommendations?: string
	radiologistName?: string
	reportedAt?: string
}

export interface RadiologyReportProps {
	report: string | null
	structuredResults: unknown
	modality: string
	bodyPart: string
	clinicalIndication: string | null
	completedDatetime: string | null
}

function parseStructuredResults(raw: unknown): StructuredReport | null {
	if (!raw || typeof raw !== "object") return null
	return raw as StructuredReport
}

function formatDate(dateStr: string | null | undefined): string | null {
	if (!dateStr) return null
	return new Date(dateStr).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

export function RadiologyReport({
	report,
	structuredResults,
	modality,
	bodyPart,
	clinicalIndication,
	completedDatetime,
}: RadiologyReportProps) {
	const structured = parseStructuredResults(structuredResults)
	const hasReport = !!report || !!structured

	if (!hasReport) {
		return (
			<div className="flex flex-col items-center gap-2 py-8 text-center">
				<Clock className="text-muted-foreground size-8" />
				<p className="text-muted-foreground text-sm font-medium">Report Pending</p>
				<p className="text-muted-foreground text-xs">
					The radiology report has not yet been filed for this {modality.toLowerCase()} of{" "}
					{bodyPart.toLowerCase()}.
				</p>
			</div>
		)
	}

	return (
		<div className="space-y-4 p-4">
			{/* Header */}
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div>
					<h4 className="font-semibold">
						{modality} — {bodyPart}
					</h4>
					{completedDatetime && (
						<p className="text-muted-foreground text-xs">
							Completed: {formatDate(completedDatetime)}
						</p>
					)}
				</div>
				<Badge variant="default">Report Filed</Badge>
			</div>

			<Separator />

			{/* Clinical Indication */}
			{clinicalIndication && (
				<div>
					<p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
						Clinical Indication
					</p>
					<p className="text-sm">{clinicalIndication}</p>
				</div>
			)}

			{/* Technique */}
			{structured?.technique && (
				<div>
					<p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
						Technique
					</p>
					<p className="text-sm">{structured.technique}</p>
				</div>
			)}

			{/* Findings */}
			{(structured?.findings ?? report) && (
				<div>
					<p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
						Findings
					</p>
					<p className="whitespace-pre-wrap text-sm">{structured?.findings ?? report}</p>
				</div>
			)}

			{/* Impression */}
			{structured?.impression && (
				<div>
					<p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
						Impression
					</p>
					<p className="bg-muted rounded-md p-3 text-sm font-medium">
						{structured.impression}
					</p>
				</div>
			)}

			{/* Recommendations */}
			{structured?.recommendations && (
				<div>
					<p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
						Recommendations
					</p>
					<p className="text-sm">{structured.recommendations}</p>
				</div>
			)}

			<Separator />

			{/* Radiologist */}
			<div className="flex items-center gap-2">
				<FileText className="text-muted-foreground size-4" />
				<p className="text-muted-foreground text-xs">
					{structured?.radiologistName
						? `Reported by ${structured.radiologistName}`
						: "Radiologist not specified"}
					{structured?.reportedAt && ` · ${formatDate(structured.reportedAt)}`}
				</p>
			</div>
		</div>
	)
}

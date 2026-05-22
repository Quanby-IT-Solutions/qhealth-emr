"use client"

import { Clock, FileText } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Separator } from "@/core/components/ui/separator"

interface ReportAttachment {
	id: string
	name: string
	size: number
	type: string
	uploadedAt: string
	dataUrl: string
}

interface StructuredReport {
	technique?: string
	findings?: string
	impression?: string
	recommendations?: string
	radiologistName?: string
	reportedAt?: string
	reportStatus?: "draft" | "signed"
	attachments?: ReportAttachment[]
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

function formatFileSize(bytes: number) {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function openAttachment(attachment: ReportAttachment) {
	window.open(attachment.dataUrl, "_blank", "noopener,noreferrer")
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
	const structuredIsReleased = !structured?.reportStatus || structured.reportStatus === "signed"
	const hasStructuredReport =
		structuredIsReleased &&
		(!!structured?.findings ||
			!!structured?.impression ||
			!!structured?.recommendations ||
			!!structured?.attachments?.length)
	const hasReport = !!report || hasStructuredReport

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
					<p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
						Clinical Indication
					</p>
					<p className="text-sm">{clinicalIndication}</p>
				</div>
			)}

			{/* Technique */}
			{structured?.technique && (
				<div>
					<p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
						Technique
					</p>
					<p className="text-sm">{structured.technique}</p>
				</div>
			)}

			{/* Findings */}
			{(structured?.findings ?? report) && (
				<div>
					<p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
						Findings
					</p>
					<p className="text-sm whitespace-pre-wrap">{structured?.findings ?? report}</p>
				</div>
			)}

			{/* Impression */}
			{structured?.impression && (
				<div>
					<p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
						Impression
					</p>
					<p className="bg-muted rounded-md p-3 text-sm font-medium">{structured.impression}</p>
				</div>
			)}

			{/* Recommendations */}
			{structured?.recommendations && (
				<div>
					<p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
						Recommendations
					</p>
					<p className="text-sm">{structured.recommendations}</p>
				</div>
			)}

			{structured?.attachments && structured.attachments.length > 0 && (
				<>
					<Separator />
					<div>
						<p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
							Attachments
						</p>
						<div className="space-y-2">
							{structured.attachments.map(attachment => (
								<div
									key={attachment.id}
									className="bg-background flex items-center justify-between gap-3 rounded-md border px-3 py-2"
								>
									<div className="min-w-0">
										<p className="truncate text-sm font-medium">{attachment.name}</p>
										<p className="text-muted-foreground text-xs">
											{formatFileSize(attachment.size)}
										</p>
									</div>
									<Button variant="outline" size="sm" onClick={() => openAttachment(attachment)}>
										Open
									</Button>
								</div>
							))}
						</div>
					</div>
				</>
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

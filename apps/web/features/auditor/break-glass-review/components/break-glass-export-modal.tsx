"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"

import { useAuditLogExportMutation } from "@/features/auditor/audit-log/api/audit-log.hooks"

interface BreakGlassExportModalProps {
	open: boolean
	onClose: () => void
	facilityId: string
}

export function BreakGlassExportModal({ open, onClose, facilityId }: BreakGlassExportModalProps) {
	const [format, setFormat] = useState<"csv" | "pdf">("pdf")
	const [startDate, setStartDate] = useState("")
	const [endDate, setEndDate] = useState("")
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

	const exportMutation = useAuditLogExportMutation()

	function handleGenerate() {
		setDownloadUrl(null)
		exportMutation.mutate(
			{
				facilityId,
				format,
				startDate: startDate || undefined,
				endDate: endDate || undefined,
				// Filter to break-glass review audit trail
				resourceType: "break_glass_review",
			},
			{
				onSuccess: result => {
					if (result && typeof result === "object" && "contentHash" in result) {
						setDownloadUrl(`/api/v1/auditor/exports/${result.contentHash}`)
					}
				},
			}
		)
	}

	function handleClose() {
		setDownloadUrl(null)
		onClose()
	}

	return (
		<Dialog open={open} onOpenChange={o => !o && handleClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Export Break-Glass DPA Report</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-1">
						<Label>Format</Label>
						<Select value={format} onValueChange={v => setFormat(v as "csv" | "pdf")}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="pdf">PDF — DPA compliance file</SelectItem>
								<SelectItem value="csv">CSV — Raw data</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<Label>From</Label>
							<Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
						</div>
						<div className="space-y-1">
							<Label>To</Label>
							<Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
						</div>
					</div>

					<div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
						Export includes all break-glass access events and reviewer decisions. File is hashed (sha256) and stored for authenticity verification per DPA requirements.
					</div>

					{downloadUrl && (
						<div className="rounded-md border bg-green-50 p-3 text-sm dark:bg-green-900/20">
							<p className="mb-1 font-semibold text-green-800 dark:text-green-300">Export ready</p>
							<a
								href={downloadUrl}
								className="font-mono text-xs underline"
								download
							>
								{downloadUrl}
							</a>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={handleClose} disabled={exportMutation.isPending}>
						Close
					</Button>
					<Button onClick={handleGenerate} disabled={exportMutation.isPending}>
						{exportMutation.isPending ? "Generating..." : "Generate Export"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

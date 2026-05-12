"use client"

import { useState } from "react"

import type { AuditorEventListFilter } from "@repo/contracts"

import { Button } from "@/core/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"

import { useAuditLogExportMutation } from "@/features/auditor/audit-log/api/audit-log.hooks"

interface ExportModalProps {
	open: boolean
	onClose: () => void
	facilityId: string
	currentFilters: AuditorEventListFilter
}

export function ExportModal({ open, onClose, facilityId, currentFilters }: ExportModalProps) {
	const [format, setFormat] = useState<"csv" | "pdf">("csv")
	const [startDate, setStartDate] = useState(currentFilters.startDate ?? "")
	const [endDate, setEndDate] = useState(currentFilters.endDate ?? "")

	const exportMutation = useAuditLogExportMutation()

	function handleGenerate() {
		exportMutation.mutate(
			{
				facilityId,
				format,
				startDate: startDate || undefined,
				endDate: endDate || undefined,
				userId: currentFilters.userId,
				action: currentFilters.action,
				severity: currentFilters.severity,
				outcome: currentFilters.outcome,
				resourceType: currentFilters.resourceType,
			},
			{
				onSuccess: () => onClose(),
			}
		)
	}

	return (
		<Dialog open={open} onOpenChange={open => !open && onClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Export Audit Log</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-1">
						<Label>Format</Label>
						<Select value={format} onValueChange={v => setFormat(v as "csv" | "pdf")}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="csv">CSV — Raw data</SelectItem>
								<SelectItem value="pdf">PDF — Compliance file</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<Label>From</Label>
							<Input
								type="date"
								value={startDate}
								onChange={e => setStartDate(e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label>To</Label>
							<Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
						</div>
					</div>

					{/* Filter snapshot */}
					<div className="rounded-md border bg-muted/40 p-3 text-xs">
						<p className="mb-1 font-semibold text-muted-foreground">Active filters included</p>
						{currentFilters.userId && <p>User: {currentFilters.userId}</p>}
						{currentFilters.action && <p>Action: {currentFilters.action}</p>}
						{currentFilters.severity && <p>Severity: {currentFilters.severity}</p>}
						{currentFilters.outcome && <p>Outcome: {currentFilters.outcome}</p>}
						{currentFilters.resourceType && <p>Resource type: {currentFilters.resourceType}</p>}
						{!currentFilters.userId &&
							!currentFilters.action &&
							!currentFilters.severity &&
							!currentFilters.outcome &&
							!currentFilters.resourceType && (
								<p className="text-muted-foreground">No active filters — exporting all records</p>
							)}
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={exportMutation.isPending}>
						Cancel
					</Button>
					<Button onClick={handleGenerate} disabled={exportMutation.isPending}>
						{exportMutation.isPending ? "Generating..." : "Generate Export"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

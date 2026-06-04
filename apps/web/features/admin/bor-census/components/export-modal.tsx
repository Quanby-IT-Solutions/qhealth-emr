"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"

interface ExportModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	defaultTitle?: string
}

export function ExportModal({ open, onOpenChange, defaultTitle = "BOR Report" }: ExportModalProps) {
	const [format, setFormat] = useState<"csv" | "pdf">("csv")
	const [dateFrom, setDateFrom] = useState("")
	const [dateTo, setDateTo] = useState("")
	const [ward, setWard] = useState("all")
	const [isExporting, setIsExporting] = useState(false)

	function reset() {
		setFormat("csv")
		setDateFrom("")
		setDateTo("")
		setWard("all")
	}

	async function handleExport() {
		if (!dateFrom || !dateTo) {
			toast.error("Select a date range before exporting.")
			return
		}
		setIsExporting(true)
		try {
			// Wire to admin.bor.export endpoint once ADM-BE-06 is complete
			await new Promise(r => setTimeout(r, 500))
			toast.success(`${defaultTitle} exported as ${format.toUpperCase()}.`)
			onOpenChange(false)
			reset()
		} catch {
			toast.error("Export failed.")
		} finally {
			setIsExporting(false)
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={open => {
				if (!open) reset()
				onOpenChange(open)
			}}
		>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Export {defaultTitle}</DialogTitle>
					<DialogDescription>Choose format and date range for the export.</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-1.5">
						<Label>Format</Label>
						<Select
							value={format}
							onValueChange={v => {
								if (v) setFormat(v as "csv" | "pdf")
							}}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="csv">CSV</SelectItem>
								<SelectItem value="pdf">PDF</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label>Date range</Label>
						<div className="flex items-center gap-2">
							<Input
								type="date"
								value={dateFrom}
								onChange={e => setDateFrom(e.target.value)}
								className="w-full"
							/>
							<span className="text-muted-foreground shrink-0 text-sm">to</span>
							<Input
								type="date"
								value={dateTo}
								onChange={e => setDateTo(e.target.value)}
								className="w-full"
							/>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label>Ward scope</Label>
						<Select
							value={ward}
							onValueChange={v => {
								if (v) setWard(v)
							}}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Wards</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
						Cancel
					</Button>
					<Button onClick={handleExport} disabled={isExporting || !dateFrom || !dateTo}>
						{isExporting ? "Exporting..." : "Export"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

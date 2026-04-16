"use client"

import { Badge } from "@/core/components/ui/badge"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Separator } from "@/core/components/ui/separator"
import { type LabOrder } from "@/features/lab/api/lab.hooks"

import { CriticalValueAlert, type CriticalValueItem } from "./critical-value-alert"
import { LabResultCard } from "./lab-result-card"

interface LabResultDetailProps {
	order: LabOrder | null
	open: boolean
	onOpenChange: (open: boolean) => void
}

function priorityBadge(priority: string) {
	switch (priority) {
		case "stat":
			return <Badge variant="destructive">STAT</Badge>
		case "urgent":
			return <Badge variant="secondary">Urgent</Badge>
		default:
			return <Badge variant="outline">Routine</Badge>
	}
}

function formatDateTime(d: string | null | undefined) {
	if (!d) return "—"
	return new Date(d).toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

export function LabResultDetail({ order, open, onOpenChange }: LabResultDetailProps) {
	if (!order) return null

	const results = order.results
	const criticalItems: CriticalValueItem[] =
		results?.items
			.filter((item) => item.isCritical)
			.map((item) => ({
				testName: item.testName,
				value: item.value,
				unit: item.unit,
				referenceRange: item.referenceRange,
			})) ?? []

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						Lab Result Detail
						{priorityBadge(order.priority)}
					</DialogTitle>
				</DialogHeader>

				{/* Patient & Order Info */}
				<div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-md border p-4 text-sm">
					<div>
						<span className="text-muted-foreground">Patient</span>
						<p className="font-medium">{order.patientName ?? "—"}</p>
					</div>
					<div>
						<span className="text-muted-foreground">Test / Panel</span>
						<p className="font-medium">
							{order.panelName ?? order.testName}
						</p>
					</div>
					<div>
						<span className="text-muted-foreground">Ordered By</span>
						<p className="font-medium">{order.orderingStaffName ?? "—"}</p>
					</div>
					<div>
						<span className="text-muted-foreground">Ordered At</span>
						<p className="font-medium">{formatDateTime(order.createdAt)}</p>
					</div>
					<div>
						<span className="text-muted-foreground">Specimen Type</span>
						<p className="font-medium">{order.specimenType ?? "—"}</p>
					</div>
					<div>
						<span className="text-muted-foreground">Collection Time</span>
						<p className="font-medium">
							{formatDateTime(order.collectionDatetime)}
						</p>
					</div>
					{results?.reportedBy && (
						<>
							<div>
								<span className="text-muted-foreground">Reported By</span>
								<p className="font-medium">{results.reportedBy}</p>
							</div>
							<div>
								<span className="text-muted-foreground">Reported At</span>
								<p className="font-medium">
									{formatDateTime(results.reportedAt)}
								</p>
							</div>
						</>
					)}
				</div>

				{/* Critical Value Alert */}
				{criticalItems.length > 0 && (
					<CriticalValueAlert items={criticalItems} />
				)}

				{/* Results */}
				{results && results.items.length > 0 ? (
					<div className="space-y-2">
						<p className="text-sm font-medium text-muted-foreground">
							Results ({results.items.length})
						</p>
						{results.items.map((item, i) => (
							<LabResultCard key={i} item={item} />
						))}
					</div>
				) : (
					<p className="py-6 text-center text-sm text-muted-foreground">
						{order.status === "completed"
							? "No structured results available."
							: "Results pending."}
					</p>
				)}

				{/* Comments */}
				{results?.comments && (
					<>
						<Separator />
						<div className="text-sm">
							<span className="font-medium text-muted-foreground">
								Lab Comments:
							</span>
							<p className="mt-1">{results.comments}</p>
						</div>
					</>
				)}
			</DialogContent>
		</Dialog>
	)
}

"use client"

import { Badge } from "@/core/components/ui/badge"
import { cn } from "@/core/lib/utils"
import {
	getFaceScanResultItems,
	type FaceScanResultItem,
	type FaceScanVitals,
} from "@/features/face-scan/lib/face-scan-vitals"

function ResultMetric({ item }: { item: FaceScanResultItem }) {
	return (
		<div
			className={cn(
				"bg-muted/30 border-border/60 flex min-w-0 flex-col gap-1 rounded-lg border px-3 py-2.5",
				item.source === "setup" && "border-dashed"
			)}
		>
			<div className="flex items-center justify-between gap-2">
				<p className="text-muted-foreground text-xs font-medium">{item.label}</p>
				{item.source === "setup" ? (
					<Badge variant="outline" className="text-muted-foreground h-5 px-1.5 text-[10px]">
						Setup
					</Badge>
				) : null}
			</div>
			<p className="text-foreground text-xl font-semibold tracking-tight break-words tabular-nums">
				{item.value}
				{item.unit ? (
					<span className="text-muted-foreground ml-1 text-sm font-normal">{item.unit}</span>
				) : null}
			</p>
		</div>
	)
}

interface FaceScanResultsProps {
	vitals: FaceScanVitals
	className?: string
}

export function FaceScanResults({ vitals, className }: FaceScanResultsProps) {
	const items = getFaceScanResultItems(vitals)

	if (items.length === 0) {
		return (
			<p className={cn("text-muted-foreground text-sm", className)}>
				No measurements were returned from this scan.
			</p>
		)
	}

	const cameraItems = items.filter(item => item.source === "camera")
	const setupItems = items.filter(item => item.source === "setup")

	return (
		<div className={cn("space-y-4", className)}>
			{cameraItems.length > 0 ? (
				<div className="space-y-2">
					<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
						Camera estimates
					</p>
					<div className="grid gap-2.5 sm:grid-cols-2">
						{cameraItems.map(item => (
							<ResultMetric key={item.id} item={item} />
						))}
					</div>
				</div>
			) : null}

			{setupItems.length > 0 ? (
				<div className="space-y-2">
					<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
						From setup
					</p>
					<div className="grid gap-2.5 sm:grid-cols-2">
						{setupItems.map(item => (
							<ResultMetric key={item.id} item={item} />
						))}
					</div>
				</div>
			) : null}
		</div>
	)
}

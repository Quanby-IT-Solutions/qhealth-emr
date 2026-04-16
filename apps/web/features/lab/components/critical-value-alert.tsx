"use client"

import { AlertCircle, X } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { cn } from "@/core/lib/utils"

export interface CriticalValueItem {
	testName: string
	value: string | number
	unit: string
	referenceRange: string | null
}

interface CriticalValueAlertProps {
	items: CriticalValueItem[]
	onAcknowledge?: () => void
	className?: string
}

export function CriticalValueAlert({
	items,
	onAcknowledge,
	className,
}: CriticalValueAlertProps) {
	if (items.length === 0) return null

	return (
		<div
			className={cn(
				"flex items-start gap-3 rounded-md border border-destructive bg-destructive/10 p-4 text-destructive dark:bg-destructive/20",
				className,
			)}
		>
			<AlertCircle className="mt-0.5 size-5 shrink-0" />
			<div className="flex-1">
				<p className="font-semibold">
					Critical Lab Value{items.length > 1 ? "s" : ""} Detected
				</p>
				<ul className="mt-1 space-y-0.5 text-sm">
					{items.map((item, i) => (
						<li key={i}>
							<span className="font-medium">{item.testName}</span>:{" "}
							<span className="font-bold">
								{String(item.value)} {item.unit}
							</span>
							{item.referenceRange && (
								<span className="ml-1 opacity-75">
									(Ref: {item.referenceRange})
								</span>
							)}
						</li>
					))}
				</ul>
				<p className="mt-1 text-xs opacity-75">
					Immediate clinical action required. Notify attending physician.
				</p>
			</div>
			{onAcknowledge && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="shrink-0 text-destructive hover:bg-destructive/20 hover:text-destructive"
					onClick={onAcknowledge}
				>
					<X className="size-4" />
					<span className="sr-only">Acknowledge</span>
				</Button>
			)}
		</div>
	)
}

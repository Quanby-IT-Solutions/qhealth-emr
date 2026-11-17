"use client"

import { Alert02FreeIcons, MinusSignIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { cn } from "@/core/lib/utils"
import type { ScanState } from "@/features/face-scan/lib/insight-genie-adapter"

type GuideStatus = "ok" | "issue" | "neutral"

interface GuideItem {
	id: string
	label: string
	hint: string
	status: GuideStatus
}

interface FaceScanGuidePanelProps {
	scanState: ScanState
	conditionStatus: {
		centered?: boolean
		lighting?: boolean
		tooMuchMovement?: boolean
		analyzing?: boolean
	} | null
	scanTimeRemaining: number | null
	className?: string
}

function GuideRow({ item }: { item: GuideItem }) {
	const icon =
		item.status === "ok" ? Tick02Icon : item.status === "issue" ? Alert02FreeIcons : MinusSignIcon

	return (
		<div className="flex gap-3">
			<div
				className={cn(
					"mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
					item.status === "ok" && "bg-success/15 text-success",
					item.status === "issue" && "bg-destructive/10 text-destructive",
					item.status === "neutral" && "bg-muted text-muted-foreground"
				)}
			>
				<HugeiconsIcon icon={icon} className="size-3.5" strokeWidth={2} />
			</div>
			<div className="min-w-0 space-y-0.5">
				<p
					className={cn(
						"text-sm font-medium",
						item.status === "neutral" && "text-muted-foreground"
					)}
				>
					{item.label}
				</p>
				<p className="text-muted-foreground text-xs leading-relaxed">{item.hint}</p>
			</div>
		</div>
	)
}

function liveStatus(value: boolean | undefined): GuideStatus {
	if (value === true) return "ok"
	if (value === false) return "issue"
	return "neutral"
}

export function FaceScanGuidePanel({
	scanState,
	conditionStatus,
	scanTimeRemaining,
	className,
}: FaceScanGuidePanelProps) {
	const isAnalyzing = scanState === "analyzing" || conditionStatus?.analyzing
	const hasLiveStatus = scanState === "positioning" || scanState === "analyzing"
	const hasConditionFeedback = conditionStatus != null

	const items: GuideItem[] = hasLiveStatus
		? [
				{
					id: "lighting",
					label: "Lighting",
					hint: hasConditionFeedback
						? "Use a well-lit room. Avoid strong backlight from windows."
						: "Waiting for camera feedback…",
					status: liveStatus(conditionStatus?.lighting),
				},
				{
					id: "centered",
					label: "Face position",
					hint: hasConditionFeedback
						? "Keep your face centered inside the outline on camera."
						: "Waiting for camera feedback…",
					status: liveStatus(conditionStatus?.centered),
				},
				{
					id: "still",
					label: "Stay still",
					hint: isAnalyzing
						? "Hold still until the scan finishes."
						: "Avoid moving while positioning your face.",
					status: isAnalyzing ? liveStatus(conditionStatus?.tooMuchMovement === false) : "neutral",
				},
			]
		: [
				{
					id: "lighting",
					label: "Lighting",
					hint: "Use a well-lit room. Avoid strong backlight from windows.",
					status: "neutral",
				},
				{
					id: "centered",
					label: "Face position",
					hint: "Keep your face centered inside the outline on camera.",
					status: "neutral",
				},
				{
					id: "still",
					label: "Stay still",
					hint: "Hold still for the full countdown once the scan starts.",
					status: "neutral",
				},
			]

	return (
		<aside className={cn("bg-muted/30 flex min-h-0 flex-col gap-4 overflow-y-auto p-5", className)}>
			<div>
				<p className="text-sm font-medium">Before you scan</p>
				<p className="text-muted-foreground mt-1 text-xs leading-relaxed">
					Estimates from the camera are for triage support only. Always review values before saving
					to the chart.
				</p>
			</div>

			{scanTimeRemaining != null && (
				<div className="bg-background ring-foreground/10 rounded-lg px-3 py-2.5 ring-1">
					<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
						Time remaining
					</p>
					<p className="text-primary mt-0.5 text-2xl font-semibold tabular-nums">
						{scanTimeRemaining}s
					</p>
				</div>
			)}

			<div className="space-y-4">
				{items.map(item => (
					<GuideRow key={item.id} item={item} />
				))}
			</div>

			<Alert className="border-border/80 bg-background/80 mt-auto">
				<HugeiconsIcon icon={Alert02FreeIcons} />
				<AlertTitle>Clinical disclaimer</AlertTitle>
				<AlertDescription>
					Camera vitals are estimates, not a diagnosis. Confirm with manual measurement when needed.
				</AlertDescription>
			</Alert>
		</aside>
	)
}

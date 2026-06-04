"use client"

import { cn } from "@/core/lib/utils"

export type ClaimStatus = "draft" | "submitted" | "returned" | "resubmitted" | "paid"

interface TimelineStep {
	status: ClaimStatus
	label: string
	timestamp?: string | null
}

const STEPS: TimelineStep[] = [
	{ status: "draft", label: "Draft" },
	{ status: "submitted", label: "Submitted" },
	{ status: "returned", label: "Returned" },
	{ status: "resubmitted", label: "Resubmitted" },
	{ status: "paid", label: "Paid" },
]

const STATUS_ORDER: Record<ClaimStatus, number> = {
	draft: 0,
	submitted: 1,
	returned: 2,
	resubmitted: 3,
	paid: 4,
}

interface ClaimStatusTimelineProps {
	currentStatus: ClaimStatus
	/** Optional map of status → ISO timestamp string */
	timestamps?: Partial<Record<ClaimStatus, string | null>>
	/** Resubmission count badge shown on resubmitted step */
	resubmitCount?: number
	className?: string
}

function formatTimestamp(ts: string): string {
	return new Date(ts).toLocaleString("en-PH", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

export function ClaimStatusTimeline({
	currentStatus,
	timestamps = {},
	resubmitCount,
	className,
}: ClaimStatusTimelineProps) {
	const currentOrder = STATUS_ORDER[currentStatus]

	return (
		<nav aria-label="Claim status timeline" className={cn("w-full", className)}>
			<ol className="flex items-start gap-0 overflow-x-auto">
				{STEPS.map((step, idx) => {
					const stepOrder = STATUS_ORDER[step.status]
					const isCompleted = stepOrder < currentOrder
					const isActive = step.status === currentStatus
					const ts = timestamps[step.status]

					return (
						<li key={step.status} className="flex min-w-[80px] flex-1 flex-col items-center">
							<div className="flex w-full items-center">
								{/* Left connector */}
								<div
									className={cn(
										"h-0.5 flex-1",
										idx === 0 ? "invisible" : isCompleted || isActive ? "bg-primary" : "bg-muted"
									)}
									aria-hidden
								/>

								{/* Step dot */}
								<div
									className={cn(
										"flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
										isCompleted
											? "border-primary bg-primary text-primary-foreground"
											: isActive
												? "border-primary bg-background text-primary"
												: "border-muted bg-background text-muted-foreground"
									)}
									aria-current={isActive ? "step" : undefined}
								>
									{isCompleted ? "✓" : idx + 1}
								</div>

								{/* Right connector */}
								<div
									className={cn(
										"h-0.5 flex-1",
										idx === STEPS.length - 1 ? "invisible" : isCompleted ? "bg-primary" : "bg-muted"
									)}
									aria-hidden
								/>
							</div>

							{/* Step label + timestamp */}
							<div className="mt-1 flex flex-col items-center gap-0.5 px-1 text-center">
								<span
									className={cn(
										"text-xs leading-tight font-medium",
										isActive
											? "text-foreground"
											: isCompleted
												? "text-muted-foreground"
												: "text-muted-foreground/60"
									)}
								>
									{step.label}
									{step.status === "resubmitted" && resubmitCount && resubmitCount > 0 && (
										<span className="ml-1 rounded-full bg-amber-100 px-1 text-[10px] text-amber-700">
											×{resubmitCount}
										</span>
									)}
								</span>
								{ts && (
									<span className="text-muted-foreground text-[10px]">{formatTimestamp(ts)}</span>
								)}
							</div>
						</li>
					)
				})}
			</ol>
		</nav>
	)
}

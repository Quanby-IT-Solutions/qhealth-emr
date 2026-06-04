"use client"

import { useState } from "react"

import { Card, CardContent } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { useSlaBottleneckQuery } from "@/features/sla/api/sla-orpc.hooks"

interface BottleneckAnalysisPageProps {
	workflowId: string
}

const WORKFLOW_LABELS: Record<string, string> = {
	"opd-triage": "OPD Triage",
	"lab-results": "Lab Results",
	"radiology": "Radiology",
	"admission": "Admission",
	"discharge": "Discharge",
	"emergency": "Emergency",
	"pharmacy": "Pharmacy Dispensing",
}

export function BottleneckAnalysisPage({ workflowId }: BottleneckAnalysisPageProps) {
	const facilityId = useActiveFacilityId()
	const [dateFrom, setDateFrom] = useState("")
	const [dateTo, setDateTo] = useState("")
	const [selectedStep, setSelectedStep] = useState<string | null>(null)

	const hasDateRange = !!dateFrom && !!dateTo
	const { data, isLoading } = useSlaBottleneckQuery(
		{
			facilityId: facilityId ?? "",
			workflowType: workflowId,
			startDate: dateFrom,
			endDate: dateTo,
		},
		!!facilityId && hasDateRange
	)

	const steps = data?.steps ?? []
	const label = WORKFLOW_LABELS[workflowId] ?? workflowId
	const maxMedian = steps.length > 0 ? Math.max(...steps.map(s => s.medianMinutes)) : 1

	return (
		<div className="space-y-4">
			<h2 className="text-lg font-medium">{label} Bottleneck Analysis</h2>

			<div className="space-y-1">
				<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
					Date range
				</p>
				<div className="flex items-center gap-2">
					<Input
						type="date"
						value={dateFrom}
						onChange={e => setDateFrom(e.target.value)}
						className="w-40"
					/>
					<span className="text-muted-foreground text-sm">to</span>
					<Input
						type="date"
						value={dateTo}
						onChange={e => setDateTo(e.target.value)}
						className="w-40"
					/>
				</div>
			</div>

			{!hasDateRange && (
				<p className="text-muted-foreground py-4 text-center text-sm">
					Select a date range to load bottleneck data.
				</p>
			)}

			{hasDateRange && isLoading && <Skeleton className="h-64 w-full" />}

			{hasDateRange && !isLoading && steps.length === 0 && (
				<p className="text-muted-foreground py-8 text-center text-sm">
					No bottleneck data available for this period.
				</p>
			)}

			{hasDateRange && !isLoading && steps.length > 0 && (
				<div className="space-y-2">
					{steps.map(step => {
						const barPct = (step.medianMinutes / maxMedian) * 100
						const p95Pct = (step.p95Minutes / maxMedian) * 100
						const isBottleneck = step.medianMinutes === maxMedian
						const isSelected = selectedStep === step.stepType
						const outlierCount = step.outlierEncounterIds.length

						return (
							<Card
								key={step.stepType}
								className={`cursor-pointer transition-colors ${isBottleneck ? "border-amber-400" : ""} ${isSelected ? "ring-primary ring-2" : ""}`}
								onClick={() => setSelectedStep(s => (s === step.stepType ? null : step.stepType))}
							>
								<CardContent className="py-3">
									<div className="mb-2 flex items-center justify-between">
										<span className="text-sm font-medium">{step.stepLabel}</span>
										<div className="text-muted-foreground flex gap-4 text-xs">
											<span>Median: {step.medianMinutes}m</span>
											<span>P95: {step.p95Minutes}m</span>
											{outlierCount > 0 && (
												<Tooltip>
													<TooltipTrigger className="cursor-help text-amber-600">
														{outlierCount} outlier{outlierCount !== 1 ? "s" : ""}
													</TooltipTrigger>
													<TooltipContent>
														Outliers = encounters with step duration &gt;P95 ({step.p95Minutes}m)
													</TooltipContent>
												</Tooltip>
											)}
										</div>
									</div>
									<div className="bg-muted relative h-3 overflow-hidden rounded-full">
										<div
											className="bg-primary/60 absolute h-full rounded-full"
											style={{ width: `${barPct}%` }}
										/>
										<div
											className="bg-destructive/70 absolute h-full w-0.5"
											style={{ left: `${p95Pct}%` }}
										/>
									</div>
								</CardContent>
							</Card>
						)
					})}
					<p className="text-muted-foreground text-xs">
						Bar = median duration. Red line = P95 duration. Amber border = bottleneck step. Click a
						step to filter encounters.
					</p>
					{selectedStep && (
						<p className="text-muted-foreground text-sm">
							Filtering encounters that breached at:{" "}
							<span className="font-medium">
								{steps.find(s => s.stepType === selectedStep)?.stepLabel ?? selectedStep}
							</span>
						</p>
					)}
				</div>
			)}
		</div>
	)
}

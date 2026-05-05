"use client"

import { Badge } from "@/core/components/ui/badge"
import { cn } from "@/core/lib/utils"
import { useChartContext } from "@/features/encounters/context/chart-context"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	active: "default",
	discharged: "secondary",
	closed: "outline",
	cancelled: "destructive",
}

function maskName(name: string): string {
	const parts = name.trim().split(" ")
	return parts
		.map((part, i) => (i === 0 ? part[0] + "*".repeat(Math.max(part.length - 1, 1)) : part[0] + "***"))
		.join(" ")
}

const CEWS_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	active: "default",
	lapsed: "destructive",
	suspended: "destructive",
}

interface EncounterContextBarProps {
	/** When true, patient name is masked per DPA requirements */
	dpaFlag?: boolean
	/** DRG code to display once mapping is confirmed */
	drgCode?: string
	/** eSOA version number to show once issued */
	esoaVersion?: number
	/** eSOA generation timestamp to show once issued */
	esoaGeneratedAt?: string | Date | null
	/** Saved CEWS eligibility status from latest snapshot */
	cewsStatus?: string | null
	className?: string
}

export function EncounterContextBar({ dpaFlag = false, drgCode, esoaVersion, esoaGeneratedAt, cewsStatus, className }: EncounterContextBarProps) {
	const { encounter, isLoading } = useChartContext()

	if (isLoading) {
		return (
			<div
				className={cn("sticky top-0 z-10 border-b bg-background px-4 py-2", className)}
				aria-busy="true"
				aria-label="Loading encounter context"
			>
				<div className="h-5 w-72 animate-pulse rounded bg-muted" />
			</div>
		)
	}

	if (!encounter) return null

	const displayName = dpaFlag ? maskName(encounter.patientName) : encounter.patientName

	return (
		<div
			className={cn(
				"sticky top-0 z-10 border-b bg-background/95 px-4 py-2 backdrop-blur-sm",
				className
			)}
			aria-label="Encounter context"
		>
			{/* Full layout ≥768px */}
			<div className="hidden items-center gap-x-4 gap-y-1 sm:flex sm:flex-wrap">
				<div className="flex items-center gap-2">
					<span className="font-semibold text-sm">{displayName}</span>
					{dpaFlag && (
						<Badge variant="outline" className="text-xs">
							DPA
						</Badge>
					)}
				</div>

				<span className="text-muted-foreground text-xs">MRN: {encounter.patientMrn}</span>

				<Badge variant="outline" className="capitalize text-xs">
					{encounter.encounterType}
				</Badge>

				<Badge variant={STATUS_VARIANT[encounter.status] ?? "secondary"} className="capitalize text-xs">
					{encounter.status}
				</Badge>

				{encounter.wardName && (
					<span className="text-muted-foreground text-xs">
						{encounter.wardName}
						{encounter.bedNumber ? ` / Bed ${encounter.bedNumber}` : ""}
					</span>
				)}

				{drgCode && (
					<Badge variant="outline" className="font-mono text-xs">
						DRG: {drgCode}
					</Badge>
				)}

				{esoaVersion != null && (
					<span className="text-muted-foreground text-xs">
						eSOA v{esoaVersion}
						{esoaGeneratedAt && ` · ${new Date(esoaGeneratedAt).toLocaleDateString("en-PH")}`}
					</span>
				)}

				{cewsStatus && (
					<Badge variant={CEWS_STATUS_VARIANT[cewsStatus.toLowerCase()] ?? "outline"} className="capitalize text-xs">
						CEWS: {cewsStatus}
					</Badge>
				)}
			</div>

			{/* Collapsed single-line <768px */}
			<div className="flex items-center gap-2 sm:hidden">
				<span className="truncate font-semibold text-sm">{displayName}</span>
				<span className="text-muted-foreground text-xs shrink-0">· {encounter.patientMrn}</span>
				<Badge variant={STATUS_VARIANT[encounter.status] ?? "secondary"} className="capitalize text-xs shrink-0">
					{encounter.status}
				</Badge>
			</div>
		</div>
	)
}

"use client"

import { Badge } from "@/core/components/ui/badge"
import { cn } from "@/core/lib/utils"
import { useEncounterDetailQuery } from "@/features/encounters/api/encounters.hooks"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	active: "default",
	discharged: "secondary",
	closed: "outline",
	cancelled: "destructive",
}

interface HimEncounterContextBarProps {
	encounterId: string
	className?: string
}

export function HimEncounterContextBar({ encounterId, className }: HimEncounterContextBarProps) {
	const { data: encounter, isLoading } = useEncounterDetailQuery(encounterId)

	if (isLoading) {
		return (
			<div
				className={cn("bg-background sticky top-0 z-10 border-b px-4 py-2", className)}
				aria-busy="true"
				aria-label="Loading encounter context"
			>
				<div className="bg-muted h-5 w-72 animate-pulse rounded" />
			</div>
		)
	}

	if (!encounter) return null

	return (
		<div
			className={cn(
				"bg-background/95 sticky top-0 z-10 border-b px-4 py-2 backdrop-blur-sm",
				className
			)}
			aria-label="Encounter context"
		>
			<div className="flex flex-wrap items-center gap-x-4 gap-y-1">
				<span className="text-sm font-semibold">{encounter.patientName}</span>
				<span className="text-muted-foreground text-xs">MRN: {encounter.patientMrn}</span>
				<Badge variant="outline" className="text-xs capitalize">
					{encounter.encounterType}
				</Badge>
				<Badge
					variant={STATUS_VARIANT[encounter.status] ?? "secondary"}
					className="text-xs capitalize"
				>
					{encounter.status}
				</Badge>
				{encounter.wardName && (
					<span className="text-muted-foreground text-xs">
						{encounter.wardName}
						{encounter.bedNumber ? ` / Bed ${encounter.bedNumber}` : ""}
					</span>
				)}
			</div>
		</div>
	)
}

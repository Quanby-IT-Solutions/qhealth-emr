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
				className={cn("sticky top-0 z-10 border-b bg-background px-4 py-2", className)}
				aria-busy="true"
				aria-label="Loading encounter context"
			>
				<div className="h-5 w-72 animate-pulse rounded bg-muted" />
			</div>
		)
	}

	if (!encounter) return null

	return (
		<div
			className={cn(
				"sticky top-0 z-10 border-b bg-background/95 px-4 py-2 backdrop-blur-sm",
				className
			)}
			aria-label="Encounter context"
		>
			<div className="flex flex-wrap items-center gap-x-4 gap-y-1">
				<span className="text-sm font-semibold">{encounter.patientName}</span>
				<span className="text-xs text-muted-foreground">MRN: {encounter.patientMrn}</span>
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
					<span className="text-xs text-muted-foreground">
						{encounter.wardName}
						{encounter.bedNumber ? ` / Bed ${encounter.bedNumber}` : ""}
					</span>
				)}
			</div>
		</div>
	)
}

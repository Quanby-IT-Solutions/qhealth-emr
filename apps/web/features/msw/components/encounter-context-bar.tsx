"use client"

import { ChevronRight, User } from "lucide-react"

import { cn } from "@/core/lib/utils"

interface EncounterContextBarProps {
	patientName?: string
	mrn?: string
	encounterId: string
	className?: string
}

export function EncounterContextBar({
	patientName,
	mrn,
	encounterId,
	className,
}: EncounterContextBarProps) {
	return (
		<div
			className={cn(
				"bg-muted/40 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm",
				className
			)}
		>
			<User className="text-muted-foreground size-4 shrink-0" />
			<span className="font-medium">{patientName ?? "Patient"}</span>
			{mrn && <span className="text-muted-foreground">· MRN {mrn}</span>}
			<ChevronRight className="text-muted-foreground size-3.5" />
			<span className="text-muted-foreground">Encounter</span>
			<code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
				{encounterId.slice(0, 8)}
			</code>
		</div>
	)
}

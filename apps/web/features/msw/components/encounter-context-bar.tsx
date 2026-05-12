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
				"flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-2.5 text-sm",
				className
			)}
		>
			<User className="size-4 shrink-0 text-muted-foreground" />
			<span className="font-medium">{patientName ?? "Patient"}</span>
			{mrn && <span className="text-muted-foreground">· MRN {mrn}</span>}
			<ChevronRight className="size-3.5 text-muted-foreground" />
			<span className="text-muted-foreground">Encounter</span>
			<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
				{encounterId.slice(0, 8)}
			</code>
		</div>
	)
}

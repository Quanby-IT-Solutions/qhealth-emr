"use client"

import { ShieldAlert } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"

interface TraumaAliasBadgeProps {
	alias: string
	acuityLevel?: number | null
	/** Extra Tailwind classes */
	className?: string
}

/**
 * Visual indicator shown on Pre-Encounter patients who bypassed
 * registration and received an auto-generated Trauma Alias MRN.
 */
export function TraumaAliasBadge({ alias, acuityLevel, className = "" }: TraumaAliasBadgeProps) {
	const isCritical = acuityLevel !== null && acuityLevel !== undefined && acuityLevel <= 2

	return (
		<Badge
			variant="outline"
			className={`gap-1 border-orange-400 bg-orange-50 text-orange-700 dark:border-orange-600 dark:bg-orange-950/40 dark:text-orange-400 ${isCritical ? "border-red-500 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-950/40 dark:text-red-400" : ""} ${className}`}
		>
			<ShieldAlert className="size-3" />
			{alias}
		</Badge>
	)
}

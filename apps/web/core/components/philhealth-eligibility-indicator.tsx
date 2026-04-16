"use client"

import { cn } from "@/core/lib/utils"

import { Badge } from "./ui/badge"
import { Skeleton } from "./ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"

type PhilHealthStatus = "active" | "inactive" | "dependent" | "none" | "loading"

interface PhilHealthEligibilityIndicatorProps {
	status: PhilHealthStatus
	memberType?: string
	memberPin?: string
	className?: string
}

const STATUS_CONFIG: Record<
	Exclude<PhilHealthStatus, "loading">,
	{ label: string; description: string; className: string }
> = {
	active: {
		label: "PhilHealth Active",
		description: "Member is currently active and eligible for PhilHealth benefits.",
		className: "bg-green-100 text-green-800 border-green-200",
	},
	inactive: {
		label: "PhilHealth Inactive",
		description: "Member account is inactive. Benefits may not be available.",
		className: "bg-yellow-100 text-yellow-800 border-yellow-200",
	},
	dependent: {
		label: "PhilHealth Dependent",
		description: "Patient is covered as a dependent under a primary member.",
		className: "bg-blue-100 text-blue-800 border-blue-200",
	},
	none: {
		label: "No PhilHealth",
		description: "Patient is not enrolled in PhilHealth.",
		className: "bg-gray-100 text-gray-500 border-gray-200",
	},
}

export function PhilHealthEligibilityIndicator({
	status,
	memberType,
	memberPin,
	className,
}: PhilHealthEligibilityIndicatorProps) {
	if (status === "loading") {
		return <Skeleton className={cn("h-5 w-36 rounded-full", className)} />
	}

	const config = STATUS_CONFIG[status]
	const label = memberType
		? `PhilHealth · ${memberType}`
		: config.label

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger>
					<Badge
						variant="outline"
						className={cn("cursor-default text-xs font-medium", config.className, className)}
					>
						{label}
					</Badge>
				</TooltipTrigger>
				<TooltipContent side="top" className="max-w-xs text-xs">
					<p>{config.description}</p>
					{memberPin && (
						<p className="mt-1 font-mono font-semibold">PIN: {memberPin}</p>
					)}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}

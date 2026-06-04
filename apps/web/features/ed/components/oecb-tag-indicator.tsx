"use client"

import { HeartHandshake } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip"

interface OecbTagIndicatorProps {
	/** Whether the encounter is tagged as OECB-eligible */
	oecbEligible: boolean
	/** If true, shows nothing when oecbEligible is false */
	hideWhenIneligible?: boolean
}

/**
 * Badge displayed on the tracking board and encounter detail for non-admitted
 * ER cases that are eligible for the Outpatient Emergency Care Benefit (OECB).
 */
export function OecbTagIndicator({
	oecbEligible,
	hideWhenIneligible = false,
}: OecbTagIndicatorProps) {
	if (!oecbEligible) {
		if (hideWhenIneligible) return null
		return (
			<Badge variant="outline" className="text-muted-foreground gap-1">
				No OECB
			</Badge>
		)
	}

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Badge className="gap-1 bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600" />
				}
			>
				<HeartHandshake className="size-3" />
				OECB
			</TooltipTrigger>
			<TooltipContent>
				<p className="text-xs">Outpatient Emergency Care Benefit (PhilHealth)</p>
				<p className="text-muted-foreground text-xs">Patient is eligible for OECB billing.</p>
			</TooltipContent>
		</Tooltip>
	)
}

"use client"

import { AlertCircle, CheckCircle2, HelpCircle, Loader2 } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/core/components/ui/tooltip"

import { useCewsEligibilityQuery } from "../api/billing.hooks"

// Tooltip is a common shadcn/ui component; if not present, gracefully skip
// by wrapping in a plain span. We export two variants.

interface CewsEligibilityBadgeProps {
	patientId: string
}

export function CewsEligibilityBadge({ patientId }: CewsEligibilityBadgeProps) {
	const { data, isLoading, isError } = useCewsEligibilityQuery(patientId)

	if (isLoading) {
		return (
			<Badge variant="secondary" className="gap-1">
				<Loader2 className="size-3 animate-spin" />
				CEWS…
			</Badge>
		)
	}

	if (isError || !data) {
		return (
			<Badge variant="outline" className="text-muted-foreground gap-1">
				<HelpCircle className="size-3" />
				CEWS
			</Badge>
		)
	}

	if (data.isEligible === null) {
		return (
			<Badge variant="outline" className="text-muted-foreground gap-1">
				<HelpCircle className="size-3" />
				No Eligibility Check
			</Badge>
		)
	}

	const eligible = data.isEligible
	const tooltipLines = [
		data.message,
		data.benefitType ? `Benefit: ${data.benefitType}` : null,
		data.remainingCoverage !== null
			? `Remaining: ₱${data.remainingCoverage.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
			: null,
		data.lastCheckedAt ? `Checked: ${new Date(data.lastCheckedAt).toLocaleString("en-PH")}` : null,
	]
		.filter(Boolean)
		.join(" · ")

	const badge = eligible ? (
		<Badge variant="default" className="gap-1 bg-green-600 text-white hover:bg-green-700">
			<CheckCircle2 className="size-3" />
			PhilHealth Eligible
		</Badge>
	) : (
		<Badge variant="destructive" className="gap-1">
			<AlertCircle className="size-3" />
			Not Eligible
		</Badge>
	)

	if (!tooltipLines) return badge

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger render={badge} />
				<TooltipContent side="bottom" className="max-w-xs text-xs">
					{tooltipLines}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}

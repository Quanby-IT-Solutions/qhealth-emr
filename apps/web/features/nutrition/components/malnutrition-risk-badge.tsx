import { cn } from "@/core/lib/utils"
import type { MalnutritionRisk } from "@/features/nutrition/api/nutrition.hooks"

interface MalnutritionRiskBadgeProps {
	risk: MalnutritionRisk | null | undefined
	className?: string
}

const config: Record<MalnutritionRisk, { label: string; classes: string }> = {
	low: {
		label: "Low Risk",
		classes:
			"bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
	},
	moderate: {
		label: "Moderate Risk",
		classes:
			"bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
	},
	high: {
		label: "High Risk",
		classes:
			"bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
	},
}

export function MalnutritionRiskBadge({ risk, className }: MalnutritionRiskBadgeProps) {
	if (!risk) return null

	const { label, classes } = config[risk]

	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
				classes,
				className
			)}
		>
			{label}
		</span>
	)
}

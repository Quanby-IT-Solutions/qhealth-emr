import { cn } from "@/core/lib/utils"
import { STATUS_CLASSES, STATUS_LABELS, type StatusVariant } from "@/core/styles/status-tokens"

interface StatusBadgeProps {
	variant: StatusVariant
	label?: string
	className?: string
}

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
				STATUS_CLASSES[variant],
				className
			)}
		>
			{label ?? STATUS_LABELS[variant]}
		</span>
	)
}

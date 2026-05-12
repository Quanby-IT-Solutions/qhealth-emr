"use client"

import { Switch } from "@/core/components/ui/switch"
import { cn } from "@/core/lib/utils"

interface ToggleListItemProps {
	label: string
	description?: string
	checked: boolean
	onCheckedChange: (checked: boolean) => void
	disabled?: boolean
	lastChangedAt?: string
	lastChangedBy?: string
	scope?: "Staging" | "Production"
	className?: string
}

export function ToggleListItem({
	label,
	description,
	checked,
	onCheckedChange,
	disabled,
	lastChangedAt,
	lastChangedBy,
	scope,
	className,
}: ToggleListItemProps) {
	return (
		<div className={cn("flex items-center justify-between gap-4 py-3", className)}>
			<div className="min-w-0 flex-1 space-y-0.5">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">{label}</span>
					{scope && (
						<span
							className={cn(
								"inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
								scope === "Production"
									? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
									: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
							)}
						>
							{scope}
						</span>
					)}
				</div>
				{description && (
					<p className="text-muted-foreground text-xs">{description}</p>
				)}
				{(lastChangedAt || lastChangedBy) && (
					<p className="text-muted-foreground text-[10px]">
						{lastChangedBy && `By ${lastChangedBy}`}
						{lastChangedBy && lastChangedAt && " · "}
						{lastChangedAt}
					</p>
				)}
			</div>
			<Switch
				checked={checked}
				onCheckedChange={onCheckedChange}
				disabled={disabled}
				aria-label={label}
			/>
		</div>
	)
}

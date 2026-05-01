import { cn } from "@/core/lib/utils"
import { Card, CardContent } from "@/core/components/ui/card"

interface KpiTileProps {
	label: string
	value: string | number
	delta?: string | number
	deltaDirection?: "up" | "down" | "neutral"
	className?: string
}

export function KpiTile({ label, value, delta, deltaDirection = "neutral", className }: KpiTileProps) {
	return (
		<Card className={cn("min-w-0", className)}>
			<CardContent className="pt-4">
				<p className="text-muted-foreground truncate text-xs font-medium uppercase tracking-wide">
					{label}
				</p>
				<p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
				{delta !== undefined && (
					<p
						className={cn("mt-0.5 text-xs", {
							"text-emerald-600 dark:text-emerald-400": deltaDirection === "up",
							"text-red-600 dark:text-red-400": deltaDirection === "down",
							"text-muted-foreground": deltaDirection === "neutral",
						})}
					>
						{deltaDirection === "up" && "+"}{delta}
					</p>
				)}
			</CardContent>
		</Card>
	)
}

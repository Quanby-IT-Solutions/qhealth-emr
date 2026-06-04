"use client"

import { useState } from "react"
import { AlertTriangle, Ban, Bell, ShieldAlert } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Label } from "@/core/components/ui/label"
import { Textarea } from "@/core/components/ui/textarea"
import { cn } from "@/core/lib/utils"

export interface CdsAlertItem {
	id: string
	severity: "hard_block" | "soft_block" | "warning" | "high_alert"
	message: string
	field?: string
}

interface CdsAlertBannerProps {
	alerts: CdsAlertItem[]
	onOverride?: (alertId: string, reason: string) => void
	overrideReasons?: Record<string, string>
	onOverrideReasonChange?: (alertId: string, reason: string) => void
}

const SEVERITY_CONFIG = {
	hard_block: {
		label: "Hard Block",
		icon: Ban,
		containerCn: "border-destructive bg-destructive/10 text-destructive dark:bg-destructive/20",
		iconCn: "text-destructive",
		canOverride: false,
	},
	soft_block: {
		label: "Soft Block",
		icon: AlertTriangle,
		containerCn:
			"border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
		iconCn: "text-orange-500",
		canOverride: true,
	},
	warning: {
		label: "Warning",
		icon: Bell,
		containerCn:
			"border-yellow-500 bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
		iconCn: "text-yellow-500",
		canOverride: false,
	},
	high_alert: {
		label: "High Alert",
		icon: ShieldAlert,
		containerCn:
			"border-purple-500 bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
		iconCn: "text-purple-500",
		canOverride: false,
	},
} as const

function SingleAlert({
	alert,
	onOverride,
	overrideReason,
	onReasonChange,
}: {
	alert: CdsAlertItem
	onOverride?: (reason: string) => void
	overrideReason?: string
	onReasonChange?: (reason: string) => void
}) {
	const [showOverride, setShowOverride] = useState(false)
	const config = SEVERITY_CONFIG[alert.severity]
	const Icon = config.icon

	return (
		<div className={cn("rounded-md border p-3 text-sm", config.containerCn)}>
			<div className="flex items-start gap-2">
				<Icon className={cn("mt-0.5 size-4 shrink-0", config.iconCn)} />
				<div className="flex-1">
					<div className="flex items-center justify-between gap-2">
						<div>
							<span className="font-semibold">{config.label}</span>
							{alert.field && <span className="ml-1 opacity-70">({alert.field})</span>}
							<span className="ml-1">—</span>
							<span className="ml-1">{alert.message}</span>
						</div>
						{config.canOverride && onOverride && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="shrink-0 border-orange-400 text-orange-700 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-900"
								onClick={() => setShowOverride(v => !v)}
							>
								{showOverride ? "Cancel Override" : "Override"}
							</Button>
						)}
					</div>

					{config.canOverride && showOverride && (
						<div className="mt-2 space-y-1">
							<Label className="text-xs font-medium">Override reason (required)</Label>
							<Textarea
								rows={2}
								value={overrideReason ?? ""}
								onChange={e => onReasonChange?.(e.target.value)}
								placeholder="Provide clinical justification…"
								className="bg-white text-sm dark:bg-orange-950"
							/>
							<Button
								type="button"
								size="sm"
								className="mt-1 bg-orange-600 text-white hover:bg-orange-700"
								disabled={!overrideReason?.trim()}
								onClick={() => {
									if (overrideReason?.trim()) {
										onOverride?.(overrideReason.trim())
										setShowOverride(false)
									}
								}}
							>
								Confirm Override
							</Button>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

export function CdsAlertBanner({
	alerts,
	onOverride,
	overrideReasons = {},
	onOverrideReasonChange,
}: CdsAlertBannerProps) {
	if (alerts.length === 0) return null

	const hardBlocks = alerts.filter(a => a.severity === "hard_block")
	const softBlocks = alerts.filter(a => a.severity === "soft_block")
	const warnings = alerts.filter(a => a.severity === "warning")
	const highAlerts = alerts.filter(a => a.severity === "high_alert")

	const ordered = [...hardBlocks, ...highAlerts, ...softBlocks, ...warnings]

	return (
		<div className="space-y-2">
			{ordered.map(alert => (
				<SingleAlert
					key={alert.id}
					alert={alert}
					overrideReason={overrideReasons[alert.id]}
					onReasonChange={reason => onOverrideReasonChange?.(alert.id, reason)}
					onOverride={onOverride ? reason => onOverride(alert.id, reason) : undefined}
				/>
			))}
		</div>
	)
}

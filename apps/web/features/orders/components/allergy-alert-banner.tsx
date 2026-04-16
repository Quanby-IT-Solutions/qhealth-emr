"use client"

import { useState } from "react"

import { AlertTriangle, Ban } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Label } from "@/core/components/ui/label"
import { Textarea } from "@/core/components/ui/textarea"
import { cn } from "@/core/lib/utils"

export interface AllergyAlertItem {
	id: string
	blockType: "hard_block" | "soft_block"
	allergenName: string
	severity: string
	reactionType: string | null
}

interface AllergyAlertBannerProps {
	alerts: AllergyAlertItem[]
	overrideReasons?: Record<string, string>
	onOverrideReasonChange?: (id: string, reason: string) => void
	onOverride?: (id: string, reason: string) => void
}

const BLOCK_CONFIG = {
	hard_block: {
		label: "Allergy Hard Block",
		icon: Ban,
		containerCn:
			"border-destructive bg-destructive/10 text-destructive dark:bg-destructive/20",
		iconCn: "text-destructive",
		canOverride: false,
	},
	soft_block: {
		label: "Allergy Alert",
		icon: AlertTriangle,
		containerCn:
			"border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
		iconCn: "text-orange-500",
		canOverride: true,
	},
} as const

function formatSeverityLabel(severity: string) {
	return severity
		.split("-")
		.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
		.join("-")
}

function SingleAllergyAlert({
	alert,
	overrideReason,
	onReasonChange,
	onOverride,
}: {
	alert: AllergyAlertItem
	overrideReason?: string
	onReasonChange?: (reason: string) => void
	onOverride?: (reason: string) => void
}) {
	const [showOverride, setShowOverride] = useState(false)
	const config = BLOCK_CONFIG[alert.blockType]
	const Icon = config.icon

	return (
		<div className={cn("rounded-md border p-3 text-sm", config.containerCn)}>
			<div className="flex items-start gap-2">
				<Icon className={cn("mt-0.5 size-4 shrink-0", config.iconCn)} />
				<div className="flex-1">
					<div className="flex items-center justify-between gap-2">
						<div>
							<span className="font-semibold">{config.label}</span>
							<span className="ml-1">—</span>
							<span className="ml-1 font-medium">{alert.allergenName}</span>
							<span className="ml-1 opacity-80">
								({formatSeverityLabel(alert.severity)}
								{alert.reactionType ? ` · ${alert.reactionType}` : ""})
							</span>
						</div>
						{config.canOverride && onOverride && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="shrink-0 border-orange-400 text-orange-700 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-900"
								onClick={() => setShowOverride((v) => !v)}
							>
								{showOverride ? "Cancel" : "Override"}
							</Button>
						)}
					</div>

					{config.canOverride && showOverride && (
						<div className="mt-2 space-y-1">
							<Label className="text-xs font-medium">
								Override reason (required)
							</Label>
							<Textarea
								rows={2}
								value={overrideReason ?? ""}
								onChange={(e) => onReasonChange?.(e.target.value)}
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
										onOverride(overrideReason)
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

export function AllergyAlertBanner({
	alerts,
	overrideReasons,
	onOverrideReasonChange,
	onOverride,
}: AllergyAlertBannerProps) {
	if (alerts.length === 0) return null

	return (
		<div className="space-y-2">
			<p className="text-xs font-medium text-muted-foreground">
				Known Patient Medication Allergies
			</p>
			{alerts.map((alert) => (
				<SingleAllergyAlert
					key={alert.id}
					alert={alert}
					overrideReason={overrideReasons?.[alert.id]}
					onReasonChange={(reason) => onOverrideReasonChange?.(alert.id, reason)}
					onOverride={(reason) => onOverride?.(alert.id, reason)}
				/>
			))}
		</div>
	)
}

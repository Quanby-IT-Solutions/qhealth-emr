"use client"

import { cn } from "@/core/lib/utils"

import { Badge } from "./ui/badge"

type SlaStatus = "on-time" | "warning" | "breached" | "pending"

interface SlaStatusBadgeProps {
	status: SlaStatus
	label?: string
	targetMinutes?: number
	elapsedMinutes?: number
	className?: string
}

const STATUS_CONFIG: Record<SlaStatus, { label: string; className: string }> = {
	"on-time": {
		label: "On Time",
		className: "bg-green-100 text-green-800 border-green-200",
	},
	"warning": {
		label: "Warning",
		className: "bg-yellow-100 text-yellow-800 border-yellow-200",
	},
	"breached": {
		label: "Breached",
		className: "bg-red-100 text-red-800 border-red-200",
	},
	"pending": {
		label: "Pending",
		className: "bg-gray-100 text-gray-600 border-gray-200",
	},
}

function formatTime(minutes: number): string {
	if (minutes < 60) return `${minutes}m`
	const h = Math.floor(minutes / 60)
	const m = minutes % 60
	return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function SlaStatusBadge({
	status,
	label,
	targetMinutes,
	elapsedMinutes,
	className,
}: SlaStatusBadgeProps) {
	const config = STATUS_CONFIG[status]
	const displayLabel = label ?? config.label

	let timeInfo = ""
	if (targetMinutes !== undefined && elapsedMinutes !== undefined) {
		timeInfo = ` · ${formatTime(elapsedMinutes)} / ${formatTime(targetMinutes)}`
	} else if (targetMinutes !== undefined) {
		timeInfo = ` · target ${formatTime(targetMinutes)}`
	}

	return (
		<Badge variant="outline" className={cn("text-xs font-medium", config.className, className)}>
			{displayLabel}
			{timeInfo && <span className="ml-1 font-normal opacity-80">{timeInfo}</span>}
		</Badge>
	)
}

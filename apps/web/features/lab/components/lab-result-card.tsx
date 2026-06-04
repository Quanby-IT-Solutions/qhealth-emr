"use client"

import { AlertCircle } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { cn } from "@/core/lib/utils"
import { type LabResultItem } from "@/features/lab/api/lab.hooks"

interface LabResultCardProps {
	item: LabResultItem
}

function flagConfig(flag: LabResultItem["flag"]) {
	switch (flag) {
		case "C":
			return {
				label: "Critical",
				badgeVariant: "destructive" as const,
				rowCn: "bg-destructive/10 border-destructive/30",
				valueCn: "font-bold text-destructive",
			}
		case "H":
			return {
				label: "High",
				badgeVariant: "default" as const,
				rowCn: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800",
				valueCn: "font-semibold text-orange-700 dark:text-orange-400",
			}
		case "L":
			return {
				label: "Low",
				badgeVariant: "secondary" as const,
				rowCn: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
				valueCn: "font-semibold text-blue-700 dark:text-blue-400",
			}
		default:
			return {
				label: null,
				badgeVariant: "outline" as const,
				rowCn: "",
				valueCn: "",
			}
	}
}

export function LabResultCard({ item }: LabResultCardProps) {
	const cfg = flagConfig(item.flag)

	return (
		<div
			className={cn(
				"flex items-center justify-between rounded-md border px-4 py-3 text-sm",
				cfg.rowCn
			)}
		>
			<div className="flex items-center gap-2">
				{item.isCritical && <AlertCircle className="text-destructive size-4 shrink-0" />}
				<span className="font-medium">{item.testName}</span>
				{cfg.label && (
					<Badge variant={cfg.badgeVariant} className="text-[10px]">
						{cfg.label}
					</Badge>
				)}
			</div>

			<div className="flex items-center gap-4 text-right">
				<span className={cn("text-base", cfg.valueCn)}>
					{String(item.value)}{" "}
					<span className="text-muted-foreground text-xs font-normal">{item.unit}</span>
				</span>
				{item.referenceRange && (
					<span className="text-muted-foreground text-xs">Ref: {item.referenceRange}</span>
				)}
			</div>
		</div>
	)
}

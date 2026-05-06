"use client"

import type { ReactNode } from "react"

import { cn } from "@/core/lib/utils"

interface TableToolbarProps {
	title?: string
	description?: string
	actions?: ReactNode
	filters?: ReactNode
	className?: string
}

export function TableToolbar({ title, description, actions, filters, className }: TableToolbarProps) {
	return (
		<div className={cn("flex flex-col gap-3 border-b bg-muted/30 px-3 py-2", className)}>
			{(title || actions) && (
				<div className="flex items-center justify-between gap-3">
					{title && (
						<div>
							<h2 className="text-sm font-semibold">{title}</h2>
							{description && <p className="text-xs text-muted-foreground">{description}</p>}
						</div>
					)}
					{actions && <div className="flex items-center gap-2">{actions}</div>}
				</div>
			)}
			{filters && <div className="flex flex-wrap items-end gap-2">{filters}</div>}
		</div>
	)
}

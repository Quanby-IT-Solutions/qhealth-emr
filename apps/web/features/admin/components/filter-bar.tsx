"use client"

import type { ReactNode } from "react"

import { cn } from "@/core/lib/utils"

interface FilterBarProps {
	children: ReactNode
	className?: string
}

export function FilterBar({ children, className }: FilterBarProps) {
	return (
		<div
			className={cn("bg-muted/30 flex flex-wrap items-end gap-3 rounded-md border p-3", className)}
			role="search"
			aria-label="Filter bar"
		>
			{children}
		</div>
	)
}

interface FilterFieldProps {
	label: string
	htmlFor?: string
	children: ReactNode
}

export function FilterField({ label, htmlFor, children }: FilterFieldProps) {
	return (
		<div className="flex flex-col gap-1">
			<label htmlFor={htmlFor} className="text-muted-foreground text-xs font-medium">
				{label}
			</label>
			{children}
		</div>
	)
}

"use client"

import type { ReactNode } from "react"
import { AlertCircle, Inbox } from "lucide-react"

import { Skeleton } from "@/core/components/ui/skeleton"
import { cn } from "@/core/lib/utils"

interface EmptyStateProps {
	icon?: ReactNode
	title: string
	description?: string
	action?: ReactNode
	className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
	return (
		<div
			className={cn("flex flex-col items-center justify-center gap-2 p-8 text-center", className)}
		>
			<div className="text-muted-foreground" aria-hidden>
				{icon ?? <Inbox className="size-10" />}
			</div>
			<p className="text-sm font-medium">{title}</p>
			{description && <p className="text-muted-foreground max-w-sm text-xs">{description}</p>}
			{action && <div className="mt-2">{action}</div>}
		</div>
	)
}

interface ErrorStateProps {
	title?: string
	error?: unknown
	retry?: () => void
	className?: string
}

export function ErrorState({
	title = "Something went wrong",
	error,
	retry,
	className,
}: ErrorStateProps) {
	const message = error instanceof Error ? error.message : error ? String(error) : null
	return (
		<div
			className={cn("flex flex-col items-center justify-center gap-2 p-8 text-center", className)}
			role="alert"
		>
			<AlertCircle className="text-destructive size-8" aria-hidden />
			<p className="text-sm font-medium">{title}</p>
			{message && <p className="text-muted-foreground max-w-sm text-xs">{message}</p>}
			{retry && (
				<button
					type="button"
					onClick={retry}
					className="hover:bg-muted rounded-md border px-3 py-1 text-xs font-medium"
				>
					Retry
				</button>
			)}
		</div>
	)
}

interface SkeletonRowsProps {
	count?: number
	className?: string
}

export function SkeletonRows({ count = 5, className }: SkeletonRowsProps) {
	return (
		<div className={cn("space-y-2", className)} aria-busy aria-label="Loading">
			{Array.from({ length: count }).map((_, i) => (
				<Skeleton key={i} className="h-10 w-full" />
			))}
		</div>
	)
}

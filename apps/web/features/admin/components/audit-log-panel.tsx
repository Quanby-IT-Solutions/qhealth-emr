"use client"

import { Badge } from "@/core/components/ui/badge"
import { cn } from "@/core/lib/utils"

export interface AuditLogEntry {
	id: string
	action: string
	entityType: string
	entityId?: string
	actor?: string
	occurredAt: Date | string
	metadata?: Record<string, unknown> | null
}

interface AuditLogPanelProps {
	entries: AuditLogEntry[]
	isLoading?: boolean
	className?: string
}

const ACTION_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	create: "default",
	update: "secondary",
	delete: "destructive",
	read: "outline",
	sign: "default",
	verify: "secondary",
}

export function AuditLogPanel({ entries, isLoading, className }: AuditLogPanelProps) {
	if (isLoading) {
		return (
			<div className={cn("space-y-2 p-3", className)} aria-busy>
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="bg-muted h-10 animate-pulse rounded" />
				))}
			</div>
		)
	}

	if (entries.length === 0) {
		return (
			<p className={cn("text-muted-foreground py-8 text-center text-xs", className)}>
				No audit entries.
			</p>
		)
	}

	return (
		<ol className={cn("bg-card divide-y rounded-md border", className)} aria-label="Audit log">
			{entries.map(entry => (
				<li key={entry.id} className="flex items-start gap-3 px-3 py-2 text-xs">
					<Badge
						variant={ACTION_VARIANT[entry.action] ?? "outline"}
						className="text-[10px] capitalize"
					>
						{entry.action}
					</Badge>
					<div className="min-w-0 flex-1">
						<div className="flex items-baseline justify-between gap-2">
							<span className="truncate font-medium">
								{entry.entityType}
								{entry.entityId ? ` · ${entry.entityId}` : ""}
							</span>
							<time
								className="text-muted-foreground shrink-0 text-[10px]"
								dateTime={String(entry.occurredAt)}
							>
								{new Date(entry.occurredAt).toLocaleString("en-PH")}
							</time>
						</div>
						{entry.actor && <p className="text-muted-foreground text-[10px]">by {entry.actor}</p>}
						{entry.metadata && Object.keys(entry.metadata).length > 0 && (
							<pre className="bg-muted/50 mt-1 max-h-24 overflow-auto rounded p-1 font-mono text-[10px]">
								{JSON.stringify(entry.metadata, null, 0)}
							</pre>
						)}
					</div>
				</li>
			))}
		</ol>
	)
}

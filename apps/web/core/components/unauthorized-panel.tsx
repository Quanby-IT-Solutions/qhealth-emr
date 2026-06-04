"use client"

import { ShieldAlert } from "lucide-react"

interface UnauthorizedPanelProps {
	title?: string
	description?: string
}

export function UnauthorizedPanel({
	title = "Access restricted",
	description = "You do not have permission to view this area.",
}: UnauthorizedPanelProps) {
	return (
		<div className="bg-muted/20 flex min-h-[16rem] items-center justify-center rounded-xl border border-dashed p-8">
			<div className="flex max-w-md flex-col items-center gap-3 text-center">
				<div className="bg-background rounded-full border p-3 text-amber-600">
					<ShieldAlert className="size-6" aria-hidden />
				</div>
				<div className="space-y-1">
					<h2 className="text-lg font-semibold">{title}</h2>
					<p className="text-muted-foreground text-sm">{description}</p>
				</div>
			</div>
		</div>
	)
}

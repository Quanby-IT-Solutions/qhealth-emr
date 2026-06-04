import type { ReactNode } from "react"

interface AdminPageHeaderProps {
	title: string
	description?: string
	action?: ReactNode
}

export function AdminPageHeader({ title, description, action }: AdminPageHeaderProps) {
	return (
		<div className="flex items-start justify-between gap-4">
			<div className="space-y-1">
				<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
				{description && <p className="text-muted-foreground text-sm">{description}</p>}
			</div>
			{action && <div className="shrink-0">{action}</div>}
		</div>
	)
}

"use client"

import type { ReactNode } from "react"

export function TriageShell({ children, roleName }: { children: ReactNode; roleName?: string }) {
	return (
		<div className="flex flex-col gap-0">
			<div className="p-4">{children}</div>
		</div>
	)
}

import type { ReactNode } from "react"

export function SchedulingShell({
	children,
	roleName: _roleName,
}: {
	children: ReactNode
	roleName?: string
}) {
	return <div className="p-4">{children}</div>
}

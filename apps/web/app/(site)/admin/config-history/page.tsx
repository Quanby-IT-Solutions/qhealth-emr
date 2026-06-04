"use client"

import { ConfigHistoryPanel } from "@/features/admin/components/config-history-panel"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(
		permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
	)
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function ConfigHistoryPage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "admin", "view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access configuration history.
			</div>
		)
	}

	return <ConfigHistoryPanel />
}

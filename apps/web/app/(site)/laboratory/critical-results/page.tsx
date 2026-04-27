"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { CriticalResultsDashboard } from "@/features/lab/components/critical-results-dashboard"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function CriticalResultsPage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "laboratory", "view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access critical results.
			</div>
		)
	}

	return <CriticalResultsDashboard />
}

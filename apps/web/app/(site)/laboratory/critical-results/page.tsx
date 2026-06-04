"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { LAB_TECH_ROLE_NAMES, roleNameMatches } from "@/features/app-shell/lib/navigation"
import { CriticalResultsDashboard } from "@/features/lab/components/critical-results-dashboard"

function useAccessContext() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return {
		permSet: new Set(
			permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
		),
		roleName: profile?.activeRole?.name,
	}
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function CriticalResultsPage() {
	const { permSet, roleName } = useAccessContext()

	if (!can(permSet, "laboratory", "view") || !roleNameMatches(roleName, LAB_TECH_ROLE_NAMES)) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access critical results.
			</div>
		)
	}

	return <CriticalResultsDashboard />
}

"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { LAB_TECH_ROLE_NAMES, roleNameMatches } from "@/features/app-shell/lib/navigation"
import { LabDashboard } from "@/features/lab/components/lab-dashboard"

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

export default function LabPage() {
	const { permSet, roleName } = useAccessContext()

	if (!can(permSet, "laboratory", "view") || !roleNameMatches(roleName, LAB_TECH_ROLE_NAMES)) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access laboratory.
			</div>
		)
	}

	return <LabDashboard />
}

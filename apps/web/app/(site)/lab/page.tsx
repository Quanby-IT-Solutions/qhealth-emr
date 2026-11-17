"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { canAccessRoleGatedModule, LAB_TECH_ROLES } from "@/features/app-shell/lib/navigation"
import { LabDashboard } from "@/features/lab/components/lab-dashboard"

function useAccessContext() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return {
		permSet: new Set(
			permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
		),
		role: profile?.activeRole,
	}
}

export default function LabPage() {
	const { permSet, role } = useAccessContext()

	if (!canAccessRoleGatedModule(role, LAB_TECH_ROLES, permSet, "laboratory", "view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access laboratory.
			</div>
		)
	}

	return <LabDashboard />
}

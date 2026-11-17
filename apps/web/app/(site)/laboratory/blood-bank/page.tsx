"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	BLOOD_BANK_ROLE_NAMES,
	canAccessRoleGatedModule,
} from "@/features/app-shell/lib/navigation"
import { BloodBankDashboard } from "@/features/lab/components/blood-bank-dashboard"

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

export default function LaboratoryBloodBankPage() {
	const { permSet, roleName } = useAccessContext()

	if (!canAccessRoleGatedModule(roleName, BLOOD_BANK_ROLE_NAMES, permSet, "laboratory", "view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access blood bank.
			</div>
		)
	}

	return <BloodBankDashboard />
}

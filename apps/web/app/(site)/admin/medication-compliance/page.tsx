"use client"

import { MedicationCompliancePanel } from "@/features/admin/components/medication-compliance-panel"
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

export default function AdminMedicationCompliancePage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "formulary", "clinical_policy")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access medication compliance.
			</div>
		)
	}

	return <MedicationCompliancePanel />
}

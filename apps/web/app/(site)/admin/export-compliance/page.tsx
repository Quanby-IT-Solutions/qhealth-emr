"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { ExportCompliancePanel } from "@/features/admin/components/export-compliance-panel"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function AdminExportCompliancePage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "admin", "view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access export compliance.
			</div>
		)
	}

	return <ExportCompliancePanel />
}

"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { FhirExportDashboard } from "@/features/fhir/components/fhir-export-dashboard"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function AdminFhirPage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "admin", "view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access this page.
			</div>
		)
	}

	if (!can(permSet, "fhir", "view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access FHIR export management.
			</div>
		)
	}

	const canEdit = can(permSet, "fhir", "export")

	return <FhirExportDashboard canEdit={canEdit} />
}

"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { PatientSearch } from "@/features/patients/components/patient-search"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function PatientSearchPage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "patients", "view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to search patients.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Patient Search</h1>
				<p className="text-muted-foreground text-sm">
					Search patients by name, MRN, or date of birth
				</p>
			</div>
			<PatientSearch />
		</div>
	)
}

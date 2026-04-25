"use client"

import { use } from "react"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { PatientProfile } from "@/features/patients/components/patient-profile"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function PatientProfilePage({
	params,
}: {
	params: Promise<{ patientId: string }>
}) {
	const { patientId } = use(params)
	const permSet = usePermissionSet()

	if (!can(permSet, "patients", "view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to view patient records.
			</div>
		)
	}

	return <PatientProfile patientId={patientId} />
}

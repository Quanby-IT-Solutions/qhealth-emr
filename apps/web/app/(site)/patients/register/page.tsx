"use client"

import { useSearchParams } from "next/navigation"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { PatientRegistrationForm } from "@/features/patients/components/patient-registration-form"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function PatientRegisterPage() {
	const searchParams = useSearchParams()
	const pendingTriageId = searchParams.get("pendingTriageId") ?? ""
	const permSet = usePermissionSet()

	if (!can(permSet, "adt", "create")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to register patients.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Register New Patient</h1>
				<p className="text-muted-foreground text-sm">
					{pendingTriageId
						? "Register this walk-in patient. The pending triage intake will be linked automatically."
						: "Enter patient demographics to create a new medical record"}
				</p>
			</div>
			<PatientRegistrationForm />
		</div>
	)
}

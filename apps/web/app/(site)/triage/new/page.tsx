"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { OpdTriageForm } from "@/features/opd-triage/components/opd-triage-form"

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

/**
 * Walk-in (pre-registration) OPD triage page.
 * Triage staff can capture arrival time, chief complaint, and vitals
 * before the patient has been registered. The registrar links the
 * resulting intake to a patient record from the patient registration queue.
 */
export default function WalkInTriagePage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "adt", "create")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to create triage records.
			</div>
		)
	}

	return (
		<div className="p-6">
			<div className="mb-6">
				<h1 className="text-2xl font-semibold">Walk-in OPD Triage</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Record triage data for an unregistered walk-in patient. A registrar will link this intake
					to the patient record.
				</p>
			</div>
			<OpdTriageForm />
		</div>
	)
}

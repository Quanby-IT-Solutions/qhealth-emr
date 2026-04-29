"use client"

import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { FormularyManager } from "@/features/formulary/components/formulary-manager"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function PharmacyFormularyPage() {
	const facilityId = useActiveFacilityId()
	const permSet = usePermissionSet()

	if (!can(permSet, "formulary", "view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access the formulary.
			</div>
		)
	}

	const canEdit = can(permSet, "formulary", "edit")

	return (
		<div className="w-full max-w-7xl space-y-6 p-4">
			<div>
				<h1 className="text-2xl font-bold">Formulary</h1>
				<p className="text-muted-foreground">
					Review formulary items and manage clinical notes, high-alert designations, and restriction guidance.
				</p>
			</div>

			{facilityId ? (
				<FormularyManager
					facilityId={facilityId}
					canEdit={canEdit}
					canDelete={false}
					canEditFlags={can(permSet, "formulary", "clinical_policy")}
				/>
			) : (
				<p className="text-muted-foreground">Loading facility context...</p>
			)}
		</div>
	)
}

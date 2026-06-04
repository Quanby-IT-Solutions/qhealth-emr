"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { FacilityProfilePanel } from "@/features/facility-profile/components/facility-profile-panel"

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

export default function FacilityProfilePage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "facility_profile", "view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access facility profile settings.
			</div>
		)
	}

	const canEdit = can(permSet, "facility_profile", "edit")

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h1 className="text-2xl font-semibold">Facility Profile</h1>
				<p className="text-muted-foreground text-sm">
					Official identity used in reports, exports, and external submissions.
				</p>
			</div>
			<FacilityProfilePanel canEdit={canEdit} />
		</div>
	)
}

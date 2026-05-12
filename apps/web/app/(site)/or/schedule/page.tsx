"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { SurgicalCalendar } from "@/features/surgical/components/surgical-calendar"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(
		permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
	)
}

export default function ORSchedulePage() {
	const { data: profile } = useMyProfile()
	const permSet = usePermissionSet()
	const activeStaffProfile =
		profile?.staffProfiles?.find(staffProfile =>
			staffProfile.roles?.some(role => role.id === profile.activeRole?.id)
		) ?? profile?.staffProfiles?.[0]
	const roleName = (profile?.activeRole?.name ?? "").toLowerCase()
	const isSurgeon = roleName === "surgeon"
	const isAnesthesiologist = roleName === "anesthesiologist"
	const isSurgicalReadOnly = permSet.has("surgical:view") && !permSet.has("scheduling:create")

	if (!permSet.has("surgical:view") && !permSet.has("scheduling:view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access the OR schedule.
			</div>
		)
	}

	return (
		<SurgicalCalendar
			readOnly={isSurgicalReadOnly}
			surgeonStaffId={isSurgeon ? activeStaffProfile?.id : undefined}
			anesthesiologistStaffId={isAnesthesiologist ? activeStaffProfile?.id : undefined}
		/>
	)
}

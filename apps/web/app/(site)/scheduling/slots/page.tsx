"use client"

import { UnauthorizedPanel } from "@/core/components/unauthorized-panel"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { SlotManagement } from "@/features/scheduling/components/slot-management"

export default function SchedulingSlotsPage() {
	const { data: profile, isLoading } = useMyProfile()
	const facilityId = useActiveFacilityId()
	const permissionSet = new Set(
		profile?.activeRole?.permissions.map(
			permission => `${permission.module}:${permission.action}`
		) ?? []
	)

	if (isLoading) {
		return null
	}

	if (!permissionSet.has("scheduling:edit")) {
		return (
			<UnauthorizedPanel
				title="Scheduling edit access required"
				description="Your current role does not include scheduling:edit."
			/>
		)
	}

	if (!facilityId) {
		return (
			<div className="text-muted-foreground flex h-48 items-center justify-center">
				No facility context available.
			</div>
		)
	}

	return <SlotManagement facilityId={facilityId} />
}

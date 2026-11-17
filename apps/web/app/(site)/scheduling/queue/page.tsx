"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { isCoordinatorRole } from "@/features/app-shell/lib/navigation"
import { ClinicQueue } from "@/features/scheduling/components/clinic-queue"

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

export default function ClinicQueuePage() {
	const { data: profile } = useMyProfile()
	const permSet = usePermissionSet()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	const currentStaffId = profile?.staffProfiles?.[0]?.id ?? ""
	const isClinicCoordinator = isCoordinatorRole(profile?.activeRole?.name)

	// Default to the current user's own clinic scope (PS-013: queue must be clinic-scoped)
	const [showAllClinics, setShowAllClinics] = useState(false)
	const clinicianStaffId =
		isClinicCoordinator || showAllClinics ? undefined : currentStaffId || undefined

	if (!can(permSet, "scheduling", "view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access scheduling.
			</div>
		)
	}

	if (!facilityId) {
		return (
			<div className="text-muted-foreground flex h-48 items-center justify-center">
				No facility context available.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<h1 className="text-xl font-bold sm:text-2xl">Clinic Queue</h1>
					<p className="text-muted-foreground text-sm sm:text-base">
						Real-time queue display for checked-in patients
					</p>
				</div>
				{currentStaffId && !isClinicCoordinator && (
					<Button
						variant="outline"
						size="sm"
						className="w-full sm:w-auto"
						onClick={() => setShowAllClinics(v => !v)}
					>
						{showAllClinics ? "My Clinic Only" : "Show All Clinics"}
					</Button>
				)}
			</div>
			<ClinicQueue
				facilityId={facilityId}
				clinicianStaffId={clinicianStaffId}
				showCoordinatorFilters={isClinicCoordinator}
			/>
		</div>
	)
}

"use client"

import { useState } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { SchedulerBookedCasesList } from "@/features/surgical/components/scheduler-booked-cases-list"
import { SurgicalCalendar } from "@/features/surgical/components/surgical-calendar"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(
		permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
	)
}

export default function ORSchedulePage() {
	const [schedulerView, setSchedulerView] = useState<"schedule" | "booked-cases">("schedule")
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
	const isScheduler = permSet.has("scheduling:create") && !permSet.has("surgical:view")
	const facilityId = activeStaffProfile?.facilityId ?? ""

	if (!permSet.has("surgical:view") && !permSet.has("scheduling:view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access the OR schedule.
			</div>
		)
	}

	if (isScheduler && facilityId) {
		return (
			<Tabs
				value={schedulerView}
				onValueChange={value => setSchedulerView(value as typeof schedulerView)}
			>
				<div className="border-b px-6 pt-4">
					<TabsList variant="line" aria-label="OR schedule views">
						<TabsTrigger value="schedule">OR Schedule</TabsTrigger>
						<TabsTrigger value="booked-cases">Booked Cases</TabsTrigger>
					</TabsList>
				</div>
				<TabsContent value="schedule">
					<SurgicalCalendar />
				</TabsContent>
				<TabsContent value="booked-cases">
					<SchedulerBookedCasesList facilityId={facilityId} />
				</TabsContent>
			</Tabs>
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

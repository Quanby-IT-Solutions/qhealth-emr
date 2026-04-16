"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { ClinicQueue } from "@/features/scheduling/components/clinic-queue"

export default function ClinicQueuePage() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	if (!facilityId) {
		return (
			<div className="text-muted-foreground flex h-48 items-center justify-center">
				No facility context available.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Clinic Queue</h1>
				<p className="text-muted-foreground">
					Real-time queue display for checked-in patients
				</p>
			</div>
			<ClinicQueue facilityId={facilityId} />
		</div>
	)
}

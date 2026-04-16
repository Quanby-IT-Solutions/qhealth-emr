"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { PidsrDashboard } from "@/features/reporting/components/pidsr-dashboard"

export default function PidsrReportingPage() {
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
				<h1 className="text-2xl font-bold">PIDSR Dashboard</h1>
				<p className="text-muted-foreground">
					Disease surveillance flags and PIDSR case management
				</p>
			</div>
			<PidsrDashboard facilityId={facilityId} />
		</div>
	)
}

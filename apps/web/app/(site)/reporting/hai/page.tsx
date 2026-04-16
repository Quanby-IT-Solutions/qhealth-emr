"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { HaiReport } from "@/features/reporting/components/hai-report"

export default function HaiReportingPage() {
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
				<h1 className="text-2xl font-bold">HAI Surveillance Report</h1>
				<p className="text-muted-foreground">
					Healthcare-associated infection metrics by type
				</p>
			</div>
			<HaiReport facilityId={facilityId} />
		</div>
	)
}

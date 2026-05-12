"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { HaiReport } from "@/features/reporting/components/hai-report"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

export default function HaiReportingPage() {
	const { data: profile } = useMyProfile()
	const permSet = usePermissionSet()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	if (!permSet.has("reporting:edit")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access HAI reporting.
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

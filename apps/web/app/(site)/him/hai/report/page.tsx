"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { HaiReportPage } from "@/features/him/hai-reconciliation/components/hai-report-page"

export default function HimHaiReportPage() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	if (!facilityId) return <div className="text-muted-foreground p-8">Loading…</div>
	return <HaiReportPage facilityId={facilityId} />
}

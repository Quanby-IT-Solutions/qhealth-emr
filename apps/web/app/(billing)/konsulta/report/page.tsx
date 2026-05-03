"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { CapitationReportPage as CapitationReportPageComponent } from "@/features/billing/konsulta-capitation/components/capitation-report-page"

export default function CapitationReportPage() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	if (!facilityId) return null

	return <CapitationReportPageComponent facilityId={facilityId} />
}

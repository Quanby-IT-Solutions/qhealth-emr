"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { KonsultaTrackerPage as KonsultaTrackerPageComponent } from "@/features/billing/konsulta-capitation/components/konsulta-tracker-page"

export function KonsultaTrackerPageClient() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	if (!facilityId) return null

	return <KonsultaTrackerPageComponent facilityId={facilityId} />
}

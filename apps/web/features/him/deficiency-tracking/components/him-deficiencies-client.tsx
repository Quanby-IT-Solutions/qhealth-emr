"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

import { DeficiencyWorklistPage } from "./deficiency-worklist-page"

export function HimDeficienciesClient() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	if (!facilityId) return <div className="p-8 text-muted-foreground">Loading…</div>
	return <DeficiencyWorklistPage facilityId={facilityId} />
}

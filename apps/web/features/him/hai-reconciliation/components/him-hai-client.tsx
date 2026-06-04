"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

import { HaiWorklistPage } from "./hai-worklist-page"

export function HimHaiClient() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	if (!facilityId) return <div className="text-muted-foreground p-8">Loading…</div>
	return <HaiWorklistPage facilityId={facilityId} />
}

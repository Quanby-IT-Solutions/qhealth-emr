"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

import { RecordsRequestListPage } from "./records-request-list-page"

export function HimRecordsClient() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	if (!facilityId) return <div className="p-8 text-muted-foreground">Loading…</div>
	return <RecordsRequestListPage facilityId={facilityId} />
}

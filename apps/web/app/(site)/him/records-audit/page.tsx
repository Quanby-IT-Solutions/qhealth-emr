"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

import { RecordsAuditPage } from "@/features/him/records-issuance/components/records-audit-page"

export default function HimRecordsAuditPage() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	if (!facilityId) {
		return <div className="p-8 text-muted-foreground">Loading…</div>
	}
	return <RecordsAuditPage facilityId={facilityId} />
}

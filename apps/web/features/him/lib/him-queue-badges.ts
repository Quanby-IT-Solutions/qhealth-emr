"use client"

import { useHimOpsQuery } from "@/features/admin/api/admin-dashboard.hooks"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useDeficienciesQuery } from "@/features/him/deficiency-tracking/api/deficiencies.hooks"
import { useHaiQuery } from "@/features/him/hai-reconciliation/api/hai.hooks"

export function useHimQueueCounts() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const { data: himOpsData } = useHimOpsQuery()
	const { data: defData } = useDeficienciesQuery({ facilityId, status: "open", limit: 1 })
	const { data: haiData } = useHaiQuery({ facilityId, limit: 1 })

	return {
		openDeficiencies: defData?.total ?? null,
		pendingCoding: himOpsData?.pendingCodingCount ?? null,
		pendingRecordsRequests: himOpsData?.pendingRecordsReleaseCount ?? null,
		pendingHaiReview: haiData?.total ?? null,
	} as const
}
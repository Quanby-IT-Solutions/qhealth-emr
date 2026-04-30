"use client"

import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { BreakGlassReviewTable } from "@/features/audit/components/break-glass-review-table"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function BreakGlassReviewPage() {
	const facilityId = useActiveFacilityId()
	const permSet = usePermissionSet()

	if (!can(permSet, "audit", "view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access break-glass review.
			</div>
		)
	}

	return (
		<div className="w-full max-w-7xl space-y-6 p-4">
			<div>
				<h1 className="text-2xl font-bold">Break-Glass Review</h1>
				<p className="text-muted-foreground">
					Review emergency override access events. Privacy Officers can mark events as appropriate or flagged.
				</p>
			</div>

			{facilityId ? (
				<BreakGlassReviewTable facilityId={facilityId} />
			) : (
				<p className="text-muted-foreground">Loading facility context...</p>
			)}
		</div>
	)
}

import { Suspense } from "react"

import { BreakGlassReviewTable } from "@/features/audit/components/break-glass-review-table"

// TODO: Replace with actual facility context from session/RBAC
const PLACEHOLDER_FACILITY_ID = "00000000-0000-0000-0000-000000000000"

export default function BreakGlassReviewPage() {
	return (
		<div className="w-full max-w-7xl space-y-6 p-4">
			<div>
				<h1 className="text-2xl font-bold">Break-Glass Review</h1>
				<p className="text-muted-foreground">
					Review emergency override access events. Privacy Officers can mark events as appropriate or flagged.
				</p>
			</div>

			<Suspense fallback={<p>Loading break-glass events...</p>}>
				<BreakGlassReviewTable facilityId={PLACEHOLDER_FACILITY_ID} />
			</Suspense>
		</div>
	)
}

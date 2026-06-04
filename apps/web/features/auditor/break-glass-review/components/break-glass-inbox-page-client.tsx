"use client"

import { useActiveFacilityId } from "@/core/hooks/use-active-facility"

import { BreakGlassInbox } from "./break-glass-inbox"

export function BreakGlassInboxPageClient() {
	const facilityId = useActiveFacilityId()

	return (
		<div className="space-y-4">
			<div>
				<h1 className="text-2xl font-bold">Break-Glass Reviews</h1>
				<p className="text-muted-foreground">
					Review emergency override access events. Mark as appropriate or flag for investigation.
				</p>
			</div>

			{facilityId ? (
				<BreakGlassInbox facilityId={facilityId} />
			) : (
				<p className="text-muted-foreground">Loading facility context...</p>
			)}
		</div>
	)
}

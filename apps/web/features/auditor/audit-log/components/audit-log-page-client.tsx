"use client"

import { useActiveFacilityId } from "@/core/hooks/use-active-facility"

import { AuditLogTable } from "./audit-log-table"

export function AuditLogPageClient() {
	const facilityId = useActiveFacilityId()

	return (
		<div className="space-y-4">
			<div>
				<h1 className="text-2xl font-bold">Audit Log</h1>
				<p className="text-muted-foreground">
					View and search the complete audit trail for this facility.
				</p>
			</div>

			{facilityId ? (
				<AuditLogTable facilityId={facilityId} />
			) : (
				<p className="text-muted-foreground">Loading facility context...</p>
			)}
		</div>
	)
}

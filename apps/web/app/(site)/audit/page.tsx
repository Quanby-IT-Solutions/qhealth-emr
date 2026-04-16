import { Suspense } from "react"
import Link from "next/link"

import { Button } from "@/core/components/ui/button"
import { AuditLogTable } from "@/features/audit/components/audit-log-table"

// TODO: Replace with actual facility context from session/RBAC
const PLACEHOLDER_FACILITY_ID = "00000000-0000-0000-0000-000000000000"

export default function AuditPage() {
	return (
		<div className="w-full max-w-7xl space-y-6 p-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Audit Trail</h1>
					<p className="text-muted-foreground">
						View and search the complete audit log for this facility.
					</p>
				</div>
				<Button variant="outline" nativeButton={false} render={<Link href="/audit/break-glass" />}>
					Break-Glass Review
				</Button>
			</div>

			<Suspense fallback={<p>Loading audit logs...</p>}>
				<AuditLogTable facilityId={PLACEHOLDER_FACILITY_ID} />
			</Suspense>
		</div>
	)
}

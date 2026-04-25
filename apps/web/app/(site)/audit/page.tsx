"use client"

import Link from "next/link"

import { Button } from "@/core/components/ui/button"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { AuditLogTable } from "@/features/audit/components/audit-log-table"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function AuditPage() {
	const facilityId = useActiveFacilityId()
	const permSet = usePermissionSet()

	if (!can(permSet, "audit", "view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access the audit trail.
			</div>
		)
	}

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

			{facilityId ? (
				<AuditLogTable facilityId={facilityId} />
			) : (
				<p className="text-muted-foreground">Loading facility context...</p>
			)}
		</div>
	)
}

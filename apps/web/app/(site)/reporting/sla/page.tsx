"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { SlaComplianceReport } from "@/features/sla/components/sla-compliance-report"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(
		permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
	)
}

export default function ReportingSlaPage() {
	const permSet = usePermissionSet()
	const canAccess = permSet.has("reporting:view")

	if (!canAccess) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access SLA compliance reports.
			</div>
		)
	}

	return <SlaComplianceReport />
}

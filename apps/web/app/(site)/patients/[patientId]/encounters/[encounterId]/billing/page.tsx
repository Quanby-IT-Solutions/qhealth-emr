"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { BillingTab } from "@/features/billing/components/billing-tab"
import { useChartContext } from "@/features/encounters/context/chart-context"

export default function BillingPage() {
	const { encounterId, patientId, facilityId } = useChartContext()
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	const canViewBilling = permissions.some(
		permission => permission.module === "billing" && permission.action === "view"
	)
	const isClinicalSigner = permissions.some(
		permission => permission.module === "clinical_docs" && permission.action === "sign"
	)

	if (!canViewBilling || isClinicalSigner) {
		return (
			<div className="text-muted-foreground py-8 text-center text-sm">
				You do not have permission to view encounter billing.
			</div>
		)
	}

	return (
		<BillingTab encounterId={encounterId} patientId={patientId} facilityId={facilityId ?? ""} />
	)
}

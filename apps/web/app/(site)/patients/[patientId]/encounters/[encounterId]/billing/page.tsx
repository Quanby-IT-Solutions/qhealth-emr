"use client"

import { BillingTab } from "@/features/billing/components/billing-tab"
import { useChartContext } from "@/features/encounters/context/chart-context"

export default function BillingPage() {
	const { encounterId, patientId, facilityId } = useChartContext()

	return (
		<BillingTab
			encounterId={encounterId}
			patientId={patientId}
			facilityId={facilityId ?? ""}
		/>
	)
}

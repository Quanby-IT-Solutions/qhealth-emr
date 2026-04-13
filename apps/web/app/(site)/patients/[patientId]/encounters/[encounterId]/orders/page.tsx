"use client"

import { OrdersTab } from "@/features/orders/components/orders-tab"
import { useChartContext } from "@/features/encounters/context/chart-context"

export default function OrdersPage() {
	const { encounterId, patientId, facilityId } = useChartContext()

	return (
		<OrdersTab
			encounterId={encounterId}
			patientId={patientId}
			facilityId={facilityId ?? ""}
		/>
	)
}

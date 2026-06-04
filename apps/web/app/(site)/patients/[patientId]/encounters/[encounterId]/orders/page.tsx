"use client"

import { useChartContext } from "@/features/encounters/context/chart-context"
import { OrdersTab } from "@/features/orders/components/orders-tab"

export default function OrdersPage() {
	const { encounterId, patientId, facilityId, encounter } = useChartContext()

	return (
		<OrdersTab
			encounterId={encounterId}
			patientId={patientId}
			facilityId={facilityId ?? ""}
			encounterType={encounter?.encounterType}
		/>
	)
}

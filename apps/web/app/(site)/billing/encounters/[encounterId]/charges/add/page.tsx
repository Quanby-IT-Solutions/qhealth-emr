"use client"

import { use } from "react"

import { ServiceItemPage as ServiceItemPageComponent } from "@/features/billing/charge-capture/components/service-item-page"
import { useChartContext } from "@/features/encounters/context/chart-context"

export default function AddChargePage({ params }: { params: Promise<{ encounterId: string }> }) {
	const { encounterId } = use(params)
	const { facilityId, patientId } = useChartContext()

	if (!facilityId) return null

	return (
		<ServiceItemPageComponent
			encounterId={encounterId}
			facilityId={facilityId}
			patientId={patientId}
		/>
	)
}

"use client"

import { use } from "react"

import { ChargeCapturePageComponent } from "@/features/billing/charge-capture/components/charge-capture-page"
import { useChartContext } from "@/features/encounters/context/chart-context"

export default function ChargesPage({ params }: { params: Promise<{ encounterId: string }> }) {
	const { encounterId } = use(params)
	const { facilityId, patientId } = useChartContext()

	if (!facilityId) return null

	return (
		<ChargeCapturePageComponent
			encounterId={encounterId}
			facilityId={facilityId}
			patientId={patientId}
		/>
	)
}

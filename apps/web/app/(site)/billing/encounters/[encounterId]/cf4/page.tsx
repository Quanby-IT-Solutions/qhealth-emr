"use client"

import { use } from "react"

import { Cf4GenerationPage as Cf4GenerationPageComponent } from "@/features/billing/cf4-eclaims/components/cf4-generation-page"
import { useChartContext } from "@/features/encounters/context/chart-context"

export default function Cf4GenerationPage({ params }: { params: Promise<{ encounterId: string }> }) {
	const { encounterId } = use(params)
	const { facilityId, patientId } = useChartContext()

	if (!facilityId) return null

	return (
		<Cf4GenerationPageComponent
			encounterId={encounterId}
			facilityId={facilityId}
			patientId={patientId}
		/>
	)
}

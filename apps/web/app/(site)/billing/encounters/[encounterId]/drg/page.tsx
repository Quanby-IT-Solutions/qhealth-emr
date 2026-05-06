"use client"

import { use } from "react"

import { DrgMappingPage as DrgMappingPageComponent } from "@/features/billing/drg-cf5/components/drg-mapping-page"
import { useChartContext } from "@/features/encounters/context/chart-context"

export default function DrgMappingPage({ params }: { params: Promise<{ encounterId: string }> }) {
	const { encounterId } = use(params)
	const { facilityId, patientId } = useChartContext()

	if (!facilityId) return null

	return (
		<DrgMappingPageComponent
			encounterId={encounterId}
			facilityId={facilityId}
			patientId={patientId}
		/>
	)
}

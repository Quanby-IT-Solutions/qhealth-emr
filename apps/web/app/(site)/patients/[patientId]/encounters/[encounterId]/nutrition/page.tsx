"use client"

import { useChartContext } from "@/features/encounters/context/chart-context"

import { NutritionTab } from "@/features/nutrition/components/nutrition-tab"

export default function NutritionPage() {
	const { encounterId, patientId, facilityId } = useChartContext()

	return (
		<NutritionTab
			encounterId={encounterId}
			patientId={patientId}
			facilityId={facilityId ?? ""}
		/>
	)
}

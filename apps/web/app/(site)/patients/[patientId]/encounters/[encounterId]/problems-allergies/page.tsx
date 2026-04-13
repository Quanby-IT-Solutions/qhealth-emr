"use client"

import { ProblemsAllergiesTab } from "@/features/problems-allergies/components/problems-allergies-tab"
import { useChartContext } from "@/features/encounters/context/chart-context"

export default function ProblemsAllergiesPage() {
	const { patientId, facilityId } = useChartContext()

	return <ProblemsAllergiesTab patientId={patientId} facilityId={facilityId ?? ""} />
}

"use client"

import { NursingTab } from "@/features/nursing/components/nursing-tab"
import { useChartContext } from "@/features/encounters/context/chart-context"

export default function NursingPage() {
	const { encounterId, patientId, facilityId } = useChartContext()

	return (
		<NursingTab
			encounterId={encounterId}
			patientId={patientId}
			facilityId={facilityId ?? ""}
		/>
	)
}

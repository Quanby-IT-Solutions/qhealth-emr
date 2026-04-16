"use client"

import { NursingTab } from "@/features/nursing/components/nursing-tab"
import { useChartContext } from "@/features/encounters/context/chart-context"

export default function NursingPage() {
	const { encounterId, patientId, facilityId, encounter } = useChartContext()

	return (
		<NursingTab
			encounterId={encounterId}
			patientId={patientId}
			facilityId={facilityId ?? ""}
			patientDateOfBirth={encounter?.patientDateOfBirth}
			patientName={encounter?.patientName}
		/>
	)
}

"use client"

import { ConsentLibrary } from "@/features/nursing/components/consent-library"
import { useChartContext } from "@/features/encounters/context/chart-context"

export default function ConsentsPage() {
	const { encounterId, patientId, facilityId, encounter } = useChartContext()

	return (
		<div className="space-y-4">
			<ConsentLibrary
				patientName={encounter?.patientName}
			/>
		</div>
	)
}

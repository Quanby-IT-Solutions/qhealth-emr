"use client"

import { useChartContext } from "@/features/encounters/context/chart-context"
import { ConsentLibrary } from "@/features/nursing/components/consent-library"

export default function ConsentsPage() {
	const { encounterId, patientId, facilityId, encounter } = useChartContext()

	return (
		<div className="space-y-4">
			<ConsentLibrary patientName={encounter?.patientName} />
		</div>
	)
}

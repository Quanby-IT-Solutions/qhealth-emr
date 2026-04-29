"use client"

import { useChartContext } from "@/features/encounters/context/chart-context"
import { EPrescriptionPage } from "@/features/orders/components/e-prescription-page"

export default function EPrescriptionRoutePage() {
	const { encounterId, patientId, facilityId } = useChartContext()

	return (
		<EPrescriptionPage
			encounterId={encounterId}
			patientId={patientId}
			facilityId={facilityId ?? ""}
		/>
	)
}

"use client"

import { useChartContext } from "@/features/encounters/context/chart-context"
import { MswTab } from "@/features/msw/components/msw-tab"

export default function MswPage() {
	const { encounterId, patientId, facilityId } = useChartContext()

	return (
		<MswTab encounterId={encounterId} patientId={patientId} facilityId={facilityId ?? ""} />
	)
}

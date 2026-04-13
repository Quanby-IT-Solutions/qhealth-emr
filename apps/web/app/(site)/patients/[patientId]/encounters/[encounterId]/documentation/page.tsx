"use client"

import { DocumentationTab } from "@/features/clinical-docs/components/documentation-tab"
import { useChartContext } from "@/features/encounters/context/chart-context"

export default function DocumentationPage() {
	const { encounterId, patientId, facilityId } = useChartContext()

	return (
		<DocumentationTab
			encounterId={encounterId}
			patientId={patientId}
			facilityId={facilityId ?? ""}
		/>
	)
}

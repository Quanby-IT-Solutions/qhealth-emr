"use client"

import { use } from "react"

import { StatementPreviewPage as StatementPreviewPageComponent } from "@/features/billing/esoa/components/statement-preview-page"
import { useChartContext } from "@/features/encounters/context/chart-context"

export default function StatementPreviewPage({
	params,
}: {
	params: Promise<{ encounterId: string }>
}) {
	const { encounterId } = use(params)
	const { facilityId, patientId } = useChartContext()

	if (!facilityId) return null

	return (
		<StatementPreviewPageComponent
			encounterId={encounterId}
			facilityId={facilityId}
			patientId={patientId}
		/>
	)
}

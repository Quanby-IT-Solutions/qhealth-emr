"use client"

import { use } from "react"

import { EsoaPage as EsoaPageComponent } from "@/features/billing/esoa/components/esoa-page"
import { useChartContext } from "@/features/encounters/context/chart-context"

export default function EsoaPage({ params }: { params: Promise<{ encounterId: string }> }) {
	const { encounterId } = use(params)
	const { facilityId, patientId } = useChartContext()

	if (!facilityId) return null

	return (
		<EsoaPageComponent encounterId={encounterId} facilityId={facilityId} patientId={patientId} />
	)
}

"use client"

import { use } from "react"

import { useEncounterDetailQuery } from "@/features/encounters/api/encounters.hooks"
import { ChartContext } from "@/features/encounters/context/chart-context"
import { usePatientSummaryQuery } from "@/features/problems-allergies/api/problems-allergies.hooks"

export default function BillingEncounterLayout({
	children,
	params,
}: {
	children: React.ReactNode
	params: Promise<{ encounterId: string }>
}) {
	const { encounterId } = use(params)
	const { data: encounter, isLoading } = useEncounterDetailQuery(encounterId)
	const { data: summary } = usePatientSummaryQuery(encounter?.patientId ?? "")

	return (
		<ChartContext.Provider
			value={{
				encounterId,
				patientId: encounter?.patientId ?? "",
				encounter,
				isLoading,
				facilityId: encounter?.facilityId,
				activeAllergyCount: summary?.activeAllergyCount ?? 0,
				hasSevereAllergies: summary?.hasSevereAllergies ?? false,
				canViewClinicalSummary: true,
				canViewVitals: false,
			}}
		>
			{children}
		</ChartContext.Provider>
	)
}

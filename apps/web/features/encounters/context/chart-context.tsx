"use client"

import { createContext, useContext } from "react"

import type { EncounterDetail } from "@repo/contracts"

export interface ChartContextValue {
	encounterId: string
	patientId: string
	encounter: EncounterDetail | undefined
	isLoading: boolean
	facilityId: string | undefined
	activeAllergyCount: number
	hasSevereAllergies: boolean
}

export const ChartContext = createContext<ChartContextValue | null>(null)

export function useChartContext(): ChartContextValue {
	const ctx = useContext(ChartContext)
	if (!ctx) throw new Error("useChartContext must be used within chart layout")
	return ctx
}

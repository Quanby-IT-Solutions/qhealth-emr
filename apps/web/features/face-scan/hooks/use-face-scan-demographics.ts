"use client"

import { useMemo } from "react"

import { useEncounterDetailQuery } from "@/features/encounters/api/encounters.hooks"
import {
	calculateAgeYears,
	mapPatientSexToFaceScanGender,
	type FaceScanDemographics,
} from "@/features/face-scan/lib/face-scan-demographics"
import { usePatientProfileQuery } from "@/features/patients/api/patients.hooks"

export function useFaceScanDemographicsFromEncounter(
	encounterId: string | undefined
): FaceScanDemographics {
	const { data } = useEncounterDetailQuery(encounterId ?? "", { enabled: Boolean(encounterId) })

	return useMemo(() => {
		if (!data) return {}
		const age = calculateAgeYears(data.patientDateOfBirth)
		const gender = mapPatientSexToFaceScanGender(data.patientSex)
		return {
			age: age ?? undefined,
			gender,
		}
	}, [data])
}

export function useFaceScanDemographicsFromPatient(
	patientId: string | undefined
): FaceScanDemographics {
	const { data } = usePatientProfileQuery(patientId ?? "")

	return useMemo(() => {
		if (!data) return {}
		const age = calculateAgeYears(data.dateOfBirth)
		const gender = mapPatientSexToFaceScanGender(data.sex)
		return {
			age: age ?? undefined,
			gender,
		}
	}, [data])
}

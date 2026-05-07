"use client"

import { useEffect } from "react"

import { useEncounterDetailQuery } from "@/features/encounters/api/encounters.hooks"
import { useVitalsQuery } from "@/features/nursing/api/nursing.hooks"
import { usePatientSummaryQuery } from "@/features/problems-allergies/api/problems-allergies.hooks"

import {
	loadEncounterSummary,
	saveEncounterSummary,
	type OfflineEncounterHeader,
	type OfflineEncounterSummary,
	type OfflineVitalSummary,
} from "./offline-cache"
import { useOfflineSync } from "./use-offline-sync"

export interface UseOfflineEncounterResult {
	isOnline: boolean
	/** The latest vital sign: live data when online, cached when offline. */
	latestVital: OfflineVitalSummary | null
	/** Full cached encounter summary. Non-null only when offline. */
	cachedSummary: OfflineEncounterSummary | null
	/** ISO timestamp of the last successful cache write, or null. */
	cachedAt: string | null
}

/**
 * Manages offline caching for an encounter's summary data.
 *
 * When online: fetches encounter detail, latest vitals, and patient summary,
 * then persists the combined payload to localStorage via saveEncounterSummary.
 *
 * When offline: loads from localStorage and surfaces the cached data.
 */
export function useOfflineEncounter(
	encounterId: string,
	patientId: string,
): UseOfflineEncounterResult {
	const { isOnline } = useOfflineSync()

	const { data: encounter } = useEncounterDetailQuery(encounterId, {
		enabled: isOnline && !!encounterId,
	})
	const { data: vitalsData } = useVitalsQuery({ encounterId: isOnline ? encounterId : undefined, limit: 1, page: 1 })
	const { data: patientSummary } = usePatientSummaryQuery(patientId)

	useEffect(() => {
		if (!isOnline || !encounter || !encounterId) return

		const rawVital = vitalsData?.data?.[0] ?? null

		const latestVitals: OfflineVitalSummary | null = rawVital
			? {
					id: rawVital.id,
					temperature: rawVital.temperature,
					bpSystolic: rawVital.bpSystolic,
					bpDiastolic: rawVital.bpDiastolic,
					heartRate: rawVital.heartRate,
					respiratoryRate: rawVital.respiratoryRate,
					spo2: rawVital.spo2,
					newsScore: rawVital.newsScore,
					newsRiskLevel: rawVital.newsRiskLevel,
					recordedAt: rawVital.recordedAt,
				}
			: null

		const encounterHeader: OfflineEncounterHeader = {
			id: encounter.id,
			facilityId: encounter.facilityId,
			patientId: encounter.patientId,
			patientName: encounter.patientName,
			patientMrn: encounter.patientMrn,
			patientDateOfBirth: encounter.patientDateOfBirth,
			patientSex: encounter.patientSex,
			encounterType: encounter.encounterType,
			status: encounter.status,
			chiefComplaint: encounter.chiefComplaint,
			admissionDatetime: encounter.admissionDatetime,
			dischargeDatetime: encounter.dischargeDatetime,
			disposition: encounter.disposition,
			admittingStaffName: encounter.admittingStaffName,
			attendingStaffName: encounter.attendingStaffName,
			wardName: encounter.wardName,
			bedNumber: encounter.bedNumber,
			oecbEligible: encounter.oecbEligible,
			transfers: encounter.transfers,
		}

		const activeProblems = (patientSummary?.activeProblems ?? []).map(p => ({
			id: p.id,
			description: p.description,
			icd10Code: p.icd10Code,
			icd10Display: p.icd10Display,
			snomedCode: p.snomedCode ?? undefined,
			snomedDisplay: p.snomedDisplay ?? undefined,
			onsetDate: p.onsetDate,
			status: p.status as "active" | "resolved",
		}))

		const activeAllergies = (patientSummary?.activeAllergies ?? []).map(a => ({
			id: a.id,
			allergenName: a.allergenName,
			allergenType: a.allergenType,
			reactionType: a.reactionType,
			severity: a.severity,
			onsetDate: a.onsetDate,
			isActive: a.isActive,
		}))

		const summary: OfflineEncounterSummary = {
			encounter: encounterHeader,
			latestVitals,
			activeProblems,
			activeAllergies,
			activeProblemCount: patientSummary?.activeProblemCount ?? activeProblems.length,
			activeAllergyCount: patientSummary?.activeAllergyCount ?? activeAllergies.length,
			hasSevereAllergies: patientSummary?.hasSevereAllergies ?? false,
		}

		saveEncounterSummary(encounterId, summary)
	}, [isOnline, encounter, vitalsData, patientSummary, encounterId])

	if (!isOnline) {
		const cached = loadEncounterSummary(encounterId)
		return {
			isOnline,
			latestVital: cached?.summary.latestVitals ?? null,
			cachedSummary: cached?.summary ?? null,
			cachedAt: cached?.cachedAt ?? null,
		}
	}

	const rawVital = vitalsData?.data?.[0] ?? null
	const latestVital: OfflineVitalSummary | null = rawVital
		? {
				id: rawVital.id,
				temperature: rawVital.temperature,
				bpSystolic: rawVital.bpSystolic,
				bpDiastolic: rawVital.bpDiastolic,
				heartRate: rawVital.heartRate,
				respiratoryRate: rawVital.respiratoryRate,
				spo2: rawVital.spo2,
				newsScore: rawVital.newsScore,
				newsRiskLevel: rawVital.newsRiskLevel,
				recordedAt: rawVital.recordedAt,
			}
		: null

	return { isOnline, latestVital, cachedSummary: null, cachedAt: null }
}

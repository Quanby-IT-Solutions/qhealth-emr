"use client"

import { useEffect } from "react"

import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { usePatientSearchQuery } from "@/features/patients/api/patients.hooks"

import {
	type OfflinePatientSummary,
	loadPatientSummaries,
	savePatientSummaries,
} from "./offline-cache"
import { useOfflineSync } from "./use-offline-sync"

export interface UseOfflinePatientsResult {
	/** Whether the browser is currently connected to the network. */
	isOnline: boolean
	/**
	 * Patients from the offline cache. Only populated when offline AND a valid
	 * cache exists. Empty array otherwise.
	 */
	offlinePatients: OfflinePatientSummary[]
	/** ISO timestamp of the last successful cache write, or null. */
	cachedAt: string | null
}

/**
 * Returns the offline-cached patient list and keeps the cache warm whenever
 * the browser is online.
 *
 * When online the hook transparently saves patient search results into
 * localStorage so they remain accessible if the network is subsequently lost.
 */
export function useOfflinePatients(): UseOfflinePatientsResult {
	const facilityId = useActiveFacilityId()
	const { isOnline } = useOfflineSync()

	// Load live patients when online so we can keep the cache fresh
	const { data: searchResult } = usePatientSearchQuery(
		{ facilityId: facilityId ?? "", isActive: true, limit: 100 },
		{ enabled: isOnline && !!facilityId }
	)

	// Populate / refresh the localStorage cache whenever we get fresh data
	useEffect(() => {
		if (!facilityId || !isOnline) return
		const patients = searchResult?.data
		if (!patients || patients.length === 0) return

		const summaries: OfflinePatientSummary[] = patients.map((p: (typeof patients)[number]) => ({
			id: p.id,
			mrn: p.mrn,
			firstName: p.firstName,
			lastName: p.lastName,
			dateOfBirth: p.dateOfBirth,
			sex: p.sex,
			isActive: p.isActive,
		}))

		savePatientSummaries(facilityId, summaries)
	}, [facilityId, isOnline, searchResult])

	// When offline, serve from cache
	if (!isOnline && facilityId) {
		const cached = loadPatientSummaries(facilityId)
		return {
			isOnline,
			offlinePatients: cached?.patients ?? [],
			cachedAt: cached?.cachedAt ?? null,
		}
	}

	return { isOnline, offlinePatients: [], cachedAt: null }
}

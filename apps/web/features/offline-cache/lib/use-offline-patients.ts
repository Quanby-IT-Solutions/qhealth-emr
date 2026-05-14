"use client"

import { useEffect } from "react"

import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { useOfflineSummarySnapshotQuery } from "@/features/system-settings/api/system-settings.hooks"

import {
	importOfflineSummarySnapshot,
	loadPatientSummaries,
	type OfflinePatientSummary,
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

	const { data: preparedSnapshot } = useOfflineSummarySnapshotQuery({
		enabled: isOnline && !!facilityId,
	})

	// Populate / refresh the browser cache from the backend-prepared snapshot.
	useEffect(() => {
		if (!facilityId || !isOnline || !preparedSnapshot) return
		if (preparedSnapshot.facilityId !== facilityId) return
		importOfflineSummarySnapshot(preparedSnapshot)
	}, [facilityId, isOnline, preparedSnapshot])

	// Serve cached metadata in both online and offline modes. Online screens use
	// the live API for lists, but still need cache age/count for readiness notices.
	if (facilityId) {
		const cached = loadPatientSummaries(facilityId)
		return {
			isOnline,
			offlinePatients: cached?.patients ?? [],
			cachedAt: cached?.cachedAt ?? null,
		}
	}

	return { isOnline, offlinePatients: [], cachedAt: null }
}

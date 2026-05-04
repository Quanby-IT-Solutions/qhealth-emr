/**
 * Offline patient summary cache backed by localStorage.
 *
 * TOR §4.2 requires that patient summaries are available locally during
 * network outages. This module handles serialisation, versioning, and
 * retrieval of that cached dataset.
 */

const CACHE_KEY_PREFIX = "qhealth_offline_patients_"
const CACHE_VERSION = 2

export interface OfflinePatientSummary {
	id: string
	mrn: string
	firstName: string
	middleName: string | null
	lastName: string
	dateOfBirth: string
	sex: string
	isActive: boolean
}

interface OfflinePatientsCache {
	version: number
	cachedAt: string
	facilityId: string
	patients: OfflinePatientSummary[]
}

function cacheKey(facilityId: string) {
	return `${CACHE_KEY_PREFIX}${facilityId}`
}

/** Persist patient summaries for a facility. Silent on quota errors. */
export function savePatientSummaries(facilityId: string, patients: OfflinePatientSummary[]): void {
	const payload: OfflinePatientsCache = {
		version: CACHE_VERSION,
		cachedAt: new Date().toISOString(),
		facilityId,
		patients,
	}
	try {
		localStorage.setItem(cacheKey(facilityId), JSON.stringify(payload))
	} catch {
		// localStorage is full or unavailable — fail silently
	}
}

/**
 * Load cached patient summaries for a facility.
 * Returns null if there is no valid cache or if the version is outdated.
 */
export function loadPatientSummaries(facilityId: string): OfflinePatientsCache | null {
	try {
		const raw = localStorage.getItem(cacheKey(facilityId))
		if (!raw) return null
		const parsed = JSON.parse(raw) as OfflinePatientsCache
		if (parsed.version !== CACHE_VERSION) return null
		return parsed
	} catch {
		return null
	}
}

/** Remove the offline cache for a facility. */
export function clearPatientSummaries(facilityId: string): void {
	try {
		localStorage.removeItem(cacheKey(facilityId))
	} catch {
		// ignore
	}
}

/** True if there is a valid, non-empty cache for this facility. */
export function isOfflineCacheAvailable(facilityId: string): boolean {
	const cache = loadPatientSummaries(facilityId)
	return cache !== null && cache.patients.length > 0
}

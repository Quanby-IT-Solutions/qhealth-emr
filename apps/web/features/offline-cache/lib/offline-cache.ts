/**
 * Offline patient summary cache backed by localStorage.
 *
 * TOR §4.2 requires that patient summaries are available locally during
 * network outages. This module handles serialisation, versioning, and
 * retrieval of that cached dataset.
 */

const CACHE_KEY_PREFIX = "qhealth_offline_patients_"
const CACHE_VERSION = 2
const ENCOUNTER_CACHE_KEY_PREFIX = "qhealth_offline_encounter_summary_"
const ENCOUNTER_CACHE_VERSION = 2

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

export interface OfflineVitalSummary {
	id: string
	temperature: string | number | null
	bpSystolic: number | null
	bpDiastolic: number | null
	heartRate: number | null
	respiratoryRate: number | null
	spo2: string | number | null
	newsScore?: number | null
	newsRiskLevel?: "low" | "medium" | "high" | null
	recordedAt: string | Date
}

export interface OfflineProblemSummary {
	id: string
	description: string
	icd10Code: string | null
	icd10Display?: string | null
	snomedCode?: string | null
	snomedDisplay?: string | null
	onsetDate?: string | null
	status: "active" | "resolved"
}

export interface OfflineAllergySummary {
	id: string
	allergenName: string
	allergenType: "medication" | "food" | "environmental"
	reactionType: string | null
	severity: "mild" | "moderate" | "severe"
	onsetDate: string | null
	isActive: boolean
}

export interface OfflineMedicationSummary {
	id: string
	genericName: string
	dose: string
	doseUnit: string
	route: string
	frequency: string
	status: string
}

export interface OfflineEncounterHeader {
	id: string
	facilityId: string
	patientId: string
	patientName: string
	patientMrn: string
	patientDateOfBirth: string
	patientSex: "male" | "female" | "other"
	encounterType: "inpatient" | "outpatient" | "emergency" | "telemedicine"
	status: "active" | "pending_discharge" | "discharged" | "closed" | "cancelled"
	chiefComplaint: string | null
	admissionDatetime: string | Date
	dischargeDatetime: string | Date | null
	disposition: "home" | "transfer" | "deceased" | "ama" | null
	admittingStaffName: string | null
	attendingStaffName: string | null
	wardName: string | null
	bedNumber: string | null
	oecbEligible: boolean
	transfers: unknown[]
}

export interface OfflineEncounterSummary {
	encounter: OfflineEncounterHeader
	latestVitals: OfflineVitalSummary | null
	activeProblems: OfflineProblemSummary[]
	activeAllergies: OfflineAllergySummary[]
	activeMedications: OfflineMedicationSummary[]
	activeProblemCount: number
	activeAllergyCount: number
	hasSevereAllergies: boolean
}

interface OfflinePatientsCache {
	version: number
	cachedAt: string
	facilityId: string
	patients: OfflinePatientSummary[]
}

interface OfflineEncounterSummaryCache {
	version: number
	cachedAt: string
	encounterId: string
	summary: OfflineEncounterSummary
}

function cacheKey(facilityId: string) {
	return `${CACHE_KEY_PREFIX}${facilityId}`
}

function encounterCacheKey(encounterId: string) {
	return `${ENCOUNTER_CACHE_KEY_PREFIX}${encounterId}`
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

/** Persist a full encounter summary for offline chart review. */
export function saveEncounterSummary(encounterId: string, summary: OfflineEncounterSummary): void {
	const payload: OfflineEncounterSummaryCache = {
		version: ENCOUNTER_CACHE_VERSION,
		cachedAt: new Date().toISOString(),
		encounterId,
		summary,
	}
	try {
		localStorage.setItem(encounterCacheKey(encounterId), JSON.stringify(payload))
	} catch {
		// localStorage is full or unavailable; the online chart remains unaffected
	}
}

/** Load a cached encounter summary, or null when unavailable/outdated. */
export function loadEncounterSummary(encounterId: string): OfflineEncounterSummaryCache | null {
	try {
		const raw = localStorage.getItem(encounterCacheKey(encounterId))
		if (!raw) return null
		const parsed = JSON.parse(raw) as OfflineEncounterSummaryCache
		if (parsed.version !== ENCOUNTER_CACHE_VERSION) return null
		return parsed
	} catch {
		return null
	}
}

/** Remove the offline encounter summary cache for a specific encounter. */
export function clearEncounterSummary(encounterId: string): void {
	try {
		localStorage.removeItem(encounterCacheKey(encounterId))
	} catch {
		// ignore
	}
}

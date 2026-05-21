"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { env } from "@/env"

// ============================================================================
// Helpers
// ============================================================================

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/death-reporting`

function buildQueryString(params: Record<string, string | number | boolean | undefined | null>) {
	const filtered = Object.entries(params).filter(
		([, v]) => v !== undefined && v !== null && v !== ""
	)
	if (!filtered.length) return ""
	return `?${filtered.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&")}`
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
	const res = await fetch(url, {
		...init,
		credentials: "include",
		headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
	})
	if (!res.ok) {
		const text = await res.text().catch(() => res.statusText)
		throw new Error(text || `HTTP ${res.status}`)
	}
	return res.json() as Promise<T>
}

// ============================================================================
// Helpers — patient eligibility
// ============================================================================

export type DeathReportWorkflowStatus = "draft" | "completed" | "submitted"

export function calculateAgeYears(dateOfBirth: string, at: Date = new Date()): number | null {
	const dob = new Date(dateOfBirth)
	if (Number.isNaN(dob.getTime())) return null

	let age = at.getFullYear() - dob.getFullYear()
	const birthdayThisYear = new Date(at.getFullYear(), dob.getMonth(), dob.getDate())
	if (at < birthdayThisYear) age -= 1
	return age
}

/**
 * Returns true when the patient is reproductive-age female (10-49 years).
 */
export function isMaternalDeathCandidate(sex: string, dateOfBirth: string): boolean {
	if (sex.toLowerCase() !== "female") return false
	const ageYears = calculateAgeYears(dateOfBirth)
	return ageYears !== null && ageYears >= 10 && ageYears < 50
}

/**
 * Returns true when the patient is a neonate (<= 28 days old).
 */
export function isNeonatalDeathCandidate(dateOfBirth: string): boolean {
	const ageDays = (Date.now() - new Date(dateOfBirth).getTime()) / (1000 * 60 * 60 * 24)
	return ageDays >= 0 && ageDays <= 28
}

export function isDeathReportSubmitted(status: DeathReportWorkflowStatus | null | undefined) {
	return status === "submitted" || status === "completed"
}

// ============================================================================
// Types — FMDRF (Facility Maternal Death Review Form)
// ============================================================================

export interface FmdrfReport {
	id: string
	encounterId: string
	patientId: string
	facilityId: string

	// Section 1 – Patient Demographics
	patientName: string
	patientMrn: string
	patientAge: number
	patientAddress: string

	// Section 2 – Death Details
	dateOfDeath: string // ISO datetime
	placeOfDeath: string
	causeOfDeathImmediate: string
	causeOfDeathAntecedent: string
	causeOfDeathUnderlying: string
	causeOfDeathContributing: string | null

	// Section 3 – Maternal History
	gravidity: number
	parity: number
	lastMenstrualPeriod: string | null
	gestationalAgeWeeks: number | null
	antenatalCare: boolean
	antenatalVisitCount: number | null
	complicationType: string | null

	// Section 4 – Contributing Factors
	factorHemorrhage: boolean
	factorSepsis: boolean
	factorEclampsia: boolean
	factorObstructedLabor: boolean
	factorUnsafeAbortion: boolean
	factorOther: string | null

	// Section 5 – Preventability
	avoidableFactors: boolean
	avoidableRemark: string | null

	// Section 6 – Physician Certification
	physicianName: string
	physicianLicenseNo: string
	physicianSignatureDataUrl: string
	certificationDate: string

	status: "draft" | "completed" | "submitted"
	createdAt: string
	updatedAt: string
}

export type CreateFmdrfInput = Omit<FmdrfReport, "id" | "createdAt" | "updatedAt" | "status">
export type UpdateFmdrfInput = Partial<
	Omit<FmdrfReport, "id" | "createdAt" | "updatedAt" | "status">
> & {
	id: string
}

// ============================================================================
// Types — FNDRF (Facility Neonatal Death Review Form)
// ============================================================================

export interface FndrfReport {
	id: string
	encounterId: string
	patientId: string
	facilityId: string

	// Section 1 – Newborn Info
	newbornName: string
	newbornMrn: string
	newbornDateOfBirth: string

	// Section 2 – Birth History
	gestationalAgeWeeks: number
	birthWeightGrams: number
	deliveryType: "svd" | "cs" | "forceps" | "vacuum" | "other"
	apgarScore1Min: number | null
	apgarScore5Min: number | null
	resuscitationRequired: boolean

	// Section 3 — Maternal Info
	motherName: string
	motherAge: number
	motherGravidity: number
	motherParity: number
	motherAncVisits: number | null

	// Section 4 – Death Circumstances
	dateOfDeath: string
	ageAtDeathHours: number | null
	ageAtDeathDays: number | null
	placeOfDeath: string

	// Section 5 – Cause of Death
	causePrematurity: boolean
	causeBirthAsphyxia: boolean
	causeSepsis: boolean
	causeCongenitalAnomaly: boolean
	causeRds: boolean
	causeOther: string | null

	// Section 6 – Contributing Factors / Remarks
	contributingRemarks: string | null

	// Section 7 – Physician Certification
	physicianName: string
	physicianLicenseNo: string
	physicianSignatureDataUrl: string
	certificationDate: string

	status: "draft" | "completed" | "submitted"
	createdAt: string
	updatedAt: string
}

export type CreateFndrfInput = Omit<FndrfReport, "id" | "createdAt" | "updatedAt" | "status">
export type UpdateFndrfInput = Partial<
	Omit<FndrfReport, "id" | "createdAt" | "updatedAt" | "status">
> & {
	id: string
}

// ============================================================================
// Types — By-Encounter lookup
// ============================================================================

export interface DeathReportStatus {
	hasFmdrf: boolean
	hasFndrf: boolean
	fmdrfId: string | null
	fndrfId: string | null
	fmdrfStatus: DeathReportWorkflowStatus | null
	fndrfStatus: DeathReportWorkflowStatus | null
}

// ============================================================================
// Query Keys
// ============================================================================

const deathReportingKeys = {
	all: ["death-reporting"] as const,
	statusByEncounter: (encounterId: string) =>
		[...deathReportingKeys.all, "status", encounterId] as const,
	fmdrf: (encounterId: string) => [...deathReportingKeys.all, "fmdrf", encounterId] as const,
	fndrf: (encounterId: string) => [...deathReportingKeys.all, "fndrf", encounterId] as const,
}

// ============================================================================
// Hooks — status
// ============================================================================

export function useDeathReportStatusQuery(encounterId: string) {
	return useQuery({
		queryKey: deathReportingKeys.statusByEncounter(encounterId),
		queryFn: () =>
			fetchJson<DeathReportStatus>(`${API_BASE}/status${buildQueryString({ encounterId })}`),
		enabled: !!encounterId,
	})
}

// ============================================================================
// Hooks — FMDRF
// ============================================================================

export function useFmdrfQuery(encounterId: string) {
	return useQuery({
		queryKey: deathReportingKeys.fmdrf(encounterId),
		queryFn: () =>
			fetchJson<FmdrfReport | null>(`${API_BASE}/fmdrf${buildQueryString({ encounterId })}`),
		enabled: !!encounterId,
	})
}

export function useCreateFmdrfMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (input: CreateFmdrfInput) =>
			fetchJson<FmdrfReport>(`${API_BASE}/fmdrf`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: data => {
			void qc.invalidateQueries({ queryKey: deathReportingKeys.fmdrf(data.encounterId) })
			void qc.invalidateQueries({
				queryKey: deathReportingKeys.statusByEncounter(data.encounterId),
			})
		},
	})
}

export function useUpdateFmdrfMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, ...rest }: UpdateFmdrfInput) =>
			fetchJson<FmdrfReport>(`${API_BASE}/fmdrf/${id}`, {
				method: "PATCH",
				body: JSON.stringify(rest),
			}),
		onSuccess: data => {
			void qc.invalidateQueries({ queryKey: deathReportingKeys.fmdrf(data.encounterId) })
			void qc.invalidateQueries({
				queryKey: deathReportingKeys.statusByEncounter(data.encounterId),
			})
		},
	})
}

export function useMarkDeathReportPaidMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, paidAt }: { id: string; encounterId: string; paidAt?: string }) =>
			fetchJson<{ id: string; paidAt: string | null }>(`${API_BASE}/${id}/mark-paid`, {
				method: "POST",
				body: JSON.stringify({ paidAt }),
			}),
		onSuccess: (_data, variables) => {
			void qc.invalidateQueries({
				queryKey: deathReportingKeys.statusByEncounter(variables.encounterId),
			})
		},
	})
}

export function useMarkDeathReportReleasedMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, releasedAt }: { id: string; encounterId: string; releasedAt?: string }) =>
			fetchJson<{
				id: string
				releasedByStaffId: string | null
				releasedAt: string | null
				status: string
				completedAt: string | null
			}>(`${API_BASE}/${id}/mark-released`, {
				method: "POST",
				body: JSON.stringify({ releasedAt }),
			}),
		onSuccess: (_data, variables) => {
			void qc.invalidateQueries({
				queryKey: deathReportingKeys.statusByEncounter(variables.encounterId),
			})
			void qc.invalidateQueries({ queryKey: deathReportingKeys.fmdrf(variables.encounterId) })
			void qc.invalidateQueries({ queryKey: deathReportingKeys.fndrf(variables.encounterId) })
		},
	})
}

// ============================================================================
// Hooks — FNDRF
// ============================================================================

export function useFndrfQuery(encounterId: string) {
	return useQuery({
		queryKey: deathReportingKeys.fndrf(encounterId),
		queryFn: () =>
			fetchJson<FndrfReport | null>(`${API_BASE}/fndrf${buildQueryString({ encounterId })}`),
		enabled: !!encounterId,
	})
}

export function useCreateFndrfMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (input: CreateFndrfInput) =>
			fetchJson<FndrfReport>(`${API_BASE}/fndrf`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: data => {
			void qc.invalidateQueries({ queryKey: deathReportingKeys.fndrf(data.encounterId) })
			void qc.invalidateQueries({
				queryKey: deathReportingKeys.statusByEncounter(data.encounterId),
			})
		},
	})
}

export function useUpdateFndrfMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, ...rest }: UpdateFndrfInput) =>
			fetchJson<FndrfReport>(`${API_BASE}/fndrf/${id}`, {
				method: "PATCH",
				body: JSON.stringify(rest),
			}),
		onSuccess: data => {
			void qc.invalidateQueries({ queryKey: deathReportingKeys.fndrf(data.encounterId) })
			void qc.invalidateQueries({
				queryKey: deathReportingKeys.statusByEncounter(data.encounterId),
			})
		},
	})
}

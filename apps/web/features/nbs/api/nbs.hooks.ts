"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { env } from "@/env"

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/nbs`

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
	const res = await fetch(url, {
		credentials: "include",
		...init,
		headers: {
			"Content-Type": "application/json",
			...init?.headers,
		},
	})
	if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
	return res.json() as Promise<T>
}

function buildQueryString(
	params: Record<string, string | number | boolean | undefined>
): string {
	const entries = Object.entries(params).filter(([, v]) => v !== undefined)
	if (entries.length === 0) return ""
	return (
		"?" +
		entries
			.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
			.join("&")
	)
}

// ============================================================================
// Types
// ============================================================================

export type NbsStatus = "pending" | "collected" | "sent" | "resulted" | "positive" | "negative"

export type NbsSpecimenType = "dried_blood_spot" | "cord_blood" | "heel_prick"

export type NbsConsentType = "consent" | "waiver"

export type NbsReferralStatus = "pending" | "accepted" | "completed" | "declined"

export interface NbsScreening {
	id: string
	encounterId: string
	patientId: string
	facilityId: string

	// Timing
	birthDatetime: string
	specimenCollectedAt: string | null
	specimenSentAt: string | null
	resultReceivedAt: string | null

	// Specimen
	specimenType: NbsSpecimenType | null
	specimenBarcode: string | null
	specimenCollectedBy: string | null
	specimenCollectedByName: string | null

	// Status
	status: NbsStatus

	// Results — NBS panel conditions (DOH mandated)
	result_ch: "positive" | "negative" | "borderline" | null // Congenital Hypothyroidism
	result_cah: "positive" | "negative" | "borderline" | null // Congenital Adrenal Hyperplasia
	result_g6pd: "positive" | "negative" | "borderline" | null // G6PD Deficiency
	result_gal: "positive" | "negative" | "borderline" | null // Galactosemia
	result_pku: "positive" | "negative" | "borderline" | null // Phenylketonuria
	result_msud: "positive" | "negative" | "borderline" | null // Maple Syrup Urine Disease
	result_overall: "normal" | "abnormal" | "borderline" | null

	// Notes
	notes: string | null
	performedBy: string
	performedByName: string
	createdAt: string
	updatedAt: string
}

export interface CreateNbsScreeningInput {
	encounterId: string
	patientId: string
	facilityId: string
	birthDatetime: string
	specimenType?: NbsSpecimenType
	specimenBarcode?: string
	specimenCollectedAt?: string
	specimenCollectedBy?: string
	notes?: string
}

export interface UpdateNbsScreeningInput {
	id: string
	encounterId?: string
	specimenType?: NbsSpecimenType
	specimenBarcode?: string
	specimenCollectedAt?: string
	specimenCollectedBy?: string
	specimenSentAt?: string
	resultReceivedAt?: string
	status?: NbsStatus
	result_ch?: "positive" | "negative" | "borderline"
	result_cah?: "positive" | "negative" | "borderline"
	result_g6pd?: "positive" | "negative" | "borderline"
	result_gal?: "positive" | "negative" | "borderline"
	result_pku?: "positive" | "negative" | "borderline"
	result_msud?: "positive" | "negative" | "borderline"
	result_overall?: "normal" | "abnormal" | "borderline"
	notes?: string
}

export interface NbsConsent {
	id: string
	nbsId: string
	encounterId: string
	patientId: string
	consentType: NbsConsentType
	parentName: string
	relationship: string
	waiversReason: string | null
	signatureDataUrl: string | null
	signedAt: string
	witnessName: string | null
	performedBy: string
	performedByName: string
	createdAt: string
}

export interface CreateNbsConsentInput {
	nbsId: string
	encounterId: string
	patientId: string
	consentType: NbsConsentType
	parentName: string
	relationship: string
	waiverReason?: string
	signatureDataUrl?: string
	witnessName?: string
}

export interface NbsReferral {
	id: string
	nbsId: string
	encounterId: string
	patientId: string
	referredCondition: string
	referralFacility: string
	referralDatetime: string
	referralStatus: NbsReferralStatus
	acceptedAt: string | null
	completedAt: string | null
	referralNotes: string | null
	performedBy: string
	performedByName: string
	createdAt: string
	updatedAt: string
}

export interface CreateNbsReferralInput {
	nbsId: string
	encounterId: string
	patientId: string
	referredCondition: string
	referralFacility: string
	referralDatetime: string
	referralNotes?: string
}

export interface UpdateNbsReferralInput {
	id: string
	referralStatus?: NbsReferralStatus
	acceptedAt?: string
	completedAt?: string
	referralNotes?: string
}

export interface NbsLogbookEntry {
	id: string
	encounterId: string
	patientId: string
	patientName: string
	patientMrn: string
	birthDatetime: string
	specimenCollectedAt: string | null
	status: NbsStatus
	result_overall: "normal" | "abnormal" | "borderline" | null
	facilityId: string
	createdAt: string
}

export interface NbsLogbookResponse {
	data: NbsLogbookEntry[]
	total: number
	page: number
	limit: number
	totalPages: number
}

// ============================================================================
// Query keys
// ============================================================================

export const nbsKeys = {
	all: ["nbs"] as const,
	screening: (encounterId: string) => ["nbs", "screening", encounterId] as const,
	consent: (nbsId: string) => ["nbs", "consent", nbsId] as const,
	referrals: (nbsId: string) => ["nbs", "referrals", nbsId] as const,
	logbook: (facilityId: string, page?: number) =>
		["nbs", "logbook", facilityId, page] as const,
}

// ============================================================================
// Screening hooks
// ============================================================================

export function useNbsScreeningQuery(encounterId: string) {
	return useQuery({
		queryKey: nbsKeys.screening(encounterId),
		queryFn: () =>
			fetchJson<NbsScreening | null>(
				`${API_BASE}/encounters/${encounterId}/screening`
			),
		enabled: Boolean(encounterId),
	})
}

export function useCreateNbsScreeningMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: CreateNbsScreeningInput) =>
			fetchJson<NbsScreening>(`${API_BASE}/screenings`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: (_, variables) => {
			void queryClient.invalidateQueries({
				queryKey: nbsKeys.screening(variables.encounterId),
			})
		},
	})
}

export function useUpdateNbsScreeningMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, ...body }: UpdateNbsScreeningInput) =>
			fetchJson<NbsScreening>(`${API_BASE}/screenings/${id}`, {
				method: "PATCH",
				body: JSON.stringify(body),
			}),
		onSuccess: (data) => {
			void queryClient.invalidateQueries({
				queryKey: nbsKeys.screening(data.encounterId),
			})
		},
	})
}

// ============================================================================
// Consent hooks
// ============================================================================

export function useNbsConsentQuery(nbsId: string) {
	return useQuery({
		queryKey: nbsKeys.consent(nbsId),
		queryFn: () =>
			fetchJson<NbsConsent | null>(`${API_BASE}/screenings/${nbsId}/consent`),
		enabled: Boolean(nbsId),
	})
}

export function useCreateNbsConsentMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: CreateNbsConsentInput) =>
			fetchJson<NbsConsent>(`${API_BASE}/consents`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: (data) => {
			void queryClient.invalidateQueries({
				queryKey: nbsKeys.consent(data.nbsId),
			})
		},
	})
}

// ============================================================================
// Referral hooks
// ============================================================================

export function useNbsReferralsQuery(nbsId: string) {
	return useQuery({
		queryKey: nbsKeys.referrals(nbsId),
		queryFn: () =>
			fetchJson<NbsReferral[]>(`${API_BASE}/screenings/${nbsId}/referrals`),
		enabled: Boolean(nbsId),
	})
}

export function useCreateNbsReferralMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: CreateNbsReferralInput) =>
			fetchJson<NbsReferral>(`${API_BASE}/referrals`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: (data) => {
			void queryClient.invalidateQueries({
				queryKey: nbsKeys.referrals(data.nbsId),
			})
		},
	})
}

export function useUpdateNbsReferralMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, ...body }: UpdateNbsReferralInput) =>
			fetchJson<NbsReferral>(`${API_BASE}/referrals/${id}`, {
				method: "PATCH",
				body: JSON.stringify(body),
			}),
		onSuccess: (data) => {
			void queryClient.invalidateQueries({
				queryKey: nbsKeys.referrals(data.nbsId),
			})
		},
	})
}

// ============================================================================
// Logbook hook
// ============================================================================

export function useNbsLogbookQuery(facilityId: string, page = 1) {
	return useQuery({
		queryKey: nbsKeys.logbook(facilityId, page),
		queryFn: () =>
			fetchJson<NbsLogbookResponse>(
				`${API_BASE}/logbook${buildQueryString({ facilityId, page, limit: 25 })}`
			),
		enabled: Boolean(facilityId),
	})
}

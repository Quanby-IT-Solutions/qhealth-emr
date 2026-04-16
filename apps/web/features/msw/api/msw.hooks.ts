"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { env } from "@/env"

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/msw`

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

export type BeneficiaryClass =
	| "sponsored"
	| "indigent"
	| "employed"
	| "self_employed"
	| "lifetime"
	| "ofw"
	| "other"

export type FinancialClassification =
	| "a" // Rich / sufficient
	| "b" // Middle income
	| "c" // Low income
	| "d" // Below poverty threshold

export interface FinancialEvaluation {
	id: string
	encounterId: string
	patientId: string
	performedBy: string
	performedByName: string
	performedAt: string

	// Household profile
	householdSize: number
	monthlyHouseholdIncome: number
	monthlyExpenses: number
	hasRegularIncome: boolean
	incomeSource: string | null

	// Classification
	beneficiaryClass: BeneficiaryClass
	financialClass: FinancialClassification

	// Findings
	findings: string
	recommendations: string | null
	socialHistoryNotes: string | null

	createdAt: string
	updatedAt: string
}

export interface CreateFinancialEvaluationInput {
	encounterId: string
	patientId: string
	householdSize: number
	monthlyHouseholdIncome: number
	monthlyExpenses: number
	hasRegularIncome: boolean
	incomeSource?: string
	beneficiaryClass: BeneficiaryClass
	financialClass: FinancialClassification
	findings: string
	recommendations?: string
	socialHistoryNotes?: string
}

// ─── CoE ────────────────────────────────────────────────────────────────────

export type CoeProgram = "malasakit" | "pcso" | "dswd" | "owwa" | "pagibig"

export type CoeStatus = "pending" | "approved" | "released" | "denied"

export interface CoE {
	id: string
	encounterId: string
	patientId: string
	program: CoeProgram
	controlNumber: string | null
	requestedAmount: number | null
	approvedAmount: number | null
	status: CoeStatus
	issuedBy: string
	issuedByName: string
	issuedAt: string
	releasedAt: string | null
	notes: string | null
	createdAt: string
	updatedAt: string
}

export interface CreateCoeInput {
	encounterId: string
	patientId: string
	program: CoeProgram
	requestedAmount?: number
	notes?: string
}

export interface UpdateCoeInput {
	id: string
	status?: CoeStatus
	controlNumber?: string
	approvedAmount?: number
	notes?: string
}

export interface CoeListResponse {
	certificates: CoE[]
}

// ─── Annex Signatures ────────────────────────────────────────────────────────

export type AnnexType = "a" | "b"

export interface AnnexSignature {
	id: string
	encounterId: string
	patientId: string
	annexType: AnnexType
	signatureDataUrl: string // base64 canvas data URL
	signedBy: string // patient name
	signedAt: string
	witnessName: string | null
	createdAt: string
}

export interface CreateAnnexSignatureInput {
	encounterId: string
	patientId: string
	annexType: AnnexType
	signatureDataUrl: string
	signedBy: string
	witnessName?: string
}

export interface AnnexSignatureListResponse {
	signatures: AnnexSignature[]
}

// ─── Benefit Tags ────────────────────────────────────────────────────────────

export type BenefitTag =
	| "konsulta"
	| "z_benefit"
	| "malasakit"
	| "pcso_assistance"
	| "dswd_assistance"
	| "cataract_package"
	| "tb_dots"
	| "maternity_care"

export interface EncounterBenefitTags {
	id: string
	encounterId: string
	patientId: string
	tags: BenefitTag[]
	taggedBy: string
	taggedByName: string
	updatedAt: string
}

export interface UpdateBenefitTagsInput {
	encounterId: string
	patientId: string
	tags: BenefitTag[]
}

// ============================================================================
// Query Keys
// ============================================================================

export const mswKeys = {
	all: ["msw"] as const,
	evaluation: (encounterId: string) =>
		[...mswKeys.all, "evaluation", encounterId] as const,
	coes: (encounterId: string) =>
		[...mswKeys.all, "coes", encounterId] as const,
	annexSignatures: (encounterId: string) =>
		[...mswKeys.all, "annex-signatures", encounterId] as const,
	benefitTags: (encounterId: string) =>
		[...mswKeys.all, "benefit-tags", encounterId] as const,
}

// ============================================================================
// Financial Evaluation Hooks
// ============================================================================

export function useFinancialEvaluationQuery(encounterId: string) {
	return useQuery({
		queryKey: mswKeys.evaluation(encounterId),
		queryFn: () =>
			fetchJson<FinancialEvaluation | null>(
				`${API_BASE}/evaluations${buildQueryString({ encounterId })}`
			),
		enabled: !!encounterId,
	})
}

export function useCreateFinancialEvaluationMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (input: CreateFinancialEvaluationInput) =>
			fetchJson<FinancialEvaluation>(`${API_BASE}/evaluations`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: (data) => {
			void qc.invalidateQueries({ queryKey: mswKeys.evaluation(data.encounterId) })
		},
	})
}

export function useUpdateFinancialEvaluationMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, ...rest }: Partial<CreateFinancialEvaluationInput> & { id: string }) =>
			fetchJson<FinancialEvaluation>(`${API_BASE}/evaluations/${id}`, {
				method: "PUT",
				body: JSON.stringify(rest),
			}),
		onSuccess: (data) => {
			void qc.invalidateQueries({ queryKey: mswKeys.evaluation(data.encounterId) })
		},
	})
}

// ============================================================================
// CoE Hooks
// ============================================================================

export function useCoeListQuery(encounterId: string) {
	return useQuery({
		queryKey: mswKeys.coes(encounterId),
		queryFn: () =>
			fetchJson<CoeListResponse>(
				`${API_BASE}/coe${buildQueryString({ encounterId })}`
			),
		enabled: !!encounterId,
	})
}

export function useCreateCoeMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (input: CreateCoeInput) =>
			fetchJson<CoE>(`${API_BASE}/coe`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: (data) => {
			void qc.invalidateQueries({ queryKey: mswKeys.coes(data.encounterId) })
		},
	})
}

export function useUpdateCoeMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, ...rest }: UpdateCoeInput) =>
			fetchJson<CoE>(`${API_BASE}/coe/${id}`, {
				method: "PATCH",
				body: JSON.stringify(rest),
			}),
		onSuccess: (data) => {
			void qc.invalidateQueries({ queryKey: mswKeys.coes(data.encounterId) })
		},
	})
}

// ============================================================================
// Annex Signature Hooks
// ============================================================================

export function useAnnexSignaturesQuery(encounterId: string) {
	return useQuery({
		queryKey: mswKeys.annexSignatures(encounterId),
		queryFn: () =>
			fetchJson<AnnexSignatureListResponse>(
				`${API_BASE}/annex-signatures${buildQueryString({ encounterId })}`
			),
		enabled: !!encounterId,
	})
}

export function useCreateAnnexSignatureMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (input: CreateAnnexSignatureInput) =>
			fetchJson<AnnexSignature>(`${API_BASE}/annex-signatures`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: (data) => {
			void qc.invalidateQueries({
				queryKey: mswKeys.annexSignatures(data.encounterId),
			})
		},
	})
}

// ============================================================================
// Benefit Tags Hooks
// ============================================================================

export function useBenefitTagsQuery(encounterId: string) {
	return useQuery({
		queryKey: mswKeys.benefitTags(encounterId),
		queryFn: () =>
			fetchJson<EncounterBenefitTags | null>(
				`${API_BASE}/benefit-tags${buildQueryString({ encounterId })}`
			),
		enabled: !!encounterId,
	})
}

export function useUpdateBenefitTagsMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (input: UpdateBenefitTagsInput) =>
			fetchJson<EncounterBenefitTags>(`${API_BASE}/benefit-tags`, {
				method: "PUT",
				body: JSON.stringify(input),
			}),
		onSuccess: (data) => {
			void qc.invalidateQueries({
				queryKey: mswKeys.benefitTags(data.encounterId),
			})
		},
	})
}

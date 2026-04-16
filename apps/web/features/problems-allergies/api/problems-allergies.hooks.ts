"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { env } from "@/env"

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/problems-allergies`

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

function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
	const entries = Object.entries(params).filter(([, v]) => v !== undefined)
	if (entries.length === 0) return ""
	return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&")
}

// ============================================================================
// Types
// ============================================================================

interface Problem {
	id: string
	facilityId: string
	patientId: string
	icd10Code: string | null
	icd10Display: string | null
	description: string
	onsetDate: string | null
	resolutionDate: string | null
	status: "active" | "resolved"
	documentingStaffId: string | null
	documentingStaffName: string | null
	createdAt: string
	updatedAt: string
}

interface ProblemListResponse {
	data: Problem[]
	total: number
	page: number
	limit: number
	totalPages: number
}

interface Allergy {
	id: string
	facilityId: string
	patientId: string
	allergenName: string
	allergenType: "medication" | "food" | "environmental"
	reactionType: string | null
	severity: "mild" | "moderate" | "severe" | "life-threatening"
	onsetDate: string | null
	isActive: boolean
	documentingStaffId: string | null
	documentingStaffName: string | null
	createdAt: string
	updatedAt: string
}

interface AllergyListResponse {
	data: Allergy[]
	total: number
	page: number
	limit: number
	totalPages: number
}

interface ActiveAllergiesResponse {
	allergies: Allergy[]
	hasSevereAllergies: boolean
}

interface PatientSummaryResponse {
	activeProblems: Problem[]
	activeProblemCount: number
	resolvedProblemCount: number
	activeAllergies: Allergy[]
	activeAllergyCount: number
	hasSevereAllergies: boolean
}

// ============================================================================
// Query Keys
// ============================================================================

export const problemsAllergiesKeys = {
	all: ["problems-allergies"] as const,
	problems: (patientId: string, status?: string) =>
		[...problemsAllergiesKeys.all, "problems", patientId, status] as const,
	problem: (id: string) => [...problemsAllergiesKeys.all, "problem", id] as const,
	allergies: (patientId: string, params?: { isActive?: boolean; allergenType?: string }) =>
		[...problemsAllergiesKeys.all, "allergies", patientId, params] as const,
	allergy: (id: string) => [...problemsAllergiesKeys.all, "allergy", id] as const,
	activeAllergies: (patientId: string) =>
		[...problemsAllergiesKeys.all, "active-allergies", patientId] as const,
	summary: (patientId: string) =>
		[...problemsAllergiesKeys.all, "summary", patientId] as const,
}

// ============================================================================
// Problem Queries
// ============================================================================

interface ProblemListParams {
	patientId: string
	status?: "active" | "resolved"
	page?: number
	limit?: number
}

export function useProblemsQuery(params: ProblemListParams) {
	return useQuery({
		queryKey: problemsAllergiesKeys.problems(params.patientId, params.status),
		queryFn: () =>
			fetchJson<ProblemListResponse>(
				`${API_BASE}/problems${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`,
			),
		enabled: !!params.patientId,
	})
}

export function useProblemDetailQuery(id: string) {
	return useQuery({
		queryKey: problemsAllergiesKeys.problem(id),
		queryFn: () => fetchJson<Problem>(`${API_BASE}/problems/${id}`),
		enabled: !!id,
	})
}

// ============================================================================
// Problem Mutations
// ============================================================================

interface CreateProblemData {
	facilityId: string
	patientId: string
	icd10Code?: string
	icd10Display?: string
	description: string
	onsetDate?: string
	notes?: string
}

export function useCreateProblemMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreateProblemData) =>
			fetchJson<Problem>(`${API_BASE}/problems`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: problemsAllergiesKeys.all })
		},
	})
}

interface UpdateProblemData {
	id: string
	icd10Code?: string
	icd10Display?: string
	description?: string
	onsetDate?: string
}

export function useUpdateProblemMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: UpdateProblemData) =>
			fetchJson<Problem>(`${API_BASE}/problems/${data.id}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: problemsAllergiesKeys.all })
		},
	})
}

interface ResolveProblemData {
	id: string
	resolutionDate?: string
}

export function useResolveProblemMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: ResolveProblemData) =>
			fetchJson<Problem>(`${API_BASE}/problems/${data.id}/resolve`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: problemsAllergiesKeys.all })
		},
	})
}

// ============================================================================
// Allergy Queries
// ============================================================================

interface AllergyListParams {
	patientId: string
	isActive?: boolean
	allergenType?: "medication" | "food" | "environmental"
	page?: number
	limit?: number
}

export function useAllergiesQuery(params: AllergyListParams) {
	return useQuery({
		queryKey: problemsAllergiesKeys.allergies(params.patientId, {
			isActive: params.isActive,
			allergenType: params.allergenType,
		}),
		queryFn: () =>
			fetchJson<AllergyListResponse>(
				`${API_BASE}/allergies${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`,
			),
		enabled: !!params.patientId,
	})
}

export function useAllergyDetailQuery(id: string) {
	return useQuery({
		queryKey: problemsAllergiesKeys.allergy(id),
		queryFn: () => fetchJson<Allergy>(`${API_BASE}/allergies/${id}`),
		enabled: !!id,
	})
}

// ============================================================================
// Allergy Mutations
// ============================================================================

interface CreateAllergyData {
	facilityId: string
	patientId: string
	allergenName: string
	allergenType: "medication" | "food" | "environmental"
	reactionType?: string
	severity: "mild" | "moderate" | "severe" | "life-threatening"
	onsetDate?: string
}

export function useCreateAllergyMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreateAllergyData) =>
			fetchJson<Allergy>(`${API_BASE}/allergies`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: problemsAllergiesKeys.all })
		},
	})
}

interface UpdateAllergyData {
	id: string
	allergenName?: string
	allergenType?: "medication" | "food" | "environmental"
	reactionType?: string
	severity?: "mild" | "moderate" | "severe" | "life-threatening"
	onsetDate?: string
}

export function useUpdateAllergyMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: UpdateAllergyData) =>
			fetchJson<Allergy>(`${API_BASE}/allergies/${data.id}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: problemsAllergiesKeys.all })
		},
	})
}

export function useDeactivateAllergyMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) =>
			fetchJson<Allergy>(`${API_BASE}/allergies/${id}/deactivate`, {
				method: "PUT",
				body: JSON.stringify({ id }),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: problemsAllergiesKeys.all })
		},
	})
}

// ============================================================================
// CDS / Cross-module
// ============================================================================

export function useActiveAllergiesQuery(patientId: string) {
	return useQuery({
		queryKey: problemsAllergiesKeys.activeAllergies(patientId),
		queryFn: () =>
			fetchJson<ActiveAllergiesResponse>(
				`${API_BASE}/active-allergies${buildQueryString({ patientId })}`,
			),
		enabled: !!patientId,
	})
}

export function usePatientSummaryQuery(patientId: string) {
	return useQuery({
		queryKey: problemsAllergiesKeys.summary(patientId),
		queryFn: () =>
			fetchJson<PatientSummaryResponse>(
				`${API_BASE}/summary${buildQueryString({ patientId })}`,
			),
		enabled: !!patientId,
	})
}

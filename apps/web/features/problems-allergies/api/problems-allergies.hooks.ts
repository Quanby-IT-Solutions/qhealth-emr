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
	if (!res.ok) {
		throw Object.assign(new Error(`HTTP ${res.status}: ${res.statusText}`), {
			status: res.status,
		})
	}
	return res.json() as Promise<T>
}

function shouldRetryPatientSummary(failureCount: number, error: unknown) {
	const status = (error as { status?: number } | null)?.status
	if (status === 401 || status === 403 || status === 404) return false
	return failureCount < 3
}

function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
	const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== "")
	if (entries.length === 0) return ""
	return `?${entries
		.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
		.join("&")}`
}

export type ProblemStatus = "active" | "resolved"
export type AllergenType = "medication" | "food" | "environmental"
export type AllergySeverity = "mild" | "moderate" | "severe"

export interface Problem {
	id: string
	facilityId: string
	patientId: string
	icd10Code: string | null
	icd10Display: string | null
	snomedCode: string | null
	snomedDisplay: string | null
	description: string
	onsetDate: string | null
	resolutionDate: string | null
	status: ProblemStatus
	documentingStaffId: string | null
	documentingStaffName: string | null
	createdAt: string
	updatedAt: string
}

export interface ProblemListResponse {
	data: Problem[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export interface Allergy {
	id: string
	facilityId: string
	patientId: string
	allergenName: string
	allergenType: AllergenType
	reactionType: string | null
	severity: AllergySeverity
	onsetDate: string | null
	isActive: boolean
	isVerified: boolean
	verifiedAt: string | null
	verifiedByStaffId: string | null
	verifiedByStaffName: string | null
	documentingStaffId: string | null
	documentingStaffName: string | null
	createdAt: string
	updatedAt: string
}

export interface AllergyListResponse {
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
	unverifiedAllergyCount: number
	hasSevereAllergies: boolean
}

export interface Icd10SearchResult {
	id: string
	code: string
	description: string
	category: string | null
	isActive: boolean
	createdAt: string
}

export interface SnomedCtSearchResult {
	id: string
	conceptId: string
	fsn: string
	preferredTerm: string
	semanticTag: string | null
	isActive: boolean
	createdAt: string
}

export interface AllergenSearchResult {
	allergenName: string
	allergenType: AllergenType
	source: "allergy_history" | "drug_generic"
}

interface ListResponse<T> {
	data: T[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export const problemsAllergiesKeys = {
	all: ["problems-allergies"] as const,
	problems: (patientId: string, status?: string) =>
		[...problemsAllergiesKeys.all, "problems", patientId, status] as const,
	problem: (id: string) => [...problemsAllergiesKeys.all, "problem", id] as const,
	allergies: (
		patientId: string,
		params?: { isActive?: boolean; isVerified?: boolean; allergenType?: string }
	) => [...problemsAllergiesKeys.all, "allergies", patientId, params] as const,
	allergy: (id: string) => [...problemsAllergiesKeys.all, "allergy", id] as const,
	activeAllergies: (patientId: string) =>
		[...problemsAllergiesKeys.all, "active-allergies", patientId] as const,
	summary: (patientId: string) => [...problemsAllergiesKeys.all, "summary", patientId] as const,
	icd10Search: (search?: string, page?: number, limit?: number) =>
		[...problemsAllergiesKeys.all, "icd10-search", search, page, limit] as const,
	snomedCtSearch: (search?: string, semanticTag?: string, page?: number, limit?: number) =>
		[...problemsAllergiesKeys.all, "snomed-ct-search", search, semanticTag, page, limit] as const,
	allergenSearch: (search?: string, facilityId?: string, allergenType?: string) =>
		[...problemsAllergiesKeys.all, "allergen-search", search, facilityId, allergenType] as const,
}

interface ProblemListParams {
	patientId: string
	status?: ProblemStatus
	page?: number
	limit?: number
}

export function useProblemsQuery(params: ProblemListParams) {
	return useQuery({
		queryKey: problemsAllergiesKeys.problems(params.patientId, params.status),
		queryFn: () =>
			fetchJson<ProblemListResponse>(
				`${API_BASE}/problems${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`
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

interface CreateProblemData {
	facilityId: string
	patientId: string
	icd10Code?: string
	icd10Display?: string
	snomedCode?: string
	snomedDisplay?: string
	description: string
	onsetDate?: string
	resolutionDate?: string
	status?: ProblemStatus
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
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: problemsAllergiesKeys.all })
		},
	})
}

interface UpdateProblemData {
	id: string
	icd10Code?: string
	icd10Display?: string
	snomedCode?: string
	snomedDisplay?: string
	description?: string
	onsetDate?: string
	resolutionDate?: string | null
	status?: ProblemStatus
}

export function useUpdateProblemMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: UpdateProblemData) =>
			fetchJson<Problem>(`${API_BASE}/problems/${data.id}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
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

export function useDeleteProblemMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) =>
			fetchJson<Problem>(`${API_BASE}/problems/${id}`, {
				method: "DELETE",
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: problemsAllergiesKeys.all })
		},
	})
}

interface AllergyListParams {
	patientId: string
	isActive?: boolean
	isVerified?: boolean
	allergenType?: AllergenType
	page?: number
	limit?: number
}

export function useAllergiesQuery(params: AllergyListParams) {
	return useQuery({
		queryKey: problemsAllergiesKeys.allergies(params.patientId, {
			isActive: params.isActive,
			isVerified: params.isVerified,
			allergenType: params.allergenType,
		}),
		queryFn: () =>
			fetchJson<AllergyListResponse>(
				`${API_BASE}/allergies${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`
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

interface CreateAllergyData {
	facilityId: string
	patientId: string
	allergenName: string
	allergenType: AllergenType
	reactionType?: string
	severity: AllergySeverity
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
	allergenType?: AllergenType
	reactionType?: string
	severity?: AllergySeverity
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

export function useVerifyAllergyMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) =>
			fetchJson<Allergy>(`${API_BASE}/allergies/${id}/verify`, {
				method: "PUT",
				body: JSON.stringify({ id }),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: problemsAllergiesKeys.all })
		},
	})
}

export function useIcd10ProblemSearchQuery(params: {
	search?: string
	page?: number
	limit?: number
}) {
	return useQuery({
		queryKey: problemsAllergiesKeys.icd10Search(params.search, params.page, params.limit),
		queryFn: () =>
			fetchJson<ListResponse<Icd10SearchResult>>(
				`${API_BASE}/terminology/icd10${buildQueryString({
					search: params.search,
					page: params.page ?? 1,
					limit: params.limit ?? 10,
				})}`
			),
		enabled: !!params.search && params.search.trim().length >= 2,
		staleTime: 5 * 60 * 1000,
	})
}

export function useSnomedCtProblemSearchQuery(params: {
	search?: string
	semanticTag?: string
	page?: number
	limit?: number
}) {
	return useQuery({
		queryKey: problemsAllergiesKeys.snomedCtSearch(
			params.search,
			params.semanticTag,
			params.page,
			params.limit
		),
		queryFn: () =>
			fetchJson<ListResponse<SnomedCtSearchResult>>(
				`${API_BASE}/terminology/snomed-ct${buildQueryString({
					search: params.search,
					semanticTag: params.semanticTag,
					page: params.page ?? 1,
					limit: params.limit ?? 10,
				})}`
			),
		enabled: !!params.search && params.search.trim().length >= 2,
		staleTime: 5 * 60 * 1000,
	})
}

export function useAllergenSearchQuery(params: {
	search?: string
	facilityId?: string
	allergenType?: AllergenType
	page?: number
	limit?: number
}) {
	return useQuery({
		queryKey: problemsAllergiesKeys.allergenSearch(
			params.search,
			params.facilityId,
			params.allergenType
		),
		queryFn: () =>
			fetchJson<ListResponse<AllergenSearchResult>>(
				`${API_BASE}/allergens/search${buildQueryString({
					search: params.search,
					facilityId: params.facilityId,
					allergenType: params.allergenType,
					page: params.page ?? 1,
					limit: params.limit ?? 10,
				})}`
			),
		enabled: !!params.search && params.search.trim().length >= 2,
		staleTime: 5 * 60 * 1000,
	})
}

export function useActiveAllergiesQuery(patientId: string) {
	return useQuery({
		queryKey: problemsAllergiesKeys.activeAllergies(patientId),
		queryFn: () =>
			fetchJson<ActiveAllergiesResponse>(
				`${API_BASE}/active-allergies${buildQueryString({ patientId })}`
			),
		enabled: !!patientId,
	})
}

export function usePatientSummaryQuery(patientId: string, options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: problemsAllergiesKeys.summary(patientId),
		queryFn: () =>
			fetchJson<PatientSummaryResponse>(`${API_BASE}/summary${buildQueryString({ patientId })}`),
		enabled: (options?.enabled ?? true) && !!patientId,
		retry: shouldRetryPatientSummary,
	})
}

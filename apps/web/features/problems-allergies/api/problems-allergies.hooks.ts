"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

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
		let message = `HTTP ${res.status}: ${res.statusText}`
		try {
			const body = (await res.json()) as { message?: string | string[] }
			if (Array.isArray(body.message)) {
				message = body.message.join("; ")
			} else if (body.message) {
				message = body.message
			}
		} catch {
			// Keep the status text fallback when the server does not return JSON.
		}
		throw Object.assign(new Error(message), {
			status: res.status,
		})
	}
	return res.json() as Promise<T>
}

function showMutationError(error: unknown, fallback: string) {
	toast.error(error instanceof Error ? error.message : fallback)
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

export type ProblemStatus = "active" | "resolved" | "entered_in_error"
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
	problems: (patientId: string, status?: string, page?: number, limit?: number) =>
		[...problemsAllergiesKeys.all, "problems", patientId, status, page, limit] as const,
	problem: (id: string) => [...problemsAllergiesKeys.all, "problem", id] as const,
	allergies: (
		patientId: string,
		params?: { isActive?: boolean; isVerified?: boolean; allergenType?: string },
		page?: number,
		limit?: number
	) => [...problemsAllergiesKeys.all, "allergies", patientId, params, page, limit] as const,
	allergy: (id: string) => [...problemsAllergiesKeys.all, "allergy", id] as const,
	activeAllergies: (patientId: string) =>
		[...problemsAllergiesKeys.all, "active-allergies", patientId] as const,
	summary: (patientId: string) => [...problemsAllergiesKeys.all, "summary", patientId] as const,
	icd10Search: (search?: string, page?: number, limit?: number) =>
		[...problemsAllergiesKeys.all, "icd10-search", search, page, limit] as const,
	snomedCtSearch: (search?: string, semanticTag?: string, page?: number, limit?: number) =>
		[...problemsAllergiesKeys.all, "snomed-ct-search", search, semanticTag, page, limit] as const,
	allergenSearch: (
		search?: string,
		facilityId?: string,
		allergenType?: string,
		page?: number,
		limit?: number
	) =>
		[
			...problemsAllergiesKeys.all,
			"allergen-search",
			search,
			facilityId,
			allergenType,
			page,
			limit,
		] as const,
}

interface ProblemListParams {
	patientId: string
	status?: ProblemStatus
	page?: number
	limit?: number
}

export function useProblemsQuery(params: ProblemListParams) {
	const { patientId, status, page, limit } = params

	return useQuery({
		queryKey: problemsAllergiesKeys.problems(patientId, status, page, limit),
		queryFn: () =>
			fetchJson<ProblemListResponse>(
				`${API_BASE}/problems${buildQueryString({ patientId, status, page, limit })}`
			),
		enabled: !!patientId,
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
		onError: error => showMutationError(error, "Failed to add problem."),
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
		onError: error => showMutationError(error, "Failed to update problem."),
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
		onError: error => showMutationError(error, "Failed to resolve problem."),
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
		onError: error => showMutationError(error, "Failed to mark problem as entered in error."),
	})
}

export const useMarkProblemEnteredInErrorMutation = useDeleteProblemMutation

interface AllergyListParams {
	patientId: string
	isActive?: boolean
	isVerified?: boolean
	allergenType?: AllergenType
	page?: number
	limit?: number
}

export function useAllergiesQuery(params: AllergyListParams) {
	const { patientId, isActive, isVerified, allergenType, page, limit } = params

	return useQuery({
		queryKey: problemsAllergiesKeys.allergies(
			patientId,
			{
				isActive,
				isVerified,
				allergenType,
			},
			page,
			limit
		),
		queryFn: () =>
			fetchJson<AllergyListResponse>(
				`${API_BASE}/allergies${buildQueryString({
					patientId,
					isActive,
					isVerified,
					allergenType,
					page,
					limit,
				})}`
			),
		enabled: !!patientId,
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
		onError: error => showMutationError(error, "Failed to add allergy."),
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
		onError: error => showMutationError(error, "Failed to update allergy."),
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
		onError: error => showMutationError(error, "Failed to deactivate allergy."),
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
		onError: error => showMutationError(error, "Failed to verify allergy."),
	})
}

export function useIcd10ProblemSearchQuery(params: {
	search?: string
	page?: number
	limit?: number
	includeEmptySearch?: boolean
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
		enabled: params.includeEmptySearch || (!!params.search && params.search.trim().length >= 2),
		staleTime: 5 * 60 * 1000,
	})
}

export function useSnomedCtProblemSearchQuery(params: {
	search?: string
	semanticTag?: string
	page?: number
	limit?: number
	includeEmptySearch?: boolean
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
		enabled: params.includeEmptySearch || (!!params.search && params.search.trim().length >= 2),
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
			params.allergenType,
			params.page,
			params.limit
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
		enabled: !!params.facilityId && !!params.search && params.search.trim().length >= 2,
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

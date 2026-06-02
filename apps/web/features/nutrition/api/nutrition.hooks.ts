"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { env } from "@/env"

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/nutrition`

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
	return `?${entries
		.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
		.join("&")}`
}

// ============================================================================
// Types
// ============================================================================

export type ScreeningTool = "nrs_2002" | "sga" | "must"

export type MalnutritionRisk = "low" | "moderate" | "high"

export interface MealPlan {
	dietType: string
	caloricTarget?: number
	proteinTarget?: number
	carbTarget?: number
	fatTarget?: number
	fluidTarget?: number
	specialInstructions?: string
	feedingRoute?: "oral" | "enteral" | "parenteral" | "mixed"
	enteralFormula?: string
	parenteralFormula?: string
	mealFrequency?: string
	supplements?: string[]
	restrictions?: string[]
}

export interface NutritionAssessment {
	id: string
	facilityId: string
	encounterId: string
	patientId: string
	patientName: string | null
	patientMrn: string | null
	screeningTool: ScreeningTool
	screeningScore: number
	malnutritionRisk: MalnutritionRisk
	mealPlan: MealPlan | null
	assessedByStaffId: string
	assessedByStaffName: string | null
	status: string
	createdAt: string
	updatedAt: string
}

export interface CreateNutritionAssessmentInput {
	facilityId: string
	encounterId: string
	patientId: string
	screeningTool: ScreeningTool
	screeningScore: number
	malnutritionRisk: MalnutritionRisk
}

export interface NutritionAssessmentListResponse {
	total: number
	page: number
	limit: number
	totalPages: number
	data: NutritionAssessment[]
}

// NRS-2002 specific question scores
export interface Nrs2002Input {
	isNutritionallyImpaired: boolean // Q1: BMI < 20.5 / recent weight loss / reduced intake
	isSeverelySick: boolean // Q2: major surgery / ICU / severe infection
	nutritionalScore: number // 0-3: nutritional status impairment
	diseaseScore: number // 0-3: disease severity
	ageOver70: boolean // +1 point if age >= 70
}

// MUST score (Malnutrition Universal Screening Tool)
export interface MustInput {
	bmiScore: number // 0=BMI>20, 1=18.5-20, 2=<18.5
	weightLossScore: number // 0=<5%, 1=5-10%, 2=>10%
	acuteIllnessScore: number // 0 or 2
}

// SGA (Subjective Global Assessment) - A, B, or C grades
export type SgaGrade = "A" | "B" | "C"

export interface CreateMealPlanInput {
	assessmentId: string
	mealPlan: MealPlan
}

export interface DietOrder {
	id: string
	encounterId: string
	patientId: string
	dietType: string
	texture: string | null
	liquidConsistency: string | null
	calories: number | null
	restrictions: string[]
	orderedBy: string
	orderedByName: string
	orderedAt: string
	effectiveDate: string
	status: "active" | "discontinued" | "completed"
}

export interface DietOrderListResponse {
	orders: DietOrder[]
}

// ============================================================================
// Query Keys
// ============================================================================

export const nutritionKeys = {
	all: ["nutrition"] as const,
	assessments: (encounterId: string) =>
		[...nutritionKeys.all, "assessments", encounterId] as const,
	assessment: (id: string) => [...nutritionKeys.all, "assessment", id] as const,
	mealPlan: (encounterId: string) =>
		[...nutritionKeys.all, "meal-plan", encounterId] as const,
	dietOrders: (encounterId: string) =>
		[...nutritionKeys.all, "diet-orders", encounterId] as const,
	worklist: (facilityId: string) =>
		[...nutritionKeys.all, "worklist", facilityId] as const,
}

// ============================================================================
// Facility-level worklist type (superset of NutritionAssessment)
// ============================================================================

export interface WorklistAssessment extends NutritionAssessment {
	ward?: string
	mealPlanStatus?: "none" | "draft" | "active"
}

// ============================================================================
// Nutrition Assessments
// ============================================================================

export function useNutritionAssessmentsQuery(
	encounterId: string,
	params?: { page?: number; limit?: number }
) {
	return useQuery({
		queryKey: [...nutritionKeys.assessments(encounterId), params],
		queryFn: () =>
			fetchJson<NutritionAssessmentListResponse>(
				`${API_BASE}/assessments${buildQueryString({
					encounterId,
					...params,
				})}`
			),
		enabled: !!encounterId,
	})
}

export function useCreateNutritionAssessmentMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (input: CreateNutritionAssessmentInput) =>
			fetchJson<NutritionAssessment>(`${API_BASE}/assessments`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: (data) => {
			void qc.invalidateQueries({
				queryKey: nutritionKeys.assessments(data.encounterId),
			})
		},
	})
}

// ============================================================================
// Meal Plans
// ============================================================================

export function useMealPlanQuery(encounterId: string) {
	return useQuery({
		queryKey: nutritionKeys.mealPlan(encounterId),
		queryFn: () =>
			fetchJson<NutritionAssessment | null>(
				`${API_BASE}/assessments/by-encounter/${encodeURIComponent(encounterId)}`
			),
		enabled: !!encounterId,
	})
}

export function useSaveMealPlanMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (input: CreateMealPlanInput) =>
			fetchJson<NutritionAssessment>(
				`${API_BASE}/assessments/${encodeURIComponent(input.assessmentId)}/meal-plan`,
				{
					method: "POST",
					body: JSON.stringify(input),
				}
			),
		onSuccess: (data) => {
			void qc.invalidateQueries({
				queryKey: nutritionKeys.mealPlan(data.encounterId),
			})
		},
	})
}

// ============================================================================
// Diet Orders
// ============================================================================

export function useDietOrdersQuery(_encounterId: string) {
	return useQuery({
		queryKey: nutritionKeys.dietOrders(_encounterId),
		queryFn: () => Promise.resolve<DietOrderListResponse>({ orders: [] }),
		enabled: false,
	})
}

// ============================================================================
// Facility Worklist (dietitian landing page)
// ============================================================================

export interface WorklistResponse {
	total: number
	page: number
	limit: number
	totalPages: number
	data: WorklistAssessment[]
}

export function useNutritionWorklistQuery(
	facilityId: string,
	params?: {
		page?: number
		limit?: number
		malnutritionRisk?: "low" | "moderate" | "high"
		status?: string
	}
) {
	return useQuery({
		queryKey: [...nutritionKeys.worklist(facilityId), params],
		queryFn: () =>
			fetchJson<WorklistResponse>(
				`${API_BASE}/assessments${buildQueryString({
					facilityId,
					...params,
				})}`
			),
		enabled: !!facilityId,
	})
}

export function useCreateDietOrderMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (input: Omit<DietOrder, "id" | "orderedBy" | "orderedByName" | "orderedAt" | "status">) =>
			fetchJson<DietOrder>(`${API_BASE}/diet-orders`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: (data) => {
			void qc.invalidateQueries({
				queryKey: nutritionKeys.dietOrders(data.encounterId),
			})
		},
	})
}

export function useDiscontinueDietOrderMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (orderId: string) =>
			fetchJson<DietOrder>(`${API_BASE}/diet-orders/${orderId}/discontinue`, {
				method: "POST",
				body: JSON.stringify({}),
			}),
		onSuccess: (data) => {
			void qc.invalidateQueries({
				queryKey: nutritionKeys.dietOrders(data.encounterId),
			})
		},
	})
}

// ============================================================================
// Screening Tool Scoring
// ============================================================================

export interface ScreeningScoreResult {
	tool: "nrs_2002" | "sga" | "must"
	score: number
	risk: "low" | "moderate" | "high"
	interpretation: string
	recommendation: string
}

export type ScreeningScoreInput =
	| { tool: "nrs_2002"; nutritionalImpairmentScore: number; severityOfDiseaseScore: number; age: number }
	| { tool: "must"; bmiScore: number; weightLossScore: number; acuteDiseaseEffect: number }
	| { tool: "sga"; rating: "A" | "B" | "C" }

export function useScoreScreeningMutation() {
	return useMutation({
		mutationFn: (input: ScreeningScoreInput) =>
			fetchJson<ScreeningScoreResult>(`${API_BASE}/screening/score`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
	})
}

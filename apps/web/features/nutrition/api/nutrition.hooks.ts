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

export type ScreeningTool = "nrs2002" | "sga" | "must"

export type MalnutritionRisk = "low" | "moderate" | "high"

export interface NutritionAssessment {
	id: string
	encounterId: string
	patientId: string
	screeningTool: ScreeningTool
	score: number
	riskLevel: MalnutritionRisk
	notes: string | null
	assessedBy: string
	assessedByName: string
	assessedAt: string
	createdAt: string
	updatedAt: string
}

export interface CreateNutritionAssessmentInput {
	encounterId: string
	patientId: string
	screeningTool: ScreeningTool
	score: number
	riskLevel: MalnutritionRisk
	notes?: string
}

export interface NutritionAssessmentListResponse {
	total: number
	page: number
	limit: number
	totalPages: number
	assessments: NutritionAssessment[]
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

export interface MealPlan {
	id: string
	encounterId: string
	patientId: string
	caloricTarget: number // kcal/day
	proteinGoalGrams: number
	carbGoalGrams: number
	fatGoalGrams: number
	dietType: string // regular, soft, liquid, diabetic, renal, cardiac, etc.
	restrictions: string[] // lactose-free, gluten-free, low-sodium, etc.
	notes: string | null
	createdBy: string
	createdByName: string
	createdAt: string
	updatedAt: string
}

export interface CreateMealPlanInput {
	encounterId: string
	patientId: string
	caloricTarget: number
	proteinGoalGrams: number
	carbGoalGrams: number
	fatGoalGrams: number
	dietType: string
	restrictions?: string[]
	notes?: string
}

export interface UpdateMealPlanInput extends Partial<CreateMealPlanInput> {
	id: string
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
			fetchJson<MealPlan | null>(
				`${API_BASE}/meal-plans${buildQueryString({ encounterId })}`
			),
		enabled: !!encounterId,
	})
}

export function useSaveMealPlanMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (input: CreateMealPlanInput | UpdateMealPlanInput) => {
			const isUpdate = "id" in input && input.id
			return isUpdate
				? fetchJson<MealPlan>(`${API_BASE}/meal-plans/${(input as UpdateMealPlanInput).id}`, {
						method: "PUT",
						body: JSON.stringify(input),
					})
				: fetchJson<MealPlan>(`${API_BASE}/meal-plans`, {
						method: "POST",
						body: JSON.stringify(input),
					})
		},
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

export function useDietOrdersQuery(encounterId: string) {
	return useQuery({
		queryKey: nutritionKeys.dietOrders(encounterId),
		queryFn: () =>
			fetchJson<DietOrderListResponse>(
				`${API_BASE}/diet-orders${buildQueryString({ encounterId })}`
			),
		enabled: !!encounterId,
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

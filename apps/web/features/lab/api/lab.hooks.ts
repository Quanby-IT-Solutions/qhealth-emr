"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type {
	ApproveCrossMatch,
	BedsideVerifyInput as ContractBedsideVerifyInput,
	BedsideVerifyResult as ContractBedsideVerifyResult,
	BloodType as ContractBloodType,
	BloodUnit as ContractBloodUnit,
	CrossMatchRequest as ContractCrossMatchRequest,
	CreateCrossMatch,
	CrossMatchListQuery,
	CrossMatchListResponse,
} from "@repo/contracts"

import { orpc } from "@/services/orpc/client"
import { env } from "@/env"

const ORDERS_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/orders`

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
	return `?${entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&")}`
}

// ============================================================================
// Types
// ============================================================================

export interface LabResultItem {
	testName: string
	value: string | number
	unit: string
	referenceRange: string | null
	flag: "H" | "L" | "C" | "N" | null
	isCritical: boolean
	isAbnormal: boolean
}

export interface LabResultData {
	items: LabResultItem[]
	reportedBy: string | null
	reportedAt: string | null
	comments: string | null
}

export type LabOrderStatus =
	| "ordered"
	| "pending"
	| "collected"
	| "in_progress"
	| "resulted"
	| "completed"
	| "cancelled"

export interface LabOrder {
	id: string
	facilityId: string
	encounterId: string | null
	preEncounterId: string | null
	patientId: string | null
	patientName: string | null
	patientMrn?: string | null
	wardName?: string | null
	bedNumber?: string | null
	loincCode: string | null
	panelCode: string | null
	testName: string
	panelName: string | null
	clinicalIndication: string | null
	indicationIcd10Code: string | null
	indicationIcd10Display: string | null
	priority: "routine" | "urgent" | "stat"
	status: LabOrderStatus
	specimenType: string | null
	orderingStaffId: string
	orderingStaffName: string | null
	collectionDatetime: string | null
	resultedDatetime: string | null
	results: LabResultData | null
	hasCriticalValues: boolean
	createdAt: string
	updatedAt: string
}

export interface PaginatedLabOrders {
	data: LabOrder[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export type BloodType = ContractBloodType
export type BloodUnit = ContractBloodUnit
export type CrossMatchRequest = ContractCrossMatchRequest
export type PaginatedCrossMatches = CrossMatchListResponse
export type BedsideVerifyInput = ContractBedsideVerifyInput
export type BedsideVerifyResult = ContractBedsideVerifyResult

// ============================================================================
// Query Keys
// ============================================================================

export const labKeys = {
	all: ["lab"] as const,
	dashboard: (params: object) => [...labKeys.all, "dashboard", params] as const,
	order: (id: string) => [...labKeys.all, "order", id] as const,
	crossMatches: (params: object) => [...labKeys.all, "cross-matches", params] as const,
	crossMatch: (id: string) => [...labKeys.all, "cross-match", id] as const,
}

// ============================================================================
// Lab Dashboard (facility-wide)
// ============================================================================

interface LabDashboardParams {
	facilityId: string
	status?: LabOrderStatus
	priority?: LabOrder["priority"]
	page?: number
	limit?: number
}

export function useLabDashboardQuery(params: LabDashboardParams, options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: labKeys.dashboard(params),
		queryFn: () =>
			fetchJson<PaginatedLabOrders>(
				`${ORDERS_BASE}/labs${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`
			),
		enabled: !!params.facilityId && (options?.enabled ?? true),
		refetchInterval: 30 * 1000,
		refetchOnWindowFocus: true,
		staleTime: 30_000,
	})
}

export function useLabOrderDetailQuery(id: string) {
	return useQuery({
		queryKey: labKeys.order(id),
		queryFn: () => fetchJson<LabOrder>(`${ORDERS_BASE}/labs/${id}`),
		enabled: !!id,
	})
}

// ============================================================================
// Blood Bank — Cross-Match
// ============================================================================

type CrossMatchListParams = Omit<CrossMatchListQuery, "page" | "limit"> &
	Partial<Pick<CrossMatchListQuery, "page" | "limit">>

export function useCrossMatchListQuery(params: CrossMatchListParams) {
	return useQuery(
		orpc.lab.listCrossMatches.queryOptions({
			input: {
				...params,
				page: params.page ?? 1,
				limit: params.limit ?? 50,
			},
			enabled: !!params.facilityId,
		})
	)
}

export function useCrossMatchDetailQuery(id: string) {
	return useQuery(
		orpc.lab.getCrossMatch.queryOptions({
			input: { id },
			enabled: !!id,
		})
	)
}

export type CreateCrossMatchData = CreateCrossMatch

export function useCreateCrossMatchMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.lab.createCrossMatch.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: orpc.lab.listCrossMatches.key() })
				queryClient.invalidateQueries({ queryKey: labKeys.all })
			},
		})
	)
}

export type ApproveCrossMatchData = ApproveCrossMatch

export function useApproveCrossMatchMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.lab.approveCrossMatch.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: orpc.lab.listCrossMatches.key() })
				queryClient.invalidateQueries({ queryKey: labKeys.all })
			},
		})
	)
}

export function useBedsideVerifyMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.lab.bedsideVerify.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: orpc.lab.listCrossMatches.key() })
				queryClient.invalidateQueries({ queryKey: labKeys.all })
			},
		})
	)
}

"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { env } from "@/env"

const ORDERS_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/orders`
const LAB_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/lab`

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

export interface LabOrder {
	id: string
	facilityId: string
	encounterId: string | null
	preEncounterId: string | null
	patientId: string | null
	patientName: string | null
	loincCode: string | null
	panelCode: string | null
	testName: string
	panelName: string | null
	priority: "routine" | "urgent" | "stat"
	status: "pending" | "in_progress" | "completed" | "cancelled"
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

export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-"

export interface BloodUnit {
	id: string
	unitBarcode: string
	bloodType: BloodType
	componentType: string
	expiryDate: string
	status: "available" | "reserved" | "transfused" | "discarded"
	donorId: string | null
}

export interface CrossMatchRequest {
	id: string
	facilityId: string
	patientId: string
	patientName: string
	bloodType: BloodType | null
	componentType: string
	unitsRequested: number
	urgency: "routine" | "urgent" | "emergency"
	clinicalIndication: string | null
	compatibilityResult: "compatible" | "incompatible" | "pending" | null
	status: "pending" | "cross_matched" | "approved" | "issued" | "transfused" | "cancelled"
	requestedBy: string
	requestedAt: string
	crossMatchedBy: string | null
	crossMatchedAt: string | null
	approvedBy: string | null
	approvedAt: string | null
	issuedBy: string | null
	issuedAt: string | null
	bloodUnits: BloodUnit[]
	createdAt: string
}

export interface PaginatedCrossMatches {
	data: CrossMatchRequest[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export interface BedsideVerifyInput {
	crossMatchId: string
	unitBarcode: string
	patientWristbandBarcode: string
}

export interface BedsideVerifyResult {
	verified: boolean
	patientMatch: boolean
	unitMatch: boolean
	message: string
}

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
	status?: "pending" | "in_progress" | "completed" | "cancelled"
	priority?: string
	page?: number
	limit?: number
}

export function useLabDashboardQuery(params: LabDashboardParams) {
	return useQuery({
		queryKey: labKeys.dashboard(params),
		queryFn: () =>
			fetchJson<PaginatedLabOrders>(
				`${ORDERS_BASE}/labs${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`,
			),
		enabled: !!params.facilityId,
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

interface CrossMatchListParams {
	facilityId: string
	status?: string
	page?: number
	limit?: number
}

export function useCrossMatchListQuery(params: CrossMatchListParams) {
	return useQuery({
		queryKey: labKeys.crossMatches(params),
		queryFn: () =>
			fetchJson<PaginatedCrossMatches>(
				`${LAB_BASE}/blood-bank/cross-matches${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`,
			),
		enabled: !!params.facilityId,
	})
}

export function useCrossMatchDetailQuery(id: string) {
	return useQuery({
		queryKey: labKeys.crossMatch(id),
		queryFn: () => fetchJson<CrossMatchRequest>(`${LAB_BASE}/blood-bank/cross-matches/${id}`),
		enabled: !!id,
	})
}

interface CreateCrossMatchData {
	facilityId: string
	patientId: string
	bloodType?: BloodType
	componentType: string
	unitsRequested: number
	urgency: "routine" | "urgent" | "emergency"
	clinicalIndication?: string
}

export function useCreateCrossMatchMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreateCrossMatchData) =>
			fetchJson<CrossMatchRequest>(`${LAB_BASE}/blood-bank/cross-matches`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: labKeys.all })
		},
	})
}

interface ApproveCrossMatchData {
	id: string
	compatibilityResult: "compatible" | "incompatible"
	bloodUnitIds: string[]
}

export function useApproveCrossMatchMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: ApproveCrossMatchData) =>
			fetchJson<CrossMatchRequest>(`${LAB_BASE}/blood-bank/cross-matches/${data.id}/approve`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: labKeys.all })
		},
	})
}

export function useBedsideVerifyMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: BedsideVerifyInput) =>
			fetchJson<BedsideVerifyResult>(`${LAB_BASE}/blood-bank/bedside-verify`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: labKeys.all })
		},
	})
}

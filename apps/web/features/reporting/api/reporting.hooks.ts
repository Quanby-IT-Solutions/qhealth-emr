"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { reportingOrpc } from "@/services/orpc/client"
import { env } from "@/env"

// ============================================================================
// Surveillance Flag Hooks
// ============================================================================

export function useSurveillanceFlagsQuery(params: {
	facilityId: string
	page?: number
	limit?: number
	isReviewed?: boolean
	flagType?: "icd10_match" | "syndromic_keyword"
	category?: "category_1" | "category_2"
}) {
	return useQuery(
		reportingOrpc.listSurveillanceFlags.queryOptions({
			input: { ...params, page: params.page ?? 1, limit: params.limit ?? 20 },
		})
	)
}

export function useReviewFlagMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		reportingOrpc.reviewSurveillanceFlag.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: reportingOrpc.listSurveillanceFlags.key() }),
		})
	)
}

export function useScanEncounterMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		reportingOrpc.scanEncounter.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: reportingOrpc.listSurveillanceFlags.key() }),
		})
	)
}

// ============================================================================
// PIDSR Case Hooks
// ============================================================================

export function usePidsrCasesQuery(params: {
	facilityId: string
	page?: number
	limit?: number
	reportStatus?: "draft" | "submitted" | "rejected" | "blocked"
	category?: "category_1" | "category_2"
	dateFrom?: string
	dateTo?: string
}) {
	return useQuery(
		reportingOrpc.listPidsrCases.queryOptions({
			input: { ...params, page: params.page ?? 1, limit: params.limit ?? 20 },
		})
	)
}

export function usePidsrCaseDetailQuery(id: string) {
	return useQuery(
		reportingOrpc.getPidsrCase.queryOptions({
			input: { id },
			enabled: !!id,
		})
	)
}

export function useSubmitPidsrCaseMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		reportingOrpc.submitPidsrCase.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: reportingOrpc.listPidsrCases.key() }),
		})
	)
}

export function useDismissPidsrCaseMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		reportingOrpc.dismissPidsrCase.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: reportingOrpc.listPidsrCases.key() }),
		})
	)
}

// ============================================================================
// Weekly Report Hooks
// ============================================================================

export function useGenerateWeeklyReportMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		reportingOrpc.generateWeeklyReport.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: reportingOrpc.listPidsrCases.key() }),
		})
	)
}

// ============================================================================
// AHSR Hooks
// ============================================================================

export function useAhsrMetricsQuery(params: {
	facilityId: string
	year: number
	quarter?: 1 | 2 | 3 | 4
}) {
	return useQuery(
		reportingOrpc.getAhsrMetrics.queryOptions({
			input: { ...params },
			staleTime: 5 * 60 * 1000,
			refetchInterval: 5 * 60 * 1000,
		})
	)
}

export function useAhsrDrilldownQuery(
	params: {
		facilityId: string
		year: number
		month?: number
		metric: string
		icdCode?: string
		haiType?: string
		page?: number
		limit?: number
	},
	enabled = true
) {
	return useQuery(
		reportingOrpc.drilldownAhsr.queryOptions({
			input: {
				...params,
				page: params.page ?? 1,
				limit: params.limit ?? 20,
				metric: params.metric as
					"admissions" | "discharges" | "deaths" | "morbidity" | "mortality" | "hai",
			},
			enabled,
		})
	)
}

export function useExportAhsrMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		reportingOrpc.exportAhsr.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: reportingOrpc.getAhsrMetrics.key() }),
		})
	)
}

// ============================================================================
// HAI Report Types & Hooks (no oRPC contract yet — raw fetch preserved)
// ============================================================================

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/reporting`

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

export interface HaiTrend {
	period: string
	count: number
	rate: number
}

export interface HaiTypeReport {
	haiType: string
	label: string
	count: number
	rate: number
	trend: HaiTrend[]
}

export interface HaiReportResponse {
	facilityId: string
	year: number
	month: number | null
	totalHaiCases: number
	haiRate: number
	byType: HaiTypeReport[]
}

export interface HaiCaseDetail {
	encounterId: string
	patientName: string
	patientMrn: string
	haiType: string
	onsetDate: string | null
	diagnosisDate: string
	disposition: string | null
}

export interface HaiCaseListResponse {
	total: number
	page: number
	limit: number
	totalPages: number
	cases: HaiCaseDetail[]
}

export function useHaiReportQuery(params: { facilityId: string; year: number; month?: number }) {
	return useQuery({
		queryKey: ["reporting", "hai", params] as const,
		queryFn: () => fetchJson<HaiReportResponse>(`${API_BASE}/hai${buildQueryString(params)}`),
		enabled: !!params.facilityId,
	})
}

export function useHaiCasesQuery(
	params: {
		facilityId: string
		year: number
		month?: number
		haiType?: string
		page?: number
		limit?: number
	},
	enabled = true
) {
	return useQuery({
		queryKey: ["reporting", "hai-cases", params] as const,
		queryFn: () =>
			fetchJson<HaiCaseListResponse>(`${API_BASE}/hai/cases${buildQueryString(params)}`),
		enabled: enabled && !!params.facilityId,
	})
}

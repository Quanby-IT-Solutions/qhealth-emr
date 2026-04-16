"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { env } from "@/env"

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
	return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&")
}

// ============================================================================
// Types
// ============================================================================

interface SurveillanceFlag {
	id: string
	facilityId: string
	encounterId: string | null
	noteId: string | null
	flagType: string
	triggeredBy: string
	triggerValue: string
	category: string | null
	diseaseName: string | null
	isReviewed: boolean
	reviewedByStaffId: string | null
	reviewedAt: string | null
	createdAt: string
	patientName: string | null
	patientMrn: string | null
	encounterType: string | null
}

interface SurveillanceFlagListResponse {
	total: number
	page: number
	limit: number
	totalPages: number
	flags: SurveillanceFlag[]
}

interface ReviewFlagResponse {
	success: boolean
	pidsrCaseId: string | null
}

interface PidsrCase {
	id: string
	facilityId: string
	encounterId: string | null
	patientId: string
	diseaseCode: string
	diseaseName: string
	caseClassification: "suspected" | "probable" | "confirmed"
	onsetDate: string | null
	diagnosisDate: string
	reportingStaffId: string
	reportStatus: "draft" | "submitted"
	submissionData: Record<string, unknown> | null
	submittedAt: string | null
	createdAt: string
	updatedAt: string
	patientName: string | null
	patientMrn: string | null
}

interface PidsrCaseDetail extends PidsrCase {
	encounterType: string | null
	chiefComplaint: string | null
	attendingPhysician: string | null
}

interface PidsrCaseListResponse {
	total: number
	page: number
	limit: number
	totalPages: number
	cases: PidsrCase[]
}

interface WeeklyReportSummary {
	weekStartDate: string
	weekEndDate: string
	totalCases: number
	confirmedCases: number
	diseaseBreakdown: { diseaseCode: string; diseaseName: string; count: number }[]
	status: "generated" | "submitted"
}

interface MorbidityMortalityItem {
	rank: number
	icdCode: string
	diseaseName: string
	count: number
	percentage: number
}

interface HaiMetric {
	haiType: string
	count: number
	rate: number
}

interface AhsrMetricsResponse {
	facilityId: string
	year: number
	month: number | null
	bedOccupancyRate: number | null
	totalAdmissions: number
	totalDischarges: number
	totalDeaths: number
	grossDeathRate: number | null
	netDeathRate: number | null
	topMorbidities: MorbidityMortalityItem[]
	topMortalities: MorbidityMortalityItem[]
	haiMetrics: HaiMetric[]
}

interface AhsrDrilldownEncounter {
	encounterId: string
	patientName: string
	patientMrn: string
	encounterType: string
	admissionDate: string
	dischargeDate: string | null
	disposition: string | null
	diagnosisCodes: string[]
}

interface AhsrDrilldownResponse {
	total: number
	page: number
	limit: number
	totalPages: number
	encounters: AhsrDrilldownEncounter[]
}

interface ExportAhsrResponse {
	success: boolean
	message: string
	snapshotId: string | null
}

interface ScanEncounterResponse {
	flagsCreated: number
	flags: { id: string; flagType: string; triggeredBy: string; triggerValue: string }[]
}

// ============================================================================
// Query Keys
// ============================================================================

const reportingKeys = {
	all: ["reporting"] as const,
	flags: (params: object) => [...reportingKeys.all, "flags", params] as const,
	pidsrCases: (params: object) => [...reportingKeys.all, "pidsr", params] as const,
	pidsrCase: (id: string) => [...reportingKeys.all, "pidsr", id] as const,
	ahsr: (params: object) => [...reportingKeys.all, "ahsr", params] as const,
	ahsrDrilldown: (params: object) => [...reportingKeys.all, "ahsr-drilldown", params] as const,
}

// ============================================================================
// Surveillance Flag Hooks
// ============================================================================

export function useSurveillanceFlagsQuery(params: {
	facilityId: string
	page?: number
	limit?: number
	isReviewed?: boolean
	flagType?: string
	category?: string
}) {
	return useQuery({
		queryKey: reportingKeys.flags(params),
		queryFn: () =>
			fetchJson<SurveillanceFlagListResponse>(
				`${API_BASE}/surveillance-flags${buildQueryString(params)}`
			),
	})
}

export function useReviewFlagMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { id: string; action: "confirm" | "dismiss"; dismissReason?: string }) =>
			fetchJson<ReviewFlagResponse>(`${API_BASE}/surveillance-flags/review`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: reportingKeys.all }),
	})
}

export function useScanEncounterMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { encounterId: string; facilityId: string }) =>
			fetchJson<ScanEncounterResponse>(`${API_BASE}/surveillance-flags/scan`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: reportingKeys.all }),
	})
}

// ============================================================================
// PIDSR Case Hooks
// ============================================================================

export function usePidsrCasesQuery(params: {
	facilityId: string
	page?: number
	limit?: number
	reportStatus?: string
	category?: string
	dateFrom?: string
	dateTo?: string
}) {
	return useQuery({
		queryKey: reportingKeys.pidsrCases(params),
		queryFn: () =>
			fetchJson<PidsrCaseListResponse>(
				`${API_BASE}/pidsr${buildQueryString(params)}`
			),
	})
}

export function usePidsrCaseDetailQuery(id: string) {
	return useQuery({
		queryKey: reportingKeys.pidsrCase(id),
		queryFn: () => fetchJson<PidsrCaseDetail>(`${API_BASE}/pidsr/${id}`),
		enabled: !!id,
	})
}

export function useSubmitPidsrCaseMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { id: string }) =>
			fetchJson<{ success: boolean; message: string }>(`${API_BASE}/pidsr/${data.id}/submit`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: reportingKeys.all }),
	})
}

// ============================================================================
// Weekly Report Hooks
// ============================================================================

export function useGenerateWeeklyReportMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { facilityId: string; weekStartDate: string }) =>
			fetchJson<WeeklyReportSummary>(`${API_BASE}/pidsr/weekly`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: reportingKeys.all }),
	})
}

// ============================================================================
// AHSR Hooks
// ============================================================================

export function useAhsrMetricsQuery(params: {
	facilityId: string
	year: number
	month?: number
}) {
	return useQuery({
		queryKey: reportingKeys.ahsr(params),
		queryFn: () =>
			fetchJson<AhsrMetricsResponse>(
				`${API_BASE}/ahsr${buildQueryString(params)}`
			),
	})
}

export function useAhsrDrilldownQuery(params: {
	facilityId: string
	year: number
	month?: number
	metric: string
	icdCode?: string
	haiType?: string
	page?: number
	limit?: number
}, enabled: boolean = true) {
	return useQuery({
		queryKey: reportingKeys.ahsrDrilldown(params),
		queryFn: () =>
			fetchJson<AhsrDrilldownResponse>(
				`${API_BASE}/ahsr/drilldown${buildQueryString(params)}`
			),
		enabled,
	})
}

export function useExportAhsrMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { facilityId: string; year: number; month?: number }) =>
			fetchJson<ExportAhsrResponse>(`${API_BASE}/ahsr/export`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: reportingKeys.all }),
	})
}

// ============================================================================
// HAI Report Types & Hooks
// ============================================================================

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

// Report Export Types
export interface ExportReportResponse {
	success: boolean
	message: string
	downloadUrl?: string
	fileName?: string
}

export function useHaiReportQuery(params: {
	facilityId: string
	year: number
	month?: number
}) {
	return useQuery({
		queryKey: [...reportingKeys.all, "hai", params] as const,
		queryFn: () =>
			fetchJson<HaiReportResponse>(
				`${API_BASE}/hai${buildQueryString(params)}`
			),
		enabled: !!params.facilityId,
	})
}

export function useHaiCasesQuery(params: {
	facilityId: string
	year: number
	month?: number
	haiType?: string
	page?: number
	limit?: number
}, enabled = true) {
	return useQuery({
		queryKey: [...reportingKeys.all, "hai-cases", params] as const,
		queryFn: () =>
			fetchJson<HaiCaseListResponse>(
				`${API_BASE}/hai/cases${buildQueryString(params)}`
			),
		enabled: enabled && !!params.facilityId,
	})
}

export function useExportReportMutation() {
	return useMutation({
		mutationFn: (data: {
			facilityId: string
			reportType: "ahsr" | "pidsr" | "hai"
			format: "csv" | "pdf" | "xml"
			year: number
			month?: number
			dateFrom?: string
			dateTo?: string
		}) =>
			fetchJson<ExportReportResponse>(`${API_BASE}/export`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
	})
}

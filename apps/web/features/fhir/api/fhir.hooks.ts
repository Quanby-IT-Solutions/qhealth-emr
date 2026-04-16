import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { env } from "@/env"

// ============================================================================
// Constants
// ============================================================================

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/fhir`

export const FHIR_RESOURCE_TYPES = [
	"Patient",
	"Encounter",
	"Observation",
	"DiagnosticReport",
	"MedicationRequest",
	"Procedure",
	"Condition",
	"Immunization",
	"AllergyIntolerance",
	"Coverage",
	"ClaimResponse",
	"Practitioner",
	"Organization",
	"Location",
] as const

export type FhirResourceType = (typeof FHIR_RESOURCE_TYPES)[number]

// ============================================================================
// Types
// ============================================================================

export type FhirExportStatus =
	| "pending"
	| "processing"
	| "completed"
	| "failed"
	| "submitted"
	| "accepted"
	| "rejected"

export type NhdrSubmissionStatus = "pending" | "submitted" | "accepted" | "rejected" | "error"

export interface FhirExport {
	id: string
	facilityId: string
	status: FhirExportStatus
	dateRangeStart: string
	dateRangeEnd: string
	resourceTypes: FhirResourceType[]
	validateOnExport: boolean
	totalResources: number
	exportedResources: number
	exportUrl: string | null
	errorMessage: string | null
	createdAt: string
	completedAt: string | null
	createdByName: string
	nhdrSubmissionId: string | null
}

export interface FhirExportListResponse {
	data: FhirExport[]
	total: number
	page: number
	totalPages: number
}

export interface ValidationIssue {
	severity: "error" | "warning" | "information"
	code: string
	message: string
	count: number
}

export interface ValidationResourceSummary {
	resourceType: FhirResourceType
	total: number
	valid: number
	errorCount: number
	warningCount: number
	issues: ValidationIssue[]
}

export interface FhirValidationReport {
	exportId: string
	validatedAt: string
	totalResources: number
	totalValid: number
	totalErrors: number
	totalWarnings: number
	isValid: boolean
	resources: ValidationResourceSummary[]
}

export interface NhdrSubmission {
	id: string
	exportId: string
	facilityId: string
	status: NhdrSubmissionStatus
	submittedAt: string | null
	acknowledgementId: string | null
	responseMessage: string | null
	responseReceivedAt: string | null
	submittedByName: string
	periodStart: string
	periodEnd: string
}

export interface CreateExportInput {
	facilityId: string
	dateRangeStart: string
	dateRangeEnd: string
	resourceTypes: FhirResourceType[]
	validateOnExport: boolean
}

// ============================================================================
// Fetch helpers
// ============================================================================

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
	const res = await fetch(url, {
		credentials: "include",
		headers: { "Content-Type": "application/json", ...init?.headers },
		...init,
	})
	if (!res.ok) {
		const text = await res.text().catch(() => res.statusText)
		throw new Error(text || `HTTP ${res.status}`)
	}
	return res.json() as Promise<T>
}

function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
	const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "")
	if (!entries.length) return ""
	return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")
}

// ============================================================================
// Query Keys
// ============================================================================

export const fhirKeys = {
	all: ["fhir"] as const,
	exports: (facilityId: string) => ["fhir", "exports", facilityId] as const,
	export: (exportId: string) => ["fhir", "export", exportId] as const,
	validation: (exportId: string) => ["fhir", "validation", exportId] as const,
	submissions: (facilityId: string) => ["fhir", "submissions", facilityId] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

export function useExportListQuery(facilityId: string, page = 1, limit = 20) {
	return useQuery<FhirExportListResponse>({
		queryKey: [...fhirKeys.exports(facilityId), page],
		queryFn: () =>
			fetchJson(
				API_BASE + "/exports" + buildQueryString({ facilityId, page, limit }),
			),
		enabled: !!facilityId,
	})
}

export function useExportDetailQuery(exportId: string | null) {
	return useQuery<FhirExport>({
		queryKey: fhirKeys.export(exportId ?? ""),
		queryFn: () => fetchJson(API_BASE + `/exports/${exportId}`),
		enabled: !!exportId,
	})
}

export function useValidationReportQuery(exportId: string | null) {
	return useQuery<FhirValidationReport>({
		queryKey: fhirKeys.validation(exportId ?? ""),
		queryFn: () => fetchJson(API_BASE + `/exports/${exportId}/validation`),
		enabled: !!exportId,
	})
}

export function useNhdrSubmissionsQuery(facilityId: string) {
	return useQuery<NhdrSubmission[]>({
		queryKey: fhirKeys.submissions(facilityId),
		queryFn: () =>
			fetchJson(API_BASE + "/nhdr-submissions" + buildQueryString({ facilityId })),
		enabled: !!facilityId,
	})
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export function useCreateExportMutation() {
	const queryClient = useQueryClient()
	return useMutation<FhirExport, Error, CreateExportInput>({
		mutationFn: input =>
			fetchJson(API_BASE + "/exports", {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: data => {
			void queryClient.invalidateQueries({ queryKey: fhirKeys.exports(data.facilityId) })
		},
	})
}

export function useSubmitToNhdrMutation() {
	const queryClient = useQueryClient()
	return useMutation<NhdrSubmission, Error, { exportId: string; facilityId: string }>({
		mutationFn: ({ exportId }) =>
			fetchJson(API_BASE + `/exports/${exportId}/submit-nhdr`, { method: "POST" }),
		onSuccess: (data) => {
			void queryClient.invalidateQueries({ queryKey: fhirKeys.submissions(data.facilityId) })
			void queryClient.invalidateQueries({ queryKey: fhirKeys.exports(data.facilityId) })
		},
	})
}

// ============================================================================
// Helpers
// ============================================================================

export function getExportStatusColor(status: FhirExportStatus): string {
	switch (status) {
		case "pending":
		case "processing":
			return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
		case "completed":
			return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
		case "submitted":
			return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
		case "accepted":
			return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
		case "failed":
		case "rejected":
			return ""
	}
}

export function getNhdrStatusColor(status: NhdrSubmissionStatus): string {
	switch (status) {
		case "pending":
			return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
		case "submitted":
			return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
		case "accepted":
			return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
		case "rejected":
		case "error":
			return ""
	}
}

export function formatExportStatusLabel(status: FhirExportStatus): string {
	switch (status) {
		case "pending":
			return "Pending"
		case "processing":
			return "Processing"
		case "completed":
			return "Completed"
		case "failed":
			return "Failed"
		case "submitted":
			return "Submitted"
		case "accepted":
			return "Accepted"
		case "rejected":
			return "Rejected"
	}
}

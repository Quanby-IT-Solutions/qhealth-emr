"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, useCallback } from "react"

import { env } from "@/env"

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/sla`

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

export type SlaStatus = "on_time" | "approaching" | "exceeded"

export type SlaWorkflowType =
	| "opd_consultation"
	| "admission"
	| "lab_result"
	| "radiology_result"
	| "medication_dispensing"
	| "discharge"
	| "medical_records"
	| "emergency_triage"
	| "surgical_scheduling"
	| "billing_processing"
	| "certificate_issuance"

export interface SlaConfig {
	id: string
	facilityId: string
	workflowType: SlaWorkflowType
	targetMinutes: number
	warningThresholdPct: number // e.g. 80 = warn at 80% of target
	isActive: boolean
	description: string
	createdAt: string
	updatedAt: string
}

export interface SlaEvent {
	id: string
	facilityId: string
	encounterId: string | null
	patientId: string | null
	patientName: string | null
	workflowType: SlaWorkflowType
	startedAt: string
	completedAt: string | null
	targetMinutes: number
	elapsedMinutes: number
	status: SlaStatus
	escalatedAt: string | null
	escalatedToStaffId: string | null
	notes: string | null
	createdAt: string
	currentStep?: string | null
}

export interface SlaEventListResponse {
	total: number
	page: number
	limit: number
	totalPages: number
	data: SlaEvent[]
}

export interface SlaConfigListResponse {
	data: SlaConfig[]
}

export interface SlaStepMetric {
	stepStatus: string
	/** Human-readable label from the backend (resolves TOR step name when known) */
	stepLabel?: string
	totalCount: number
	onTimeCount: number
	approachingCount: number
	exceededCount: number
	compliancePct: number
	avgElapsedMinutes: number
	avgTargetMinutes: number
}

export interface SlaComplianceMetric {
	workflowType: SlaWorkflowType
	totalCount: number
	onTimeCount: number
	approachingCount: number
	exceededCount: number
	compliancePct: number
	avgElapsedMinutes: number
	avgTargetMinutes: number
	stepMetrics?: SlaStepMetric[]
	timingAccuracy?: "checkpoint" | "partial" | "proxy"
}

export interface SlaComplianceReport {
	facilityId: string
	periodStart: string
	periodEnd: string
	/** Operational SLA Score — all workflows including proxy/partial timing */
	overallCompliancePct: number
	/** ARTA-Authoritative Compliance — checkpoint-backed workflows only */
	authoritativeCompliancePct: number
	authoritativeCount: number
	authoritativeOnTimeCount: number
	metrics: SlaComplianceMetric[]
}

export interface CreateSlaConfigInput {
	facilityId: string
	workflowType: SlaWorkflowType
	targetMinutes: number
	warningThresholdPct: number
	description: string
}

export interface UpdateSlaConfigInput extends Partial<CreateSlaConfigInput> {
	isActive?: boolean
}

// ============================================================================
// Query Keys
// ============================================================================

export const slaKeys = {
	all: ["sla"] as const,
	events: (facilityId: string) => [...slaKeys.all, "events", facilityId] as const,
	eventsByEncounter: (encounterId: string) => [...slaKeys.all, "events", "encounter", encounterId] as const,
	configs: (facilityId: string) => [...slaKeys.all, "configs", facilityId] as const,
	compliance: (facilityId: string, start: string, end: string) =>
		[...slaKeys.all, "compliance", facilityId, start, end] as const,
}

// ============================================================================
// SLA Events Hooks
// ============================================================================

export function useSlaEventsQuery(params: {
	facilityId: string
	status?: SlaStatus | "all"
	workflowType?: SlaWorkflowType
	page?: number
	limit?: number
	paused?: boolean
}) {
	return useQuery<SlaEventListResponse>({
		queryKey: [...slaKeys.events(params.facilityId), params.status, params.workflowType, params.page],
		queryFn: () =>
			fetchJson(
				API_BASE +
					"/events" +
					buildQueryString({
						facilityId: params.facilityId,
						status: params.status !== "all" ? params.status : undefined,
						workflowType: params.workflowType,
						page: params.page ?? 1,
						limit: params.limit ?? 50,
					})
			),
		refetchInterval: params.paused ? false : 30_000,
		staleTime: 25_000,
	})
}

export function useSlaEventsByEncounterQuery(encounterId: string | null) {
	return useQuery<SlaEvent[]>({
		queryKey: slaKeys.eventsByEncounter(encounterId ?? ""),
		queryFn: () =>
			fetchJson(API_BASE + `/events/encounter/${encounterId}`),
		enabled: !!encounterId,
	})
}

// ============================================================================
// SLA Config Hooks
// ============================================================================

export function useSlaConfigsQuery(facilityId: string) {
	return useQuery<SlaConfigListResponse>({
		queryKey: slaKeys.configs(facilityId),
		queryFn: () =>
			fetchJson(API_BASE + "/configs" + buildQueryString({ facilityId })),
	})
}

export function useCreateSlaConfigMutation() {
	const queryClient = useQueryClient()
	return useMutation<SlaConfig, Error, CreateSlaConfigInput>({
		mutationFn: input =>
			fetchJson(API_BASE + "/configs", {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: (_, variables) => {
			void queryClient.invalidateQueries({ queryKey: slaKeys.configs(variables.facilityId) })
		},
	})
}

export function useUpdateSlaConfigMutation() {
	const queryClient = useQueryClient()
	return useMutation<SlaConfig, Error, { id: string; facilityId: string } & UpdateSlaConfigInput>({
		mutationFn: ({ id, facilityId: _fid, ...input }) =>
			fetchJson(API_BASE + `/configs/${id}`, {
				method: "PATCH",
				body: JSON.stringify(input),
			}),
		onSuccess: (data) => {
			void queryClient.invalidateQueries({ queryKey: slaKeys.configs(data.facilityId) })
		},
	})
}

export function useDeleteSlaConfigMutation() {
	const queryClient = useQueryClient()
	return useMutation<void, Error, { id: string; facilityId: string }>({
		mutationFn: ({ id }) =>
			fetchJson(API_BASE + `/configs/${id}`, { method: "DELETE" }),
		onSuccess: (_, variables) => {
			void queryClient.invalidateQueries({ queryKey: slaKeys.configs(variables.facilityId) })
		},
	})
}

// ============================================================================
// SLA Compliance Report Hook
// ============================================================================

export function useSlaComplianceReportQuery(params: {
	facilityId: string
	periodStart: string
	periodEnd: string
}) {
	return useQuery<SlaComplianceReport>({
		queryKey: slaKeys.compliance(params.facilityId, params.periodStart, params.periodEnd),
		queryFn: () =>
			fetchJson(
				API_BASE +
					"/compliance" +
					buildQueryString({
						facilityId: params.facilityId,
						periodStart: params.periodStart,
						periodEnd: params.periodEnd,
					})
			),
		enabled: !!params.facilityId && !!params.periodStart && !!params.periodEnd,
	})
}

// ============================================================================
// Local mock data for development (used when API is unavailable)
// ============================================================================

const WORKFLOW_LABELS: Record<SlaWorkflowType, string> = {
	opd_consultation: "OPD Consultation",
	admission: "Admission Processing",
	lab_result: "Lab Result Turnaround",
	radiology_result: "Radiology Result",
	medication_dispensing: "Medication Dispensing",
	discharge: "Discharge Processing",
	medical_records: "Medical Records Request",
	emergency_triage: "Emergency Triage",
	surgical_scheduling: "Surgical Scheduling",
	billing_processing: "Billing Processing",
	certificate_issuance: "Certificate Issuance (Flow 7)",
}

export { WORKFLOW_LABELS }

export const DEFAULT_SLA_TARGETS: Record<SlaWorkflowType, number> = {
	opd_consultation: 30,
	admission: 60,
	lab_result: 120,
	radiology_result: 240,
	medication_dispensing: 30,
	discharge: 120,
	medical_records: 4320, // 3 working days
	emergency_triage: 10,
	surgical_scheduling: 2880, // 2 working days
	billing_processing: 60,
	certificate_issuance: 30, // 30 min per TOR Flow 7
}

export function getSlaStatus(elapsedMinutes: number, targetMinutes: number, warningPct = 80): SlaStatus {
	const pct = (elapsedMinutes / targetMinutes) * 100
	if (pct >= 100) return "exceeded"
	if (pct >= warningPct) return "approaching"
	return "on_time"
}

export function useLocalSlaFacilityId() {
	// Reads facilityId from the user's active session/profile
	// Returns a placeholder; real implementation binds to useMyProfile
	const [facilityId] = useState("default-facility")
	return facilityId
}

export { buildQueryString, fetchJson }

// ============================================================================
// SLA Step Config Types
// ============================================================================

export type SlaStepType =
	| "opd_triage"
	| "opd_registration"
	| "opd_vitals"
	| "opd_consultation"
	| "opd_disposition"
	| "ed_rapid_triage"
	| "ed_registration"
	| "ed_disposition"
	| "ancillary_order_receipt"
	| "ancillary_payment_clearance"
	| "ancillary_procedure"
	| "ancillary_release"
	| "admission_order"
	| "admission_bed_assignment"
	| "admission_financial_orientation"
	| "admission_physical_transfer"
	| "discharge_may_go_home"
	| "discharge_chart_completion"
	| "discharge_clearance"
	| "discharge_bill_generation"
	| "discharge_gate_pass"
	| "pharmacy_rx_verification"
	| "pharmacy_clearance"
	| "pharmacy_dispensing"
	| "records_request"
	| "records_payment"
	| "records_processing_release"

export interface SlaStepConfig {
	id: string
	facilityId: string
	stepType: SlaStepType
	targetMinutes: number
	warningThresholdPct: number
	isActive: boolean
	description: string
	createdAt: string
	updatedAt: string
}

export interface SlaStepConfigListResponse {
	data: SlaStepConfig[]
}

export interface CreateSlaStepConfigInput {
	facilityId: string
	stepType: SlaStepType
	targetMinutes: number
	warningThresholdPct: number
	description: string
}

export interface UpdateSlaStepConfigInput {
	targetMinutes?: number
	warningThresholdPct?: number
	description?: string
	isActive?: boolean
}

// ============================================================================
// SLA Step Config Query Keys
// ============================================================================

export const slaStepKeys = {
	all: ["sla-step-configs"] as const,
	list: (facilityId: string) => [...slaStepKeys.all, facilityId] as const,
}

// ============================================================================
// SLA Step Config Hooks
// ============================================================================

export function useSlaStepConfigsQuery(facilityId: string) {
	return useQuery<SlaStepConfigListResponse>({
		queryKey: slaStepKeys.list(facilityId),
		queryFn: () =>
			fetchJson(API_BASE + "/step-configs" + buildQueryString({ facilityId })),
		enabled: !!facilityId,
	})
}

export function useCreateSlaStepConfigMutation() {
	const queryClient = useQueryClient()
	return useMutation<SlaStepConfig, Error, CreateSlaStepConfigInput>({
		mutationFn: input =>
			fetchJson(API_BASE + "/step-configs", {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: (_, variables) => {
			void queryClient.invalidateQueries({ queryKey: slaStepKeys.list(variables.facilityId) })
		},
	})
}

export function useUpdateSlaStepConfigMutation() {
	const queryClient = useQueryClient()
	return useMutation<SlaStepConfig, Error, { id: string; facilityId: string } & UpdateSlaStepConfigInput>({
		mutationFn: ({ id, facilityId: _fid, ...input }) =>
			fetchJson(API_BASE + `/step-configs/${id}`, {
				method: "PATCH",
				body: JSON.stringify(input),
			}),
		onSuccess: (data) => {
			void queryClient.invalidateQueries({ queryKey: slaStepKeys.list(data.facilityId) })
		},
	})
}

export function useDeleteSlaStepConfigMutation() {
	const queryClient = useQueryClient()
	return useMutation<void, Error, { id: string; facilityId: string }>({
		mutationFn: ({ id }) =>
			fetchJson(API_BASE + `/step-configs/${id}`, { method: "DELETE" }),
		onSuccess: (_, variables) => {
			void queryClient.invalidateQueries({ queryKey: slaStepKeys.list(variables.facilityId) })
		},
	})
}

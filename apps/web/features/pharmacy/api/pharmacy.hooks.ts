"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { env } from "@/env"

// Pharmacy endpoints are under /orders/pharmacy in the backend
const ORDERS_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/orders`
const PHARMACY_BASE = `${ORDERS_BASE}/pharmacy`

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

export type OrderPriority = "routine" | "urgent" | "stat"
export type QueueStatus = "pending_verification" | "on_hold" | "verified" | "rejected"
export type SafetySeverity = "critical" | "major" | "moderate" | "minor" | "info"
export type DispenseStep = "verify" | "billing" | "dispense"

export interface PharmacyQueueItem {
	id: string
	facilityId: string
	encounterId: string | null
	patientId: string
	patientName: string
	patientMrn: string
	patientWeight: number | null
	patientDateOfBirth: string | null
	patientCreatinine: number | null
	genericName: string
	brandName: string | null
	dose: string
	doseUnit: string
	doseForm: string
	route: string
	frequency: string
	durationDays: number | null
	specialInstructions: string | null
	isPrn: boolean
	prnReason: string | null
	isControlledSubstance: boolean
	pdeaSchedule: string | null
	priority: OrderPriority
	status: QueueStatus
	orderingStaffId: string
	orderingStaffName: string | null
	alertCount: number
	criticalAlertCount: number
	receivedAt: string
}

export interface SafetyCheck {
	id: string
	type:
		| "drug_interaction"
		| "dose_range"
		| "weight_based"
		| "renal_adjustment"
		| "hepatic_adjustment"
		| "allergy_cross_reactivity"
		| "black_box_warning"
		| "duplicate_therapy"
		| "pregnancy_category"
	severity: SafetySeverity
	title: string
	message: string
	details?: {
		interactingDrug?: string
		recommendedDose?: string
		actualDose?: string
		adjustedDose?: string
		allergen?: string
		category?: string
	}
	isHardBlock: boolean
	requiresOverride: boolean
}

export interface PharmacyOrderDetail extends PharmacyQueueItem {
	safetyChecks: SafetyCheck[]
	rxnormCode: string | null
	formularyItemId: string | null
	cdsAlerts: unknown
	cdsOverrides: unknown
}

export interface DispenseRecord {
	id: string
	medicationOrderId: string
	dispensedQuantity: number
	quantityUnit: string
	lotNumber: string | null
	expiryDate: string | null
	counselingNotes: string | null
	patientEducation: string[]
	pharmacistStaffId: string
	dispensedAt: string
}

export interface OpdPrescription {
	id: string
	prescriptionNumber: string
	facilityId: string
	patientId: string
	patientName: string
	patientMrn: string
	patientDateOfBirth: string | null
	prescriberName: string
	prescriberPrc: string
	prescribedAt: string
	status: "active" | "partially_dispensed" | "dispensed" | "expired" | "cancelled"
	items: OpdPrescriptionItem[]
	philhealthPin: string | null
	philhealthCoverage: number
	estimatedTotal: number
	outOfPocket: number
}

export interface OpdPrescriptionItem {
	id: string
	genericName: string
	brandName: string | null
	dose: string
	doseUnit: string
	doseForm: string
	route: string
	frequency: string
	quantity: number
	durationDays: number | null
	isControlledSubstance: boolean
	pdeaSchedule: string | null
	unitPrice: number
	totalPrice: number
	dispensed: boolean
}

export interface OpdDispenseRecord {
	id: string
	prescriptionId: string
	facilityId: string
	patientId: string
	patientName: string
	items: Array<{
		prescriptionItemId: string
		genericName: string
		dispensedQuantity: number
		lotNumber: string | null
	}>
	totalAmount: number
	philhealthCoverage: number
	outOfPocket: number
	counselingNotes: string | null
	patientEducation: string[]
	pharmacistStaffId: string
	dispensedAt: string
}

// ============================================================================
// Query Keys
// ============================================================================

export const pharmacyKeys = {
	all: ["pharmacy"] as const,
	queue: (params: object) => [...pharmacyKeys.all, "queue", params] as const,
	order: (id: string) => [...pharmacyKeys.all, "order", id] as const,
	dispenseRecords: (orderId: string) =>
		[...pharmacyKeys.all, "dispense-records", orderId] as const,
	opdPrescription: (search: string) =>
		[...pharmacyKeys.all, "opd-prescription", search] as const,
	opdDispenseHistory: (params: object) =>
		[...pharmacyKeys.all, "opd-history", params] as const,
}

// ============================================================================
// Verification Queue
// ============================================================================

export interface PharmacyQueueParams {
	facilityId: string
	status?: QueueStatus | "all"
	priority?: OrderPriority
	search?: string
	isControlledSubstance?: boolean
	page?: number
	limit?: number
}

interface PaginatedResponse<T> {
	data: T[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export function usePharmacyQueueQuery(params: PharmacyQueueParams) {
	return useQuery({
		queryKey: pharmacyKeys.queue(params),
		queryFn: () =>
			fetchJson<PaginatedResponse<PharmacyQueueItem>>(
				`${PHARMACY_BASE}/queue${buildQueryString(
					params as unknown as Record<string, string | number | boolean | undefined>
				)}`
			),
		enabled: !!params.facilityId,
		refetchInterval: 30 * 1000, // auto-refresh every 30 s
	})
}

export function usePharmacyOrderDetailQuery(id: string | null) {
	return useQuery({
		queryKey: pharmacyKeys.order(id ?? ""),
		queryFn: () => fetchJson<PharmacyOrderDetail>(`${ORDERS_BASE}/medications/${id}`),
		enabled: !!id,
	})
}

// ============================================================================
// Verify / Reject / Put On Hold
// ============================================================================

interface VerifyOrderInput {
	medicationOrderId: string
	action: "approved" | "rejected" | "on_hold"
	rejectionReason?: string
	modificationNotes?: string
	overrideNotes?: string
}

export function useVerifyPharmacyOrderMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: VerifyOrderInput) =>
			fetchJson<{ success: boolean }>(`${PHARMACY_BASE}/verify`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: pharmacyKeys.all })
		},
	})
}

// ============================================================================
// Dispense
// ============================================================================

export interface DispenseOrderInput {
	medicationOrderId: string
	dispensedQuantity: number
	quantityUnit: string
	lotNumber?: string
	expiryDate?: string
	counselingNotes?: string
	patientEducation?: string[]
}

export function useDispenseOrderMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: DispenseOrderInput) =>
			fetchJson<DispenseRecord>(`${PHARMACY_BASE}/dispense`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: pharmacyKeys.all })
		},
	})
}

// ============================================================================
// OPD Dispensing
// ============================================================================

export function useOpdPrescriptionSearchQuery(search: string) {
	return useQuery({
		queryKey: pharmacyKeys.opdPrescription(search),
		queryFn: () =>
			fetchJson<OpdPrescription>(
				`${PHARMACY_BASE}/opd/prescription${buildQueryString({ q: search })}`
			),
		enabled: search.trim().length >= 3,
		retry: false,
	})
}

export interface OpdDispenseInput {
	prescriptionId: string
	facilityId: string
	items: Array<{
		prescriptionItemId: string
		dispensedQuantity: number
		lotNumber?: string
	}>
	counselingNotes?: string
	patientEducation?: string[]
}

export function useOpdDispenseMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: OpdDispenseInput) =>
			fetchJson<OpdDispenseRecord>(`${PHARMACY_BASE}/opd/dispense`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: pharmacyKeys.all })
		},
	})
}

export interface OpdDispenseHistoryParams {
	facilityId: string
	date?: string
	page?: number
	limit?: number
}

export function useOpdDispenseHistoryQuery(params: OpdDispenseHistoryParams) {
	return useQuery({
		queryKey: pharmacyKeys.opdDispenseHistory(params),
		queryFn: () =>
			fetchJson<PaginatedResponse<OpdDispenseRecord>>(
				`${PHARMACY_BASE}/opd/history${buildQueryString(
					params as unknown as Record<string, string | number | boolean | undefined>
				)}`
			),
		enabled: !!params.facilityId,
	})
}

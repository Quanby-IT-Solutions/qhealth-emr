"use client"

import type { InferContractRouterOutputs } from "@orpc/contract"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { type v1Contract } from "@repo/contracts"

import { env } from "@/env"
import { orpc } from "@/services/orpc/client"

// Pharmacy endpoints are under /orders/pharmacy in the backend
const ORDERS_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/orders`
const PHARMACY_BASE = `${ORDERS_BASE}/pharmacy`

type V1Outputs = InferContractRouterOutputs<typeof v1Contract>
type RawMedOrder = V1Outputs["orders"]["getMedOrder"]
type RawVerificationQueueResponse = V1Outputs["orders"]["getVerificationQueue"]

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

function serializeDate(value: Date | string | null | undefined): string | null {
	if (!value) return null
	return value instanceof Date ? value.toISOString() : value
}

function serializeRequiredDate(value: Date | string): string {
	return value instanceof Date ? value.toISOString() : value
}

function normalizeQueueStatus(status: string): QueueStatus {
	switch (status) {
		case "active":
		case "verified":
			return "verified"
		case "modified":
			return "on_hold"
		case "rejected":
			return "rejected"
		default:
			return "pending_verification"
	}
}

function mapPharmacyQueueItem(order: RawMedOrder): PharmacyQueueItem {
	return {
		id: order.id,
		facilityId: order.facilityId,
		encounterId: order.encounterId,
		patientId: order.patientId ?? "",
		patientName: order.patientName ?? "Unknown patient",
		patientMrn: order.patientMrn ?? "-",
		patientWeight: order.patientWeight ?? null,
		patientDateOfBirth: serializeDate(order.patientDateOfBirth),
		patientCreatinine: order.patientCreatinine ?? null,
		genericName: order.genericName,
		brandName: order.brandName,
		dose: order.dose,
		doseUnit: order.doseUnit,
		doseForm: order.doseForm,
		route: order.route,
		frequency: order.frequency,
		durationDays: order.durationDays,
		specialInstructions: order.specialInstructions,
		isPrn: order.isPrn,
		prnReason: order.prnReason,
		isControlledSubstance: order.isControlledSubstance,
		pdeaSchedule: order.pdeaSchedule,
		priority: (order.priority ?? "routine") as OrderPriority,
		status: normalizeQueueStatus(order.status),
		orderingStaffId: order.orderingStaffId,
		orderingStaffName: order.orderingStaffName,
		alertCount: order.alertCount ?? 0,
		criticalAlertCount: order.criticalAlertCount ?? 0,
		receivedAt: serializeRequiredDate(order.receivedAt ?? order.createdAt),
	}
	}

function mapSafetyChecks(order: RawMedOrder): SafetyCheck[] {
	return (order.safetyChecks ?? []).map(check => ({
		id: check.id,
		type: check.type,
		severity: check.severity,
		title: check.title,
		message: check.message,
		details: check.details,
		isHardBlock: check.isHardBlock,
		requiresOverride: check.requiresOverride,
	}))
}

function mapPharmacyOrderDetail(order: RawMedOrder): PharmacyOrderDetail {
	return {
		...mapPharmacyQueueItem(order),
		safetyChecks: mapSafetyChecks(order),
		rxnormCode: order.rxnormCode,
		formularyItemId: order.formularyItemId,
		cdsAlerts: order.cdsAlerts,
		cdsOverrides: order.cdsOverrides,
	}
}

function filterQueueResponse(
	response: RawVerificationQueueResponse,
	params: PharmacyQueueParams
): PaginatedResponse<PharmacyQueueItem> {
	const searchTerm = params.search?.trim().toLowerCase()

	const data = response.data
		.map(mapPharmacyQueueItem)
		.filter(item => {
			if (params.status && params.status !== "all" && item.status !== params.status) {
				return false
			}

			if (params.priority && item.priority !== params.priority) {
				return false
			}

			if (
				params.isControlledSubstance !== undefined &&
				item.isControlledSubstance !== params.isControlledSubstance
			) {
				return false
			}

			if (!searchTerm) {
				return true
			}

			const haystack = [
				item.patientName,
				item.patientMrn,
				item.genericName,
				item.brandName,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase()

			return haystack.includes(searchTerm)
		})

	return {
		data,
		total: data.length,
		page: params.page ?? response.page,
		limit: params.limit ?? response.limit,
		totalPages: Math.max(1, Math.ceil(data.length / (params.limit ?? response.limit))),
	}
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
		...orpc.orders.getVerificationQueue.queryOptions({
			input: {
				facilityId: params.facilityId,
				page: params.page ?? 1,
				limit: params.limit ?? 50,
			},
			enabled: !!params.facilityId,
			select: response => filterQueueResponse(response, params),
		}),
		queryKey: pharmacyKeys.queue(params),
		refetchInterval: 30 * 1000,
	})
}

export function usePharmacyOrderDetailQuery(id: string | null) {
	return useQuery({
		...orpc.orders.getMedOrder.queryOptions({
			input: id ? { id } : undefined,
			enabled: !!id,
			select: mapPharmacyOrderDetail,
		}),
		queryKey: pharmacyKeys.order(id ?? ""),
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
		mutationFn: async (data: VerifyOrderInput) => {
			await orpc.orders.verifyOrder.call({
				medicationOrderId: data.medicationOrderId,
				action: data.action === "on_hold" ? "modified" : data.action,
				rejectionReason: data.rejectionReason,
				modificationNotes:
					data.modificationNotes ?? data.overrideNotes,
			})

			return { success: true }
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: pharmacyKeys.all })
			queryClient.invalidateQueries({ queryKey: orpc.orders.key() })
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

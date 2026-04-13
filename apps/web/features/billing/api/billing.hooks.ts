"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { env } from "@/env"

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/billing`

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

interface ChargeMasterItem {
	id: string
	facilityId: string
	itemCode: string
	description: string
	category: "laboratory" | "imaging" | "medication" | "procedure" | "room" | "other"
	unitPrice: string
	rvsCode: string | null
	isActive: boolean
	createdAt: string
	updatedAt: string
}

interface Charge {
	id: string
	facilityId: string
	encounterId: string
	chargeMasterItemId: string | null
	description: string
	quantity: string
	unitPrice: string
	totalAmount: string
	sourceType: "auto_medication" | "auto_lab" | "auto_imaging" | "manual"
	sourceOrderId: string | null
	createdByStaffId: string
	createdAt: string
}

interface InvoiceLineItem {
	id: string
	invoiceId: string
	chargeId: string | null
	description: string
	quantity: string
	unitPrice: string
	totalAmount: string
	createdAt: string
}

interface Invoice {
	id: string
	facilityId: string
	encounterId: string
	patientId: string
	invoiceNumber: string
	subtotal: string
	philhealthCoverage: string
	patientResponsibility: string
	status: "draft" | "finalized" | "paid" | "partially_paid"
	finalizedAt: string | null
	createdByStaffId: string
	createdAt: string
	updatedAt: string
	lineItems?: InvoiceLineItem[]
}

interface Payment {
	id: string
	facilityId: string
	invoiceId: string
	amount: string
	paymentMethod: "cash" | "philhealth" | "hmo" | "credit_card" | "bank_transfer" | "other"
	referenceNumber: string | null
	receivedByStaffId: string
	paymentDate: string
	notes: string | null
	createdAt: string
}

interface Cf4Claim {
	id: string
	facilityId: string
	encounterId: string
	patientId: string
	invoiceId: string | null
	claimNumber: string | null
	status: "draft" | "submitted" | "approved" | "rejected" | "resubmitted"
	submissionData: Record<string, unknown> | null
	responseData: Record<string, unknown> | null
	submittedAt: string | null
	createdAt: string
	updatedAt: string
}

interface Cf4Preview {
	cf4: Cf4Claim
	extractedData: {
		chiefComplaint: string | null
		briefHistory: string | null
		vitalSigns: Record<string, unknown> | null
		diagnoses: { code: string; displayName: string }[]
		procedures: { rvsCode: string | null; description: string }[]
		managementPlan: string | null
	}
	missingFields: string[]
}

interface EligibilityResponse {
	eligibilityCheck: {
		id: string
		facilityId: string
		patientId: string
		philhealthMemberId: string
		checkStatus: "pending" | "eligible" | "ineligible" | "error"
		checkResponse: Record<string, unknown> | null
		checkedAt: string
		createdAt: string
	}
	result: {
		isEligible: boolean
		benefitType: string | null
		remainingCoverage: number | null
		message: string
	}
}

interface BillingStatus {
	areChargesCaptured: boolean
	isInvoiceGenerated: boolean
	totalCharges: number
	invoiceStatus: "draft" | "finalized" | "paid" | "partially_paid" | null
}

interface UnbilledEncounter {
	encounterId: string
	patientId: string
	patientName: string
	mrn: string
	encounterType: string
	admittedAt: string
	totalCharges: number
	chargeCount: number
}

interface PaginatedResponse<T> {
	total: number
	page: number
	limit: number
	totalPages: number
	items?: T[]
	charges?: T[]
	invoices?: T[]
	payments?: T[]
	encounters?: T[]
}

// ============================================================================
// Query Keys
// ============================================================================

const billingKeys = {
	all: ["billing"] as const,
	chargeMaster: (params: object) => [...billingKeys.all, "charge-master", params] as const,
	charges: (params: object) => [...billingKeys.all, "charges", params] as const,
	invoices: (params: object) => [...billingKeys.all, "invoices", params] as const,
	invoice: (id: string) => [...billingKeys.all, "invoice", id] as const,
	payments: (params: object) => [...billingKeys.all, "payments", params] as const,
	cf4: (id: string) => [...billingKeys.all, "cf4", id] as const,
	billingStatus: (encounterId: string) => [...billingKeys.all, "status", encounterId] as const,
	unbilled: (params: object) => [...billingKeys.all, "unbilled", params] as const,
}

// ============================================================================
// Charge Master Hooks
// ============================================================================

export function useChargeMasterQuery(params: {
	facilityId: string
	page?: number
	limit?: number
	category?: string
	search?: string
	isActive?: boolean
}) {
	return useQuery({
		queryKey: billingKeys.chargeMaster(params),
		queryFn: () =>
			fetchJson<PaginatedResponse<ChargeMasterItem>>(
				`${API_BASE}/charge-master${buildQueryString(params)}`
			),
	})
}

// ============================================================================
// Charges Hooks
// ============================================================================

export function useChargesQuery(params: {
	facilityId: string
	encounterId: string
	page?: number
	limit?: number
	sourceType?: string
}) {
	return useQuery({
		queryKey: billingKeys.charges(params),
		queryFn: () =>
			fetchJson<PaginatedResponse<Charge>>(
				`${API_BASE}/charges${buildQueryString(params)}`
			),
	})
}

export function useCreateChargeMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: {
			facilityId: string
			encounterId: string
			chargeMasterItemId?: string
			description: string
			quantity: number
			unitPrice: number
		}) =>
			fetchJson<Charge>(`${API_BASE}/charges`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: billingKeys.all }),
	})
}

export function useUpdateChargeMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { id: string; quantity?: number; description?: string }) =>
			fetchJson<Charge>(`${API_BASE}/charges/${data.id}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: billingKeys.all }),
	})
}

export function useDeleteChargeMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: string) =>
			fetchJson<{ success: boolean }>(`${API_BASE}/charges/${id}`, {
				method: "DELETE",
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: billingKeys.all }),
	})
}

// ============================================================================
// Invoices Hooks
// ============================================================================

export function useInvoicesQuery(params: {
	facilityId: string
	encounterId?: string
	patientId?: string
	status?: string
	page?: number
	limit?: number
}) {
	return useQuery({
		queryKey: billingKeys.invoices(params),
		queryFn: () =>
			fetchJson<PaginatedResponse<Invoice>>(
				`${API_BASE}/invoices${buildQueryString(params)}`
			),
	})
}

export function useInvoiceQuery(id: string) {
	return useQuery({
		queryKey: billingKeys.invoice(id),
		queryFn: () => fetchJson<Invoice>(`${API_BASE}/invoices/${id}`),
		enabled: !!id,
	})
}

export function useGenerateInvoiceMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: {
			facilityId: string
			encounterId: string
			patientId: string
			philhealthCoverage?: number
		}) =>
			fetchJson<Invoice>(`${API_BASE}/invoices/generate`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: billingKeys.all }),
	})
}

export function useFinalizeInvoiceMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: string) =>
			fetchJson<Invoice>(`${API_BASE}/invoices/${id}/finalize`, {
				method: "POST",
				body: JSON.stringify({ id }),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: billingKeys.all }),
	})
}

// ============================================================================
// Payments Hooks
// ============================================================================

export function usePaymentsQuery(params: {
	facilityId: string
	invoiceId: string
	page?: number
	limit?: number
}) {
	return useQuery({
		queryKey: billingKeys.payments(params),
		queryFn: () =>
			fetchJson<PaginatedResponse<Payment>>(
				`${API_BASE}/payments${buildQueryString(params)}`
			),
		enabled: !!params.invoiceId,
	})
}

export function useRecordPaymentMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: {
			facilityId: string
			invoiceId: string
			amount: number
			paymentMethod: string
			referenceNumber?: string
			paymentDate: string
			notes?: string
		}) =>
			fetchJson<Payment>(`${API_BASE}/payments`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: billingKeys.all }),
	})
}

// ============================================================================
// CF4 Hooks
// ============================================================================

export function useCf4Query(id: string) {
	return useQuery({
		queryKey: billingKeys.cf4(id),
		queryFn: () => fetchJson<Cf4Claim>(`${API_BASE}/cf4/${id}`),
		enabled: !!id,
	})
}

export function useGenerateCf4Mutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: {
			facilityId: string
			encounterId: string
			patientId: string
		}) =>
			fetchJson<Cf4Preview>(`${API_BASE}/cf4/generate`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: billingKeys.all }),
	})
}

export function useFinalizeCf4Mutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { id: string; submissionData?: Record<string, unknown> }) =>
			fetchJson<Cf4Claim>(`${API_BASE}/cf4/${data.id}/finalize`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: billingKeys.all }),
	})
}

// ============================================================================
// Eligibility Hooks
// ============================================================================

export function useCheckEligibilityMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: {
			facilityId: string
			patientId: string
			philhealthMemberId: string
		}) =>
			fetchJson<EligibilityResponse>(`${API_BASE}/eligibility/check`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: billingKeys.all }),
	})
}

// ============================================================================
// Billing Status Hooks
// ============================================================================

export function useBillingStatusQuery(encounterId: string) {
	return useQuery({
		queryKey: billingKeys.billingStatus(encounterId),
		queryFn: () =>
			fetchJson<BillingStatus>(
				`${API_BASE}/status${buildQueryString({ encounterId })}`
			),
		enabled: !!encounterId,
	})
}

// ============================================================================
// Unbilled Encounters Hooks
// ============================================================================

export function useUnbilledEncountersQuery(params: {
	facilityId: string
	page?: number
	limit?: number
}) {
	return useQuery({
		queryKey: billingKeys.unbilled(params),
		queryFn: () =>
			fetchJson<PaginatedResponse<UnbilledEncounter>>(
				`${API_BASE}/unbilled${buildQueryString(params)}`
			),
	})
}

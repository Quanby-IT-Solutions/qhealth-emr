"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { env } from "@/env"

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/orders`

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

interface CdsAlert {
	type: string
	severity: string
	message: string
	details?: Record<string, unknown>
}

interface CdsEvaluateResponse {
	alerts: CdsAlert[]
	canProceed: boolean
	requiresOverride: boolean
	requiresDoubleVerification: boolean
}

interface MedOrder {
	id: string
	facilityId: string
	encounterId: string | null
	preEncounterId: string | null
	formularyItemId: string | null
	genericName: string
	brandName: string | null
	rxnormCode: string | null
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
	pdeaTrancheNumber: number | null
	pdeaTrancheTotal: number | null
	status: string
	orderingStaffId: string
	orderingStaffName: string | null
	cdsAlerts: unknown
	cdsOverrides: unknown
	createdAt: string
	updatedAt: string
}

interface LabOrder {
	id: string
	facilityId: string
	encounterId: string | null
	preEncounterId: string | null
	loincCode: string | null
	panelCode: string | null
	testName: string
	panelName: string | null
	priority: string
	status: string
	specimenType: string | null
	orderingStaffId: string
	orderingStaffName: string | null
	collectionDatetime: string | null
	resultedDatetime: string | null
	results: unknown
	cdsAlerts: unknown
	createdAt: string
	updatedAt: string
}

interface ImagingOrder {
	id: string
	facilityId: string
	encounterId: string | null
	preEncounterId: string | null
	modality: string
	bodyPart: string
	clinicalIndication: string | null
	priority: string
	status: string
	orderingStaffId: string
	orderingStaffName: string | null
	scheduledDatetime: string | null
	completedDatetime: string | null
	report: string | null
	structuredResults: unknown
	cdsAlerts: unknown
	createdAt: string
	updatedAt: string
}

interface Verification {
	id: string
	medicationOrderId: string
	action: string
	pharmacistStaffId: string
	pharmacistStaffName: string | null
	rejectionReason: string | null
	modificationNotes: string | null
	verifiedAt: string
	createdAt: string
}

interface Prescription {
	id: string
	facilityId: string
	encounterId: string
	medicationOrderId: string
	patientId: string
	prescriberStaffId: string
	prescriberStaffName: string | null
	prcLicenseNumber: string
	ptrNumber: string
	pdeaS2License: string | null
	prescriptionContent: unknown
	status: string
	signedAt: string | null
	createdAt: string
}

interface PaginatedResponse<T> {
	data: T[]
	total: number
	page: number
	limit: number
	totalPages: number
}

interface ActiveOrdersResponse {
	medicationOrders: MedOrder[]
	labOrders: LabOrder[]
	imagingOrders: ImagingOrder[]
}

// ============================================================================
// Query Keys
// ============================================================================

export const orderKeys = {
	all: ["orders"] as const,
	medOrders: (params: object) => [...orderKeys.all, "medications", params] as const,
	medOrder: (id: string) => [...orderKeys.all, "medication", id] as const,
	labOrders: (params: object) => [...orderKeys.all, "labs", params] as const,
	labOrder: (id: string) => [...orderKeys.all, "lab", id] as const,
	imagingOrders: (params: object) => [...orderKeys.all, "imaging", params] as const,
	imagingOrder: (id: string) => [...orderKeys.all, "imaging-detail", id] as const,
	verificationQueue: (params: object) => [...orderKeys.all, "verification-queue", params] as const,
	prescriptions: (params: object) => [...orderKeys.all, "prescriptions", params] as const,
	prescription: (id: string) => [...orderKeys.all, "prescription", id] as const,
	active: (encounterId: string) => [...orderKeys.all, "active", encounterId] as const,
}

// ============================================================================
// CDS Evaluation
// ============================================================================

interface CdsEvaluateInput {
	patientId: string
	genericName: string
	formularyItemId?: string
	isControlledSubstance?: boolean
	orderingStaffId: string
	facilityId: string
}

export function useEvaluateCdsMutation() {
	return useMutation({
		mutationFn: (data: CdsEvaluateInput) =>
			fetchJson<CdsEvaluateResponse>(`${API_BASE}/cds/evaluate`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
	})
}

// ============================================================================
// Medication Orders
// ============================================================================

interface MedOrderListParams {
	encounterId?: string
	preEncounterId?: string
	status?: string
	page?: number
	limit?: number
}

export function useMedOrderListQuery(params: MedOrderListParams) {
	return useQuery({
		queryKey: orderKeys.medOrders(params),
		queryFn: () =>
			fetchJson<PaginatedResponse<MedOrder>>(
				`${API_BASE}/medications${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`
			),
		enabled: !!(params.encounterId || params.preEncounterId),
	})
}

export function useMedOrderDetailQuery(id: string) {
	return useQuery({
		queryKey: orderKeys.medOrder(id),
		queryFn: () => fetchJson<MedOrder>(`${API_BASE}/medications/${id}`),
		enabled: !!id,
	})
}

interface CreateMedOrderData {
	facilityId: string
	encounterId?: string
	preEncounterId?: string
	formularyItemId?: string
	genericName: string
	brandName?: string
	rxnormCode?: string
	dose: string
	doseUnit: string
	doseForm: string
	route: string
	frequency: string
	durationDays?: number
	specialInstructions?: string
	isPrn?: boolean
	prnReason?: string
	isControlledSubstance?: boolean
	pdeaSchedule?: string
	pdeaTrancheNumber?: number
	pdeaTrancheTotal?: number
	cdsAlerts?: unknown
	cdsOverrides?: unknown
}

export function useCreateMedOrderMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreateMedOrderData) =>
			fetchJson<MedOrder>(`${API_BASE}/medications`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: orderKeys.all })
		},
	})
}

interface UpdateMedOrderData {
	id: string
	dose?: string
	doseUnit?: string
	doseForm?: string
	route?: string
	frequency?: string
	durationDays?: number
	specialInstructions?: string
	isPrn?: boolean
	prnReason?: string
	status?: string
}

export function useUpdateMedOrderMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: UpdateMedOrderData) =>
			fetchJson<MedOrder>(`${API_BASE}/medications/${data.id}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: orderKeys.all })
			queryClient.invalidateQueries({ queryKey: orderKeys.medOrder(variables.id) })
		},
	})
}

export function useDiscontinueMedOrderMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) =>
			fetchJson<MedOrder>(`${API_BASE}/medications/${id}/discontinue`, {
				method: "PUT",
				body: JSON.stringify({ id }),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: orderKeys.all })
		},
	})
}

// ============================================================================
// Lab Orders
// ============================================================================

interface LabOrderListParams {
	encounterId?: string
	preEncounterId?: string
	status?: string
	page?: number
	limit?: number
}

export function useLabOrderListQuery(params: LabOrderListParams) {
	return useQuery({
		queryKey: orderKeys.labOrders(params),
		queryFn: () =>
			fetchJson<PaginatedResponse<LabOrder>>(
				`${API_BASE}/labs${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`
			),
		enabled: !!(params.encounterId || params.preEncounterId),
	})
}

export function useLabOrderDetailQuery(id: string) {
	return useQuery({
		queryKey: orderKeys.labOrder(id),
		queryFn: () => fetchJson<LabOrder>(`${API_BASE}/labs/${id}`),
		enabled: !!id,
	})
}

interface CreateLabOrderData {
	facilityId: string
	encounterId?: string
	preEncounterId?: string
	loincCode?: string
	panelCode?: string
	testName: string
	panelName?: string
	priority?: string
	specimenType?: string
	clinicalIndication?: string
}

export function useCreateLabOrderMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreateLabOrderData) =>
			fetchJson<LabOrder>(`${API_BASE}/labs`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: orderKeys.all })
		},
	})
}

// ============================================================================
// Imaging Orders
// ============================================================================

interface ImagingOrderListParams {
	encounterId?: string
	preEncounterId?: string
	status?: string
	page?: number
	limit?: number
}

export function useImagingOrderListQuery(params: ImagingOrderListParams) {
	return useQuery({
		queryKey: orderKeys.imagingOrders(params),
		queryFn: () =>
			fetchJson<PaginatedResponse<ImagingOrder>>(
				`${API_BASE}/imaging${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`
			),
		enabled: !!(params.encounterId || params.preEncounterId),
	})
}

export function useImagingOrderDetailQuery(id: string) {
	return useQuery({
		queryKey: orderKeys.imagingOrder(id),
		queryFn: () => fetchJson<ImagingOrder>(`${API_BASE}/imaging/${id}`),
		enabled: !!id,
	})
}

interface CreateImagingOrderData {
	facilityId: string
	encounterId?: string
	preEncounterId?: string
	modality: string
	bodyPart: string
	clinicalIndication?: string
	priority?: string
}

export function useCreateImagingOrderMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreateImagingOrderData) =>
			fetchJson<ImagingOrder>(`${API_BASE}/imaging`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: orderKeys.all })
		},
	})
}

// ============================================================================
// Pharmacy Verification
// ============================================================================

interface VerificationQueueParams {
	facilityId: string
	page?: number
	limit?: number
}

export function useVerificationQueueQuery(params: VerificationQueueParams) {
	return useQuery({
		queryKey: orderKeys.verificationQueue(params),
		queryFn: () =>
			fetchJson<PaginatedResponse<MedOrder>>(
				`${API_BASE}/pharmacy/queue${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`
			),
		enabled: !!params.facilityId,
	})
}

interface VerifyOrderData {
	medicationOrderId: string
	action: "approved" | "rejected" | "modified"
	rejectionReason?: string
	modificationNotes?: string
}

export function useVerifyOrderMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: VerifyOrderData) =>
			fetchJson<Verification>(`${API_BASE}/pharmacy/verify`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: orderKeys.all })
		},
	})
}

// ============================================================================
// Prescriptions
// ============================================================================

interface PrescriptionListParams {
	encounterId?: string
	patientId?: string
	page?: number
	limit?: number
}

export function usePrescriptionListQuery(params: PrescriptionListParams) {
	return useQuery({
		queryKey: orderKeys.prescriptions(params),
		queryFn: () =>
			fetchJson<PaginatedResponse<Prescription>>(
				`${API_BASE}/prescriptions${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`
			),
		enabled: !!(params.encounterId || params.patientId),
	})
}

export function usePrescriptionDetailQuery(id: string) {
	return useQuery({
		queryKey: orderKeys.prescription(id),
		queryFn: () => fetchJson<Prescription>(`${API_BASE}/prescriptions/${id}`),
		enabled: !!id,
	})
}

interface CreatePrescriptionData {
	facilityId: string
	encounterId: string
	medicationOrderId: string
	patientId: string
}

export function useCreatePrescriptionMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreatePrescriptionData) =>
			fetchJson<Prescription>(`${API_BASE}/prescriptions`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: orderKeys.all })
		},
	})
}

export function useSignPrescriptionMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) =>
			fetchJson<Prescription>(`${API_BASE}/prescriptions/${id}/sign`, {
				method: "PUT",
				body: JSON.stringify({ id }),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: orderKeys.all })
		},
	})
}

// ============================================================================
// Active Orders (cross-module)
// ============================================================================

export function useActiveOrdersQuery(encounterId: string) {
	return useQuery({
		queryKey: orderKeys.active(encounterId),
		queryFn: () =>
			fetchJson<ActiveOrdersResponse>(
				`${API_BASE}/active${buildQueryString({ encounterId })}`
			),
		enabled: !!encounterId,
	})
}

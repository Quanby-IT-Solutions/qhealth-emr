"use client"

import type { InferContractRouterInputs, InferContractRouterOutputs } from "@orpc/contract"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { type v1Contract } from "@repo/contracts"

import { orpc } from "@/services/orpc/client"

type V1Inputs = InferContractRouterInputs<typeof v1Contract>
type V1Outputs = InferContractRouterOutputs<typeof v1Contract>

type RawMedOrder = V1Outputs["orders"]["getMedOrder"]
type RawLabOrder = V1Outputs["orders"]["getLabOrder"]
type RawImagingOrder = V1Outputs["orders"]["getImagingOrder"]
type RawVerification = V1Outputs["orders"]["verifyOrder"]
type RawHighAlertVerification = V1Outputs["orders"]["createHighAlertVerification"]
type RawHighAlertVerificationQuery = V1Outputs["orders"]["getHighAlertVerification"]
type RawPrescription = V1Outputs["orders"]["getPrescription"]
type RawMedOrderListResponse = V1Outputs["orders"]["listMedOrders"]
type RawLabOrderListResponse = V1Outputs["orders"]["listLabOrders"]
type RawImagingOrderListResponse = V1Outputs["orders"]["listImagingOrders"]
type RawPrescriptionListResponse = V1Outputs["orders"]["listPrescriptions"]
type RawActiveOrdersResponse = V1Outputs["orders"]["getActiveOrders"]
type RawTranchedOrdersResponse = V1Outputs["orders"]["createTranchedOrders"]
type RawPdeaLicenseStatus = V1Outputs["orders"]["checkPdeaLicense"]
type RawChildOrdersResponse = V1Outputs["orders"]["getChildOrders"]

function serializeDate(value: Date | string | null | undefined): string | null {
	if (!value) return null
	return value instanceof Date ? value.toISOString() : value
}

function serializeRequiredDate(value: Date | string): string {
	return value instanceof Date ? value.toISOString() : value
}

export interface CdsAlert {
	type: string
	severity: string
	message: string
	details?: Record<string, unknown>
}

export interface CdsEvaluateResponse {
	alerts: CdsAlert[]
	canProceed: boolean
	requiresOverride: boolean
	requiresDoubleVerification: boolean
}

export interface MedOrder {
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
	parentOrderId: string | null
	isTranche: boolean
	status: string
	orderingStaffId: string
	orderingStaffName: string | null
	patientId?: string | null
	patientName?: string | null
	patientMrn?: string | null
	patientDateOfBirth?: string | null
	patientWeight?: number | null
	patientCreatinine?: number | null
	priority?: string
	alertCount?: number
	criticalAlertCount?: number
	receivedAt?: string
	safetyChecks?: Array<{
		id: string
		type: string
		severity: string
		title: string
		message: string
		details?: Record<string, unknown>
		isHardBlock: boolean
		requiresOverride: boolean
	}>
	cdsAlerts: unknown
	cdsOverrides: unknown
	createdAt: string
	updatedAt: string
}

export interface LabOrder {
	id: string
	facilityId: string
	encounterId: string | null
	preEncounterId: string | null
	loincCode: string | null
	panelCode: string | null
	testName: string
	panelName: string | null
	clinicalIndication: string | null
	indicationIcd10Code: string | null
	indicationIcd10Display: string | null
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

export interface ImagingOrder {
	id: string
	facilityId: string
	encounterId: string | null
	preEncounterId: string | null
	modality: string
	bodyPart: string
	clinicalIndication: string | null
	indicationIcd10Code: string | null
	indicationIcd10Display: string | null
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

export interface Verification {
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

export interface HighAlertVerification {
	id: string
	medicationOrderId: string
	requestingStaffId: string
	verifyingStaffId: string
	verifiedAt: string
	notes: string | null
	createdAt: string
}

export interface Prescription {
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

export interface PaginatedResponse<T> {
	data: T[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export interface ActiveOrdersResponse {
	medicationOrders: MedOrder[]
	labOrders: LabOrder[]
	imagingOrders: ImagingOrder[]
}

export interface TranchedOrdersResponse {
	parentOrder: MedOrder
	childOrders: MedOrder[]
	totalTranches: number
}

export interface PdeaLicenseStatus extends Omit<RawPdeaLicenseStatus, "expiryDate"> {
	expiryDate: string | null
}

function mapMedOrder(order: RawMedOrder): MedOrder {
	return {
		...order,
		patientDateOfBirth: serializeDate(order.patientDateOfBirth),
		receivedAt: order.receivedAt ? serializeRequiredDate(order.receivedAt) : undefined,
		createdAt: serializeRequiredDate(order.createdAt),
		updatedAt: serializeRequiredDate(order.updatedAt),
	}
}

function mapLabOrder(order: RawLabOrder): LabOrder {
	return {
		...order,
		collectionDatetime: serializeDate(order.collectionDatetime),
		resultedDatetime: serializeDate(order.resultedDatetime),
		createdAt: serializeRequiredDate(order.createdAt),
		updatedAt: serializeRequiredDate(order.updatedAt),
	}
}

function mapImagingOrder(order: RawImagingOrder): ImagingOrder {
	return {
		...order,
		scheduledDatetime: serializeDate(order.scheduledDatetime),
		completedDatetime: serializeDate(order.completedDatetime),
		createdAt: serializeRequiredDate(order.createdAt),
		updatedAt: serializeRequiredDate(order.updatedAt),
	}
}

function mapVerification(verification: RawVerification): Verification {
	return {
		...verification,
		verifiedAt: serializeRequiredDate(verification.verifiedAt),
		createdAt: serializeRequiredDate(verification.createdAt),
	}
}

function mapHighAlertVerification(verification: RawHighAlertVerification): HighAlertVerification {
	return {
		...verification,
		verifiedAt: serializeRequiredDate(verification.verifiedAt),
		createdAt: serializeRequiredDate(verification.createdAt),
	}
}

function mapPrescription(prescription: RawPrescription): Prescription {
	return {
		...prescription,
		signedAt: serializeDate(prescription.signedAt),
		createdAt: serializeRequiredDate(prescription.createdAt),
	}
}

function mapPaginatedMedOrders(response: RawMedOrderListResponse): PaginatedResponse<MedOrder> {
	return { ...response, data: response.data.map(mapMedOrder) }
}

function mapPaginatedLabOrders(response: RawLabOrderListResponse): PaginatedResponse<LabOrder> {
	return { ...response, data: response.data.map(mapLabOrder) }
}

function mapPaginatedImagingOrders(
	response: RawImagingOrderListResponse
): PaginatedResponse<ImagingOrder> {
	return { ...response, data: response.data.map(mapImagingOrder) }
}

function mapPaginatedPrescriptions(
	response: RawPrescriptionListResponse
): PaginatedResponse<Prescription> {
	return { ...response, data: response.data.map(mapPrescription) }
}

function mapActiveOrders(response: RawActiveOrdersResponse): ActiveOrdersResponse {
	return {
		medicationOrders: response.medicationOrders.map(mapMedOrder),
		labOrders: response.labOrders.map(mapLabOrder),
		imagingOrders: response.imagingOrders.map(mapImagingOrder),
	}
}

function mapTranchedOrders(response: RawTranchedOrdersResponse): TranchedOrdersResponse {
	return {
		parentOrder: mapMedOrder(response.parentOrder),
		childOrders: response.childOrders.map(mapMedOrder),
		totalTranches: response.totalTranches,
	}
}

function mapPdeaLicenseStatus(response: RawPdeaLicenseStatus): PdeaLicenseStatus {
	return {
		...response,
		expiryDate: serializeDate(response.expiryDate),
	}
}

function mapChildOrders(response: RawChildOrdersResponse): MedOrder[] {
	return response.map(mapMedOrder)
}

export const orderKeys = {
	all: ["orders"] as const,
	medOrders: (params: object) => [...orderKeys.all, "medications", params] as const,
	medOrder: (id: string) => [...orderKeys.all, "medication", id] as const,
	labOrders: (params: object) => [...orderKeys.all, "labs", params] as const,
	labOrder: (id: string) => [...orderKeys.all, "lab", id] as const,
	imagingOrders: (params: object) => [...orderKeys.all, "imaging", params] as const,
	imagingOrder: (id: string) => [...orderKeys.all, "imaging-detail", id] as const,
	verificationQueue: (params: object) => [...orderKeys.all, "verification-queue", params] as const,
	highAlertVerification: (medicationOrderId: string) =>
		[...orderKeys.all, "high-alert-verification", medicationOrderId] as const,
	prescriptions: (params: object) => [...orderKeys.all, "prescriptions", params] as const,
	prescription: (id: string) => [...orderKeys.all, "prescription", id] as const,
	active: (encounterId: string) => [...orderKeys.all, "active", encounterId] as const,
}

type CdsEvaluateInput = V1Inputs["orders"]["evaluateCds"]

export function useEvaluateCdsMutation() {
	return useMutation<CdsEvaluateResponse, Error, CdsEvaluateInput>({
		mutationFn: async data => {
			const result = await orpc.orders.evaluateCds.call(data)
			return result as CdsEvaluateResponse
		},
	})
}

interface MedOrderListParams {
	encounterId?: string
	preEncounterId?: string
	status?: string
	page?: number
	limit?: number
}

export function useMedOrderListQuery(params: MedOrderListParams) {
	return useQuery(
		orpc.orders.listMedOrders.queryOptions({
			input: {
				encounterId: params.encounterId,
				preEncounterId: params.preEncounterId,
				status: params.status as V1Inputs["orders"]["listMedOrders"]["status"],
				page: params.page ?? 1,
				limit: params.limit ?? 50,
			},
			enabled: !!(params.encounterId || params.preEncounterId),
			select: mapPaginatedMedOrders,
		})
	)
}

export function useMedOrderDetailQuery(id: string) {
	return useQuery(
		orpc.orders.getMedOrder.queryOptions({
			input: { id },
			enabled: !!id,
			select: mapMedOrder,
		})
	)
}

export function useCreateMedOrderMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.orders.createMedOrder.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: orpc.orders.key() })
			},
		})
	)
}

type CreateTranchedOrdersData = V1Inputs["orders"]["createTranchedOrders"]

export function useCreateTranchedOrdersMutation() {
	const queryClient = useQueryClient()

	return useMutation<TranchedOrdersResponse, Error, CreateTranchedOrdersData>({
		mutationFn: async data => {
			const result = await orpc.orders.createTranchedOrders.call(data)
			return mapTranchedOrders(result)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: orpc.orders.key() })
		},
	})
}

export function useUpdateMedOrderMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.orders.updateMedOrder.mutationOptions({
			onSuccess: (_data, variables) => {
				queryClient.invalidateQueries({ queryKey: orpc.orders.key() })
				queryClient.invalidateQueries({ queryKey: orderKeys.medOrder(variables.id) })
			},
		})
	)
}

export function useDiscontinueMedOrderMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (id: string) => {
			const result = await orpc.orders.discontinueMedOrder.call({ id })
			return mapMedOrder(result)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: orpc.orders.key() })
		},
	})
}

interface LabOrderListParams {
	encounterId?: string
	preEncounterId?: string
	status?: string
	page?: number
	limit?: number
}

export function useLabOrderListQuery(params: LabOrderListParams) {
	return useQuery(
		orpc.orders.listLabOrders.queryOptions({
			input: {
				encounterId: params.encounterId,
				preEncounterId: params.preEncounterId,
				status: params.status as V1Inputs["orders"]["listLabOrders"]["status"],
				page: params.page ?? 1,
				limit: params.limit ?? 50,
			},
			enabled: !!(params.encounterId || params.preEncounterId),
			select: mapPaginatedLabOrders,
		})
	)
}

export function useLabOrderDetailQuery(id: string) {
	return useQuery(
		orpc.orders.getLabOrder.queryOptions({
			input: { id },
			enabled: !!id,
			select: mapLabOrder,
		})
	)
}

export function useCreateLabOrderMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.orders.createLabOrder.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: orpc.orders.key() })
			},
		})
	)
}

interface ImagingOrderListParams {
	encounterId?: string
	preEncounterId?: string
	status?: string
	page?: number
	limit?: number
}

export function useImagingOrderListQuery(params: ImagingOrderListParams) {
	return useQuery(
		orpc.orders.listImagingOrders.queryOptions({
			input: {
				encounterId: params.encounterId,
				preEncounterId: params.preEncounterId,
				status: params.status as V1Inputs["orders"]["listImagingOrders"]["status"],
				page: params.page ?? 1,
				limit: params.limit ?? 50,
			},
			enabled: !!(params.encounterId || params.preEncounterId),
			select: mapPaginatedImagingOrders,
		})
	)
}

export function useImagingOrderDetailQuery(id: string) {
	return useQuery(
		orpc.orders.getImagingOrder.queryOptions({
			input: { id },
			enabled: !!id,
			select: mapImagingOrder,
		})
	)
}

export function useCreateImagingOrderMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.orders.createImagingOrder.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: orpc.orders.key() })
			},
		})
	)
}

interface VerificationQueueParams {
	facilityId: string
	page?: number
	limit?: number
}

export function useVerificationQueueQuery(params: VerificationQueueParams) {
	return useQuery(
		orpc.orders.getVerificationQueue.queryOptions({
			input: {
				facilityId: params.facilityId,
				page: params.page ?? 1,
				limit: params.limit ?? 50,
			},
			enabled: !!params.facilityId,
			select: mapPaginatedMedOrders,
		})
	)
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
		mutationFn: async (data: VerifyOrderData) => {
			const result = await orpc.orders.verifyOrder.call(data)
			return mapVerification(result)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: orpc.orders.key() })
		},
	})
}

type CreateHighAlertVerificationData = V1Inputs["orders"]["createHighAlertVerification"]

export function useCreateHighAlertVerificationMutation() {
	const queryClient = useQueryClient()

	return useMutation<HighAlertVerification, Error, CreateHighAlertVerificationData>({
		mutationFn: async data => {
			const result = await orpc.orders.createHighAlertVerification.call(data)
			return mapHighAlertVerification(result)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: orpc.orders.key() })
		},
	})
}

export function useGetHighAlertVerificationQuery(medicationOrderId: string) {
	return useQuery(
		orpc.orders.getHighAlertVerification.queryOptions({
			input: { medicationOrderId },
			enabled: !!medicationOrderId,
			select: (data: RawHighAlertVerificationQuery) =>
				data ? mapHighAlertVerification(data) : null,
		})
	)
}

interface PrescriptionListParams {
	encounterId?: string
	patientId?: string
	page?: number
	limit?: number
}

export function usePrescriptionListQuery(params: PrescriptionListParams) {
	return useQuery(
		orpc.orders.listPrescriptions.queryOptions({
			input: {
				encounterId: params.encounterId,
				patientId: params.patientId,
				page: params.page ?? 1,
				limit: params.limit ?? 50,
			},
			enabled: !!(params.encounterId || params.patientId),
			select: mapPaginatedPrescriptions,
		})
	)
}

export function usePrescriptionDetailQuery(id: string) {
	return useQuery(
		orpc.orders.getPrescription.queryOptions({
			input: { id },
			enabled: !!id,
			select: mapPrescription,
		})
	)
}

export function useCreatePrescriptionMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.orders.createPrescription.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: orpc.orders.key() })
			},
		})
	)
}

export function useSignPrescriptionMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (id: string) => {
			const result = await orpc.orders.signPrescription.call({ id })
			return mapPrescription(result)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: orpc.orders.key() })
		},
	})
}

export function useActiveOrdersQuery(encounterId: string) {
	return useQuery(
		orpc.orders.getActiveOrders.queryOptions({
			input: { encounterId },
			enabled: !!encounterId,
			select: mapActiveOrders,
		})
	)
}

interface CheckPdeaLicenseQueryParams {
	staffId: string
	facilityId: string
	enabled?: boolean
}

export function useCheckPdeaLicenseQuery(params: CheckPdeaLicenseQueryParams) {
	return useQuery(
		orpc.orders.checkPdeaLicense.queryOptions({
			input: {
				staffId: params.staffId,
				facilityId: params.facilityId,
			},
			enabled: Boolean(params.enabled) && !!params.staffId && !!params.facilityId,
			select: mapPdeaLicenseStatus,
		})
	)
}

export function useGetChildOrdersQuery(parentOrderId: string) {
	return useQuery(
		orpc.orders.getChildOrders.queryOptions({
			input: { parentOrderId },
			enabled: !!parentOrderId,
			select: mapChildOrders,
		})
	)
}

interface PdeaLicenseCheckInput {
	prescriberStaffId: string
	pdeaSchedule: string
	facilityId?: string
}

interface PdeaLicenseCheckResponse {
	isValid: boolean
	licenseNumber: string | null
	expiryDate: string | null
	remainingMonthlyQuota: number | null
	message: string
}

export function usePdeaLicenseCheckMutation() {
	const queryClient = useQueryClient()

	return useMutation<PdeaLicenseCheckResponse, Error, PdeaLicenseCheckInput>({
		mutationFn: async data => {
			if (!data.facilityId) {
				throw new Error("facilityId is required for PDEA license checks")
			}

			const result = await queryClient.fetchQuery(
				orpc.orders.checkPdeaLicense.queryOptions({
					input: {
						staffId: data.prescriberStaffId,
						facilityId: data.facilityId,
					},
				})
			)

			return {
				isValid: result.canPrescribeControlled,
				licenseNumber: result.licenseNumber,
				expiryDate: result.expiryDate,
				remainingMonthlyQuota: null,
				message:
					result.errorMessage ??
					(result.canPrescribeControlled ? "License valid" : "License invalid"),
			}
		},
	})
}

interface TranchingPreviewInput {
	facilityId: string
	genericName: string
	dose: string
	frequency: string
	durationDays: number
	pdeaSchedule: string
	startDate?: string
}

interface TranchePreview {
	trancheNumber: number
	quantity: number
	startDay: number
	endDay: number
	releaseDate: string
}

interface TranchingPreviewResponse {
	requiresTranching: boolean
	reason: string | null
	totalDays: number
	totalTranches: number
	tranches: TranchePreview[]
	maxTrancheSize: number
}

export function useTranchingPreviewMutation() {
	return useMutation<TranchingPreviewResponse, Error, TranchingPreviewInput>({
		mutationFn: async data => {
			const result = await orpc.orders.previewTranches.call({
				facilityId: data.facilityId,
				genericName: data.genericName,
				dose: data.dose,
				frequency: data.frequency,
				durationDays: data.durationDays,
				pdeaSchedule: data.pdeaSchedule,
				startDate: data.startDate,
			})

			return {
				requiresTranching: result.requiresTranching,
				reason: result.reason,
				totalDays: result.totalDays,
				totalTranches: result.tranches.length,
				tranches: result.tranches.map(tranche => ({
					trancheNumber: tranche.trancheNumber,
					quantity: tranche.quantityPerTranche ?? 0,
					startDay: Number(tranche.startDate.split("-")[2] ?? 1),
					endDay: Number(tranche.endDate.split("-")[2] ?? tranche.durationDays),
					releaseDate: tranche.startDate,
				})),
				maxTrancheSize: result.maxDaysPerTranche,
			}
		},
	})
}

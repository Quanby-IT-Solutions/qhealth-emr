"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { env } from "@/env"

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/surgical`

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
	const res = await fetch(url, {
		credentials: "include",
		...init,
		headers: {
			"Content-Type": "application/json",
			...init?.headers,
		},
	})
	const text = await res.text()
	if (!res.ok) {
		let message = `HTTP ${res.status}: ${res.statusText}`

		if (text) {
			try {
				const parsed = JSON.parse(text) as {
					message?: string
					error?: { message?: string }
				}
				message = parsed.message ?? parsed.error?.message ?? text
			} catch {
				message = text
			}
		}

		throw new Error(message)
	}

	return (text ? JSON.parse(text) : null) as T
}

function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
	const entries = Object.entries(params).filter(([, v]) => v !== undefined)
	if (entries.length === 0) return ""
	return (
		"?" +
		entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&")
	)
}

// ============================================================================
// Types
// ============================================================================

export type SurgeryStatus = "scheduled" | "in_progress" | "completed" | "cancelled" | "postponed"
export type AsaClass = "ASA I" | "ASA II" | "ASA III" | "ASA IV" | "ASA V" | "ASA VI"
export type AirwayType = "oral_ett" | "nasal_ett" | "lma" | "awake_fiber_optic" | "tracheostomy"
export type AnesthesiaType = "general" | "regional" | "local" | "sedation"
export type IntubationGrade = "CL1" | "CL2" | "CL3" | "CL4" | "not_applicable"
export type AnesthesiaRecordStatus = "draft" | "signed"
export type RvsCodeStatus = "suggested" | "validated" | "finalized"
export type RvsAssignmentType = "primary" | "adjunct"
export type OperationRecordStatus = "draft" | "signed"

export interface SurgicalCase {
	id: string
	facilityId: string
	encounterId: string | null
	patientId: string
	patientName: string | null
	procedureName: string
	orSuite: string | null
	surgeonName: string | null
	surgeonStaffId: string | null
	anesthesiologistName: string | null
	anesthesiologistStaffId: string | null
	scheduledDatetime: string | null
	actualStartDatetime: string | null
	actualEndDatetime: string | null
	status: SurgeryStatus
	surgicalType: string
	asaClass: AsaClass | null
	estimatedDurationMinutes: number | null
	requiredEquipment: string[] | null
	notes: string | null
	createdAt: string
	updatedAt: string
}

export interface OrConflict {
	type: "room" | "surgeon" | "equipment"
	conflictingCaseId: string
	conflictingProcedure: string
	conflictingOrSuite: string | null
	conflictingStart: string
	conflictingEnd: string
	equipmentItem?: string
}

export interface OrConflictCheckResponse {
	hasConflicts: boolean
	conflicts: OrConflict[]
}

export interface OperationRecord {
	id: string
	surgicalCaseId: string
	preOpDiagnosis: string
	postOpDiagnosis: string | null
	procedurePerformed: string
	procedureDescription: string | null
	operativeTechnique: string | null
	findings: string | null
	specimens: string | null
	estimatedBloodLoss: number | null
	fluidIn: number | null
	fluidOut: number | null
	incisionDatetime: string | null
	closureDatetime: string | null
	surgeonStaffId: string
	firstAssistantStaffId: string | null
	secondAssistantStaffId: string | null
	scrubNurseStaffId: string | null
	circulatingNurseStaffId: string | null
	anesthesiologistStaffId: string | null
	instrumentCountCorrect: boolean
	swabCountCorrect: boolean
	complications: string | null
	status: OperationRecordStatus
	signedAt: string | null
	signedByStaffId: string | null
	signedByName: string | null
	createdAt: string
	updatedAt: string
}

export interface AnesthesiaAgent {
	name: string
	dose: string
	route: string
	time: string
}

export interface InductionAgent {
	agent: string
	dose: string
	time?: string
}

export interface MaintenanceAgent {
	agent: string
	dose: string
	time?: string
}

export interface MuscleRelaxant {
	agent: string
	dose: string
	time?: string
}

export interface IntraopMedication {
	name: string
	dose: string
	route: string
	time: string
	indication?: string
}

export interface IntraopVital {
	time: string
	bp: string
	hr: number
	spo2: number
	etco2?: number
	temp?: number
}

export interface AnesthesiaRecord {
	id: string
	surgicalCaseId: string
	asaClass: AsaClass | null
	anesthesiaType: AnesthesiaType | null
	airwayType: AirwayType | null
	airwayManagement: string | null
	intubationAttempts: number | null
	intubationGrade: IntubationGrade | null
	difficultAirway: boolean
	agents: AnesthesiaAgent[] | null
	inductionAgents: InductionAgent[] | null
	maintenanceAgents: MaintenanceAgent[] | null
	muscleRelaxants: MuscleRelaxant[] | null
	intraopMedications: IntraopMedication[] | null
	intraopVitals: IntraopVital[] | null
	reversalAgent: string | null
	totalAnesthesiaMinutes: number | null
	emergenceSmooth: boolean | null
	complications: string | null
	postAnesthesiaCareNotes: string | null
	status: AnesthesiaRecordStatus
	signedAt: string | null
	signedByStaffId: string | null
	createdAt: string
	updatedAt: string
}

export interface PreOpChecklistItem {
	key: string
	label: string
	checked: boolean
	checkedAt: string | null
	checkedByName: string | null
}

export interface PreOpChecklist {
	id: string
	surgicalCaseId: string
	items: PreOpChecklistItem[]
	allClear: boolean
	completedAt: string | null
	completedByName: string | null
	createdAt: string
	updatedAt: string
}

export interface RvsCode {
	id: string
	code: string
	description: string
	baseValue: number
	category: string
}

export interface RvsAssignment {
	id: string
	surgicalCaseId: string
	rvsCodeId: string
	procedureLabel: string | null
	code: string
	description: string
	assignmentType: RvsAssignmentType
	status: RvsCodeStatus
	suggestedByName: string | null
	validatedByName: string | null
	finalizedByName: string | null
	suggestedAt: string | null
	validatedAt: string | null
	finalizedAt: string | null
	modifier: string | null
	units: number
	createdAt: string
}

export interface OrSlot {
	id: string
	facilityId: string
	orSuite: string
	date: string
	startTime: string
	endTime: string
	surgicalCaseId: string | null
	procedureName: string | null
	surgeonName: string | null
}

interface PaginatedResponse<T> {
	data: T[]
	total: number
	page: number
	limit: number
	totalPages: number
}

// ============================================================================
// Query Keys
// ============================================================================

export const surgicalKeys = {
	all: ["surgical"] as const,
	cases: (params: object) => [...surgicalKeys.all, "cases", params] as const,
	case: (id: string) => [...surgicalKeys.all, "case", id] as const,
	operationRecord: (caseId: string) => [...surgicalKeys.all, "operation-record", caseId] as const,
	anesthesiaRecord: (caseId: string) => [...surgicalKeys.all, "anesthesia-record", caseId] as const,
	preOpChecklist: (caseId: string) => [...surgicalKeys.all, "pre-op-checklist", caseId] as const,
	rvsAssignments: (caseId: string) => [...surgicalKeys.all, "rvs-assignments", caseId] as const,
	rvsCodes: (search: string) => [...surgicalKeys.all, "rvs-codes", search] as const,
	orSlots: (params: object) => [...surgicalKeys.all, "or-slots", params] as const,
}

// ============================================================================
// Surgical Cases
// ============================================================================

interface SurgicalCaseListParams {
	facilityId?: string
	encounterId?: string
	status?: SurgeryStatus
	date?: string
	surgeonStaffId?: string
	anesthesiologistStaffId?: string
	page?: number
	limit?: number
}

export function useSurgicalCaseListQuery(params: SurgicalCaseListParams) {
	return useQuery({
		queryKey: surgicalKeys.cases(params),
		queryFn: () =>
			fetchJson<PaginatedResponse<SurgicalCase>>(
				`${API_BASE}/cases${buildQueryString(params as Record<string, string | number | boolean | undefined>)}`
			),
		enabled: !!(params.facilityId || params.encounterId),
	})
}

export function useSurgicalCaseDetailQuery(id: string) {
	return useQuery({
		queryKey: surgicalKeys.case(id),
		queryFn: () => fetchJson<SurgicalCase>(`${API_BASE}/cases/${id}`),
		enabled: !!id,
	})
}

interface CreateSurgicalCaseData {
	facilityId: string
	encounterId?: string
	patientId: string
	procedureName: string
	orSuite?: string
	surgeonStaffId?: string
	anesthesiologistStaffId?: string
	scheduledDatetime?: string
	surgicalType: string
	asaClass?: AsaClass
	estimatedDurationMinutes?: number
	requiredEquipment?: string[]
	notes?: string
}

export function useCreateSurgicalCaseMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: CreateSurgicalCaseData) =>
			fetchJson<SurgicalCase>(`${API_BASE}/cases`, { method: "POST", body: JSON.stringify(data) }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: surgicalKeys.all }),
	})
}

interface UpdateSurgicalCaseData {
	id: string
	status?: SurgeryStatus
	actualStartDatetime?: string
	actualEndDatetime?: string
	orSuite?: string
	notes?: string
	asaClass?: AsaClass
}

export function useUpdateSurgicalCaseMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: UpdateSurgicalCaseData) =>
			fetchJson<SurgicalCase>(`${API_BASE}/cases/${data.id}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: surgicalKeys.all })
			queryClient.invalidateQueries({ queryKey: surgicalKeys.case(variables.id) })
		},
	})
}

// ============================================================================
// Operation Record
// ============================================================================

export function useOperationRecordQuery(caseId: string | undefined) {
	return useQuery({
		queryKey: surgicalKeys.operationRecord(caseId ?? ""),
		queryFn: () =>
			fetchJson<OperationRecord | null>(`${API_BASE}/cases/${caseId}/operation-record`),
		enabled: !!caseId,
	})
}

interface SaveOperationRecordData {
	caseId: string
	preOpDiagnosis: string
	postOpDiagnosis?: string
	procedurePerformed: string
	procedureDescription?: string
	operativeTechnique?: string
	findings?: string
	specimens?: string
	estimatedBloodLoss?: number
	fluidIn?: number
	fluidOut?: number
	incisionDatetime?: string
	closureDatetime?: string
	surgeonStaffId: string
	firstAssistantStaffId?: string
	secondAssistantStaffId?: string
	scrubNurseStaffId?: string
	circulatingNurseStaffId?: string
	anesthesiologistStaffId?: string | null
	instrumentCountCorrect: boolean
	swabCountCorrect: boolean
	complications?: string
}

export function useSaveOperationRecordMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: SaveOperationRecordData) =>
			fetchJson<OperationRecord>(`${API_BASE}/cases/${data.caseId}/operation-record`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: surgicalKeys.operationRecord(variables.caseId) })
			queryClient.invalidateQueries({ queryKey: surgicalKeys.all })
		},
	})
}

export function useSignOperationRecordMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ caseId }: { caseId: string }) =>
			fetchJson<OperationRecord>(`${API_BASE}/cases/${caseId}/operation-record/sign`, {
				method: "PUT",
				body: JSON.stringify({ caseId }),
			}),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: surgicalKeys.operationRecord(variables.caseId) })
			queryClient.invalidateQueries({ queryKey: surgicalKeys.rvsAssignments(variables.caseId) })
			queryClient.invalidateQueries({ queryKey: surgicalKeys.all })
		},
	})
}

// ============================================================================
// Anesthesia Record
// ============================================================================

export function useAnesthesiaRecordQuery(caseId: string | undefined) {
	return useQuery({
		queryKey: surgicalKeys.anesthesiaRecord(caseId ?? ""),
		queryFn: () =>
			fetchJson<AnesthesiaRecord | null>(`${API_BASE}/cases/${caseId}/anesthesia-record`),
		enabled: !!caseId,
	})
}

interface SaveAnesthesiaRecordData {
	caseId: string
	asaClass?: AsaClass
	anesthesiaType?: AnesthesiaType
	airwayType?: AirwayType
	airwayManagement?: string
	intubationAttempts?: number
	intubationGrade?: IntubationGrade
	difficultAirway?: boolean
	agents?: AnesthesiaAgent[]
	inductionAgents?: InductionAgent[]
	maintenanceAgents?: MaintenanceAgent[]
	muscleRelaxants?: MuscleRelaxant[]
	intraopMedications?: IntraopMedication[]
	intraopVitals?: IntraopVital[]
	reversalAgent?: string
	totalAnesthesiaMinutes?: number
	emergenceSmooth?: boolean
	complications?: string
	postAnesthesiaCareNotes?: string
}

export function useSaveAnesthesiaRecordMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: SaveAnesthesiaRecordData) =>
			fetchJson<AnesthesiaRecord>(`${API_BASE}/cases/${data.caseId}/anesthesia-record`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: surgicalKeys.anesthesiaRecord(variables.caseId) })
		},
	})
}

export function useSignAnesthesiaRecordMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ caseId }: { caseId: string }) =>
			fetchJson<AnesthesiaRecord>(`${API_BASE}/cases/${caseId}/anesthesia-record/sign`, {
				method: "PUT",
				body: JSON.stringify({ caseId }),
			}),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: surgicalKeys.anesthesiaRecord(variables.caseId) })
			queryClient.invalidateQueries({ queryKey: surgicalKeys.all })
		},
	})
}

// ============================================================================
// Pre-Op Checklist
// ============================================================================

export function usePreOpChecklistQuery(caseId: string | undefined) {
	return useQuery({
		queryKey: surgicalKeys.preOpChecklist(caseId ?? ""),
		queryFn: () => fetchJson<PreOpChecklist | null>(`${API_BASE}/cases/${caseId}/pre-op-checklist`),
		enabled: !!caseId,
	})
}

interface SavePreOpChecklistData {
	caseId: string
	items: Array<{ key: string; checked: boolean }>
}

export function useSavePreOpChecklistMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: SavePreOpChecklistData) =>
			fetchJson<PreOpChecklist>(`${API_BASE}/cases/${data.caseId}/pre-op-checklist`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: surgicalKeys.preOpChecklist(variables.caseId) })
		},
	})
}

// ============================================================================
// RVS Codes
// ============================================================================

export function useRvsCodeSearchQuery(search: string) {
	return useQuery({
		queryKey: surgicalKeys.rvsCodes(search),
		queryFn: () =>
			fetchJson<PaginatedResponse<RvsCode>>(
				`${API_BASE}/rvs-codes${buildQueryString({ search, limit: 20 })}`
			),
		enabled: search.length >= 2,
	})
}

export function useRvsAssignmentsQuery(caseId: string) {
	return useQuery({
		queryKey: surgicalKeys.rvsAssignments(caseId),
		queryFn: () => fetchJson<RvsAssignment[]>(`${API_BASE}/cases/${caseId}/rvs-assignments`),
		enabled: !!caseId,
	})
}

interface SuggestRvsCodeData {
	caseId: string
	rvsCodeId: string
	procedureLabel: string
	assignmentType?: RvsAssignmentType
	modifier?: string
	units?: number
}

export function useSuggestRvsCodeMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: SuggestRvsCodeData) =>
			fetchJson<RvsAssignment>(`${API_BASE}/cases/${data.caseId}/rvs-assignments`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: surgicalKeys.rvsAssignments(variables.caseId) })
		},
	})
}

interface UpdateRvsStatusData {
	caseId: string
	assignmentId: string
	status: RvsCodeStatus
}

export function useUpdateRvsStatusMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ caseId, assignmentId, ...data }: UpdateRvsStatusData) =>
			fetchJson<RvsAssignment>(`${API_BASE}/cases/${caseId}/rvs-assignments/${assignmentId}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: surgicalKeys.rvsAssignments(variables.caseId) })
		},
	})
}

export function useRemoveRvsAssignmentMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ caseId, assignmentId }: { caseId: string; assignmentId: string }) =>
			fetchJson<void>(`${API_BASE}/cases/${caseId}/rvs-assignments/${assignmentId}`, {
				method: "DELETE",
			}),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: surgicalKeys.rvsAssignments(variables.caseId) })
		},
	})
}

// ============================================================================
// OR Slots
// ============================================================================

interface OrSlotsParams {
	facilityId: string
	weekStart: string
	surgeonStaffId?: string
	anesthesiologistStaffId?: string
}

export function useOrSlotsQuery(params: OrSlotsParams) {
	return useQuery({
		queryKey: surgicalKeys.orSlots(params),
		queryFn: () =>
			fetchJson<OrSlot[]>(
				`${API_BASE}/or-slots${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`
			),
		enabled: !!params.facilityId,
		staleTime: 0,
	})
}

// ============================================================================
// OR Conflict Check
// ============================================================================

interface CheckOrConflictsData {
	facilityId: string
	orSuite: string
	scheduledDatetime: string
	estimatedDurationMinutes: number
	surgeonStaffId?: string
	requiredEquipment?: string[]
	excludeCaseId?: string
}

export function useCheckOrConflictsMutation() {
	return useMutation({
		mutationFn: (data: CheckOrConflictsData) =>
			fetchJson<OrConflictCheckResponse>(`${API_BASE}/or-conflicts/check`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
	})
}

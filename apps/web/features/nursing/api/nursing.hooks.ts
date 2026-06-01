"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"
import { useOfflineNursingMutation } from "@/features/nursing/lib/use-offline-mutation"
import { env } from "@/env"

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/nursing`

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
	const res = await fetch(url, {
		credentials: "include",
		...init,
		headers: {
			"Content-Type": "application/json",
			...init?.headers,
		},
	})
	if (!res.ok) {
		throw Object.assign(new Error(`HTTP ${res.status}: ${res.statusText}`), {
			status: res.status,
		})
	}
	return res.json() as Promise<T>
}

function shouldRetryRead(failureCount: number, error: unknown) {
	const status = (error as { status?: number } | null)?.status
	if (status === 401 || status === 403 || status === 404) return false
	return failureCount < 3
}

function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
	const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "")
	if (entries.length === 0) return ""
	return `?${entries
		.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
		.join("&")}`
}

// ============================================================================
// Types
// ============================================================================

interface VitalSign {
	id: string
	facilityId: string
	encounterId: string | null
	preEncounterId: string | null
	temperature: string | null
	bpSystolic: number | null
	bpDiastolic: number | null
	heartRate: number | null
	respiratoryRate: number | null
	spo2: string | null
	painScore: number | null
	weight: string | null
	height: string | null
	newsScore: number | null
	newsRiskLevel: "low" | "medium" | "high" | null
	recordedByStaffId: string
	recordedAt: string
	createdAt: string
}

interface MarEntry {
	id: string
	facilityId: string
	encounterId: string | null
	preEncounterId: string | null
	medicationOrderId: string
	scheduledTime: string
	status: "due" | "given" | "missed" | "held" | "refused"
	administeredDose: string | null
	administeredRoute: string | null
	prnReason: string | null
	administeredByStaffId: string | null
	administeredAt: string | null
	notes: string | null
	createdAt: string
}

interface TarEntry {
	id: string
	facilityId: string
	encounterId: string | null
	preEncounterId: string | null
	treatmentDescription: string
	scheduledTime: string
	status: "due" | "given" | "missed" | "held" | "refused"
	administeredByStaffId: string | null
	administeredAt: string | null
	notes: string | null
	createdAt: string
}

interface IoEntry {
	id: string
	facilityId: string
	encounterId: string | null
	preEncounterId: string | null
	ioType: "intake" | "output"
	route: string
	description: string | null
	amountMl: string
	recordedByStaffId: string
	recordedAt: string
	createdAt: string
}

interface IoBalanceResponse {
	totalIntake: number
	totalOutput: number
	netBalance: number
	periodStart: string
	periodEnd: string
}

interface FlowsheetEntry {
	id: string
	facilityId: string
	encounterId: string
	parameterName: string
	parameterValue: string
	unit: string | null
	recordedByStaffId: string
	recordedAt: string
	createdAt: string
}

interface ShiftHandoff {
	id: string
	facilityId: string
	encounterId: string
	outgoingStaffId: string
	incomingStaffId: string | null
	handoffNotes: string
	status: "draft" | "signed"
	signedAt: string | null
	createdAt: string
}

interface GeneratedHandoffResponse {
	activeProblems: { description: string; icd10Code: string | null }[]
	currentMedications: { genericName: string; dose: string; frequency: string }[]
	recentVitals: VitalSign | null
	newsScore: number | null
	newsRiskLevel: "low" | "medium" | "high" | null
	ioBalance: IoBalanceResponse | null
	pendingOrders: number
}

interface HaiTag {
	id: string
	facilityId: string
	encounterId: string
	haiType: "clabsi" | "cauti" | "vap" | "ssi" | "cdiff"
	onsetDate: string
	confirmedAt: string | null
	resolvedAt: string | null
	status: "suspected" | "confirmed" | "resolved"
	notes: string | null
	documentedByStaffId: string
	createdAt: string
	updatedAt: string
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

export const nursingKeys = {
	all: ["nursing"] as const,
	vitals: (params: object) => [...nursingKeys.all, "vitals", params] as const,
	vital: (id: string) => [...nursingKeys.all, "vital", id] as const,
	marEntries: (params: object) => [...nursingKeys.all, "mar", params] as const,
	marEntry: (id: string) => [...nursingKeys.all, "mar-entry", id] as const,
	tarEntries: (params: object) => [...nursingKeys.all, "tar", params] as const,
	tarEntry: (id: string) => [...nursingKeys.all, "tar-entry", id] as const,
	ioEntries: (params: object) => [...nursingKeys.all, "io", params] as const,
	ioBalance: (params: object) => [...nursingKeys.all, "io-balance", params] as const,
	flowsheets: (params: object) => [...nursingKeys.all, "flowsheets", params] as const,
	handoffs: (params: object) => [...nursingKeys.all, "handoffs", params] as const,
	handoff: (id: string) => [...nursingKeys.all, "handoff", id] as const,
	haiTags: (params: object) => [...nursingKeys.all, "hai-tags", params] as const,
	haiTag: (id: string) => [...nursingKeys.all, "hai-tag", id] as const,
}

// ============================================================================
// Vital Signs
// ============================================================================

interface VitalSignListParams {
	facilityId?: string
	encounterId?: string
	preEncounterId?: string
	page?: number
	limit?: number
}

export function useVitalsQuery(params: VitalSignListParams, options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: nursingKeys.vitals(params),
		queryFn: () =>
			fetchJson<PaginatedResponse<VitalSign>>(
				`${API_BASE}/vitals${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`
			),
		enabled:
			(options?.enabled ?? true) &&
			!!(params.facilityId || params.encounterId || params.preEncounterId),
		retry: shouldRetryRead,
	})
}

export function useVitalQuery(id: string) {
	return useQuery({
		queryKey: nursingKeys.vital(id),
		queryFn: () => fetchJson<VitalSign>(`${API_BASE}/vitals/${encodeURIComponent(id)}`),
		enabled: !!id,
	})
}

interface CreateVitalInput {
	facilityId: string
	encounterId?: string
	preEncounterId?: string
	temperature?: number
	bpSystolic?: number
	bpDiastolic?: number
	heartRate?: number
	respiratoryRate?: number
	spo2?: number
	painScore?: number
	weight?: number
	height?: number
}

export function useCreateVitalMutation() {
	return useOfflineNursingMutation<VitalSign, CreateVitalInput>({
		endpoint: `${API_BASE}/vitals`,
		method: "POST",
		recordType: "vital_sign",
		describe: d => {
			const parts: string[] = []
			if (d.bpSystolic && d.bpDiastolic) parts.push(`BP ${d.bpSystolic}/${d.bpDiastolic}`)
			if (d.heartRate) parts.push(`HR ${d.heartRate}`)
			if (d.temperature) parts.push(`T ${d.temperature}°C`)
			if (d.spo2) parts.push(`SpO₂ ${d.spo2}%`)
			return parts.length ? parts.join(", ") : "Vital signs"
		},
		facilityId: d => d.facilityId,
		encounterId: d => d.encounterId ?? d.preEncounterId ?? "",
	})
}

// ============================================================================
// MAR Entries
// ============================================================================

interface MarEntryListParams {
	facilityId?: string
	encounterId?: string
	preEncounterId?: string
	status?: string
	scheduledFrom?: string
	scheduledTo?: string
	page?: number
	limit?: number
}

export function useMarEntriesQuery(params: MarEntryListParams) {
	return useQuery({
		queryKey: nursingKeys.marEntries(params),
		queryFn: () =>
			fetchJson<PaginatedResponse<MarEntry>>(
				`${API_BASE}/mar${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`
			),
		enabled: !!(params.encounterId || params.preEncounterId),
	})
}

export function useMarEntryQuery(id: string) {
	return useQuery({
		queryKey: nursingKeys.marEntry(id),
		queryFn: () => fetchJson<MarEntry>(`${API_BASE}/mar/${encodeURIComponent(id)}`),
		enabled: !!id,
	})
}

interface AdministerMarInput {
	id: string
	status: "due" | "given" | "missed" | "held" | "refused"
	administeredDose?: string
	administeredRoute?: string
	prnReason?: string
	notes?: string
}

export function useAdministerMarMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: AdministerMarInput) =>
			fetchJson<MarEntry>(`${API_BASE}/mar/${encodeURIComponent(data.id)}/administer`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: nursingKeys.all })
		},
	})
}

// ============================================================================
// TAR Entries
// ============================================================================

interface TarEntryListParams {
	facilityId?: string
	encounterId?: string
	preEncounterId?: string
	status?: string
	page?: number
	limit?: number
}

export function useTarEntriesQuery(params: TarEntryListParams) {
	return useQuery({
		queryKey: nursingKeys.tarEntries(params),
		queryFn: () =>
			fetchJson<PaginatedResponse<TarEntry>>(
				`${API_BASE}/tar${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`
			),
		enabled: !!(params.encounterId || params.preEncounterId),
	})
}

export function useTarEntryQuery(id: string) {
	return useQuery({
		queryKey: nursingKeys.tarEntry(id),
		queryFn: () => fetchJson<TarEntry>(`${API_BASE}/tar/${encodeURIComponent(id)}`),
		enabled: !!id,
	})
}

interface CreateTarEntryInput {
	facilityId: string
	encounterId?: string
	preEncounterId?: string
	treatmentDescription: string
	scheduledTime: string
}

export function useCreateTarEntryMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: CreateTarEntryInput) =>
			fetchJson<TarEntry>(`${API_BASE}/tar`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: nursingKeys.all })
		},
	})
}

interface AdministerTarInput {
	id: string
	status: "due" | "given" | "missed" | "held" | "refused"
	notes?: string
}

export function useAdministerTarMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: AdministerTarInput) =>
			fetchJson<TarEntry>(`${API_BASE}/tar/${encodeURIComponent(data.id)}/administer`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: nursingKeys.all })
		},
	})
}

// ============================================================================
// I/O Entries
// ============================================================================

interface IoEntryListParams {
	facilityId?: string
	encounterId?: string
	preEncounterId?: string
	ioType?: "intake" | "output"
	page?: number
	limit?: number
}

export function useIoEntriesQuery(params: IoEntryListParams) {
	return useQuery({
		queryKey: nursingKeys.ioEntries(params),
		queryFn: () =>
			fetchJson<PaginatedResponse<IoEntry>>(
				`${API_BASE}/io${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`
			),
		enabled: !!(params.encounterId || params.preEncounterId),
	})
}

interface CreateIoEntryInput {
	facilityId: string
	encounterId?: string
	preEncounterId?: string
	ioType: "intake" | "output"
	route: string
	description?: string
	amountMl: number
}

export function useCreateIoEntryMutation() {
	return useOfflineNursingMutation<IoEntry, CreateIoEntryInput>({
		endpoint: `${API_BASE}/io`,
		method: "POST",
		recordType: "io_entry",
		describe: d =>
			`${d.ioType === "intake" ? "Intake" : "Output"} — ${d.route}${d.description ? ` (${d.description})` : ""} ${d.amountMl} mL`,
		facilityId: d => d.facilityId,
		encounterId: d => d.encounterId ?? d.preEncounterId ?? "",
	})
}

interface IoBalanceParams {
	encounterId: string
	facilityId?: string
}

export function useIoBalanceQuery(params: IoBalanceParams) {
	return useQuery({
		queryKey: nursingKeys.ioBalance(params),
		queryFn: () =>
			fetchJson<IoBalanceResponse>(
				`${API_BASE}/io/balance${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`
			),
		enabled: !!params.encounterId,
	})
}

// ============================================================================
// Flowsheets
// ============================================================================

interface FlowsheetListParams {
	encounterId: string
	facilityId?: string
	parameterName?: string
	dateFrom?: string
	dateTo?: string
	page?: number
	limit?: number
}

export function useFlowsheetsQuery(params: FlowsheetListParams) {
	return useQuery({
		queryKey: nursingKeys.flowsheets(params),
		queryFn: () =>
			fetchJson<PaginatedResponse<FlowsheetEntry>>(
				`${API_BASE}/flowsheets${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`
			),
		enabled: !!params.encounterId,
	})
}

// ============================================================================
// Shift Handoffs
// ============================================================================

interface HandoffListParams {
	facilityId?: string
	encounterId?: string
	outgoingStaffId?: string
	page?: number
	limit?: number
}

export function useHandoffsQuery(params: HandoffListParams) {
	return useQuery({
		queryKey: nursingKeys.handoffs(params),
		queryFn: () =>
			fetchJson<PaginatedResponse<ShiftHandoff>>(
				`${API_BASE}/handoffs${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`
			),
		enabled: !!(params.encounterId || params.outgoingStaffId),
	})
}

export function useHandoffQuery(id: string) {
	return useQuery({
		queryKey: nursingKeys.handoff(id),
		queryFn: () => fetchJson<ShiftHandoff>(`${API_BASE}/handoffs/${encodeURIComponent(id)}`),
		enabled: !!id,
	})
}

interface GenerateHandoffInput {
	encounterId: string
	facilityId?: string
}

export function useGenerateHandoffMutation() {
	return useMutation({
		mutationFn: (data: GenerateHandoffInput) =>
			fetchJson<GeneratedHandoffResponse>(`${API_BASE}/handoffs/generate`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
	})
}

interface CreateHandoffInput {
	facilityId: string
	encounterId: string
	incomingStaffId?: string
	handoffNotes?: string
}

export function useCreateHandoffMutation() {
	return useOfflineNursingMutation<ShiftHandoff, CreateHandoffInput>({
		endpoint: `${API_BASE}/handoffs`,
		method: "POST",
		recordType: "handoff",
		describe: d =>
			d.handoffNotes ? `Shift handoff: ${d.handoffNotes.slice(0, 60)}` : "Shift handoff note",
		facilityId: d => d.facilityId,
		encounterId: d => d.encounterId,
	})
}

export function useFinalizeHandoffMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { id: string }) =>
			fetchJson<ShiftHandoff>(`${API_BASE}/handoffs/${encodeURIComponent(data.id)}/finalize`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: nursingKeys.all })
		},
	})
}

// ============================================================================
// HAI Tags
// ============================================================================

interface HaiTagListParams {
	facilityId?: string
	encounterId?: string
	haiType?: string
	status?: string
	page?: number
	limit?: number
}

export function useHaiTagsQuery(params: HaiTagListParams) {
	return useQuery({
		queryKey: nursingKeys.haiTags(params),
		queryFn: () =>
			fetchJson<PaginatedResponse<HaiTag>>(
				`${API_BASE}/hai-tags${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`
			),
		enabled: !!(params.facilityId || params.encounterId),
	})
}

export function useHaiTagQuery(id: string) {
	return useQuery({
		queryKey: nursingKeys.haiTag(id),
		queryFn: () => fetchJson<HaiTag>(`${API_BASE}/hai-tags/${encodeURIComponent(id)}`),
		enabled: !!id,
	})
}

interface CreateHaiTagInput {
	facilityId: string
	encounterId: string
	haiType: "clabsi" | "cauti" | "vap" | "ssi" | "cdiff"
	onsetDate: string
	notes?: string
}

export function useCreateHaiTagMutation() {
	return useOfflineNursingMutation<HaiTag, CreateHaiTagInput>({
		endpoint: `${API_BASE}/hai-tags`,
		method: "POST",
		recordType: "hai_tag",
		describe: d => `${d.haiType.toUpperCase()} — onset ${d.onsetDate}`,
		facilityId: d => d.facilityId,
		encounterId: d => d.encounterId,
	})
}

interface UpdateHaiTagInput {
	id: string
	status?: "suspected" | "confirmed" | "resolved"
	notes?: string
}

export function useUpdateHaiTagMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: UpdateHaiTagInput) =>
			fetchJson<HaiTag>(`${API_BASE}/hai-tags/${encodeURIComponent(data.id)}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: nursingKeys.all })
		},
	})
}

// ============================================================================
// NEWS Score Calculation
// ============================================================================

interface NewsScoreInput {
	respiratoryRate: number
	spo2: number
	isOnSupplementalOxygen: boolean
	temperature: number
	bpSystolic: number
	heartRate: number
	consciousnessLevel: "A" | "C" | "V" | "P" | "U" // ACVPU scale
}

interface NewsScoreResult {
	totalScore: number
	riskLevel: "low" | "medium" | "high"
	clinicalResponse: string
	componentScores: {
		respiratoryRate: number
		spo2: number
		supplementalOxygen: number
		temperature: number
		systolicBp: number
		heartRate: number
		consciousness: number
	}
	recommendations: string[]
}

/**
 * Calculate NEWS (National Early Warning Score) from vital signs.
 * This is calculated client-side for immediate feedback.
 */
export function calculateNewsScore(input: NewsScoreInput): NewsScoreResult {
	const scores = {
		respiratoryRate: getRespiratoryRateScore(input.respiratoryRate),
		spo2: getSpo2Score(input.spo2),
		supplementalOxygen: input.isOnSupplementalOxygen ? 2 : 0,
		temperature: getTempScore(input.temperature),
		systolicBp: getSystolicBpScore(input.bpSystolic),
		heartRate: getHeartRateScore(input.heartRate),
		consciousness: input.consciousnessLevel === "A" ? 0 : 3,
	}

	const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0)

	let riskLevel: "low" | "medium" | "high" = "low"
	let clinicalResponse = "Continue routine monitoring"
	const recommendations: string[] = []

	if (totalScore >= 7 || scores.consciousness === 3) {
		riskLevel = "high"
		clinicalResponse = "Emergency response team assessment"
		recommendations.push("Notify physician immediately")
		recommendations.push("Continuous monitoring")
		recommendations.push("Consider ICU transfer")
	} else if (totalScore >= 5) {
		riskLevel = "medium"
		clinicalResponse = "Urgent ward-based response"
		recommendations.push("Notify senior nurse/physician")
		recommendations.push("Increase monitoring frequency")
	} else if (totalScore >= 1) {
		riskLevel = "low"
		clinicalResponse = "Ward-based response"
		recommendations.push("Inform registered nurse")
	}

	return {
		totalScore,
		riskLevel,
		clinicalResponse,
		componentScores: scores,
		recommendations,
	}
}

function getRespiratoryRateScore(rr: number): number {
	if (rr <= 8) return 3
	if (rr <= 11) return 1
	if (rr <= 20) return 0
	if (rr <= 24) return 2
	return 3
}

function getSpo2Score(spo2: number): number {
	if (spo2 <= 91) return 3
	if (spo2 <= 93) return 2
	if (spo2 <= 95) return 1
	return 0
}

function getTempScore(temp: number): number {
	if (temp <= 35) return 3
	if (temp <= 36) return 1
	if (temp <= 38) return 0
	if (temp <= 39) return 1
	return 2
}

function getSystolicBpScore(sbp: number): number {
	if (sbp <= 90) return 3
	if (sbp <= 100) return 2
	if (sbp <= 110) return 1
	if (sbp <= 219) return 0
	return 3
}

function getHeartRateScore(hr: number): number {
	if (hr <= 40) return 3
	if (hr <= 50) return 1
	if (hr <= 90) return 0
	if (hr <= 110) return 1
	if (hr <= 130) return 2
	return 3
}

/**
 * Query for patient NEWS score history
 */
export function useNewsScoreHistoryQuery(params: {
	encounterId: string
	facilityId: string
	limit?: number
}) {
	return useQuery({
		queryKey: [...nursingKeys.all, "news-history", params] as const,
		queryFn: () =>
			fetchJson<{
				data: Array<{
					id: string
					recordedAt: string
					newsScore: number
					riskLevel: "low" | "medium" | "high"
					vitals: VitalSign
				}>
				total: number
			}>(
				`${API_BASE}/news/history${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`
			),
		enabled: !!params.encounterId,
	})
}

// ============================================================================
// Consent Records
// ============================================================================

export const ConsentTypeLabels: Record<string, string> = {
	general: "General Consent",
	dpa: "Data Privacy Act (DPA) Consent",
	nbs: "Newborn Screening Consent",
	transfusion: "Blood Transfusion Consent",
	surgery: "Surgical Consent",
	anesthesia: "Anesthesia Consent",
	philhealth: "PhilHealth Authorization",
	do_not_resuscitate: "Do Not Resuscitate (DNR) Order",
	hiv_testing: "HIV Testing Consent",
	organ_donation: "Organ Donation Consent",
	research: "Research Participation Consent",
	telemedicine: "Telemedicine Consent",
}

export interface ConsentRecord {
	id: string
	facilityId: string
	encounterId: string | null
	preEncounterId: string | null
	consentType: string
	consentText: string
	patientSignature: string | null
	guardianSignature: string | null
	witnessSignature: string | null
	capturedByStaffId: string
	signedAt: string
	createdAt: string
}

export interface CreateConsentInput {
	facilityId: string
	encounterId?: string
	preEncounterId?: string
	consentType: string
	consentText?: string
	patientSignature?: string
	guardianSignature?: string
	witnessSignature?: string
}

export function useConsentsQuery(params: {
	facilityId?: string
	encounterId?: string
	preEncounterId?: string
	consentType?: string
	page?: number
	limit?: number
}) {
	return useQuery({
		...orpc.nursing.listConsents.queryOptions({
			input: {
				facilityId: params.facilityId,
				encounterId: params.encounterId,
				preEncounterId: params.preEncounterId,
				consentType: params.consentType,
				page: params.page ?? 1,
				limit: params.limit ?? 50,
			},
			enabled: !!(params.encounterId || params.preEncounterId || params.facilityId),
		}),
		queryKey: [...nursingKeys.all, "consents", params] as const,
	})
}

export function useConsentQuery(id: string | null) {
	return useQuery({
		...orpc.nursing.getConsent.queryOptions({
			input: id ? { id } : undefined,
			enabled: !!id,
		}),
		queryKey: [...nursingKeys.all, "consent", id ?? ""] as const,
	})
}

export function useCreateConsentMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: CreateConsentInput) => orpc.nursing.createConsent.call(data),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: nursingKeys.all })
		},
	})
}

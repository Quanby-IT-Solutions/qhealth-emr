"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { env } from "@/env"

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/clinical-docs`

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
	return (
		"?" +
		entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&")
	)
}

// ============================================================================
// Types (exported for use in feature components)
// ============================================================================

export interface TemplateSection {
	key: string
	label: string
	type: "rich_text" | "structured"
	defaultContent?: string
}

export type ClinicalNoteType =
	| "admission"
	| "progress"
	| "consultation"
	| "discharge_summary"
	| "fpe"
	| "operative"
	| "anesthesia"

export interface NoteTemplate {
	id: string
	facilityId: string
	name: string
	category: ClinicalNoteType
	sections: TemplateSection[]
	isActive: boolean
	createdByStaffId: string | null
	createdByStaffName: string | null
	createdAt: string
	updatedAt: string
}

interface NoteTemplateListResponse {
	data: NoteTemplate[]
	total: number
	page: number
	limit: number
	totalPages: number
}

interface Addendum {
	id: string
	noteId: string
	content: string
	reason: string | null
	status: "draft" | "signed"
	authorStaffId: string
	authorStaffName: string | null
	signedAt: string | null
	createdAt: string
}

export interface ClinicalNote {
	id: string
	facilityId: string
	encounterId: string | null
	preEncounterId: string | null
	templateId: string | null
	templateName: string | null
	noteType: ClinicalNoteType
	content: string
	structuredData: unknown
	status: "draft" | "signed"
	authorStaffId: string
	authorStaffName: string | null
	signedAt: string | null
	signedIp: string | null
	addenda?: Addendum[]
	createdAt: string
	updatedAt: string
}

interface ClinicalNoteListResponse {
	data: ClinicalNote[]
	total: number
	page: number
	limit: number
	totalPages: number
}

interface ConsentRecord {
	id: string
	facilityId: string
	encounterId: string | null
	patientId: string
	consentType: "general" | "procedure" | "research" | "blood_transfusion" | "surgery" | "dpa"
	signedByName: string
	relationship: "self" | "parent" | "guardian" | "spouse" | "other"
	content: string | null
	signatureData: unknown
	signedAt: string | null
	witnessStaffId: string | null
	witnessStaffName: string | null
	revokedAt: string | null
	revokeReason: string | null
	createdAt: string
	updatedAt: string
}

export type { ConsentRecord }

interface ConsentRecordListResponse {
	data: ConsentRecord[]
	total: number
	page: number
	limit: number
	totalPages: number
}

interface SignedNotesResponse {
	notes: ClinicalNote[]
}

export interface NoteContext {
	encounterId: string
	patientId: string | null
	latestVitals: {
		id: string
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
		recordedAt: string
	} | null
	activeAllergies: Array<{
		id: string
		allergenName: string
		allergenType: "medication" | "food" | "environmental"
		reactionType: string | null
		severity: "mild" | "moderate" | "severe"
		onsetDate: string | null
	}>
	recentLabs: Array<{
		id: string
		testName: string
		panelName: string | null
		status:
			| "pending"
			| "ordered"
			| "collected"
			| "in_progress"
			| "resulted"
			| "completed"
			| "cancelled"
		resultedDatetime: string | null
		results: unknown
	}>
}

// ============================================================================
// Query Keys
// ============================================================================

export const clinicalDocsKeys = {
	all: ["clinical-docs"] as const,
	templates: (facilityId: string) => [...clinicalDocsKeys.all, "templates", facilityId] as const,
	template: (id: string) => [...clinicalDocsKeys.all, "template", id] as const,
	notes: (encounterId?: string, preEncounterId?: string) =>
		[...clinicalDocsKeys.all, "notes", encounterId, preEncounterId] as const,
	note: (id: string) => [...clinicalDocsKeys.all, "note", id] as const,
	context: (encounterId: string) => [...clinicalDocsKeys.all, "context", encounterId] as const,
	consents: (encounterId: string) => [...clinicalDocsKeys.all, "consents", encounterId] as const,
	consent: (id: string) => [...clinicalDocsKeys.all, "consent", id] as const,
	patientConsents: (patientId: string) =>
		[...clinicalDocsKeys.all, "patient-consents", patientId] as const,
	signedNotes: (encounterId: string) =>
		[...clinicalDocsKeys.all, "signed-notes", encounterId] as const,
}

// ============================================================================
// Note Template Hooks
// ============================================================================

export function useNoteTemplatesQuery(params: {
	facilityId: string
	category?: string
	isActive?: boolean
}) {
	return useQuery({
		queryKey: [
			...clinicalDocsKeys.templates(params.facilityId),
			params.category,
			params.isActive,
		] as const,
		queryFn: () =>
			fetchJson<NoteTemplateListResponse>(
				`${API_BASE}/templates${buildQueryString({
					facilityId: params.facilityId,
					category: params.category,
					isActive: params.isActive,
					limit: 100,
				})}`
			),
		enabled: !!params.facilityId,
	})
}

export function useNoteTemplateDetailQuery(id: string) {
	return useQuery({
		queryKey: clinicalDocsKeys.template(id),
		queryFn: () => fetchJson<NoteTemplate>(`${API_BASE}/templates/${id}`),
		enabled: !!id,
	})
}

export function useCreateTemplateMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: {
			facilityId: string
			name: string
			category: NoteTemplate["category"]
			sections: TemplateSection[]
		}) =>
			fetchJson<NoteTemplate>(`${API_BASE}/templates`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: (_data, variables) => {
			void queryClient.invalidateQueries({
				queryKey: clinicalDocsKeys.templates(variables.facilityId),
			})
		},
	})
}

export function useUpdateTemplateMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: {
			id: string
			name?: string
			category?: NoteTemplate["category"]
			sections?: TemplateSection[]
			isActive?: boolean
		}) =>
			fetchJson<NoteTemplate>(`${API_BASE}/templates/${data.id}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: clinicalDocsKeys.all,
			})
		},
	})
}

// ============================================================================
// Clinical Note Hooks
// ============================================================================

export function useNotesQuery(params: {
	encounterId?: string
	preEncounterId?: string
	noteType?: string
	status?: string
}) {
	return useQuery({
		queryKey: clinicalDocsKeys.notes(params.encounterId, params.preEncounterId),
		queryFn: () =>
			fetchJson<ClinicalNoteListResponse>(
				`${API_BASE}/notes${buildQueryString({
					encounterId: params.encounterId,
					preEncounterId: params.preEncounterId,
					noteType: params.noteType,
					status: params.status,
					limit: 100,
				})}`
			),
		enabled: !!(params.encounterId || params.preEncounterId),
	})
}

export function useNoteDetailQuery(id: string) {
	return useQuery({
		queryKey: clinicalDocsKeys.note(id),
		queryFn: () => fetchJson<ClinicalNote>(`${API_BASE}/notes/${id}`),
		enabled: !!id,
	})
}

export function useCreateNoteMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: {
			facilityId: string
			encounterId?: string
			preEncounterId?: string
			templateId?: string
			noteType: ClinicalNote["noteType"]
			content?: string
			structuredData?: unknown
		}) =>
			fetchJson<ClinicalNote>(`${API_BASE}/notes`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: (_data, variables) => {
			void queryClient.invalidateQueries({
				queryKey: clinicalDocsKeys.notes(variables.encounterId, variables.preEncounterId),
			})
		},
	})
}

export function useUpdateNoteMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: { id: string; content?: string; structuredData?: unknown }) =>
			fetchJson<ClinicalNote>(`${API_BASE}/notes/${data.id}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: note => {
			void queryClient.invalidateQueries({
				queryKey: clinicalDocsKeys.note(note.id),
			})
			void queryClient.invalidateQueries({
				queryKey: clinicalDocsKeys.all,
			})
		},
	})
}

export function useSignNoteMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: { id: string }) =>
			fetchJson<ClinicalNote>(`${API_BASE}/notes/${data.id}/sign`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: note => {
			void queryClient.invalidateQueries({
				queryKey: clinicalDocsKeys.note(note.id),
			})
			void queryClient.invalidateQueries({
				queryKey: clinicalDocsKeys.all,
			})
		},
	})
}

export function useSubmitFpeMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: { noteId: string; facilityId: string }) =>
			fetchJson<ClinicalNote>(`${API_BASE}/notes/${data.noteId}/submit-fpe`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: note => {
			void queryClient.invalidateQueries({
				queryKey: clinicalDocsKeys.note(note.id),
			})
			void queryClient.invalidateQueries({
				queryKey: clinicalDocsKeys.all,
			})
		},
	})
}

export function useNoteContextQuery(encounterId: string) {
	return useQuery({
		queryKey: clinicalDocsKeys.context(encounterId),
		queryFn: () =>
			fetchJson<NoteContext>(
				`${API_BASE}/context${buildQueryString({
					encounterId,
				})}`
			),
		enabled: !!encounterId,
	})
}

// ============================================================================
// Addendum Hooks
// ============================================================================

export function useCreateAddendumMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: { noteId: string; content: string; reason?: string }) =>
			fetchJson<Addendum>(`${API_BASE}/addenda`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: (_data, variables) => {
			void queryClient.invalidateQueries({
				queryKey: clinicalDocsKeys.note(variables.noteId),
			})
		},
	})
}

export function useSignAddendumMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: { id: string; noteId: string }) =>
			fetchJson<Addendum>(`${API_BASE}/addenda/${data.id}/sign`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: (_data, variables) => {
			void queryClient.invalidateQueries({
				queryKey: clinicalDocsKeys.note(variables.noteId),
			})
		},
	})
}

// ============================================================================
// Consent Record Hooks
// ============================================================================

export function useConsentsQuery(params: { encounterId: string; consentType?: string }) {
	return useQuery({
		queryKey: clinicalDocsKeys.consents(params.encounterId),
		queryFn: () =>
			fetchJson<ConsentRecordListResponse>(
				`${API_BASE}/consents${buildQueryString({
					encounterId: params.encounterId,
					consentType: params.consentType,
					limit: 100,
				})}`
			),
		enabled: !!params.encounterId,
	})
}

export function useConsentDetailQuery(id: string) {
	return useQuery({
		queryKey: clinicalDocsKeys.consent(id),
		queryFn: () => fetchJson<ConsentRecord>(`${API_BASE}/consents/${id}`),
		enabled: !!id,
	})
}

export function useCreateConsentMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: {
			facilityId: string
			encounterId?: string
			patientId: string
			consentType: ConsentRecord["consentType"]
			signedByName: string
			relationship: ConsentRecord["relationship"]
			content?: string
			signatureData?: unknown
		}) =>
			fetchJson<ConsentRecord>(`${API_BASE}/consents`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: (_data, variables) => {
			if (variables.encounterId) {
				void queryClient.invalidateQueries({
					queryKey: clinicalDocsKeys.consents(variables.encounterId),
				})
			}
			void queryClient.invalidateQueries({
				queryKey: clinicalDocsKeys.patientConsents(variables.patientId),
			})
		},
	})
}

export function useRevokeConsentMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: { id: string; encounterId: string }) =>
			fetchJson<ConsentRecord>(`${API_BASE}/consents/${data.id}/revoke`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		onSuccess: (_data, variables) => {
			void queryClient.invalidateQueries({
				queryKey: clinicalDocsKeys.consents(variables.encounterId),
			})
		},
	})
}

export function useRevokeConsentWithReasonMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: { id: string; patientId: string; encounterId?: string; reason?: string }) =>
			fetchJson<ConsentRecord>(`${API_BASE}/consents/${data.id}/revoke`, {
				method: "PUT",
				body: JSON.stringify({ reason: data.reason }),
			}),
		onSuccess: (_data, variables) => {
			if (variables.encounterId) {
				void queryClient.invalidateQueries({
					queryKey: clinicalDocsKeys.consents(variables.encounterId),
				})
			}
			void queryClient.invalidateQueries({
				queryKey: clinicalDocsKeys.patientConsents(variables.patientId),
			})
		},
	})
}

export function usePatientConsentsQuery(params: { patientId: string; consentType?: string }) {
	return useQuery({
		queryKey: clinicalDocsKeys.patientConsents(params.patientId),
		queryFn: () =>
			fetchJson<ConsentRecordListResponse>(
				`${API_BASE}/consents${buildQueryString({
					patientId: params.patientId,
					consentType: params.consentType,
					limit: 200,
				})}`
			),
		enabled: !!params.patientId,
	})
}

// ============================================================================
// Signed Notes (Cross-module)
// ============================================================================

export function useSignedNotesQuery(encounterId: string) {
	return useQuery({
		queryKey: clinicalDocsKeys.signedNotes(encounterId),
		queryFn: () =>
			fetchJson<SignedNotesResponse>(
				`${API_BASE}/signed-notes${buildQueryString({
					encounterId,
				})}`
			),
		enabled: !!encounterId,
	})
}

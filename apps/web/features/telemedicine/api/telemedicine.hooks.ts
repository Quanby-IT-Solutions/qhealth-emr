import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { env } from "@/env"

// ============================================================================
// Constants
// ============================================================================

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/telemedicine`

export const TELEMEDICINE_PLATFORMS = ["zoom", "teams"] as const
export type TelemedicinePlatform = (typeof TELEMEDICINE_PLATFORMS)[number]

export const APPOINTMENT_STATUSES = [
	"scheduled",
	"confirmed",
	"in-progress",
	"completed",
	"cancelled",
	"no-show",
] as const
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

export const ENCOUNTER_TYPES = ["standalone", "linked"] as const
export type EncounterType = (typeof ENCOUNTER_TYPES)[number]

export const PRESCRIPTION_STATUSES = ["draft", "active", "dispensed", "cancelled"] as const
export type PrescriptionStatus = (typeof PRESCRIPTION_STATUSES)[number]

// ============================================================================
// Types
// ============================================================================

export interface TelemedicineAppointment {
	id: string
	facilityId: string
	patientId: string
	patientName: string
	patientMrn: string
	patientContactNumber: string
	patientEmail: string | null
	clinicianId: string
	clinicianName: string
	clinicianSpecialty: string
	scheduledDate: string
	scheduledTime: string
	durationMinutes: number
	platform: TelemedicinePlatform
	status: AppointmentStatus
	videoLink: string | null
	meetingId: string | null
	meetingPassword: string | null
	notes: string | null
	encounterId: string | null
	createdAt: string
	createdByName: string
}

export interface AppointmentListResponse {
	data: TelemedicineAppointment[]
	total: number
	page: number
	limit: number
}

export interface TelemedicineEncounter {
	id: string
	appointmentId: string
	encounterType: EncounterType
	linkedEncounterId: string | null
	linkedEncounterNumber: string | null
	patientId: string
	patientName: string
	clinicianId: string
	clinicianName: string
	chiefComplaint: string
	subjectiveNotes: string
	objectiveNotes: string
	assessmentNotes: string
	planNotes: string
	diagnosis: string
	icdCode: string | null
	vitalSigns: {
		bloodPressure?: string
		heartRate?: string
		temperature?: string
		oxygenSaturation?: string
		weight?: string
	}
	status: "open" | "signed" | "finalized"
	createdAt: string
	signedAt: string | null
	signedByName: string | null
}

export interface EPrescription {
	id: string
	encounterId: string
	appointmentId: string
	patientName: string
	patientMrn: string
	patientAge: number
	patientSex: string
	clinicianName: string
	clinicianPrcNumber: string
	clinicianSignature: string | null
	facilityName: string
	facilityAddress: string
	prescriptionDate: string
	validUntil: string
	status: PrescriptionStatus
	medications: EPrescriptionItem[]
	dispensingInstructions: string | null
	createdAt: string
}

export interface EPrescriptionItem {
	id: string
	genericName: string
	brandName: string | null
	dosage: string
	form: string
	quantity: number
	unit: string
	frequency: string
	duration: string
	route: string
	instructions: string | null
}

export interface CreateAppointmentInput {
	facilityId: string
	patientId: string
	clinicianId: string
	scheduledDate: string
	scheduledTime: string
	durationMinutes: number
	platform: TelemedicinePlatform
	notes?: string
}

export interface UpdateAppointmentInput {
	id: string
	videoLink?: string | null
	meetingId?: string | null
	meetingPassword?: string | null
}

export interface CreateEncounterInput {
	appointmentId: string
	encounterType: EncounterType
	linkedEncounterId?: string
	chiefComplaint: string
	subjectiveNotes: string
	objectiveNotes: string
	assessmentNotes: string
	planNotes: string
	diagnosis: string
	icdCode?: string
	vitalSigns?: TelemedicineEncounter["vitalSigns"]
}

export interface CreatePrescriptionInput {
	encounterId: string
	medications: Array<{
		genericName: string
		brandName?: string
		dosage: string
		form: string
		quantity: number
		unit: string
		frequency: string
		duration: string
		route: string
		instructions?: string
	}>
	dispensingInstructions?: string
}

// ============================================================================
// Query Keys
// ============================================================================

export interface TeleAbstract {
	id: string
	encounterId: string
	appointmentId: string
	patientName: string
	clinicianName: string
	clinicianPrcNumber: string
	facilityName: string
	chiefComplaint: string
	subjectiveNotes: string
	objectiveNotes: string
	assessmentNotes: string
	planNotes: string
	diagnosis: string
	icdCode: string | null
	additionalNotes: string | null
	status: "draft" | "signed" | "sent"
	signedAt: string | null
	signedByName: string | null
	sentAt: string | null
	sentToEmail: string | null
	createdAt: string
}

export interface GenerateAbstractInput {
	encounterId: string
	additionalNotes?: string
}

export interface SignAbstractInput {
	id: string
}

export interface SendAbstractInput {
	id: string
	email: string
}

export interface SendPrescriptionInput {
	id: string
	email: string
}

export const telemedicineKeys = {
	all: ["telemedicine"] as const,
	appointments: (facilityId: string) => [...telemedicineKeys.all, "appointments", facilityId] as const,
	appointment: (id: string) => [...telemedicineKeys.all, "appointments", id] as const,
	encounters: (appointmentId: string) =>
		[...telemedicineKeys.all, "encounters", appointmentId] as const,
	encounter: (id: string) => [...telemedicineKeys.all, "encounter", id] as const,
	prescriptions: (encounterId: string) =>
		[...telemedicineKeys.all, "prescriptions", encounterId] as const,
	prescription: (id: string) => [...telemedicineKeys.all, "prescription", id] as const,
	abstracts: (encounterId: string) =>
		[...telemedicineKeys.all, "abstracts", encounterId] as const,
	abstract: (id: string) => [...telemedicineKeys.all, "abstract", id] as const,
}

// ============================================================================
// Fetch helpers
// ============================================================================

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
	const res = await fetch(url, {
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		...init,
	})
	if (!res.ok) {
		const err = await res.text().catch(() => res.statusText)
		throw new Error(err || `HTTP ${res.status}`)
	}
	return res.json() as Promise<T>
}

function buildQueryString(params: Record<string, string | number | undefined | null>): string {
	const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
	if (!entries.length) return ""
	return `?${entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&")}`
}

// ============================================================================
// Query Hooks
// ============================================================================

export function useAppointmentsQuery(
	facilityId: string,
	page = 1,
	limit = 20,
	status?: AppointmentStatus,
) {
	return useQuery<AppointmentListResponse>({
		queryKey: [...telemedicineKeys.appointments(facilityId), page, limit, status],
		queryFn: () =>
			fetchJson<AppointmentListResponse>(
				`${API_BASE}/appointments${buildQueryString({ facilityId, page, limit, status })}`,
			),
		enabled: Boolean(facilityId),
	})
}

export function useAppointmentQuery(appointmentId: string) {
	return useQuery<TelemedicineAppointment>({
		queryKey: telemedicineKeys.appointment(appointmentId),
		queryFn: () => fetchJson<TelemedicineAppointment>(`${API_BASE}/appointments/${appointmentId}`),
		enabled: Boolean(appointmentId),
	})
}

export function useEncounterQuery(encounterId: string) {
	return useQuery<TelemedicineEncounter>({
		queryKey: telemedicineKeys.encounter(encounterId),
		queryFn: () => fetchJson<TelemedicineEncounter>(`${API_BASE}/encounters/${encounterId}`),
		enabled: Boolean(encounterId),
	})
}

export function usePrescriptionQuery(prescriptionId: string) {
	return useQuery<EPrescription>({
		queryKey: telemedicineKeys.prescription(prescriptionId),
		queryFn: () => fetchJson<EPrescription>(`${API_BASE}/prescriptions/${prescriptionId}`),
		enabled: Boolean(prescriptionId),
	})
}

export function useEncounterPrescriptionsQuery(encounterId: string) {
	return useQuery<EPrescription[]>({
		queryKey: telemedicineKeys.prescriptions(encounterId),
		queryFn: () => fetchJson<EPrescription[]>(`${API_BASE}/prescriptions?encounterId=${encounterId}`),
		enabled: Boolean(encounterId),
	})
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export function useCreateAppointmentMutation() {
	const queryClient = useQueryClient()
	return useMutation<TelemedicineAppointment, Error, CreateAppointmentInput>({
		mutationFn: (input) =>
			fetchJson<TelemedicineAppointment>(`${API_BASE}/appointments`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: telemedicineKeys.all })
		},
	})
}

export function useCancelAppointmentMutation() {
	const queryClient = useQueryClient()
	return useMutation<void, Error, string>({
		mutationFn: (appointmentId) =>
			fetchJson<void>(`${API_BASE}/appointments/${appointmentId}/cancel`, { method: "POST" }),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: telemedicineKeys.all })
		},
	})
}

export function useUpdateAppointmentMutation() {
	const queryClient = useQueryClient()
	return useMutation<TelemedicineAppointment, Error, UpdateAppointmentInput>({
		mutationFn: (input) =>
			fetchJson<TelemedicineAppointment>(`${API_BASE}/appointments/${input.id}`, {
				method: "PATCH",
				body: JSON.stringify(input),
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: telemedicineKeys.all })
		},
	})
}

export function useCreateEncounterMutation() {
	const queryClient = useQueryClient()
	return useMutation<TelemedicineEncounter, Error, CreateEncounterInput>({
		mutationFn: (input) =>
			fetchJson<TelemedicineEncounter>(`${API_BASE}/encounters`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: telemedicineKeys.all })
		},
	})
}

export function useCreatePrescriptionMutation() {
	const queryClient = useQueryClient()
	return useMutation<EPrescription, Error, CreatePrescriptionInput>({
		mutationFn: (input) =>
			fetchJson<EPrescription>(`${API_BASE}/prescriptions`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: telemedicineKeys.all })
		},
	})
}

export function useSendPrescriptionMutation() {
	const queryClient = useQueryClient()
	return useMutation<EPrescription, Error, SendPrescriptionInput>({
		mutationFn: (input) =>
			fetchJson<EPrescription>(`${API_BASE}/prescriptions/${input.id}/send`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: telemedicineKeys.all })
		},
	})
}

export function useEncounterAbstractsQuery(encounterId: string) {
	return useQuery<TeleAbstract[]>({
		queryKey: telemedicineKeys.abstracts(encounterId),
		queryFn: () =>
			fetchJson<TeleAbstract[]>(`${API_BASE}/abstracts?encounterId=${encounterId}`),
		enabled: Boolean(encounterId),
	})
}

export function useAbstractQuery(abstractId: string) {
	return useQuery<TeleAbstract>({
		queryKey: telemedicineKeys.abstract(abstractId),
		queryFn: () => fetchJson<TeleAbstract>(`${API_BASE}/abstracts/${abstractId}`),
		enabled: Boolean(abstractId),
	})
}

export function useGenerateAbstractMutation() {
	const queryClient = useQueryClient()
	return useMutation<TeleAbstract, Error, GenerateAbstractInput>({
		mutationFn: (input) =>
			fetchJson<TeleAbstract>(`${API_BASE}/abstracts`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: telemedicineKeys.all })
		},
	})
}

export function useSignAbstractMutation() {
	const queryClient = useQueryClient()
	return useMutation<TeleAbstract, Error, SignAbstractInput>({
		mutationFn: (input) =>
			fetchJson<TeleAbstract>(`${API_BASE}/abstracts/${input.id}/sign`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: telemedicineKeys.all })
		},
	})
}

export function useSendAbstractMutation() {
	const queryClient = useQueryClient()
	return useMutation<TeleAbstract, Error, SendAbstractInput>({
		mutationFn: (input) =>
			fetchJson<TeleAbstract>(`${API_BASE}/abstracts/${input.id}/send`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: telemedicineKeys.all })
		},
	})
}

// ============================================================================
// Display Helpers
// ============================================================================

export function getAppointmentStatusColor(status: AppointmentStatus): string {
	const map: Record<AppointmentStatus, string> = {
		scheduled: "bg-blue-100 text-blue-800",
		confirmed: "bg-green-100 text-green-800",
		"in-progress": "bg-yellow-100 text-yellow-800",
		completed: "bg-gray-100 text-gray-800",
		cancelled: "bg-red-100 text-red-800",
		"no-show": "bg-orange-100 text-orange-800",
	}
	return map[status] ?? "bg-gray-100 text-gray-800"
}

export function getPlatformLabel(platform: TelemedicinePlatform): string {
	return platform === "zoom" ? "Zoom" : "Microsoft Teams"
}

export function formatAppointmentStatusLabel(status: AppointmentStatus): string {
	const map: Record<AppointmentStatus, string> = {
		scheduled: "Scheduled",
		confirmed: "Confirmed",
		"in-progress": "In Progress",
		completed: "Completed",
		cancelled: "Cancelled",
		"no-show": "No Show",
	}
	return map[status] ?? status
}

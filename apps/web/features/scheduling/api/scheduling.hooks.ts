"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { env } from "@/env"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useFacilityProfileQuery } from "@/features/facility-profile/api/facility-profile.hooks"
import { useListCliniciansQuery as usePatientClinicianListQuery } from "@/features/patients/api/patients.hooks"

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/scheduling`

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

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface ScheduleTemplate {
	id: string
	facilityId: string
	clinicianStaffId: string
	clinicId: string
	clinicName: string
	clinicianId: string
	clinicianName: string
	dayOfWeek: DayOfWeek
	startTime: string // "HH:mm"
	endTime: string // "HH:mm"
	slotDurationMinutes: number
	maxPatients: number
	isActive: boolean
	createdAt: string
	updatedAt: string
}

export interface ScheduleTemplateListResponse {
	total: number
	page: number
	limit: number
	totalPages: number
	templates: ScheduleTemplate[]
}

export interface CreateScheduleTemplateInput {
	facilityId: string
	clinicName: string
	clinicianStaffId: string
	dayOfWeek: DayOfWeek
	startTime: string
	endTime: string
	slotDurationMinutes: number
	maxPatients: number
}

export interface UpdateScheduleTemplateInput extends Partial<CreateScheduleTemplateInput> {
	isActive?: boolean
}

export interface ClinicOption {
	id: string
	name: string
}

export interface ClinicianOption {
	id: string
	name: string
	department?: string | null
}

interface BackendScheduleTemplate {
	id: string
	facilityId: string
	clinicianStaffId: string
	clinicName: string
	dayOfWeek: DayOfWeek
	startTime: string
	endTime: string
	slotDurationMinutes: number
	maxPatients: number
	isActive: boolean
	createdAt: string
	updatedAt: string
}

export interface AppointmentSlot {
	date: string
	time: string
	clinicId: string
	clinicianId: string
	clinicianName: string
	isAvailable: boolean
	remainingSlots: number
}

export interface AvailableSlotsResponse {
	slots: AppointmentSlot[]
}

export type AppointmentStatus =
	| "scheduled"
	| "checked_in"
	| "in_progress"
	| "completed"
	| "no_show"
	| "cancelled"

export interface Appointment {
	id: string
	patientId: string
	patientName: string
	patientMrn: string
	clinicId: string
	clinicName: string
	clinicianId: string
	clinicianName: string
	scheduledDate: string
	slotTime: string
	status: AppointmentStatus
	notes?: string | null
	checkInTime?: string | null
	createdAt: string
	updatedAt: string
}

export interface AppointmentListResponse {
	total: number
	page: number
	limit: number
	totalPages: number
	appointments: Appointment[]
}

export interface BookAppointmentInput {
	patientId: string
	clinicId: string
	clinicianId: string
	scheduledDate: string
	slotTime: string
	notes?: string
}

export interface QueueEntry {
	position: number
	appointmentId: string
	patientId: string
	patientName: string
	patientMrn: string
	slotTime: string
	checkInTime: string
	status: AppointmentStatus
}

export type QueueEntryStatus = "waiting" | "in_progress" | "completed"

export interface UnifiedQueueEntry {
	entryType: "appointment" | "walk_in"
	id: string
	appointmentId: string | null
	encounterId: string | null
	queueNumber: number | null
	slotTime: string | null
	checkInTime: string | null
	status: QueueEntryStatus
	patientId: string
	patientName?: string
	patientMrn?: string
	clinicianStaffId: string | null
	clinicianName?: string
}

export interface ClinicQueueResponse {
	entries: UnifiedQueueEntry[]
	clinicName: string | null
	stats: {
		waiting: number
		inProgress: number
		completed: number
		total: number
	}
}

// ============================================================================
// Query Keys
// ============================================================================

export const schedulingKeys = {
	all: ["scheduling"] as const,
	templates: () => [...schedulingKeys.all, "templates"] as const,
	template: (id: string) => [...schedulingKeys.templates(), id] as const,
	slots: (params: object) => [...schedulingKeys.all, "slots", params] as const,
	appointments: () => [...schedulingKeys.all, "appointments"] as const,
	appointment: (id: string) => [...schedulingKeys.appointments(), id] as const,
	queue: (clinicId: string, date: string, clinicianStaffId?: string) =>
		clinicianStaffId
			? ([...schedulingKeys.all, "queue", clinicId, date, clinicianStaffId] as const)
			: ([...schedulingKeys.all, "queue", clinicId, date] as const),
}

function mapScheduleTemplate(template: BackendScheduleTemplate): ScheduleTemplate {
	return {
		id: template.id,
		facilityId: template.facilityId,
		clinicianStaffId: template.clinicianStaffId,
		clinicId: template.facilityId,
		clinicName: template.clinicName,
		clinicianId: template.clinicianStaffId,
		clinicianName: "",
		dayOfWeek: template.dayOfWeek,
		startTime: template.startTime,
		endTime: template.endTime,
		slotDurationMinutes: template.slotDurationMinutes,
		maxPatients: template.maxPatients,
		isActive: template.isActive,
		createdAt: template.createdAt,
		updatedAt: template.updatedAt,
	}
}

export function useClinicsQuery() {
	const { data: profile } = useMyProfile()
	const facilityProfile = useFacilityProfileQuery()
	const activeFacilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	return {
		...facilityProfile,
		data:
			facilityProfile.data && activeFacilityId
				? [
						{
							id: activeFacilityId,
							name: facilityProfile.data.name,
						},
					]
				: ([] as ClinicOption[]),
	}
}

export function useStaffClinicianListQuery({ facilityId }: { facilityId?: string }) {
	const clinicianDirectory = usePatientClinicianListQuery(facilityId)

	return {
		...clinicianDirectory,
		data:
			clinicianDirectory.data?.data.map(clinician => ({
				id: clinician.staffProfileId,
				name: clinician.name,
				department: clinician.department,
			})) ?? ([] as ClinicianOption[]),
	}
}

// ============================================================================
// Schedule Templates
// ============================================================================

export function useScheduleTemplatesQuery(params: {
	facilityId?: string
	clinicId?: string
	clinicianId?: string
	clinicianStaffId?: string
	page?: number
	limit?: number
}) {
	return useQuery({
		queryKey: [...schedulingKeys.templates(), params],
		queryFn: () =>
			fetchJson<BackendScheduleTemplate[]>(
				`${API_BASE}/clinic-templates${buildQueryString({
					facilityId: params.facilityId ?? params.clinicId,
					clinicianStaffId: params.clinicianStaffId ?? params.clinicianId,
					page: params.page,
					limit: params.limit,
				})}`
			),
		select: templates => templates.map(mapScheduleTemplate),
		enabled: true,
	})
}

export function useScheduleTemplateDetailQuery(id: string) {
	return useQuery({
		queryKey: schedulingKeys.template(id),
		queryFn: () => fetchJson<BackendScheduleTemplate>(`${API_BASE}/clinic-templates/${id}`),
		select: mapScheduleTemplate,
		enabled: !!id,
	})
}

export function useCreateScheduleTemplateMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (input: CreateScheduleTemplateInput) =>
			fetchJson<BackendScheduleTemplate>(`${API_BASE}/clinic-templates`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: schedulingKeys.templates() })
		},
	})
}

export function useUpdateScheduleTemplateMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, ...input }: UpdateScheduleTemplateInput & { id: string }) =>
			fetchJson<BackendScheduleTemplate>(`${API_BASE}/clinic-templates/${id}`, {
				method: "PUT",
				body: JSON.stringify(input),
			}),
		onSuccess: (_, vars) => {
			void qc.invalidateQueries({ queryKey: schedulingKeys.templates() })
			void qc.invalidateQueries({ queryKey: schedulingKeys.template(vars.id) })
		},
	})
}

export function useDeleteScheduleTemplateMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) =>
			fetchJson<BackendScheduleTemplate>(`${API_BASE}/clinic-templates/${id}`, {
				method: "PUT",
				body: JSON.stringify({ isActive: false }),
			}),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: schedulingKeys.templates() })
		},
	})
}

// ============================================================================
// Available Slots
// ============================================================================

export function useAvailableSlotsQuery(
	params: { clinicId?: string; clinicianId?: string; date: string },
	enabled = true
) {
	return useQuery({
		queryKey: schedulingKeys.slots(params),
		queryFn: () =>
			fetchJson<AvailableSlotsResponse>(
				`${API_BASE}/available-slots${buildQueryString(params)}`
			),
		enabled: enabled && !!params.date,
	})
}

// ============================================================================
// Appointments
// ============================================================================

export function useAppointmentsQuery(params: {
	facilityId?: string
	date?: string
	clinicId?: string
	clinicianId?: string
	status?: string
	patientId?: string
	page?: number
	limit?: number
}) {
	return useQuery({
		queryKey: [...schedulingKeys.appointments(), params],
		queryFn: () =>
			fetchJson<AppointmentListResponse>(
				`${API_BASE}/appointments${buildQueryString(params)}`
			),
		enabled: true,
	})
}

export function useBookAppointmentMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (input: BookAppointmentInput) =>
			fetchJson<Appointment>(`${API_BASE}/appointments`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: schedulingKeys.appointments() })
		},
	})
}

export function useCheckInMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (appointmentId: string) =>
			fetchJson<Appointment>(`${API_BASE}/appointments/${appointmentId}/check-in`, {
				method: "POST",
				body: JSON.stringify({}),
			}),
		onSuccess: (data) => {
			void qc.invalidateQueries({ queryKey: schedulingKeys.appointments() })
			void qc.invalidateQueries({
				queryKey: schedulingKeys.queue(data.clinicId, data.scheduledDate),
			})
		},
	})
}

export function useUpdateAppointmentStatusMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({
			appointmentId,
			status,
		}: {
			appointmentId: string
			status: AppointmentStatus
		}) =>
			fetchJson<Appointment>(
				`${API_BASE}/appointments/${appointmentId}/status`,
				{
					method: "PATCH",
					body: JSON.stringify({ status }),
				}
			),
		onSuccess: (data) => {
			void qc.invalidateQueries({ queryKey: schedulingKeys.appointments() })
			void qc.invalidateQueries({ queryKey: schedulingKeys.appointment(data.id) })
			void qc.invalidateQueries({
				queryKey: schedulingKeys.queue(data.clinicId, data.scheduledDate),
			})
		},
	})
}

export function useCancelAppointmentMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (appointmentId: string) =>
			fetchJson<void>(`${API_BASE}/appointments/${appointmentId}`, {
				method: "DELETE",
			}),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: schedulingKeys.appointments() })
		},
	})
}

// ============================================================================
// Clinic Queue
// ============================================================================

export function useClinicQueueQuery(
	params: { facilityId?: string; clinicId?: string; clinicianStaffId?: string; date: string },
	options?: { refetchInterval?: number }
) {
	const hasFilter = !!params.facilityId || !!params.clinicId
	return useQuery({
		queryKey: schedulingKeys.queue(params.facilityId || params.clinicId || "", params.date, params.clinicianStaffId),
		queryFn: () =>
			fetchJson<ClinicQueueResponse>(
				`${API_BASE}/queue${buildQueryString(params)}`
			),
		enabled: hasFilter && !!params.date,
		refetchInterval: options?.refetchInterval ?? 30_000,
	})
}

export function useUpdateEncounterQueueStatusMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, status }: { id: string; status: "in_progress" | "completed" }) =>
			fetchJson<{ id: string; queueStatus: string }>(
				`${env.NEXT_PUBLIC_API_BASE_URL}/v1/scheduling/encounters/${id}/queue-status`,
				{ method: "PUT", body: JSON.stringify({ id, status }) }
			),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: schedulingKeys.all })
		},
	})
}

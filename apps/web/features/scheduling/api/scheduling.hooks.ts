"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { env } from "@/env"

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
	clinicId: string
	clinicianId: string
	dayOfWeek: DayOfWeek
	startTime: string
	endTime: string
	slotDurationMinutes: number
	maxPatients: number
}

export interface UpdateScheduleTemplateInput extends Partial<CreateScheduleTemplateInput> {
	isActive?: boolean
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

export interface ClinicQueueResponse {
	clinicId: string
	clinicName: string
	date: string
	entries: QueueEntry[]
	currentPosition: number | null
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
	queue: (clinicId: string, date: string) =>
		[...schedulingKeys.all, "queue", clinicId, date] as const,
}

// ============================================================================
// Schedule Templates
// ============================================================================

export function useScheduleTemplatesQuery(params: {
	clinicId?: string
	clinicianId?: string
	page?: number
	limit?: number
}) {
	return useQuery({
		queryKey: [...schedulingKeys.templates(), params],
		queryFn: () =>
			fetchJson<ScheduleTemplate[]>(
				`${API_BASE}/clinic-templates${buildQueryString(params)}`
			),
		enabled: true,
	})
}

export function useScheduleTemplateDetailQuery(id: string) {
	return useQuery({
		queryKey: schedulingKeys.template(id),
		queryFn: () => fetchJson<ScheduleTemplate>(`${API_BASE}/clinic-templates/${id}`),
		enabled: !!id,
	})
}

export function useCreateScheduleTemplateMutation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (input: CreateScheduleTemplateInput) =>
			fetchJson<ScheduleTemplate>(`${API_BASE}/clinic-templates`, {
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
			fetchJson<ScheduleTemplate>(`${API_BASE}/clinic-templates/${id}`, {
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
			fetchJson<void>(`${API_BASE}/clinic-templates/${id}`, { method: "DELETE" }),
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
	params: { facilityId?: string; clinicId?: string; date: string },
	options?: { refetchInterval?: number }
) {
	const hasFilter = !!params.facilityId || !!params.clinicId
	return useQuery({
		queryKey: schedulingKeys.queue(params.facilityId || params.clinicId || "", params.date),
		queryFn: () =>
			fetchJson<ClinicQueueResponse>(
				`${API_BASE}/queue${buildQueryString(params)}`
			),
		enabled: hasFilter && !!params.date,
		refetchInterval: options?.refetchInterval ?? 30_000,
	})
}

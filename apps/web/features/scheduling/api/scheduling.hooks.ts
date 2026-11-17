"use client"

import {
	useMutation,
	useQueries,
	useQuery,
	useQueryClient,
	type QueryKey,
} from "@tanstack/react-query"

import type {
	Appointment,
	AppointmentListInput,
	AvailableSlotsQuery,
	AvailableSlotsResponse,
	CheckInAppointmentInput,
	ClinicQueueQuery,
	ClinicQueueResponse,
	ClinicSlot,
	ClinicTemplate,
	CreateAppointmentInput,
	CreateClinicTemplateInput,
	ListTemplateSlotsQuery,
	TimeSlot,
	UnifiedQueueEntry,
	UpdateAppointmentStatusInput,
	UpdateClinicTemplateInput,
	UpdateEncounterQueueStatusInput,
	UpdateEncounterQueueStatusResponse,
	UpdateSlotInput,
} from "@repo/contracts"

import { orpc } from "@/services/orpc/client"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useListCliniciansQuery as usePatientClinicianListQuery } from "@/features/patients/api/patients.hooks"

export type DayOfWeek = ClinicTemplate["dayOfWeek"]
export type SlotStatus = ClinicSlot["status"]
export type AppointmentStatus = Appointment["status"]

export interface ClinicOption {
	id: string
	name: string
}

export interface ClinicianOption {
	id: string
	name: string
	department?: string | null
}

type QueueSnapshot = Array<readonly [QueryKey, ClinicQueueResponse | undefined]>

interface ScheduleTemplatesQueryParams {
	facilityId?: string
	clinicId?: string
	clinicianId?: string
	clinicianStaffId?: string
	dayOfWeek?: number
	isActive?: boolean
	page?: number
	limit?: number
}

interface TemplateSlotsQueryParams {
	templateId: string
	fromDate: string
	toDate: string
	status?: SlotStatus
}

interface AvailableSlotQueryParams {
	facilityId?: string
	clinicId?: string
	clinicianId?: string
	clinicianStaffId?: string
	date: string
}

interface AppointmentQueryParams {
	facilityId?: string
	clinicId?: string
	clinicianId?: string
	clinicianStaffId?: string
	date?: string
	status?: AppointmentStatus
	patientId?: string
	page?: number
	limit?: number
}

export function useClinicsQuery() {
	const { data: profile } = useMyProfile()

	const clinics =
		profile?.staffProfiles.reduce<ClinicOption[]>((list, staffProfile) => {
			const exists = list.some(clinic => clinic.id === staffProfile.facility.id)
			if (exists) {
				return list
			}

			list.push({
				id: staffProfile.facility.id,
				name: staffProfile.facility.name,
			})
			return list
		}, []) ?? []

	return {
		data: clinics,
		isLoading: !profile,
		isError: false,
		error: null,
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

export function useScheduleTemplatesQuery(params: ScheduleTemplatesQueryParams) {
	return useQuery(
		orpc.scheduling.listClinicTemplates.queryOptions({
			input: {
				facilityId: params.facilityId ?? params.clinicId,
				clinicianStaffId: params.clinicianStaffId ?? params.clinicianId,
				dayOfWeek: params.dayOfWeek,
				isActive: params.isActive,
				page: params.page,
				limit: params.limit,
			},
		})
	)
}

export function useCreateScheduleTemplateMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.scheduling.createClinicTemplate.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: orpc.scheduling.listClinicTemplates.key(),
				}),
		})
	)
}

export function useUpdateScheduleTemplateMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.scheduling.updateClinicTemplate.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: orpc.scheduling.listClinicTemplates.key(),
				}),
		})
	)
}

// Compatibility wrapper until the backend exposes a dedicated delete/deactivate route.
// For now, the UI "delete" action soft-deactivates the template via updateClinicTemplate.
export function useDeleteScheduleTemplateMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) =>
			orpc.scheduling.updateClinicTemplate.call({
				id,
				isActive: false,
			} satisfies UpdateClinicTemplateInput),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: orpc.scheduling.listClinicTemplates.key(),
			}),
	})
}

export function useTemplateSlotsQuery(params: TemplateSlotsQueryParams) {
	return useQuery({
		...orpc.scheduling.listTemplateSlots.queryOptions({
			input: {
				id: params.templateId,
				fromDate: params.fromDate,
				toDate: params.toDate,
				status: params.status,
			} satisfies ListTemplateSlotsQuery,
		}),
		enabled: !!params.templateId && !!params.fromDate && !!params.toDate,
	})
}

export function useTemplateSlotsQueries(params: TemplateSlotsQueryParams[]) {
	return useQueries({
		queries: params.map(queryParams => ({
			...orpc.scheduling.listTemplateSlots.queryOptions({
				input: {
					id: queryParams.templateId,
					fromDate: queryParams.fromDate,
					toDate: queryParams.toDate,
					status: queryParams.status,
				} satisfies ListTemplateSlotsQuery,
			}),
			enabled: !!queryParams.templateId && !!queryParams.fromDate && !!queryParams.toDate,
		})),
	})
}

export function useUpdateSlotMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.scheduling.updateSlot.mutationOptions({
			onMutate: async variables => {
				await queryClient.cancelQueries({
					queryKey: orpc.scheduling.listTemplateSlots.key(),
				})

				const snapshots = queryClient.getQueriesData<ClinicSlot[]>({
					queryKey: orpc.scheduling.listTemplateSlots.key(),
				})

				queryClient.setQueriesData<ClinicSlot[]>(
					{
						queryKey: orpc.scheduling.listTemplateSlots.key(),
					},
					current =>
						current?.map(slot => {
							if (slot.id !== variables.id) {
								return slot
							}

							if (variables.action === "block") {
								return {
									...slot,
									status: "blocked",
									blockReason: variables.reason ?? null,
									updatedAt: new Date(),
								}
							}

							return {
								...slot,
								status: "open",
								blockReason: null,
								updatedAt: new Date(),
							}
						}) ?? current
				)

				return { snapshots }
			},
			onError: (_error, _variables, context) => {
				context?.snapshots.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data)
				})
			},
			onSettled: () =>
				queryClient.invalidateQueries({
					queryKey: orpc.scheduling.listTemplateSlots.key(),
				}),
		})
	)
}

export function useAvailableSlotsQuery(params: AvailableSlotQueryParams, enabled = true) {
	return useQuery({
		...orpc.scheduling.getAvailableSlots.queryOptions({
			input: {
				facilityId: params.facilityId ?? params.clinicId,
				clinicianStaffId: params.clinicianStaffId ?? params.clinicianId,
				date: params.date,
			} satisfies AvailableSlotsQuery,
		}),
		enabled: enabled && !!params.date,
	})
}

export function useAppointmentsQuery(params: AppointmentQueryParams) {
	return useQuery(
		orpc.scheduling.listAppointments.queryOptions({
			input: {
				facilityId: params.facilityId ?? params.clinicId ?? "",
				clinicianStaffId: params.clinicianStaffId ?? params.clinicianId,
				date: params.date,
				status: params.status,
				patientId: params.patientId,
				page: params.page ?? 1,
				limit: params.limit ?? 25,
			} satisfies AppointmentListInput,
			enabled: !!(params.facilityId ?? params.clinicId),
		})
	)
}

export function useBookAppointmentMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.scheduling.createAppointment.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: orpc.scheduling.listAppointments.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: orpc.scheduling.getAvailableSlots.key(),
				})
			},
		})
	)
}

export function useCheckInMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.scheduling.checkInAppointment.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: orpc.scheduling.listAppointments.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: orpc.scheduling.getClinicQueue.key(),
				})
			},
		})
	)
}

export function useUpdateAppointmentStatusMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.scheduling.updateAppointmentStatus.mutationOptions({
			onMutate: async variables => {
				const status = variables.status
				if (!isOptimisticQueueStatus(status)) return undefined

				await queryClient.cancelQueries({
					queryKey: orpc.scheduling.getClinicQueue.key(),
				})

				const queueSnapshots = queryClient.getQueriesData<ClinicQueueResponse>({
					queryKey: orpc.scheduling.getClinicQueue.key(),
				}) as QueueSnapshot

				queryClient.setQueriesData<ClinicQueueResponse>(
					{
						queryKey: orpc.scheduling.getClinicQueue.key(),
					},
					current =>
						updateClinicQueueEntryStatus(
							current,
							entry => entry.appointmentId === variables.id || entry.id === variables.id,
							status
						)
				)

				return { queueSnapshots }
			},
			onError: (_error, _variables, context) => {
				context?.queueSnapshots.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data)
				})
			},
			onSettled: (_data, _error, variables) => {
				void queryClient.invalidateQueries({
					queryKey: orpc.scheduling.listAppointments.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: orpc.scheduling.getAppointment.key({ input: { id: variables.id } }),
				})
				void queryClient.invalidateQueries({
					queryKey: orpc.scheduling.getClinicQueue.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: orpc.scheduling.getAvailableSlots.key(),
				})
			},
		})
	)
}

export function useClinicQueueQuery(
	params: ClinicQueueQuery,
	options?: { refetchInterval?: number | false }
) {
	const hasFilter = !!params.facilityId || !!params.clinicId

	return useQuery({
		...orpc.scheduling.getClinicQueue.queryOptions({
			input: params,
		}),
		enabled: hasFilter && !!params.date,
		refetchInterval: options?.refetchInterval ?? 30_000,
	})
}

export function useUpdateEncounterQueueStatusMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.scheduling.updateEncounterQueueStatus.mutationOptions({
			onMutate: async variables => {
				await queryClient.cancelQueries({
					queryKey: orpc.scheduling.getClinicQueue.key(),
				})

				const queueSnapshots = queryClient.getQueriesData<ClinicQueueResponse>({
					queryKey: orpc.scheduling.getClinicQueue.key(),
				}) as QueueSnapshot

				queryClient.setQueriesData<ClinicQueueResponse>(
					{
						queryKey: orpc.scheduling.getClinicQueue.key(),
					},
					current =>
						updateClinicQueueEntryStatus(
							current,
							entry => entry.encounterId === variables.id || entry.id === variables.id,
							variables.status,
							variables.status === "in_progress"
								? {
										calledByStaffId: variables.calledByStaffId ?? null,
										calledAt: new Date().toISOString(),
									}
								: undefined
						)
				)

				return { queueSnapshots }
			},
			onError: (_error, _variables, context) => {
				context?.queueSnapshots.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data)
				})
			},
			onSettled: () => {
				void queryClient.invalidateQueries({
					queryKey: orpc.scheduling.getClinicQueue.key(),
				})
			},
		})
	)
}

export function useCallNextQueuePatientMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.scheduling.callNextQueuePatient.mutationOptions({
			onSettled: () => {
				void queryClient.invalidateQueries({
					queryKey: orpc.scheduling.getClinicQueue.key(),
				})
			},
		})
	)
}

function isOptimisticQueueStatus(status: string): status is UnifiedQueueEntry["status"] {
	return status === "in_progress" || status === "completed" || status === "no_show"
}

function updateClinicQueueEntryStatus(
	current: ClinicQueueResponse | undefined,
	matches: (entry: UnifiedQueueEntry) => boolean,
	status: UnifiedQueueEntry["status"],
	patch?: Partial<UnifiedQueueEntry>
) {
	if (!current) return current

	let changed = false
	const entries = current.entries.map(entry => {
		if (!matches(entry)) return entry
		changed = true
		return { ...entry, status, ...patch }
	})

	if (!changed) return current

	return {
		...current,
		entries,
		stats: getClinicQueueStats(entries),
	}
}

function getClinicQueueStats(entries: UnifiedQueueEntry[]): ClinicQueueResponse["stats"] {
	return {
		waiting: entries.filter(entry => entry.status === "waiting").length,
		inProgress: entries.filter(entry => entry.status === "in_progress").length,
		completed: entries.filter(entry => entry.status === "completed").length,
		noShow: entries.filter(entry => entry.status === "no_show").length,
		total: entries.length,
	}
}

export type {
	Appointment,
	AvailableSlotsResponse,
	CheckInAppointmentInput,
	ClinicQueueQuery,
	ClinicQueueResponse,
	ClinicSlot,
	ClinicTemplate,
	CreateAppointmentInput,
	CreateClinicTemplateInput,
	ListTemplateSlotsQuery,
	TimeSlot,
	UnifiedQueueEntry,
	UpdateAppointmentStatusInput,
	UpdateClinicTemplateInput,
	UpdateEncounterQueueStatusInput,
	UpdateEncounterQueueStatusResponse,
	UpdateSlotInput,
}

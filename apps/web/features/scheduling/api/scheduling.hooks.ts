"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

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

export function useAvailableSlotsQuery(
	params: AvailableSlotQueryParams,
	enabled = true
) {
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
				page: params.page,
				limit: params.limit,
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
			onSuccess: data => {
				void queryClient.invalidateQueries({
					queryKey: orpc.scheduling.listAppointments.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: orpc.scheduling.getAppointment.key({ input: { id: data.id } }),
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
	options?: { refetchInterval?: number }
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
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: orpc.scheduling.getClinicQueue.key(),
				}),
		})
	)
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

"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

// ============================================================================
// Search
// ============================================================================

interface PatientSearchParams {
	facilityId: string
	search?: string
	mrn?: string
	dateOfBirth?: string
	philhealthMemberId?: string
	isActive?: boolean
	page?: number
	limit?: number
}

export function usePatientSearchQuery(
	params: PatientSearchParams,
	options?: { enabled?: boolean }
) {
	return useQuery(
		orpc.patient.search.queryOptions({
			input: {
				facilityId: params.facilityId,
				search: params.search,
				mrn: params.mrn,
				dateOfBirth: params.dateOfBirth,
				philhealthMemberId: params.philhealthMemberId,
				isActive: params.isActive,
				page: params.page ?? 1,
				limit: params.limit ?? 50,
			},
			enabled: options?.enabled ?? !!params.facilityId,
			staleTime: 30 * 1000,
		})
	)
}

// ============================================================================
// Get by ID (profile with encounters)
// ============================================================================

export function usePatientProfileQuery(patientId: string) {
	return useQuery(
		orpc.patient.get.queryOptions({
			input: { id: patientId },
			enabled: !!patientId,
		})
	)
}

// ============================================================================
// Create
// ============================================================================

export function useCreatePatientMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.patient.create.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: orpc.patient.key(),
				}),
		})
	)
}

// ============================================================================
// Update
// ============================================================================

export function useUpdatePatientMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.patient.update.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: orpc.patient.key(),
				}),
		})
	)
}

// ============================================================================
// Register with OPD Encounter (PS-034 — atomic patient + encounter creation)
// ============================================================================

export function useRegisterPatientWithOpdEncounterMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.patient.registerWithOpdEncounter.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: orpc.patient.key(),
				}),
		})
	)
}

// ============================================================================
// List Clinicians — registrar-accessible (PS-047), replaces admin-only listStaff
// ============================================================================

export function useListCliniciansQuery(facilityId: string | undefined) {
	return useQuery(
		orpc.patient.listClinicians.queryOptions({
			input: { facilityId: facilityId ?? "" },
			enabled: !!facilityId,
			staleTime: 60 * 1000,
		})
	)
}

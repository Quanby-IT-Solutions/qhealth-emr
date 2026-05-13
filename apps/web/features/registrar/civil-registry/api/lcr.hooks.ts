"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useListBirthRegistrationsQuery(
	params: { facilityId: string; patientId?: string; encounterId?: string; status?: "draft" | "completed" | "submitted"; page?: number; limit?: number },
	options?: { enabled?: boolean }
) {
	return useQuery(
		orpc.civilRegistry.listBirthRegistrations.queryOptions({
			input: { ...params, page: params.page ?? 1, limit: params.limit ?? 50 },
			enabled: (options?.enabled ?? true) && !!params.facilityId,
			staleTime: 30_000,
		})
	)
}

export function useCreateBirthRegistrationMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.civilRegistry.createBirthRegistration.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.civilRegistry.key() }),
		})
	)
}

export function useUpdateBirthRegistrationMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.civilRegistry.updateBirthRegistration.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.civilRegistry.key() }),
		})
	)
}

export function useMarkBirthRegistrationPaidMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.civilRegistry.markBirthRegistrationPaid.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.civilRegistry.key() }),
		})
	)
}

export function useMarkBirthRegistrationReleasedMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.civilRegistry.markBirthRegistrationReleased.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.civilRegistry.key() }),
		})
	)
}

export function useMarkDeathReportPaidMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.deathReporting.markDeathReportPaid.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.deathReporting.key() }),
		})
	)
}

export function useMarkDeathReportReleasedMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.deathReporting.markDeathReportReleased.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.deathReporting.key() }),
		})
	)
}

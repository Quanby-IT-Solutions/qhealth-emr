"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useWardsQuery(facilityId: string) {
	return useQuery(
		orpc.bed.listWards.queryOptions({
			input: { facilityId },
			enabled: !!facilityId,
			staleTime: 60_000,
		})
	)
}

export function useBedListQuery(
	params: { facilityId: string; wardId?: string; status?: "available" | "occupied" | "out_of_service" },
	options?: { enabled?: boolean }
) {
	return useQuery(
		orpc.bed.listBeds.queryOptions({
			input: params,
			enabled: (options?.enabled ?? true) && !!params.facilityId,
		})
	)
}

export function useCreateWardMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.bed.createWard.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.bed.key() }),
		})
	)
}

export function useCreateBedMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.bed.createBed.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.bed.key() }),
		})
	)
}

export function useUpdateBedStatusMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.bed.updateBedStatus.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.bed.key() }),
		})
	)
}

export function useBedCensusQuery(
	params: { facilityId: string; date?: string },
	options?: { enabled?: boolean }
) {
	return useQuery(
		orpc.bed.census.queryOptions({
			input: params,
			enabled: (options?.enabled ?? true) && !!params.facilityId,
		})
	)
}

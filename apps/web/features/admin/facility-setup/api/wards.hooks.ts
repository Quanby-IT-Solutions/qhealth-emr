"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useListWardsQuery(facilityId: string, enabled = true) {
	return useQuery(
		orpc.bed.listWards.queryOptions({
			input: { facilityId },
			enabled: enabled && !!facilityId,
			staleTime: 60 * 1000,
		})
	)
}

export function useListBedsQuery(facilityId: string, enabled = true) {
	return useQuery(
		orpc.bed.listBeds.queryOptions({
			input: { facilityId },
			enabled: enabled && !!facilityId,
			staleTime: 60 * 1000,
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

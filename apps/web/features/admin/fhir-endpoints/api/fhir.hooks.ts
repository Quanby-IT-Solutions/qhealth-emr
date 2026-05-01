"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useListFhirEndpointsQuery(facilityId: string, enabled = true) {
	return useQuery(
		orpc.fhirEndpoints.list.queryOptions({
			input: { facilityId },
			enabled: enabled && !!facilityId,
			staleTime: 30_000,
		})
	)
}

export function useGetFhirEndpointQuery(id: string, enabled = true) {
	return useQuery(
		orpc.fhirEndpoints.get.queryOptions({
			input: { id },
			enabled: enabled && !!id,
			staleTime: 30_000,
		})
	)
}

export function useUpsertFhirEndpointMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.fhirEndpoints.upsert.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.fhirEndpoints.key() }),
		})
	)
}

export function useDeleteFhirEndpointMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.fhirEndpoints.delete.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.fhirEndpoints.key() }),
		})
	)
}

export function useTestFhirConnectionMutation() {
	return useMutation(orpc.fhirEndpoints.testConnection.mutationOptions({}))
}

export function useListExchangeLogQuery(
	params: { facilityId: string; endpointId?: string; page?: number },
	enabled = true
) {
	return useQuery(
		orpc.fhirEndpoints.listExchangeLog.queryOptions({
			input: {
				facilityId: params.facilityId,
				endpointId: params.endpointId,
				page: params.page ?? 1,
				limit: 20,
			},
			enabled: enabled && !!params.facilityId,
			staleTime: 30_000,
		})
	)
}

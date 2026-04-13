"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useEncounterListQuery(
	params: {
		facilityId: string
		patientId: string
		status?: "active" | "discharged" | "closed" | "cancelled"
		page?: number
		limit?: number
	},
	options?: { enabled?: boolean }
) {
	return useQuery(
		orpc.encounter.list.queryOptions({
			input: params,
			enabled: (options?.enabled ?? true) && !!params.facilityId,
			staleTime: 30_000,
		})
	)
}

export function useEncounterDetailQuery(encounterId: string, options?: { enabled?: boolean }) {
	return useQuery(
		orpc.encounter.get.queryOptions({
			input: { id: encounterId },
			enabled: (options?.enabled ?? true) && !!encounterId,
		})
	)
}

export function useCreateEncounterMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.encounter.create.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.encounter.key() }),
		})
	)
}

export function useTransferEncounterMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.encounter.transfer.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.encounter.key() }),
		})
	)
}

export function useDischargeEncounterMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.encounter.discharge.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.encounter.key() }),
		})
	)
}

export function useCloseEncounterMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.encounter.close.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.encounter.key() }),
		})
	)
}

export function useDischargeChecklistQuery(encounterId: string, options?: { enabled?: boolean }) {
	return useQuery(
		orpc.encounter.checklist.queryOptions({
			input: { id: encounterId },
			enabled: (options?.enabled ?? true) && !!encounterId,
		})
	)
}

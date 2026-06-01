"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useClearanceStatusQuery(encounterId: string, options?: { enabled?: boolean }) {
	return useQuery(
		orpc.discharge.getClearanceStatus.queryOptions({
			input: { encounterId },
			enabled: (options?.enabled ?? true) && !!encounterId,
			refetchInterval: 15_000,
		})
	)
}

export function useConfirmPharmacyClearanceMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.discharge.confirmPharmacyClearance.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.discharge.key() }),
		})
	)
}

export function useConfirmNursingClearanceMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.discharge.confirmNursingClearance.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.discharge.key() }),
		})
	)
}

export function useConfirmBillingSignOffMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.discharge.confirmBillingSignOff.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.discharge.key() }),
		})
	)
}

export function useIssueGatePassMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.discharge.issueGatePass.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({ queryKey: orpc.discharge.key() })
				void queryClient.invalidateQueries({ queryKey: orpc.encounter.key() })
			},
		})
	)
}

export function useGatePassQuery(encounterId: string, options?: { enabled?: boolean }) {
	return useQuery(
		orpc.discharge.getGatePass.queryOptions({
			input: { encounterId },
			enabled: (options?.enabled ?? true) && !!encounterId,
		})
	)
}

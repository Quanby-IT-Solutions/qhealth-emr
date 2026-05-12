"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { billingOrpc } from "@/services/orpc/client"

export function useCf4Query(id: string) {
	return useQuery(
		billingOrpc.getCf4.queryOptions({
			input: { id },
			enabled: !!id,
			refetchInterval: 60_000,
		})
	)
}

export function useCf4XmlQuery(id: string) {
	return useQuery(
		billingOrpc.previewCf4Xml.queryOptions({
			input: { id },
			enabled: !!id,
		})
	)
}

export function usePollCf4StatusMutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.pollCf4Status.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: billingOrpc.getCf4.key() }),
		})
	)
}

export function useGenerateCf4Mutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.generateCf4.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: billingOrpc.getCf4.key() }),
		})
	)
}

export function useFinalizeCf4Mutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.finalizeCf4.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: billingOrpc.getCf4.key() }),
		})
	)
}

export function useResubmitCf4Mutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.resubmitCf4.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: billingOrpc.getCf4.key() }),
		})
	)
}

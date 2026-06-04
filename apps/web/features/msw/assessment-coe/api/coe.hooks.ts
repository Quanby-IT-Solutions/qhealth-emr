"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { mswOrpc } from "@/services/orpc/client"

export function useCoeListQuery(input: {
	evaluationId?: string
	encounterId?: string
	patientId?: string
}) {
	return useQuery(
		mswOrpc.coe.list.queryOptions({
			input,
			enabled: !!(input.evaluationId ?? input.encounterId ?? input.patientId),
		})
	)
}

export function useCoeGetQuery(id: string) {
	return useQuery(
		mswOrpc.coe.get.queryOptions({
			input: { id },
			enabled: !!id,
		})
	)
}

export function useIssueCoeV2Mutation() {
	const qc = useQueryClient()
	return useMutation(
		mswOrpc.coe.issue.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: mswOrpc.coe.list.key() }),
		})
	)
}

export function useRevokeCoeMutation() {
	const qc = useQueryClient()
	return useMutation(
		mswOrpc.coe.revoke.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: mswOrpc.coe.list.key() }),
		})
	)
}

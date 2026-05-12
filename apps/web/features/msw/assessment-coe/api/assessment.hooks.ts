"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { mswOrpc } from "@/services/orpc/client"

export function useMswEvaluationQuery(encounterId: string) {
	return useQuery(
		mswOrpc.getByEncounter.queryOptions({
			input: { encounterId },
			enabled: !!encounterId,
		})
	)
}

export function useMswEvaluationListQuery(input: {
	facilityId?: string
	status?: "pending" | "in_progress" | "completed" | "cancelled"
	page?: number
	limit?: number
}) {
	return useQuery(
		mswOrpc.list.queryOptions({
			input: { ...input, page: input.page ?? 1, limit: input.limit ?? 25 },
		})
	)
}

export function useCreateMswEvaluationMutation() {
	const qc = useQueryClient()
	return useMutation(
		mswOrpc.create.mutationOptions({
			onSuccess: () =>
				qc.invalidateQueries({ queryKey: mswOrpc.list.key() }),
		})
	)
}

export function useUpdateMswEvaluationMutation() {
	const qc = useQueryClient()
	return useMutation(
		mswOrpc.update.mutationOptions({
			onSuccess: () =>
				qc.invalidateQueries({ queryKey: mswOrpc.list.key() }),
		})
	)
}

export function useUpsertAssessmentMutation() {
	const qc = useQueryClient()
	return useMutation(
		mswOrpc.assessments.upsert.mutationOptions({
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: mswOrpc.getByEncounter.key() })
				qc.invalidateQueries({ queryKey: mswOrpc.list.key() })
			},
		})
	)
}

export function useTagBenefitsMutation() {
	const qc = useQueryClient()
	return useMutation(
		mswOrpc.tagBenefits.mutationOptions({
			onSuccess: () =>
				qc.invalidateQueries({ queryKey: mswOrpc.getByEncounter.key() }),
		})
	)
}

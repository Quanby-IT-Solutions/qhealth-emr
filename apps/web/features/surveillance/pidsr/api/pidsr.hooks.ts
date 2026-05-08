"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { reportingOrpc } from "@/services/orpc/client"

export function useSurveillanceFlagsQuery(input: {
	facilityId: string
	page?: number
	limit?: number
	isReviewed?: boolean
	category?: "category_1" | "category_2"
}) {
	return useQuery(
		reportingOrpc.listSurveillanceFlags.queryOptions({
			input: { page: 1, limit: 50, ...input },
		})
	)
}

export function useReviewFlagMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		reportingOrpc.reviewSurveillanceFlag.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: reportingOrpc.listSurveillanceFlags.key(),
				}),
		})
	)
}

export function usePidsrCasesQuery(input: {
	facilityId: string
	page?: number
	limit?: number
	reportStatus?: "draft" | "submitted" | "rejected" | "blocked"
	category?: "category_1" | "category_2"
}) {
	return useQuery(
		reportingOrpc.listPidsrCases.queryOptions({
			input: { page: 1, limit: 50, ...input },
		})
	)
}

export function usePidsrCaseQuery(id: string) {
	return useQuery(
		reportingOrpc.getPidsrCase.queryOptions({
			input: { id },
			enabled: !!id,
		})
	)
}

export function useSubmitPidsrCaseMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		reportingOrpc.submitPidsrCase.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: reportingOrpc.listPidsrCases.key(),
				}),
		})
	)
}

export function useDismissPidsrCaseMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		reportingOrpc.dismissPidsrCase.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: reportingOrpc.listPidsrCases.key(),
				}),
		})
	)
}

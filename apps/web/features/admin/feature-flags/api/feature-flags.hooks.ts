"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useFeatureFlagsListQuery() {
	return useQuery(
		orpc.featureFlags.list.queryOptions({
			staleTime: 30_000,
		})
	)
}

export function useFeatureFlagDetailQuery(id: string, enabled = true) {
	return useQuery(
		orpc.featureFlags.get.queryOptions({
			input: { id },
			enabled: enabled && !!id,
			staleTime: 30_000,
		})
	)
}

export function useFeatureFlagHistoryQuery(flagId: string, page = 1, enabled = true) {
	return useQuery(
		orpc.featureFlags.history.queryOptions({
			input: { flagId, page, limit: 20 },
			enabled: enabled && !!flagId,
			staleTime: 60_000,
		})
	)
}

export function useEvaluateFeatureFlagQuery(key: string, enabled = true) {
	return useQuery(
		orpc.featureFlags.evaluate.queryOptions({
			input: { key },
			enabled: enabled && !!key,
			staleTime: 30_000,
		})
	)
}

export function useCreateFeatureFlagMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.featureFlags.create.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.featureFlags.list.key() }),
		})
	)
}

export function useUpdateFeatureFlagMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.featureFlags.update.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.featureFlags.list.key() }),
		})
	)
}

export function useUpdateFeatureFlagTargetingMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.featureFlags.updateTargeting.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.featureFlags.list.key() }),
		})
	)
}

export function useDeleteFeatureFlagMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.featureFlags.delete.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.featureFlags.list.key() }),
		})
	)
}

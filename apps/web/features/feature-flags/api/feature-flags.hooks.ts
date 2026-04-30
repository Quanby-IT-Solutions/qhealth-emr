"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

// ── List all flags ────────────────────────────────────────────────────────────

export function useFeatureFlagsListQuery() {
	return useQuery(
		orpc.featureFlags.list.queryOptions({
			staleTime: 30 * 1000,
		})
	)
}

// ── Single flag detail ────────────────────────────────────────────────────────

export function useFeatureFlagDetailQuery(id: string) {
	return useQuery(
		orpc.featureFlags.get.queryOptions({
			input: { id },
			staleTime: 30 * 1000,
			enabled: !!id,
		})
	)
}

// ── Create ────────────────────────────────────────────────────────────────────

export function useCreateFeatureFlagMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.featureFlags.create.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.featureFlags.key() }),
		})
	)
}

// ── Update definition ─────────────────────────────────────────────────────────

export function useUpdateFeatureFlagMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.featureFlags.update.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.featureFlags.key() }),
		})
	)
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function useDeleteFeatureFlagMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.featureFlags.delete.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.featureFlags.key() }),
		})
	)
}

// ── Update targeting ──────────────────────────────────────────────────────────

export function useUpdateFeatureFlagTargetingMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.featureFlags.updateTargeting.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.featureFlags.key() }),
		})
	)
}

// ── Resolve all flags for current session ─────────────────────────────────────

/**
 * Bulk-resolve all feature flags for the logged-in user's active facility/role.
 * Use this for feature gating across the UI. Refetches on window focus.
 */
export function useResolvedFlagsQuery() {
	return useQuery(
		orpc.featureFlags.resolveForSession.queryOptions({
			staleTime: 60 * 1000,
			refetchOnWindowFocus: true,
		})
	)
}

// ── Evaluate single flag ──────────────────────────────────────────────────────

/**
 * Evaluate a single flag by key. Use for critical paths where a cache miss
 * must be authoritative (e.g. before enabling a high-risk operation).
 */
export function useEvaluateFlagQuery(key: string) {
	return useQuery(
		orpc.featureFlags.evaluate.queryOptions({
			input: { key },
			staleTime: 30 * 1000,
			enabled: !!key,
		})
	)
}

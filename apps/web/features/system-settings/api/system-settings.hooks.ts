"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useSystemSettingsQuery() {
	return useQuery(
		orpc.systemSettings.get.queryOptions({
			staleTime: 30_000,
		})
	)
}

export function useUpdateSystemSettingsMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.systemSettings.update.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: orpc.systemSettings.key(),
				}),
		})
	)
}

/**
 * Manually trigger an offline cache preparation job for the active facility.
 * On success, invalidates the admin dashboard query so the offline readiness
 * section reflects the new job record immediately.
 */
export function useTriggerOfflineCacheJobMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.systemSettings.triggerCacheJob.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: orpc.adminDashboard.key(),
				}),
		})
	)
}

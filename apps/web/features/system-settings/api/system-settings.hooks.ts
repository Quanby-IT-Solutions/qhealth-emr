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

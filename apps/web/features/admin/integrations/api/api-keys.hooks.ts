"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useListApiKeysQuery(integrationId: string, enabled = true) {
	return useQuery(
		orpc.integrationRegistry.listApiKeys.queryOptions({
			input: { integrationId },
			enabled: enabled && !!integrationId,
			staleTime: 30 * 1000,
		})
	)
}

export function useGenerateApiKeyMutation(integrationId: string) {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.integrationRegistry.generateApiKey.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: orpc.integrationRegistry.listApiKeys.key(),
				}),
		})
	)
}

export function useRevokeApiKeyMutation(integrationId: string) {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.integrationRegistry.revokeApiKey.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: orpc.integrationRegistry.listApiKeys.key(),
				}),
		})
	)
}

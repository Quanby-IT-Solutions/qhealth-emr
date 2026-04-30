"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useIntegrationsListQuery() {
	return useQuery(orpc.integrationRegistry.list.queryOptions())
}

export function useIntegrationDetailQuery(integrationId: string) {
	return useQuery(orpc.integrationRegistry.get.queryOptions({ input: { id: integrationId } }))
}

export function useCredentialRefsQuery() {
	return useQuery(
		orpc.integrationRegistry.listCredentialRefs.queryOptions({ staleTime: 5 * 60 * 1000 })
	)
}

export function useCreateIntegrationMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.integrationRegistry.create.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: orpc.integrationRegistry.key(),
				}),
		})
	)
}

export function useUpdateIntegrationMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.integrationRegistry.update.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: orpc.integrationRegistry.key(),
				}),
		})
	)
}

export function useDeleteIntegrationMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.integrationRegistry.delete.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: orpc.integrationRegistry.key(),
				}),
		})
	)
}

export function useTestConnectivityMutation() {
	return useMutation(orpc.integrationRegistry.testConnectivity.mutationOptions())
}

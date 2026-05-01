"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useListCatalogsQuery(facilityId: string, enabled = true) {
	return useQuery(
		orpc.masterData.listCatalogs.queryOptions({
			input: { facilityId },
			enabled: enabled && !!facilityId,
			staleTime: 60_000,
		})
	)
}

export function useListItemsQuery(
	params: { catalogId: string; search?: string; page?: number },
	enabled = true
) {
	return useQuery(
		orpc.masterData.listItems.queryOptions({
			input: {
				catalogId: params.catalogId,
				search: params.search,
				page: params.page ?? 1,
				limit: 50,
			},
			enabled: enabled && !!params.catalogId,
			staleTime: 30_000,
		})
	)
}

export function useUpsertItemMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.masterData.upsertItem.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.masterData.key() }),
		})
	)
}

export function useDeprecateItemMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.masterData.deprecateItem.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.masterData.key() }),
		})
	)
}

export function useImportItemsMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.masterData.importItems.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.masterData.key() }),
		})
	)
}

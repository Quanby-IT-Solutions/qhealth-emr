"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useListCodeSystemsQuery() {
	return useQuery(orpc.terminology.listSystems.queryOptions({ staleTime: 5 * 60_000 }))
}

export function useSearchCodesQuery(
	params: { codeSystemId: string; query: string; page?: number },
	enabled = true
) {
	return useQuery(
		orpc.terminology.searchCodes.queryOptions({
			input: {
				codeSystemId: params.codeSystemId,
				query: params.query,
				page: params.page ?? 1,
				limit: 50,
			},
			enabled: enabled && !!params.codeSystemId && params.query.length >= 1,
			staleTime: 30_000,
		})
	)
}

export function useDeprecateCodeMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.terminology.deprecate.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.terminology.key() }),
		})
	)
}

export function useImportCodesMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.terminology.import.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.terminology.key() }),
		})
	)
}

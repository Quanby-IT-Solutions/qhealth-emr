"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useListDepartmentsQuery(facilityId: string, enabled = true) {
	return useQuery(
		orpc.departments.list.queryOptions({
			input: { facilityId },
			enabled: enabled && !!facilityId,
			staleTime: 60 * 1000,
		})
	)
}

export function useUpsertDepartmentMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.departments.upsert.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.departments.key() }),
		})
	)
}

export function useDeleteDepartmentMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.departments.delete.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.departments.key() }),
		})
	)
}

"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useMyProfile() {
	return useQuery(orpc.rbac.me.queryOptions({ staleTime: 5 * 60 * 1000 }))
}

export function useSwitchRoleMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.rbac.switchRole.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.rbac.me.key() }),
		})
	)
}

"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authClient } from "@/services/better-auth/auth-client"
import { orpc } from "@/services/orpc/client"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { sessionKeys } from "@/features/auth/api/session.hooks"

type UpdateOwnAccountInput = {
	name: string
}

export function useUpdateOwnAccountMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ name }: UpdateOwnAccountInput) => {
			const result = await authClient.updateUser({ name })
			if (result.error) {
				throw new Error(result.error.message || "Failed to update account settings")
			}
			return result.data
		},
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
				queryClient.invalidateQueries({ queryKey: orpc.rbac.me.key() }),
			])
		},
	})
}

export function useMyAccountProfile() {
	return useMyProfile()
}

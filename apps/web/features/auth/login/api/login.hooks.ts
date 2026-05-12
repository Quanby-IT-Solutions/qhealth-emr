"use client"

import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authClient } from "@/services/better-auth/auth-client"
import { sessionKeys } from "@/features/auth/api/session.hooks"

import type { Login } from "./login.schema"

export function useLoginMutation() {
	const router = useRouter()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (data: Login) => {
			const result = await authClient.signIn.email(data)
			if (result.error) {
				throw new Error(result.error.message || "Failed to sign in")
			}
			return result
		},
		onSuccess: () => {
			// Clear entire cache — switching users invalidates all user-specific data.
			// invalidateQueries only marks stale; the stale cache is still served until
			// the background refetch completes, causing the previous user to flash.
			queryClient.clear()
			router.push("/dashboard")
			router.refresh()
		},
	})
}

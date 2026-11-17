"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useMyLicensesQuery(enabled = true) {
	return useQuery(
		orpc.clinicianLicenses.getMine.queryOptions({
			enabled,
			staleTime: 30 * 1000,
		})
	)
}

export function useAddMyLicenseMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.clinicianLicenses.addMine.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({ queryKey: orpc.clinicianLicenses.getMine.key() })
				void queryClient.invalidateQueries({ queryKey: orpc.rbac.me.key() })
			},
		})
	)
}

export function useUpdateMyLicenseMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.clinicianLicenses.updateMine.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({ queryKey: orpc.clinicianLicenses.getMine.key() })
				void queryClient.invalidateQueries({ queryKey: orpc.rbac.me.key() })
			},
		})
	)
}

export function useVerifyMyLicenseMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.clinicianLicenses.verifyMine.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({ queryKey: orpc.clinicianLicenses.getMine.key() })
				void queryClient.invalidateQueries({ queryKey: orpc.rbac.me.key() })
			},
		})
	)
}

export function useDeleteMyLicenseMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.clinicianLicenses.deleteMine.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({ queryKey: orpc.clinicianLicenses.getMine.key() })
				void queryClient.invalidateQueries({ queryKey: orpc.rbac.me.key() })
			},
		})
	)
}

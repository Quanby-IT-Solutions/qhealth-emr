"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useListCliniciansQuery(params: {
	facilityId?: string
	search?: string
	status?: "pending" | "verified" | "expired"
	page?: number
	limit?: number
}) {
	return useQuery(
		orpc.clinicianLicenses.list.queryOptions({
			input: {
				facilityId: params.facilityId,
				search: params.search,
				status: params.status,
				page: params.page ?? 1,
				limit: params.limit ?? 20,
			},
			staleTime: 30 * 1000,
		})
	)
}

export function useGetClinicianLicensesQuery(staffProfileId: string, enabled = true) {
	return useQuery(
		orpc.clinicianLicenses.get.queryOptions({
			input: { staffProfileId },
			enabled,
			staleTime: 30 * 1000,
		})
	)
}

export function useAddLicenseMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.clinicianLicenses.add.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.clinicianLicenses.key() }),
		})
	)
}

export function useVerifyLicenseMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.clinicianLicenses.verify.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.clinicianLicenses.key() }),
		})
	)
}

export function useMarkPendingMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.clinicianLicenses.markPending.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.clinicianLicenses.key() }),
		})
	)
}

export function useDeleteLicenseMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.clinicianLicenses.delete.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.clinicianLicenses.key() }),
		})
	)
}

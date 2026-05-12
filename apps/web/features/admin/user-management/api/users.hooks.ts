"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useListStaffQuery(params: {
	facilityId?: string
	search?: string
	isActive?: boolean
	page?: number
	limit?: number
}) {
	return useQuery(
		orpc.rbac.listStaff.queryOptions({
			input: {
				facilityId: params.facilityId,
				search: params.search,
				isActive: params.isActive,
				page: params.page ?? 1,
				limit: params.limit ?? 20,
			},
			enabled: true,
			staleTime: 30_000,
		})
	)
}

export function useListRolesQuery(facilityId: string) {
	return useQuery(
		orpc.rbac.listRoles.queryOptions({
			input: { facilityId },
			enabled: !!facilityId,
			staleTime: 60_000,
		})
	)
}

export function useGetRoleQuery(id: string, enabled = true) {
	return useQuery(
		orpc.rbac.getRole.queryOptions({
			input: { id },
			enabled: enabled && !!id,
			staleTime: 60_000,
		})
	)
}

export function useListPermissionsQuery() {
	return useQuery(
		orpc.rbac.listPermissions.queryOptions({
			staleTime: 5 * 60_000,
		})
	)
}

export function useCreateStaffMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.rbac.createStaff.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.rbac.listStaff.key() }),
		})
	)
}

export function useAssignUserRolesMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.rbac.assignUserRoles.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.rbac.listStaff.key() }),
		})
	)
}

export function useResendActivationMutation() {
	return useMutation(orpc.rbac.resendActivation.mutationOptions({}))
}

export function useResetPasswordMutation() {
	return useMutation(orpc.rbac.resetPassword.mutationOptions({}))
}

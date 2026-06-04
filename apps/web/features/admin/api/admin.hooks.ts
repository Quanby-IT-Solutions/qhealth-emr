"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

// ── Staff / Users ────────────────────────────────────────────────────────────

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
			staleTime: 30 * 1000,
		})
	)
}

export function useGetStaffUserQuery(userId: string) {
	return useQuery(
		orpc.rbac.getStaffUser.queryOptions({
			input: { id: userId },
			staleTime: 60 * 1000,
			enabled: !!userId,
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

export function useUpdateStaffMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.rbac.updateStaff.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.rbac.listStaff.key() }),
		})
	)
}

export function useDeactivateStaffMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.rbac.deactivateStaff.mutationOptions({
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

export function useResetPasswordMutation() {
	return useMutation(orpc.rbac.resetPassword.mutationOptions())
}

export function useGetLicenseStatusQuery(staffProfileId: string) {
	return useQuery(
		orpc.rbac.getLicenseStatus.queryOptions({
			input: { id: staffProfileId },
			staleTime: 60 * 1000,
			enabled: !!staffProfileId,
		})
	)
}

// ── Roles ────────────────────────────────────────────────────────────────────

export function useListRolesQuery(facilityId: string) {
	return useQuery(
		orpc.rbac.listRoles.queryOptions({
			input: { facilityId },
			staleTime: 60 * 1000,
			enabled: !!facilityId,
		})
	)
}

export function useCreateRoleMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.rbac.createRole.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.rbac.listRoles.key() }),
		})
	)
}

export function useUpdateRoleMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.rbac.updateRole.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.rbac.listRoles.key() }),
		})
	)
}

export function useUpdateRolePermissionsMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.rbac.updateRolePermissions.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.rbac.listRoles.key() }),
		})
	)
}

export function useArchiveRoleMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.rbac.archiveRole.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.rbac.listRoles.key() }),
		})
	)
}

// ── Access Governance ────────────────────────────────────────────────────────

export function useCreateUserMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.rbac.createUser.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.rbac.listStaff.key() }),
		})
	)
}

export function useReEnableUserMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.rbac.reEnableUser.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.rbac.listStaff.key() }),
		})
	)
}

export function useAddStaffFacilityMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.rbac.addStaffFacility.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.rbac.listStaff.key() }),
		})
	)
}

export function useRemoveStaffFacilityMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.rbac.removeStaffFacility.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.rbac.listStaff.key() }),
		})
	)
}

export function useAddUserRoleMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.rbac.addUserRole.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.rbac.listStaff.key() }),
		})
	)
}

export function useRemoveUserRoleMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.rbac.removeUserRole.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.rbac.listStaff.key() }),
		})
	)
}

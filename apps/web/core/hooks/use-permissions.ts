"use client"

import { useMemo } from "react"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

type Permission = {
	module: string
	action: string
}

export function usePermissions() {
	const { data: profile, isLoading } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []

	const permissionSet = useMemo(
		() =>
			new Set(
				permissions.map((permission: Permission) => `${permission.module}:${permission.action}`)
			),
		[permissions]
	)

	function can(module: string, action: string) {
		return permissionSet.has(`${module}:${action}`)
	}

	return {
		isLoading,
		permissions,
		can,
		canViewTelemedicine: can("telemedicine", "view"),
		canCreateTelemedicine: can("telemedicine", "create"),
		canEditTelemedicine: can("telemedicine", "edit"),
		canSignPrescriptions: can("telemedicine", "sign"),
		canViewScheduling: can("scheduling", "view"),
		canCreateScheduling: can("scheduling", "create"),
		canEditScheduling: can("scheduling", "edit"),
	}
}

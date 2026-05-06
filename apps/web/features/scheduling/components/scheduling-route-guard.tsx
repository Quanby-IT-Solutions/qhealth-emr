"use client"

import type { ReactNode } from "react"

import { UnauthorizedPanel } from "@/core/components/unauthorized-panel"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

import { SchedulingShell } from "./scheduling-shell"

export function SchedulingRouteGuard({ children }: { children: ReactNode }) {
	const { data: profile, isLoading } = useMyProfile()
	const permSet = new Set(
		profile?.activeRole?.permissions.map(p => `${p.module}:${p.action}`) ?? []
	)
	const canView = permSet.has("scheduling:view")

	if (isLoading) {
		return null
	}

	if (!canView) {
		return (
			<UnauthorizedPanel
				title="Scheduling access required"
				description="Your current role does not include scheduling:view."
			/>
		)
	}

	return <SchedulingShell roleName={profile?.activeRole?.name}>{children}</SchedulingShell>
}

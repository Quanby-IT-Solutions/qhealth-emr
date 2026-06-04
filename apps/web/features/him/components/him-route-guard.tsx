"use client"

import type { ReactNode } from "react"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { HimShell } from "@/features/him/components/him-shell"
import { hasHimAccess } from "@/features/him/lib/him-permissions"

export function HimRouteGuard({ children }: { children: ReactNode }) {
	const { data: profile, isLoading } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	const roleName = profile?.activeRole?.name ?? ""
	const allowed = hasHimAccess(permissions)

	if (isLoading) {
		return null
	}

	if (!allowed) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access HIM operations.
			</div>
		)
	}

	return <HimShell roleName={roleName}>{children}</HimShell>
}

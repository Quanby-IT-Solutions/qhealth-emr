"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { EdDashboard } from "@/features/ed/components/ed-dashboard"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(
		permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
	)
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function EdPage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "ed", "view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access the emergency department module.
			</div>
		)
	}

	return <EdDashboard />
}

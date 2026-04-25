"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { PermissionMatrix } from "@/features/admin/components/permission-matrix"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function AdminRolesPage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "admin", "view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access role configuration.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Role & Permission Configuration</h1>
				<p className="text-muted-foreground text-sm">
					Configure permission matrices for each role in your facility
				</p>
			</div>
			<PermissionMatrix />
		</div>
	)
}

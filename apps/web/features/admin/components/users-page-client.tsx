"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { UsersTable } from "./users-table"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

export function UsersPageClient() {
	const permSet = usePermissionSet()

	if (!permSet.has("admin:view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access user management.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">User Management</h1>
				<p className="text-muted-foreground text-sm">
					Create, search, and manage staff accounts and profiles
				</p>
			</div>
			<UsersTable />
		</div>
	)
}

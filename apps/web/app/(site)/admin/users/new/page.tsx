"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { CreateUserForm } from "@/features/admin/components/create-user-form"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function NewUserPage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "admin", "create")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to create users.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Create New User</h1>
				<p className="text-muted-foreground text-sm">
					Add a new staff member with facility memberships and role assignments
				</p>
			</div>
			<CreateUserForm />
		</div>
	)
}

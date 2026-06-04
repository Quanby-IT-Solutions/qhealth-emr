"use client"

import { useParams } from "next/navigation"

import { UserDetail } from "@/features/admin/components/user-detail"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

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

export default function AdminUserDetailPage() {
	const params = useParams<{ userId: string }>()
	const userId = params.userId
	const permSet = usePermissionSet()

	if (!can(permSet, "admin", "view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access user management.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">User Detail</h1>
				<p className="text-muted-foreground text-sm">
					View and manage this user's profile, licenses, and access
				</p>
			</div>
			<UserDetail userId={userId} />
		</div>
	)
}

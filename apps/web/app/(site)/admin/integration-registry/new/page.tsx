"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { IntegrationCreate } from "@/features/integration-registry/components/integration-create"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function NewIntegrationPage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "admin", "view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access integration registry management.
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Add integration</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Register a new external system integration.
				</p>
			</div>
			<IntegrationCreate />
		</div>
	)
}

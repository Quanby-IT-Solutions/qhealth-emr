"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

import { FeatureFlagsPanel } from "./feature-flags-panel"

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

export function FeatureFlagsPageClient() {
	const permSet = usePermissionSet()

	if (!can(permSet, "admin", "view") || !can(permSet, "feature_flags", "view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access feature flags.
			</div>
		)
	}

	return <FeatureFlagsPanel canEdit={can(permSet, "feature_flags", "edit")} />
}

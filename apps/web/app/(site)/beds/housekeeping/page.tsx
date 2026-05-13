"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { HousekeepingPanel } from "@/features/beds/components/housekeeping-panel"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

export default function HousekeepingPage() {
	const permSet = usePermissionSet()

	if (!permSet.has("adt:edit")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access housekeeping.
			</div>
		)
	}

	return <HousekeepingPanel />
}

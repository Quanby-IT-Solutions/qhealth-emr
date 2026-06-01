"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { LcrTrackingTable } from "@/features/registrar/civil-registry/components/lcr-tracking-table"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

export default function LcrTrackingPage() {
	const permSet = usePermissionSet()

	if (!permSet.has("civil_registry:view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to view civil registry records.
			</div>
		)
	}

	return <LcrTrackingTable />
}

"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { RecordsRequest } from "@/features/records/components/records-request"

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

export default function RecordsPage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "medical_records", "view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access records.
			</div>
		)
	}

	return <RecordsRequest />
}

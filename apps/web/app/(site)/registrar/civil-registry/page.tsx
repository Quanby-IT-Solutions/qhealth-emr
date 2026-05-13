"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { LcrPanel } from "@/features/registrar/civil-registry/components/lcr-panel"

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

export default function RegistrarCivilRegistryPage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "civil_registry", "view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access civil registry.
			</div>
		)
	}

	return <LcrPanel />
}

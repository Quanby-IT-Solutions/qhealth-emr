"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { NutritionDashboard } from "@/features/nutrition/components/nutrition-dashboard"

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

export default function NutritionPage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "nutrition", "view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access nutrition services.
			</div>
		)
	}

	return <NutritionDashboard />
}

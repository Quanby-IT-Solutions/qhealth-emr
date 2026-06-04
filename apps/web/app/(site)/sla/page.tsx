"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { SlaDashboard } from "@/features/sla/components/sla-dashboard"

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

export default function SlaPage() {
	const router = useRouter()
	const permSet = usePermissionSet()
	const isAdmin = can(permSet, "admin", "view")

	// SLA-003: Admin users have a unified workspace at /admin/sla.
	// Redirect any admin who lands here directly so they always reach the
	// correct entrypoint (with configuration and compliance tabs).
	useEffect(() => {
		if (isAdmin) {
			router.replace("/admin/sla")
		}
	}, [isAdmin, router])

	if (isAdmin) {
		// Render nothing while the redirect navigates away
		return null
	}

	if (!can(permSet, "reporting", "view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access SLA monitoring.
			</div>
		)
	}

	return <SlaDashboard />
}

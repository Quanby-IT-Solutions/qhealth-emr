"use client"

import type { ReactNode } from "react"

import { UnauthorizedPanel } from "@/core/components/unauthorized-panel"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { hasTriageAccess } from "@/features/triage/lib/triage-permissions"

import { TriageShell } from "./triage-shell"

export function TriageRouteGuard({ children }: { children: ReactNode }) {
	const { data: profile, isLoading } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []

	if (isLoading) {
		return null
	}

	if (!hasTriageAccess(permissions)) {
		return (
			<UnauthorizedPanel
				title="Triage access required"
				description="Your current role does not include the OPD triage permission bundle."
			/>
		)
	}

	return <TriageShell roleName={profile?.activeRole?.name}>{children}</TriageShell>
}

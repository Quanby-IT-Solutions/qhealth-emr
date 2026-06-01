"use client"

import { useMemo } from "react"
import { Loader2 } from "lucide-react"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { TelemedicineDashboard } from "@/features/telemedicine/components/telemedicine-dashboard"

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function TelemedicinePage() {
	const { data: profile, isLoading } = useMyProfile()
	const permSet = useMemo(() => {
		const permissions = profile?.activeRole?.permissions ?? []
		return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
	}, [profile?.activeRole?.permissions])

	if (isLoading) {
		return (
			<div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
				<Loader2 className="size-4 animate-spin" />
				Loading telemedicine...
			</div>
		)
	}

	if (!can(permSet, "telemedicine", "view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access telemedicine.
			</div>
		)
	}

	return <TelemedicineDashboard />
}

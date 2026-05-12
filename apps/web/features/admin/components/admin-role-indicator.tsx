"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

export function AdminRoleIndicator() {
	const { data: profile } = useMyProfile()

	const roleName = profile?.activeRole?.name ?? "—"
	const primaryFacility = profile?.staffProfiles?.[0]?.facility?.name

	return (
		<div className="text-muted-foreground flex items-center gap-2 text-xs">
			{primaryFacility && (
				<>
					<span className="font-medium">{primaryFacility}</span>
					<span aria-hidden>·</span>
				</>
			)}
			<span>{roleName}</span>
		</div>
	)
}

"use client"

import { DashboardWidgets } from "@/features/app-shell/components/dashboard-widgets"
import { getDashboardWidgets } from "@/features/app-shell/lib/navigation"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

export default function DashboardPage() {
	const { data: profile, isLoading } = useMyProfile()
	const roleName = profile?.activeRole?.name ?? ""
	const widgetIds = getDashboardWidgets(roleName)

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
				<p className="text-muted-foreground text-sm">
					{profile?.activeRole
						? `Viewing as ${profile.activeRole.name}`
						: "Welcome back"}
				</p>
			</div>

			{isLoading ? (
				<div className="text-muted-foreground flex h-48 items-center justify-center">
					Loading dashboard…
				</div>
			) : (
				<DashboardWidgets widgetIds={widgetIds} />
			)}
		</div>
	)
}

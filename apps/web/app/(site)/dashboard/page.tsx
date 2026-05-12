"use client"

import { AdminDashboard } from "@/features/admin/components/admin-dashboard"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { DashboardWidgets } from "@/features/app-shell/components/dashboard-widgets"
import { getDashboardWidgetsForPermissions } from "@/features/app-shell/lib/navigation"
import { NursingDashboard } from "@/features/nursing/components/nursing-dashboard"
import { PharmacyDashboard } from "@/features/pharmacy/components/pharmacy-dashboard"

export default function DashboardPage() {
	const { data: profile, isLoading } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	const permSet = new Set(
		permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
	)
	const widgetIds = getDashboardWidgetsForPermissions(permissions)
	const canViewAdminDashboard = permSet.has("admin:view")
	const canViewNursingDashboard = permSet.has("nursing:view")
	const canViewPharmacyDashboard = permSet.has("orders:verify")

	if (isLoading) {
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

				<div className="text-muted-foreground flex h-48 items-center justify-center">
					Loading dashboard…
				</div>
			</div>
		)
	}

	if (canViewAdminDashboard) {
		return <AdminDashboard />
	}

	if (canViewNursingDashboard) {
		return <NursingDashboard />
	}

	if (canViewPharmacyDashboard) {
		return <PharmacyDashboard />
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
				<p className="text-muted-foreground text-sm">
					{profile?.activeRole ? `Viewing as ${profile.activeRole.name}` : "Welcome back"}
				</p>
			</div>

			<DashboardWidgets widgetIds={widgetIds} />
		</div>
	)
}

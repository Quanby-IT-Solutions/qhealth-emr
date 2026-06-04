"use client"

import { AdminDashboard } from "@/features/admin/components/admin-dashboard"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { DashboardWidgets } from "@/features/app-shell/components/dashboard-widgets"
import { getDashboardWidgetsForPermissions } from "@/features/app-shell/lib/navigation"
import { NurseRoleDashboard } from "@/features/nursing/components/nurse-role-dashboard"
import { DietitianDashboard } from "@/features/nutrition/components/dietitian-dashboard"
import { PharmacyDashboard } from "@/features/pharmacy/components/pharmacy-dashboard"
import { PhysicianDashboard } from "@/features/physician-dashboard/components/physician-dashboard"
import { AnesthesiologistDashboard } from "@/features/surgical/components/anesthesiologist-dashboard"
import { SurgeonDashboard } from "@/features/surgical/components/surgeon-dashboard"

export default function DashboardPage() {
	const { data: profile, isLoading } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	const permSet = new Set(
		permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
	)
	const widgetIds = getDashboardWidgetsForPermissions(permissions)
	const canViewAdminDashboard = permSet.has("admin:view")
	const canViewNursingDashboard = permSet.has("nursing:view") && !permSet.has("clinical_docs:sign")
	const canViewPharmacyDashboard = permSet.has("orders:verify")
	const canViewNutritionDashboard = permSet.has("nutrition:view")
	const canViewSurgeonDashboard =
		profile?.activeRole?.name?.toLowerCase() === "surgeon" && permSet.has("surgical:view")
	const canViewAnesthesiologistDashboard =
		profile?.activeRole?.name?.toLowerCase() === "anesthesiologist" && permSet.has("surgical:view")
	const canViewPhysicianDashboard = permSet.has("clinical_docs:sign")

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
					<p className="text-muted-foreground text-sm">Welcome back</p>
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
		return <NurseRoleDashboard />
	}

	if (canViewPharmacyDashboard) {
		return <PharmacyDashboard />
	}

	if (canViewNutritionDashboard) {
		return <DietitianDashboard />
	}

	if (canViewSurgeonDashboard) {
		return <SurgeonDashboard profile={profile} />
	}

	if (canViewAnesthesiologistDashboard) {
		return <AnesthesiologistDashboard profile={profile} />
	}

	if (canViewPhysicianDashboard) {
		return <PhysicianDashboard profile={profile} />
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

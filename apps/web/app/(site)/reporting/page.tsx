"use client"

import { Suspense } from "react"

import { Skeleton } from "@/core/components/ui/skeleton"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { ReportingDashboard } from "@/features/reporting/components/reporting-dashboard"

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

function ReportingDashboardSkeleton() {
	return (
		<div className="space-y-6">
			<div>
				<Skeleton className="h-8 w-48" />
				<Skeleton className="mt-2 h-4 w-96" />
			</div>
			<Skeleton className="h-10 w-full" />
			<Skeleton className="h-96 w-full" />
		</div>
	)
}

export default function ReportingPage() {
	const permSet = usePermissionSet()

	if (!can(permSet, "reporting", "view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access reporting.
			</div>
		)
	}

	const canEdit = can(permSet, "reporting", "edit")
	const canExport = can(permSet, "reporting", "export")

	return (
		<Suspense fallback={<ReportingDashboardSkeleton />}>
			<ReportingDashboard canEdit={canEdit} canExport={canExport} />
		</Suspense>
	)
}

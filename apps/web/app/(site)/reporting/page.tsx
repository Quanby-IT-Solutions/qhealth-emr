"use client"

import { Suspense } from "react"

import { Skeleton } from "@/core/components/ui/skeleton"
import { ReportingDashboard } from "@/features/reporting/components/reporting-dashboard"

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
	return (
		<Suspense fallback={<ReportingDashboardSkeleton />}>
			<ReportingDashboard />
		</Suspense>
	)
}

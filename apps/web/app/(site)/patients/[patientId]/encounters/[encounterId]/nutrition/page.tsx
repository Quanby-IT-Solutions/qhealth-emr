"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useChartContext } from "@/features/encounters/context/chart-context"
import { NutritionTab } from "@/features/nutrition/components/nutrition-tab"

export default function NutritionPage() {
	const { encounterId, patientId, facilityId } = useChartContext()
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	const permSet = new Set(
		permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
	)

	if (!permSet.has("nutrition:view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access nutrition assessments.
			</div>
		)
	}

	return (
		<NutritionTab encounterId={encounterId} patientId={patientId} facilityId={facilityId ?? ""} />
	)
}

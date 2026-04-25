"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useChartContext } from "@/features/encounters/context/chart-context"
import { ProblemsAllergiesTab } from "@/features/problems-allergies/components/problems-allergies-tab"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

export default function ProblemsAllergiesPage() {
	const { patientId, facilityId } = useChartContext()
	const permSet = usePermissionSet()
	const canWrite = permSet.has("clinical_docs:sign")

	return <ProblemsAllergiesTab patientId={patientId} facilityId={facilityId ?? ""} canWrite={canWrite} />
}

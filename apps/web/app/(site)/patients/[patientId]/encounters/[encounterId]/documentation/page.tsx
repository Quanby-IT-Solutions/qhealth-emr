"use client"

import { DocumentationTab } from "@/features/clinical-docs/components/documentation-tab"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useChartContext } from "@/features/encounters/context/chart-context"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function DocumentationPage() {
	const { encounterId, patientId, facilityId } = useChartContext()
	const permSet = usePermissionSet()

	return (
		<DocumentationTab
			encounterId={encounterId}
			patientId={patientId}
			facilityId={facilityId ?? ""}
			canWrite={can(permSet, "clinical_docs", "sign")}
		/>
	)
}

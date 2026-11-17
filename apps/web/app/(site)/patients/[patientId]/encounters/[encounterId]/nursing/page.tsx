"use client"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { excludeClinicalSignerFromEncounterTab } from "@/features/app-shell/lib/navigation"
import { useChartContext } from "@/features/encounters/context/chart-context"
import { NursingTab } from "@/features/nursing/components/nursing-tab"

export default function NursingPage() {
	const { encounterId, patientId, facilityId, encounter } = useChartContext()
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	const canViewNursing = permissions.some(p => p.module === "nursing" && p.action === "view")
	const canWriteNursing = permissions.some(p => p.module === "nursing" && p.action === "create")
	const isClinicalSigner = permissions.some(
		p => p.module === "clinical_docs" && p.action === "sign"
	)

	if (
		!canViewNursing ||
		excludeClinicalSignerFromEncounterTab(profile?.activeRole, isClinicalSigner)
	) {
		return (
			<div className="text-muted-foreground py-8 text-center text-sm">
				You do not have permission to view nursing workflows.
			</div>
		)
	}

	return (
		<NursingTab
			encounterId={encounterId}
			patientId={patientId}
			facilityId={facilityId ?? ""}
			patientDateOfBirth={encounter?.patientDateOfBirth}
			patientName={encounter?.patientName}
			readOnly={!canWriteNursing}
		/>
	)
}

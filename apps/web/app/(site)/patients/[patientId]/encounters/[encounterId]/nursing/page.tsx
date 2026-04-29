"use client"

import { NursingTab } from "@/features/nursing/components/nursing-tab"
import { useChartContext } from "@/features/encounters/context/chart-context"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

export default function NursingPage() {
	const { encounterId, patientId, facilityId, encounter } = useChartContext()
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	const canWriteNursing = permissions.some(
		p => p.module === "nursing" && p.action === "create"
	)

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

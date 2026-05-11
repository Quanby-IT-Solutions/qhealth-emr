"use client"

import { useChartContext } from "@/features/encounters/context/chart-context"
import { DischargePanel } from "@/features/encounters/components/discharge-panel"

export default function DischargePage() {
	const { encounterId, patientId, encounter } = useChartContext()

	if (!encounter) {
		return (
			<div className="text-muted-foreground py-8 text-center text-sm">
				Loading encounter...
			</div>
		)
	}

	if (encounter.status !== "active" && encounter.status !== "pending_discharge") {
		return (
			<div className="text-muted-foreground py-8 text-center text-sm">
				This encounter has already been {encounter.encounterType === "outpatient" ? "closed" : "discharged"}.
			</div>
		)
	}

	return (
		<DischargePanel
			encounterId={encounterId}
			encounterType={encounter.encounterType}
			patientId={patientId}
			patientSex={encounter.patientSex}
			patientDateOfBirth={encounter.patientDateOfBirth}
		/>
	)
}

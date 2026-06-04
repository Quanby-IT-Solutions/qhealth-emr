"use client"

import { use } from "react"

import { OpdTriageForm } from "@/features/opd-triage/components/opd-triage-form"

export default function NewTriagePage({ params }: { params: Promise<{ patientId: string }> }) {
	const { patientId } = use(params)

	return (
		<div className="p-6">
			<OpdTriageForm patientId={patientId} />
		</div>
	)
}

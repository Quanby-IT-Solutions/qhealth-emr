"use client"

import { use } from "react"

import { usePatientProfileQuery } from "@/features/patients/api/patients.hooks"
import { CreateEncounterForm } from "@/features/encounters/components/create-encounter-form"

export default function NewEncounterPage({
	params,
}: {
	params: Promise<{ patientId: string }>
}) {
	const { patientId } = use(params)
	const { data: patient } = usePatientProfileQuery(patientId)

	const patientName = patient
		? `${patient.lastName}, ${patient.firstName}`
		: "Loading…"

	return <CreateEncounterForm patientId={patientId} patientName={patientName} />
}

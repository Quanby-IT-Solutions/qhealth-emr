"use client"

import { use } from "react"

import { PatientProfile } from "@/features/patients/components/patient-profile"

export default function PatientProfilePage({
	params,
}: {
	params: Promise<{ patientId: string }>
}) {
	const { patientId } = use(params)

	return <PatientProfile patientId={patientId} />
}

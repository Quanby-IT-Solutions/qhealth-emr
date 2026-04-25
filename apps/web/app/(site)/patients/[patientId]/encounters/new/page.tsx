"use client"

import { use } from "react"
import { useSearchParams } from "next/navigation"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { usePatientProfileQuery } from "@/features/patients/api/patients.hooks"
import { CreateEncounterForm } from "@/features/encounters/components/create-encounter-form"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export default function NewEncounterPage({
	params,
}: {
	params: Promise<{ patientId: string }>
}) {
	const { patientId } = use(params)
	const { data: patient } = usePatientProfileQuery(patientId)
	const searchParams = useSearchParams()
	const permSet = usePermissionSet()
	const typeParam = searchParams.get("type")
	const triageId = searchParams.get("triageId") ?? undefined
	const defaultType =
		typeParam === "outpatient" || typeParam === "inpatient" || typeParam === "emergency"
			? typeParam
			: undefined

	if (!can(permSet, "adt", "create")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to create encounters.
			</div>
		)
	}

	const patientName = patient
		? `${patient.lastName}, ${patient.firstName}`
		: "Loading…"

	return (
		<CreateEncounterForm
			patientId={patientId}
			patientName={patientName}
			defaultType={defaultType}
			triageId={triageId}
		/>
	)
}

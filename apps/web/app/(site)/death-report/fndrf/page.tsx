"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { FndrfForm } from "@/features/death-reporting/components/fndrf-form"
import { useEncounterDetailQuery } from "@/features/encounters/api/encounters.hooks"

function defaultPlaceOfDeath(encounter: ReturnType<typeof useEncounterDetailQuery>["data"]) {
	if (!encounter) return ""
	if (encounter.wardName && encounter.bedNumber) {
		return `${encounter.wardName}, Bed ${encounter.bedNumber}`
	}
	if (encounter.wardName) return encounter.wardName
	if (encounter.encounterType === "emergency") return "Emergency Department"
	if (encounter.encounterType === "inpatient") return "Inpatient Ward"
	return ""
}

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(
		permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`)
	)
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

function FndrfPageInner() {
	const searchParams = useSearchParams()
	const encounterId = searchParams.get("encounterId") ?? ""
	const patientId = searchParams.get("patientId") ?? ""
	const facilityId = searchParams.get("facilityId") ?? ""
	const { data: encounter } = useEncounterDetailQuery(encounterId, { enabled: !!encounterId })
	const permSet = usePermissionSet()

	if (!can(permSet, "death_reporting", "view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access death reporting records.
			</div>
		)
	}

	if (!encounterId || !patientId || !facilityId) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				Missing required context — please open this form from the patient encounter.
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div>
				<h1 className="text-xl font-semibold">Facility Neonatal Death Review Form</h1>
				<p className="text-muted-foreground text-sm">
					Complete all required sections and submit the physician certification to finalise.
				</p>
			</div>
			<FndrfForm
				encounterId={encounterId}
				patientId={patientId}
				facilityId={facilityId}
				initialNewbornName={encounter?.patientName}
				initialNewbornMrn={encounter?.patientMrn}
				initialNewbornDateOfBirth={encounter?.patientDateOfBirth}
				initialPlaceOfDeath={defaultPlaceOfDeath(encounter)}
			/>
		</div>
	)
}

export default function FndrfPage() {
	return (
		<Suspense
			fallback={
				<div className="text-muted-foreground flex items-center justify-center p-8">Loading…</div>
			}
		>
			<FndrfPageInner />
		</Suspense>
	)
}

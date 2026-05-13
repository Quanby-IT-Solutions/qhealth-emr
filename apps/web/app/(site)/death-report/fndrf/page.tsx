"use client"

import { Suspense } from "react"

import { useSearchParams } from "next/navigation"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { FndrfForm } from "@/features/death-reporting/components/fndrf-form"

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

function FndrfPageInner() {
	const searchParams = useSearchParams()
	const encounterId = searchParams.get("encounterId") ?? ""
	const patientId = searchParams.get("patientId") ?? ""
	const facilityId = searchParams.get("facilityId") ?? ""
	const permSet = usePermissionSet()

	if (!can(permSet, "death_reporting", "view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access death reporting records.
			</div>
		)
	}

	if (!encounterId || !patientId || !facilityId) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				Missing required context — please open this form from the patient encounter.
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div>
				<h1 className="text-xl font-semibold">Facility Neonatal Death Review Form</h1>
				<p className="text-sm text-muted-foreground">
					Complete all required sections and submit the physician certification to finalise.
				</p>
			</div>
			<FndrfForm
				encounterId={encounterId}
				patientId={patientId}
				facilityId={facilityId}
			/>
		</div>
	)
}

export default function FndrfPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center p-8 text-muted-foreground">Loading…</div>
			}
		>
			<FndrfPageInner />
		</Suspense>
	)
}

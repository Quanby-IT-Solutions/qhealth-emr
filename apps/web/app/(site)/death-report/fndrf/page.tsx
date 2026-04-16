"use client"

import { useSearchParams } from "next/navigation"

import { FndrfForm } from "@/features/death-reporting/components/fndrf-form"

export default function FndrfPage() {
	const searchParams = useSearchParams()
	const encounterId = searchParams.get("encounterId") ?? ""
	const patientId = searchParams.get("patientId") ?? ""
	const facilityId = searchParams.get("facilityId") ?? ""

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

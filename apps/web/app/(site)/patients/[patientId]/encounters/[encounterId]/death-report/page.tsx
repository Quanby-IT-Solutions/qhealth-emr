"use client"

import { useSearchParams } from "next/navigation"
import { AlertTriangle } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import {
	calculateAgeYears,
	isMaternalDeathCandidate,
	isNeonatalDeathCandidate,
} from "@/features/death-reporting/api/death-reporting.hooks"
import { FmdrfForm } from "@/features/death-reporting/components/fmdrf-form"
import { FndrfForm } from "@/features/death-reporting/components/fndrf-form"
import { useChartContext } from "@/features/encounters/context/chart-context"

function defaultPlaceOfDeath(encounter: ReturnType<typeof useChartContext>["encounter"]) {
	if (!encounter) return ""
	if (encounter.wardName && encounter.bedNumber) {
		return `${encounter.wardName}, Bed ${encounter.bedNumber}`
	}
	if (encounter.wardName) return encounter.wardName
	if (encounter.encounterType === "emergency") return "Emergency Department"
	if (encounter.encounterType === "inpatient") return "Inpatient Ward"
	return ""
}

export default function DeathReportPage() {
	const { encounterId, patientId, facilityId, encounter } = useChartContext()
	const searchParams = useSearchParams()

	const patientSex = encounter?.patientSex ?? ""
	const patientDob = encounter?.patientDateOfBirth ?? ""

	const needsFmdrf = patientDob ? isMaternalDeathCandidate(patientSex, patientDob) : false
	const needsFndrf = patientDob ? isNeonatalDeathCandidate(patientDob) : false
	const patientAge = patientDob ? (calculateAgeYears(patientDob) ?? undefined) : undefined
	const placeOfDeath = defaultPlaceOfDeath(encounter)

	// Allow ?type=fmdrf or ?type=fndrf to jump directly to a tab
	const typeParam = searchParams.get("type")
	const defaultTab = typeParam === "fndrf" && needsFndrf ? "fndrf" : needsFmdrf ? "fmdrf" : "fndrf"

	if (!needsFmdrf && !needsFndrf) {
		return (
			<div className="flex flex-col items-center gap-3 py-16 text-center">
				<AlertTriangle className="text-muted-foreground size-8" />
				<p className="text-muted-foreground text-sm">
					This patient does not meet the criteria for FMDRF or FNDRF reporting.
				</p>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div>
				<h1 className="text-xl font-semibold">Death Reporting</h1>
				<p className="text-muted-foreground text-sm">
					Complete the required death review form(s) before confirming discharge.
				</p>
			</div>

			{needsFmdrf && needsFndrf ? (
				<Tabs defaultValue={defaultTab}>
					<TabsList variant="line">
						<TabsTrigger value="fmdrf">FMDRF</TabsTrigger>
						<TabsTrigger value="fndrf">FNDRF</TabsTrigger>
					</TabsList>
					<TabsContent value="fmdrf" className="mt-4">
						<FmdrfForm
							encounterId={encounterId}
							patientId={patientId}
							facilityId={facilityId ?? ""}
							initialPatientName={encounter?.patientName}
							initialPatientMrn={encounter?.patientMrn}
							initialPatientAge={patientAge}
							initialPatientAddress={encounter?.patientAddress}
							initialPlaceOfDeath={placeOfDeath}
						/>
					</TabsContent>
					<TabsContent value="fndrf" className="mt-4">
						<FndrfForm
							encounterId={encounterId}
							patientId={patientId}
							facilityId={facilityId ?? ""}
							initialNewbornName={encounter?.patientName}
							initialNewbornMrn={encounter?.patientMrn}
							initialNewbornDateOfBirth={encounter?.patientDateOfBirth}
							initialPlaceOfDeath={placeOfDeath}
						/>
					</TabsContent>
				</Tabs>
			) : needsFmdrf ? (
				<FmdrfForm
					encounterId={encounterId}
					patientId={patientId}
					facilityId={facilityId ?? ""}
					initialPatientName={encounter?.patientName}
					initialPatientMrn={encounter?.patientMrn}
					initialPatientAge={patientAge}
					initialPatientAddress={encounter?.patientAddress}
					initialPlaceOfDeath={placeOfDeath}
				/>
			) : (
				<FndrfForm
					encounterId={encounterId}
					patientId={patientId}
					facilityId={facilityId ?? ""}
					initialNewbornName={encounter?.patientName}
					initialNewbornMrn={encounter?.patientMrn}
					initialNewbornDateOfBirth={encounter?.patientDateOfBirth}
					initialPlaceOfDeath={placeOfDeath}
				/>
			)}
		</div>
	)
}

"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { Activity } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useCreateEncounterMutation } from "@/features/encounters/api/encounters.hooks"
import { LinkTriageBanner } from "@/features/opd-triage/components/link-triage-banner"
import { usePatientSearchQuery } from "@/features/patients/api/patients.hooks"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"

function formatDate(dateVal: Date | string | null) {
	if (!dateVal) return "—"
	const d = dateVal instanceof Date ? dateVal : new Date(dateVal)
	return d.toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

function formatSex(sex: string) {
	return sex.charAt(0).toUpperCase() + sex.slice(1)
}

export function PatientSearch() {
	const router = useRouter()
	const { data: profile } = useMyProfile()
	// PS-042: resolve facility/staff from the active role, not the first profile in the array
	const facilityId = useActiveFacilityId() ?? ""
	const activeStaffProfile =
		profile?.staffProfiles?.find(p => p.roles?.some(r => r.id === profile.activeRole?.id)) ??
		profile?.staffProfiles?.[0]
	const staffId = activeStaffProfile?.id ?? ""
	const searchParams = useSearchParams()
	const pendingTriageId = searchParams.get("pendingTriageId") ?? undefined

	const permissions = profile?.activeRole?.permissions ?? []
	const canCreatePatient = permissions.some(
		p => p.module === "patients" && (p.action === "create" || p.action === "edit"),
	)
	const canTriage = permissions.some(
		p => p.module === "opd" && (p.action === "create" || p.action === "edit"),
	)

	const [searchTerm, setSearchTerm] = useState("")
	const [mrnFilter, setMrnFilter] = useState("")
	const [dobFilter, setDobFilter] = useState("")
	const [selectedForTriage, setSelectedForTriage] = useState<string | null>(null)
	const createEncounter = useCreateEncounterMutation()

	// Triage reconciliation queue result — PS-035
	const [triageQueueResult, setTriageQueueResult] = useState<{
		queueNumber: number
		encounterId: string
		patientId: string
	} | null>(null)

	// Only execute the query after the user explicitly submits the form
	const [committedParams, setCommittedParams] = useState<{
		facilityId: string
		search?: string
		mrn?: string
		dateOfBirth?: string
		page: number
		limit: number
	} | null>(null)

	const { data, isLoading, isFetching } = usePatientSearchQuery(
		committedParams ?? { facilityId, page: 1, limit: 50 },
		{ enabled: !!committedParams && !!facilityId },
	)

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault()
		setCommittedParams({
			facilityId,
			search: searchTerm || undefined,
			mrn: mrnFilter || undefined,
			dateOfBirth: dobFilter || undefined,
			page: 1,
			limit: 50,
		})
	}

	const results = data?.data ?? []
	const hasSearched = !!committedParams
	const showEmpty = hasSearched && !isLoading && results.length === 0

	// PS-038: triage-first — column only shown for triage staff or when reconciling a pending intake
	const showActions = canTriage || (!!pendingTriageId && canCreatePatient)

	const selectedPatient = results.find(p => p.id === selectedForTriage) ?? null
	const selectedPatientName = selectedPatient
		? `${selectedPatient.lastName}, ${selectedPatient.firstName}`
		: null

	const registerHref = pendingTriageId
		? `/patients/register?pendingTriageId=${pendingTriageId}`
		: "/patients/register"

	return (
		<div className="space-y-6">
			{pendingTriageId && (
				<LinkTriageBanner
					pendingTriageId={pendingTriageId}
					facilityId={facilityId}
					selectedPatientId={selectedForTriage ?? null}
					selectedPatientName={selectedPatientName}
				onLinked={async (patientId, clinicianStaffId, chiefComplaint) => { // PS-045
					const encounter = await createEncounter.mutateAsync({
						facilityId,
						patientId,
						encounterType: "outpatient",
						triageIntakeId: pendingTriageId,
						chiefComplaint: chiefComplaint, // PS-045
							admittingStaffId: staffId,
							clinicianStaffId,
						})
						// PS-035: show queue confirmation instead of navigating immediately
						if (encounter.queueNumber != null) {
							setTriageQueueResult({
								queueNumber: encounter.queueNumber,
								encounterId: encounter.id,
								patientId,
							})
						} else {
							router.push(`/patients/${patientId}/encounters/${encounter.id}`)
						}
					}}
				/>
			)}
			<Card>
				<CardHeader>
					<CardTitle>Search Patients</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
						<div className="min-w-[200px] flex-1 space-y-1.5">
							<Label htmlFor="search">Name or MRN</Label>
							<Input
								id="search"
								placeholder="Search by name or MRN…"
								value={searchTerm}
								onChange={e => setSearchTerm(e.target.value)}
							/>
						</div>
						<div className="w-40 space-y-1.5">
							<Label htmlFor="mrn">MRN</Label>
							<Input
								id="mrn"
								placeholder="MRN"
								value={mrnFilter}
								onChange={e => setMrnFilter(e.target.value)}
							/>
						</div>
						<div className="w-44 space-y-1.5">
							<Label htmlFor="dob">Date of Birth</Label>
							<Input
								id="dob"
								type="date"
								value={dobFilter}
								onChange={e => setDobFilter(e.target.value)}
							/>
						</div>
						<Button type="submit" disabled={!facilityId}>
							{isFetching ? "Searching…" : "Search"}
						</Button>
					</form>
				</CardContent>
			</Card>

			{isLoading && hasSearched && (
				<div className="text-muted-foreground flex h-32 items-center justify-center">
					Searching patients…
				</div>
			)}

			{results.length > 0 && (
				<Card>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>MRN</TableHead>
									<TableHead>Name</TableHead>
									<TableHead>Date of Birth</TableHead>
									<TableHead>Sex</TableHead>
									<TableHead>Last Encounter</TableHead>
									{showActions && <TableHead className="w-40">Actions</TableHead>}
								</TableRow>
							</TableHeader>
							<TableBody>
								{results.map(patient => (
									<TableRow key={patient.id} className="cursor-pointer">
										<TableCell>
											<Link
												href={`/patients/${patient.id}`}
												className="text-primary hover:underline"
											>
												{patient.mrn}
											</Link>
										</TableCell>
										<TableCell>
											<Link href={`/patients/${patient.id}`}>
												{patient.lastName}, {patient.firstName}
												{patient.middleName ? ` ${patient.middleName}` : ""}
											</Link>
										</TableCell>
										<TableCell>{formatDate(patient.dateOfBirth)}</TableCell>
										<TableCell>{formatSex(patient.sex)}</TableCell>
										<TableCell>{formatDate(patient.lastEncounterDate)}</TableCell>
										{showActions && (
											<TableCell>
												{pendingTriageId ? (
													<Button
														size="sm"
														variant={selectedForTriage === patient.id ? "default" : "outline"}
														onClick={() =>
															setSelectedForTriage(
																selectedForTriage === patient.id ? null : patient.id,
															)
														}
													>
														{selectedForTriage === patient.id ? "Selected" : "Select"}
													</Button>
												) : canTriage ? (
													/* PS-040: OPD Register removed — triage is the required Step 1
													   entry point (TOR Flow 1). Only triage-capable staff see an
													   action here; registrars have no action until a pending intake
													   is present. */
													<Button
														size="sm"
														variant="ghost"
														nativeButton={false}
														render={<Link href={`/patients/${patient.id}/triage/new`} />}
													>
														<Activity className="mr-1.5 size-3.5" />
														Start Triage
													</Button>
												) : null}
											</TableCell>
										)}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
					{data && data.totalPages > 1 && (
						<div className="text-muted-foreground border-t px-4 py-3 text-sm">
							Showing page {data.page} of {data.totalPages} ({data.total} total patients)
						</div>
					)}
				</Card>
			)}

			{showEmpty && (
			<Card>
				<CardContent className="flex flex-col items-center gap-4 py-12">
					<p className="text-muted-foreground text-sm">
						No patients found matching your search criteria.
					</p>
					{/* PS-038: new-patient registration only permitted when a triage intake is already pending */}
					{pendingTriageId && canCreatePatient && (
						<Button nativeButton={false} render={<Link href={registerHref} />}>
							Register New Patient & Link Triage
						</Button>
					)}
					{canTriage && !pendingTriageId && (
						<Button
							variant="outline"
							nativeButton={false}
							render={<Link href="/triage/new" />}
						>
							<Activity className="mr-1.5 size-4" />
							Walk-in Triage
						</Button>
					)}
					{!pendingTriageId && !canTriage && canCreatePatient && (
						<p className="text-muted-foreground max-w-sm text-center text-xs">
							OPD registration requires triage first. Ask the triage nurse to assess
							the patient, then open this page from the triage reconciliation queue.
						</p>
					)}
				</CardContent>
			</Card>
		)}

		{/* Triage reconciliation queue confirmation — PS-035 */}
		<Dialog
			open={!!triageQueueResult}
			onOpenChange={open => {
				if (!open) setTriageQueueResult(null)
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Triage Registration Complete</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col items-center gap-3 py-4">
					<p className="text-muted-foreground text-sm">
						Queue number assigned for {selectedPatientName}
					</p>
					<Badge className="px-8 py-4 text-5xl font-bold tabular-nums">
						{triageQueueResult?.queueNumber}
					</Badge>
					<p className="text-muted-foreground text-xs">
						Hand this number to the patient
					</p>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setTriageQueueResult(null)}>
						Next Patient
					</Button>
					<Button
						onClick={() =>
							router.push(
								`/patients/${triageQueueResult?.patientId}/encounters/${triageQueueResult?.encounterId}`,
							)
						}
					>
						View Encounter
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	</div>
	)
}

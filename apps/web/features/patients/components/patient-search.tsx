"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { WifiOffFreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Activity, Eye } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
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
import { useOfflinePatients } from "@/features/offline-cache/lib/use-offline-patients"
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

	// Offline continuity — SS-001: load facility cache before the server query so
	// isOnline can gate the enabled flag below.
	const { isOnline, offlinePatients, cachedAt } = useOfflinePatients()

	// PS-042: automatically load all patients initially if no committed search — improve navigation UX
	const { data, isLoading, isFetching } = usePatientSearchQuery(
		committedParams ?? { facilityId, page: 1, limit: 50 },
		{ enabled: isOnline && !!facilityId },
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

	const results = isOnline ? (data?.data ?? []) : filteredOfflinePatients
	const hasSearched = !!committedParams

	// Offline: filter facility-scoped localStorage cache client-side — SS-001
	const filteredOfflinePatients = useMemo(() => {
		if (isOnline) return []
		const params = committedParams ?? { search: searchTerm, mrn: mrnFilter }
		const term = (params.search ?? "").toLowerCase()
		const mrn = (params.mrn ?? "").toLowerCase()
		return offlinePatients.filter(p => {
			const fullName = `${p.firstName} ${p.lastName}`.toLowerCase()
			const mrnMatch = !mrn || p.mrn.toLowerCase().includes(mrn)
			const nameMatch = !term || fullName.includes(term) || p.mrn.toLowerCase().includes(term)
			return mrnMatch && nameMatch && p.isActive
		})
	}, [isOnline, offlinePatients, committedParams])
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

			{/* SS-001: offline continuity banner */}
			{!isOnline && (
				<Alert className="border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20">
					<HugeiconsIcon icon={WifiOffFreeIcons} className="size-4 text-amber-600 dark:text-amber-400" />
					<AlertTitle className="text-amber-800 dark:text-amber-300">Working Offline</AlertTitle>
					<AlertDescription className="text-amber-700 dark:text-amber-400">
						{offlinePatients.length > 0
							? `Patient search is using the offline cache (${offlinePatients.length.toLocaleString()} patients${cachedAt ? `, last updated ${new Date(cachedAt).toLocaleString("en-PH")}` : ""}).`
							: "No offline cache is available for this facility. Connect to the network to search patients."}
					</AlertDescription>
				</Alert>
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

			{isLoading && (
				<div className="text-muted-foreground flex h-32 items-center justify-center">
					{hasSearched ? "Searching patients…" : "Loading patient list…"}
				</div>
			)}

			{!isLoading && results.length === 0 && (
				<div className="text-muted-foreground flex h-32 items-center justify-center border rounded-lg bg-muted/20">
					{hasSearched 
						? "No patients found matching your search criteria." 
						: "No records found in the system."}
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
									<TableHead className="w-[120px]">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{results.map(patient => (
									<TableRow
										key={patient.id}
										className="group cursor-pointer hover:bg-muted/50 transition-colors"
										onClick={() => router.push(`/patients/${patient.id}`)}
									>
										<TableCell>
											<span className="text-primary font-medium group-hover:underline">
												{patient.mrn}
											</span>
										</TableCell>
										<TableCell>
											<span className="font-medium">
												{patient.lastName}, {patient.firstName}
												{patient.middleName ? ` ${patient.middleName}` : ""}
											</span>
										</TableCell>
										<TableCell>{formatDate(patient.dateOfBirth)}</TableCell>
										<TableCell>{formatSex(patient.sex)}</TableCell>
										<TableCell>{formatDate(patient.lastEncounterDate)}</TableCell>
										<TableCell onClick={e => e.stopPropagation()}>
											<div className="flex items-center gap-2">
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
												) : (
													<>
														<Button
															size="sm"
															variant="ghost"
															className="h-8 w-8 p-0"
															title="View Profile"
															onClick={() => router.push(`/patients/${patient.id}`)}
														>
															<Eye className="size-4" />
														</Button>
														{canTriage && (
															<Button
																size="sm"
																variant="ghost"
																className="h-8 px-2 text-xs"
																onClick={() =>
																	router.push(`/patients/${patient.id}/triage/new`)
																}
															>
																<Activity className="mr-1.5 size-3" />
																Triage
															</Button>
														)}
													</>
												)}
											</div>
										</TableCell>
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

		{/* SS-001: offline cache results — shown when offline and no live TQ results available */}
		{!isOnline && hasSearched && results.length === 0 && !isLoading && (
			<>
				{filteredOfflinePatients.length > 0 ? (
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="flex items-center gap-2 text-sm font-medium">
								<HugeiconsIcon icon={WifiOffFreeIcons} className="size-4 text-amber-500" />
								Cached Patients
								<Badge variant="outline" className="ml-1 text-[10px]">
									{filteredOfflinePatients.length} result{filteredOfflinePatients.length !== 1 ? "s" : ""}
								</Badge>
							</CardTitle>
						</CardHeader>
						<CardContent className="p-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>MRN</TableHead>
										<TableHead>Name</TableHead>
										<TableHead>Date of Birth</TableHead>
										<TableHead>Sex</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredOfflinePatients.map(patient => (
										<TableRow key={patient.id} className="cursor-pointer">
											<TableCell>
												<Link href={`/patients/${patient.id}`} className="text-primary hover:underline">
													{patient.mrn}
												</Link>
											</TableCell>
											<TableCell>
												<Link href={`/patients/${patient.id}`}>
													{patient.lastName}, {patient.firstName}
												</Link>
											</TableCell>
											<TableCell>{formatDate(patient.dateOfBirth)}</TableCell>
											<TableCell>{formatSex(patient.sex)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				) : (
					<Card>
						<CardContent className="flex flex-col items-center gap-4 py-12">
							<p className="text-muted-foreground text-sm">
								{offlinePatients.length > 0
									? "No cached patients match your search criteria."
									: "No offline cache is available for this facility."}
							</p>
						</CardContent>
					</Card>
				)}
			</>
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

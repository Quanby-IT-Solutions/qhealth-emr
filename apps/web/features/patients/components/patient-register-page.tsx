"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
	Activity,
	ArrowRight,
	CalendarDays,
	Search,
	Sparkles,
	UserRound,
	UserRoundPlus,
	WifiOff,
	type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { DatePicker } from "@/core/components/ui/date-picker"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Separator } from "@/core/components/ui/separator"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { isCoordinatorRole } from "@/features/app-shell/lib/navigation"
import { useCreateEncounterMutation } from "@/features/encounters/api/encounters.hooks"
import { useOfflinePatients } from "@/features/offline-cache/lib/use-offline-patients"
import { LinkTriageBanner } from "@/features/opd-triage/components/link-triage-banner"
import { usePatientSearchQuery } from "@/features/patients/api/patients.hooks"
import { PatientListCard } from "@/features/patients/components/patient-list-page"
import { PatientRegistrationForm } from "@/features/patients/components/patient-registration-form"
import { PatientRegistrationShell } from "@/features/patients/components/patient-registration-shell"

const DATE_OF_BIRTH_END_YEAR = new Date().getFullYear()

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateVal: Date | string | null) {
	if (!dateVal) return "—"
	const date = dateVal instanceof Date ? dateVal : new Date(dateVal)
	return date.toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

function formatPatientName({
	firstName,
	lastName,
	middleName,
}: {
	firstName: string
	lastName: string
	middleName: string | null
}) {
	return [firstName, middleName, lastName].filter(Boolean).join(" ")
}

function normalizeSearchTokens(search: string) {
	return search
		.trim()
		.replaceAll(",", " ")
		.split(/\s+/)
		.map(token => token.trim().toLowerCase())
		.filter(Boolean)
}

function matchesPatientNameSearch(
	patient: {
		firstName: string
		middleName?: string | null
		lastName: string
		mrn: string
	},
	search: string
) {
	const tokens = normalizeSearchTokens(search)
	if (tokens.length === 0) return true
	const fields = [patient.firstName, patient.middleName ?? "", patient.lastName, patient.mrn].map(
		value => value.toLowerCase()
	)
	return tokens.every(token => fields.some(field => field.includes(token)))
}

function SearchField({
	htmlFor,
	label,
	icon: Icon,
	children,
}: {
	htmlFor: string
	label: string
	icon: LucideIcon
	children: ReactNode
}) {
	return (
		<div className="space-y-2">
			<Label
				htmlFor={htmlFor}
				className="text-muted-foreground flex items-center gap-2 text-[0.68rem] font-medium tracking-[0.22em] uppercase"
			>
				<Icon className="size-3.5" />
				<span>{label}</span>
			</Label>
			{children}
		</div>
	)
}

function SearchStateCard({
	title,
	description,
	action,
}: {
	title: string
	description: string
	action?: ReactNode
}) {
	return (
		<div className="border-border/60 bg-secondary/40 rounded-2xl border border-dashed px-6 py-10 text-center">
			<div className="mx-auto flex max-w-md flex-col items-center gap-4">
				<div className="bg-background text-muted-foreground flex size-11 items-center justify-center rounded-full shadow-sm">
					<Sparkles className="size-5" />
				</div>
				<div className="space-y-2">
					<h3 className="text-foreground text-lg font-semibold tracking-tight">{title}</h3>
					<p className="text-muted-foreground text-sm">{description}</p>
				</div>
				{action}
			</div>
		</div>
	)
}

// ============================================================================
// RegistrationWizard — full search → register → MRN issued flow inside dialog
// ============================================================================

function RegistrationWizard({ onClose }: { onClose: () => void }) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const pendingTriageId = searchParams.get("pendingTriageId") ?? ""
	const facilityId = useActiveFacilityId() ?? ""
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	const activeStaffProfile =
		profile?.staffProfiles?.find(staffProfile =>
			staffProfile.roles?.some(role => role.id === profile.activeRole?.id)
		) ?? profile?.staffProfiles?.[0]
	const staffId = activeStaffProfile?.id ?? ""

	const canOpenRegistrationWorkflow = permissions.some(
		permission => permission.module === "adt" && permission.action === "create"
	)
	const canCreatePatient = permissions.some(
		permission => permission.module === "patients" && permission.action === "create"
	)
	const canSearchPatients = permissions.some(
		permission => permission.module === "patients" && permission.action === "view"
	)
	const canTriage = permissions.some(
		permission =>
			permission.module === "opd" &&
			(permission.action === "create" || permission.action === "edit")
	)
	const isBreakGlassEnforced = permissions.some(
		permission => permission.module === "audit" && permission.action === "create"
	)
	const isClinicCoordinator = isCoordinatorRole(profile?.activeRole?.name)
	const shouldUseDirectOpdRegistration = isClinicCoordinator && !pendingTriageId
	const shouldStartAtForm =
		shouldUseDirectOpdRegistration || (canOpenRegistrationWorkflow && !canSearchPatients)

	const [wizardStep, setWizardStep] = useState<"search" | "form">(
		shouldStartAtForm ? "form" : "search"
	)
	const [nameFilter, setNameFilter] = useState("")
	const [birthdateFilter, setBirthdateFilter] = useState("")
	const [mrnFilter, setMrnFilter] = useState("")
	const [selectedForTriage, setSelectedForTriage] = useState<string | null>(null)
	const [triageQueueResult, setTriageQueueResult] = useState<{
		queueNumber: number
		encounterId: string
		patientId: string
	} | null>(null)
	const [committedParams, setCommittedParams] = useState<{
		facilityId: string
		search?: string
		dateOfBirth?: string
		mrn?: string
		page: number
		limit: number
		clinicianStaffId?: string
	} | null>(null)

	const trimmedNameFilter = nameFilter.trim()
	const trimmedMrnFilter = mrnFilter.trim()
	const hasNameFilter = trimmedNameFilter.length > 0
	const hasBirthdateFilter = birthdateFilter.length > 0
	const hasMrnFilter = trimmedMrnFilter.length > 0
	const hasSearchInput = hasNameFilter || hasBirthdateFilter || hasMrnFilter
	const hasBirthdateOnly = hasBirthdateFilter && !hasNameFilter && !hasMrnFilter
	const canRunSearch = !!facilityId && canSearchPatients && (hasMrnFilter || hasNameFilter)

	const createEncounter = useCreateEncounterMutation()
	const { isOnline, offlinePatients, cachedAt } = useOfflinePatients()

	useEffect(() => {
		if (shouldUseDirectOpdRegistration) {
			setWizardStep("form")
		}
	}, [shouldUseDirectOpdRegistration])

	const { data, isLoading, isFetching } = usePatientSearchQuery(
		committedParams ?? {
			facilityId,
			page: 1,
			limit: 50,
			clinicianStaffId: isBreakGlassEnforced && staffId ? staffId : undefined,
		},
		{ enabled: canSearchPatients && !!facilityId && !!committedParams && isOnline }
	)

	const results = data?.data ?? []
	const hasSearched = !!committedParams
	const selectedPatient = results.find(patient => patient.id === selectedForTriage) ?? null
	const selectedPatientName = selectedPatient ? formatPatientName(selectedPatient) : null

	const filteredOfflinePatients = useMemo(() => {
		if (isOnline || !committedParams || committedParams.mrn) return []
		const searchTerm = (committedParams.search ?? "").toLowerCase()
		const dateOfBirth = committedParams.dateOfBirth
		return offlinePatients.filter(patient => {
			const nameMatch = matchesPatientNameSearch(patient, searchTerm)
			const dobMatch = !dateOfBirth || patient.dateOfBirth === dateOfBirth
			return patient.isActive && nameMatch && dobMatch
		})
	}, [committedParams, isOnline, offlinePatients])

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault()
		if (!facilityId || !canSearchPatients) return
		if (!hasMrnFilter && !hasNameFilter) {
			toast.error("Enter a patient name or MRN to search. Date of birth is optional.")
			return
		}
		setSelectedForTriage(null)
		setCommittedParams({
			facilityId,
			search: trimmedNameFilter || undefined,
			dateOfBirth: birthdateFilter || undefined,
			mrn: trimmedMrnFilter || undefined,
			page: 1,
			limit: 50,
			clinicianStaffId: isBreakGlassEnforced && staffId ? staffId : undefined,
		})
	}

	const handleClear = () => {
		setNameFilter("")
		setBirthdateFilter("")
		setMrnFilter("")
		setSelectedForTriage(null)
		setCommittedParams(null)
	}

	const handleLinkedTriage = async (
		patientId: string,
		clinicianStaffId: string,
		chiefComplaint: string | undefined
	) => {
		if (!facilityId || !pendingTriageId || !staffId) return
		const encounter = await createEncounter.mutateAsync({
			facilityId,
			patientId,
			encounterType: "outpatient",
			triageIntakeId: pendingTriageId,
			chiefComplaint,
			admittingStaffId: staffId,
			clinicianStaffId,
			consentCaptured: true,
		})
		if (encounter.queueNumber !== null) {
			setTriageQueueResult({
				queueNumber: encounter.queueNumber,
				encounterId: encounter.id,
				patientId,
			})
		} else {
			router.push(`/patients/${patientId}/encounters/${encounter.id}`)
		}
	}

	// Form step
	if (wizardStep === "form") {
		return (
			<PatientRegistrationForm
				mode={
					pendingTriageId
						? "triage-linked"
						: shouldUseDirectOpdRegistration
							? "opd-direct"
							: "standalone"
				}
				onBack={() => (shouldUseDirectOpdRegistration ? onClose() : setWizardStep("search"))}
			/>
		)
	}

	// Search step
	const searchTitle = pendingTriageId
		? "Link the triage intake to the right patient record"
		: "Find an existing record before you register"
	const searchSubtitle = pendingTriageId
		? "Search for an existing patient to reconcile this walk-in triage intake, or continue to new-patient registration when no record exists."
		: "Search by patient name, optionally add date of birth to narrow the results, or use an MRN to avoid duplicate charts before issuing a new record."
	const helperCopy = pendingTriageId
		? "Search for the patient who already has a chart, or continue with new-patient registration if this is the first visit."
		: "Check the registry first so we only create a chart when a match does not already exist."

	return (
		<PatientRegistrationShell
			step="search"
			title={searchTitle}
			subtitle={searchSubtitle}
			notice={
				pendingTriageId || !isOnline ? (
					<div className="space-y-4">
						{pendingTriageId && (
							<LinkTriageBanner
								pendingTriageId={pendingTriageId}
								facilityId={facilityId}
								selectedPatientId={selectedForTriage ?? null}
								selectedPatientName={selectedPatientName}
								onLinked={handleLinkedTriage}
							/>
						)}
						{!isOnline && (
							<Alert className="border-border/60 bg-secondary/40">
								<WifiOff className="size-4" />
								<AlertTitle>Working offline</AlertTitle>
								<AlertDescription>
									{offlinePatients.length > 0
										? `Search is using the cached patient list (${offlinePatients.length.toLocaleString()} patients${cachedAt ? `, last updated ${new Date(cachedAt).toLocaleString("en-PH")}` : ""}).`
										: "No offline cache is available for this facility. Reconnect to search patients."}
								</AlertDescription>
							</Alert>
						)}
					</div>
				) : undefined
			}
		>
			<Card className="border-border/60 bg-card shadow-sm">
				<CardHeader className="border-border/60 border-b pb-6">
					<div className="flex items-start gap-3">
						<div className="bg-secondary/60 text-muted-foreground flex size-10 items-center justify-center rounded-xl">
							<Search className="size-4" />
						</div>
						<div className="space-y-1">
							<CardTitle className="tracking-tight">Search existing patients</CardTitle>
							<CardDescription>{helperCopy}</CardDescription>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-6 pt-6">
					<form onSubmit={handleSearch} className="space-y-6">
						<div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_auto_minmax(0,1fr)]">
							<div className="grid gap-4 md:grid-cols-2">
								<SearchField htmlFor="patient-name" label="Patient name" icon={UserRound}>
									<Input
										id="patient-name"
										placeholder="Enter first, middle, or last name"
										value={nameFilter}
										className="border-border/60 bg-background h-11 rounded-xl"
										onChange={e => setNameFilter(e.target.value)}
									/>
								</SearchField>

								<SearchField htmlFor="patient-birthdate" label="Date of birth" icon={CalendarDays}>
									<DatePicker
										id="patient-birthdate"
										value={birthdateFilter}
										className="border-border/60 bg-background h-11 rounded-xl"
										onChange={setBirthdateFilter}
										endYear={DATE_OF_BIRTH_END_YEAR}
									/>
								</SearchField>
							</div>

							<div className="hidden items-center justify-center lg:flex">
								<div className="flex h-full items-center gap-3">
									<div className="bg-border/60 h-full w-px" />
									<span className="text-muted-foreground text-[0.68rem] font-medium tracking-[0.24em] uppercase">
										Or
									</span>
									<div className="bg-border/60 h-full w-px" />
								</div>
							</div>

							<div className="space-y-6">
								<div className="flex items-center gap-3 lg:hidden">
									<Separator className="bg-border/60 flex-1" />
									<span className="text-muted-foreground text-[0.68rem] font-medium tracking-[0.24em] uppercase">
										Or
									</span>
									<Separator className="bg-border/60 flex-1" />
								</div>

								<SearchField htmlFor="patient-mrn" label="MRN" icon={Search}>
									<Input
										id="patient-mrn"
										placeholder="Enter the patient MRN"
										value={mrnFilter}
										className="border-border/60 bg-background h-11 rounded-xl"
										onChange={e => setMrnFilter(e.target.value)}
									/>
								</SearchField>
							</div>
						</div>

						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="text-muted-foreground text-sm">
								{hasBirthdateOnly
									? "Add a patient name or MRN. Date of birth only narrows the results."
									: !canSearchPatients
										? "Search is unavailable for your current role."
										: "Search by patient name, optionally add date of birth, or use an MRN."}
							</div>

							<div className="flex justify-end gap-3">
								<Button
									type="button"
									variant="ghost"
									onClick={handleClear}
									disabled={!hasSearchInput && !hasSearched}
								>
									Clear
								</Button>
								<Button type="submit" disabled={!canRunSearch}>
									<Search className="size-4" />
									{isFetching ? "Searching..." : "Search"}
								</Button>
							</div>
						</div>
					</form>

					{hasSearched && (
						<div className="space-y-5">
							<Separator className="bg-border/60" />

							<div className="flex flex-wrap items-center justify-between gap-3">
								<p className="text-foreground text-sm font-medium tracking-tight">
									{isLoading
										? "Searching patients"
										: `${results.length} ${results.length === 1 ? "match" : "matches"} found`}
								</p>
								{isFetching && !isLoading && (
									<p className="text-muted-foreground text-xs">Refreshing results…</p>
								)}
							</div>

							{isLoading ? (
								<div className="border-border/60 bg-secondary/40 text-muted-foreground rounded-2xl border border-dashed px-6 py-10 text-center text-sm">
									Checking the patient registry for matching records…
								</div>
							) : results.length > 0 ? (
								<div className="border-border/60 bg-background overflow-hidden rounded-2xl border">
									{results.map(patient => {
										const meta = [
											`DOB ${formatDate(patient.dateOfBirth)}`,
											patient.philhealthMemberId
												? `PhilHealth ${patient.philhealthMemberId}`
												: "No PhilHealth on file",
											patient.lastEncounterDate
												? `Last encounter ${formatDate(patient.lastEncounterDate)}`
												: "No prior encounter",
										]

										return (
											<div
												key={patient.id}
												className="border-border/60 flex flex-col gap-4 border-b px-5 py-4 last:border-b-0 md:flex-row md:items-center md:justify-between"
											>
												<div className="min-w-0 space-y-2">
													<div className="flex flex-wrap items-center gap-3">
														<h3 className="text-foreground text-base font-semibold tracking-tight">
															{formatPatientName(patient)}
														</h3>
														<Badge
															variant="secondary"
															className="border-border/60 bg-secondary/60 text-foreground rounded-full border px-2.5 py-1 font-mono text-[0.72rem] tracking-[0.16em]"
														>
															{patient.mrn}
														</Badge>
														{isBreakGlassEnforced && patient.hasDirectAccess === false && (
															<Badge variant="outline" className="rounded-full">
																Restricted
															</Badge>
														)}
													</div>
													<p className="text-muted-foreground text-sm">{meta.join(" · ")}</p>
												</div>

												<div className="flex flex-wrap justify-end gap-2">
													<Button
														variant="ghost"
														size="sm"
														className="justify-between"
														nativeButton={false}
														render={<Link href={`/patients/${patient.id}?from=register`} />}
													>
														Open
														<ArrowRight className="size-4" />
													</Button>

													{pendingTriageId ? (
														<Button
															size="sm"
															variant={selectedForTriage === patient.id ? "default" : "outline"}
															onClick={() =>
																setSelectedForTriage(
																	selectedForTriage === patient.id ? null : patient.id
																)
															}
															disabled={!isOnline}
														>
															{selectedForTriage === patient.id ? "Selected" : "Select"}
														</Button>
													) : canTriage ? (
														<Button
															size="sm"
															variant="outline"
															className="border-border/60 bg-background"
															nativeButton={false}
															render={<Link href={`/patients/${patient.id}/triage/new`} />}
														>
															<Activity className="size-3.5" />
															Start triage
														</Button>
													) : null}
												</div>
											</div>
										)
									})}
								</div>
							) : (
								<SearchStateCard
									title="No matching patient found"
									description={
										pendingTriageId
											? "No existing record matched the triage details you entered. Continue with new-patient registration if this is the patient's first visit."
											: canOpenRegistrationWorkflow
												? "No existing record matched the details you entered. You can continue and register a new patient record now."
												: "No existing record matched the details you entered."
									}
									action={
										canCreatePatient ? (
											<Button onClick={() => setWizardStep("form")}>
												<UserRoundPlus className="size-4" />
												Register new patient
											</Button>
										) : !pendingTriageId && canTriage ? (
											<Button
												variant="outline"
												className="border-border/60 bg-background"
												nativeButton={false}
												render={<Link href="/triage/new" />}
											>
												<Activity className="size-4" />
												Walk-in triage
											</Button>
										) : undefined
									}
								/>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{!isOnline && hasSearched && results.length === 0 && !isLoading && (
				<Card className="border-border/60 bg-card mt-6 shadow-sm">
					<CardHeader className="border-border/60 border-b pb-5">
						<div className="flex items-start gap-3">
							<div className="bg-secondary/60 text-muted-foreground flex size-10 items-center justify-center rounded-xl">
								<WifiOff className="size-4" />
							</div>
							<div className="space-y-1">
								<CardTitle className="tracking-tight">Cached patients</CardTitle>
								<CardDescription>
									Offline search is limited to the locally cached patient list for this facility.
								</CardDescription>
							</div>
						</div>
					</CardHeader>

					<CardContent className="pt-6">
						{filteredOfflinePatients.length > 0 ? (
							<div className="border-border/60 bg-background overflow-hidden rounded-2xl border">
								{filteredOfflinePatients.map(patient => (
									<div
										key={patient.id}
										className="border-border/60 flex flex-col gap-4 border-b px-5 py-4 last:border-b-0 md:flex-row md:items-center md:justify-between"
									>
										<div className="min-w-0 space-y-2">
											<div className="flex flex-wrap items-center gap-3">
												<h3 className="text-foreground text-base font-semibold tracking-tight">
													{patient.firstName} {patient.lastName}
												</h3>
												<Badge
													variant="secondary"
													className="border-border/60 bg-secondary/60 text-foreground rounded-full border px-2.5 py-1 font-mono text-[0.72rem] tracking-[0.16em]"
												>
													{patient.mrn}
												</Badge>
											</div>
											<p className="text-muted-foreground text-sm">
												DOB {formatDate(patient.dateOfBirth)} ·{" "}
												{patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1)}
											</p>
										</div>

										<Button
											variant="ghost"
											size="sm"
											className="justify-between"
											nativeButton={false}
											render={<Link href={`/patients/${patient.id}?from=register`} />}
										>
											Open
											<ArrowRight className="size-4" />
										</Button>
									</div>
								))}
							</div>
						) : (
							<div className="border-border/60 bg-secondary/40 text-muted-foreground rounded-2xl border border-dashed px-6 py-10 text-center text-sm">
								{offlinePatients.length > 0
									? "No cached patients match your search criteria."
									: "No offline cache is available for this facility."}
							</div>
						)}
					</CardContent>
				</Card>
			)}

			<Dialog
				open={!!triageQueueResult}
				onOpenChange={open => {
					if (!open) setTriageQueueResult(null)
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Triage registration complete</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col items-center gap-3 py-4">
						<p className="text-muted-foreground text-sm">
							Queue number assigned for {selectedPatientName}
						</p>
						<Badge className="bg-foreground text-background px-8 py-4 text-5xl font-bold tabular-nums">
							{triageQueueResult?.queueNumber}
						</Badge>
						<p className="text-muted-foreground text-xs">Hand this number to the patient</p>
					</div>
					<DialogFooter>
						<Button variant="outline" className="border-border/60 bg-background" onClick={onClose}>
							Next patient
						</Button>
						<Button
							onClick={() =>
								router.push(
									`/patients/${triageQueueResult?.patientId}/encounters/${triageQueueResult?.encounterId}`
								)
							}
						>
							View encounter
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</PatientRegistrationShell>
	)
}

// ============================================================================
// PatientRegisterPageContent — page layout: patient list + registration dialog
// ============================================================================

export function PatientRegisterPageContent() {
	const searchParams = useSearchParams()
	const pendingTriageId = searchParams.get("pendingTriageId") ?? ""

	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	const canCreatePatient = permissions.some(
		permission => permission.module === "patients" && permission.action === "create"
	)
	const isClinicCoordinator = isCoordinatorRole(profile?.activeRole?.name)

	// Auto-open the wizard when a triage intake is pending
	const [isDialogOpen, setIsDialogOpen] = useState(!!pendingTriageId)

	return (
		<div className="flex min-h-svh flex-col">
			<header className="bg-background/80 supports-backdrop-filter:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
				<div className="flex h-14 items-center gap-3 px-4">
					<div className="min-w-0 flex-1">
						<h1 className="truncate text-base font-semibold tracking-tight">Patient Management</h1>
					</div>
					{canCreatePatient && (
						<Button size="sm" className="shrink-0" onClick={() => setIsDialogOpen(true)}>
							<UserRoundPlus className="size-4" />
							<span className="hidden sm:inline">Register new patient</span>
							<span className="sm:hidden">Register</span>
						</Button>
					)}
				</div>
			</header>

			<main className="flex-1 space-y-5 p-4 md:p-6">
				<PatientListCard showCoordinatorFilters={isClinicCoordinator} />
			</main>

			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent size="stepper">
					<RegistrationWizard onClose={() => setIsDialogOpen(false)} />
				</DialogContent>
			</Dialog>
		</div>
	)
}

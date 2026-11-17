"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowRight, Baby, Loader2, Search, ShieldAlert, UserRound, WifiOff } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { orpc } from "@/services/orpc/client"
import { BreakGlassForm } from "@/features/audit/components/break-glass-form"
import { useOfflinePatients } from "@/features/offline-cache/lib/use-offline-patients"
import { usePatientSearchQuery } from "@/features/patients/api/patients.hooks"

const BREAK_GLASS_REQUIRED_MESSAGE = "Break-glass required for this patient chart."
const PATIENTS_PAGE_SIZE = 8

type PatientStatusFilter = "active" | "inactive"

const patientStatusFilterLabels: Record<PatientStatusFilter, string> = {
	active: "Active",
	inactive: "Inactive",
}

const coordinatorFilterFieldClassName = "flex min-w-0 flex-col gap-1"
const coordinatorFilterLabelClassName = "text-muted-foreground h-4 text-xs font-medium leading-4"
const coordinatorFilterControlClassName = "h-8 w-full rounded-full px-4"

function isBreakGlassRequiredError(error: unknown) {
	if (!error || typeof error !== "object") return false
	const candidate = error as { status?: number; message?: string } | null
	return (
		candidate?.message?.includes(BREAK_GLASS_REQUIRED_MESSAGE) === true ||
		String(error).includes(BREAK_GLASS_REQUIRED_MESSAGE)
	)
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateVal: string | null | undefined) {
	if (!dateVal) return "—"
	return new Date(dateVal).toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

function formatPatientName({
	firstName,
	middleName,
	lastName,
}: {
	firstName: string
	middleName?: string | null
	lastName: string
}) {
	return [firstName, middleName, lastName].filter(Boolean).join(" ")
}

function calculateAge(dateOfBirth: string): string {
	const dob = new Date(dateOfBirth)
	const today = new Date()
	const ageMs = today.getTime() - dob.getTime()
	const ageDays = ageMs / (1000 * 60 * 60 * 24)
	if (ageDays < 30) return `${Math.floor(ageDays)}d`
	const ageYears = Math.floor(ageDays / 365)
	return `${ageYears} yrs`
}

function isNewborn(dateOfBirth: string): boolean {
	return (Date.now() - new Date(dateOfBirth).getTime()) / (1000 * 60 * 60 * 24) < 30
}

// ============================================================================
// PatientListCard — self-contained patient list with break-glass support
// ============================================================================

interface PatientListCardProps {
	showCoordinatorFilters?: boolean
}

export function PatientListCard({ showCoordinatorFilters = false }: PatientListCardProps = {}) {
	const facilityId = useActiveFacilityId() ?? ""
	const [filter, setFilter] = useState("")
	const [patientStatusFilter, setPatientStatusFilter] = useState<PatientStatusFilter>("active")
	const [mrnFilter, setMrnFilter] = useState("")
	const [dateOfBirthFilter, setDateOfBirthFilter] = useState("")
	const [philhealthFilter, setPhilhealthFilter] = useState("")
	const [page, setPage] = useState(1)
	const [breakGlassPatientId, setBreakGlassPatientId] = useState<string | null>(null)
	const [checkingPatientId, setCheckingPatientId] = useState<string | null>(null)
	const router = useRouter()
	const queryClient = useQueryClient()

	const handleOpenChart = async (patientId: string) => {
		setCheckingPatientId(patientId)
		try {
			await queryClient.fetchQuery(orpc.patient.get.queryOptions({ input: { id: patientId } }))
			router.push(`/patients/${patientId}?from=list`)
		} catch (error) {
			if (isBreakGlassRequiredError(error)) {
				setBreakGlassPatientId(patientId)
			} else {
				router.push(`/patients/${patientId}?from=list`)
			}
		} finally {
			setCheckingPatientId(null)
		}
	}

	const { isOnline, offlinePatients, cachedAt } = useOfflinePatients()

	const trimmedSearch = filter.trim()
	const normalizedSearch = trimmedSearch.toLowerCase()
	const trimmedMrnFilter = mrnFilter.trim()
	const normalizedMrnFilter = trimmedMrnFilter.toLowerCase()
	const trimmedPhilhealthFilter = philhealthFilter.trim()
	const normalizedPhilhealthFilter = trimmedPhilhealthFilter.toLowerCase()
	const isActiveFilter = patientStatusFilter === "active"
	const hasCoordinatorFilters =
		showCoordinatorFilters &&
		(patientStatusFilter !== "active" ||
			!!trimmedMrnFilter ||
			!!dateOfBirthFilter ||
			!!trimmedPhilhealthFilter)
	const hasVisibleFilters = !!trimmedSearch || hasCoordinatorFilters

	useEffect(() => {
		setPage(1)
	}, [
		dateOfBirthFilter,
		isActiveFilter,
		normalizedMrnFilter,
		normalizedPhilhealthFilter,
		normalizedSearch,
	])

	const { data, isLoading, isFetching } = usePatientSearchQuery(
		{
			facilityId,
			isActive: isActiveFilter,
			search: trimmedSearch || undefined,
			mrn: showCoordinatorFilters ? trimmedMrnFilter || undefined : undefined,
			dateOfBirth: showCoordinatorFilters ? dateOfBirthFilter || undefined : undefined,
			philhealthMemberId: showCoordinatorFilters ? trimmedPhilhealthFilter || undefined : undefined,
			page,
			limit: PATIENTS_PAGE_SIZE,
		},
		{ enabled: !!facilityId && isOnline }
	)

	const offlineFiltered = useMemo(() => {
		return offlinePatients.filter(p => {
			const name = formatPatientName(p).toLowerCase()
			const mrn = (p.mrn ?? "").toLowerCase()
			const matchesSearch =
				!normalizedSearch || name.includes(normalizedSearch) || mrn.includes(normalizedSearch)

			if (!showCoordinatorFilters) return matchesSearch

			const matchesStatus = p.isActive === isActiveFilter
			const matchesMrn = !normalizedMrnFilter || mrn.includes(normalizedMrnFilter)
			const matchesDateOfBirth = !dateOfBirthFilter || p.dateOfBirth === dateOfBirthFilter
			const matchesPhilhealth = !normalizedPhilhealthFilter

			return matchesSearch && matchesStatus && matchesMrn && matchesDateOfBirth && matchesPhilhealth
		})
	}, [
		dateOfBirthFilter,
		isActiveFilter,
		normalizedMrnFilter,
		normalizedPhilhealthFilter,
		normalizedSearch,
		offlinePatients,
		showCoordinatorFilters,
	])

	const filterDescriptions = useMemo(() => {
		const descriptions: string[] = []
		if (trimmedSearch) descriptions.push(`matching "${trimmedSearch}"`)
		if (showCoordinatorFilters && patientStatusFilter === "inactive") {
			descriptions.push("inactive records")
		}
		if (showCoordinatorFilters && trimmedMrnFilter) {
			descriptions.push(`MRN "${trimmedMrnFilter}"`)
		}
		if (showCoordinatorFilters && dateOfBirthFilter) {
			descriptions.push(`DOB ${formatDate(dateOfBirthFilter)}`)
		}
		if (showCoordinatorFilters && trimmedPhilhealthFilter) {
			descriptions.push(`PhilHealth "${trimmedPhilhealthFilter}"`)
		}
		return descriptions
	}, [
		dateOfBirthFilter,
		patientStatusFilter,
		showCoordinatorFilters,
		trimmedMrnFilter,
		trimmedPhilhealthFilter,
		trimmedSearch,
	])

	const totalPatients = isOnline ? (data?.total ?? 0) : offlineFiltered.length
	const totalPages = Math.max(
		1,
		isOnline ? (data?.totalPages ?? 1) : Math.ceil(totalPatients / PATIENTS_PAGE_SIZE)
	)
	const currentPage = Math.min(page, totalPages)

	const pagePatients = useMemo(() => {
		if (isOnline) return data?.data ?? []
		const start = (currentPage - 1) * PATIENTS_PAGE_SIZE
		return offlineFiltered.slice(start, start + PATIENTS_PAGE_SIZE)
	}, [currentPage, data?.data, isOnline, offlineFiltered])

	const hasPreviousPage = currentPage > 1
	const hasNextPage = currentPage < totalPages
	const pageStart = totalPatients === 0 ? 0 : (currentPage - 1) * PATIENTS_PAGE_SIZE + 1
	const pageEnd = Math.min(currentPage * PATIENTS_PAGE_SIZE, totalPatients)
	const filterSummary = filterDescriptions.length > 0 ? ` ${filterDescriptions.join(", ")}` : ""
	const emptyListMessage = hasVisibleFilters
		? showCoordinatorFilters
			? "No patients match the selected filters."
			: `No patients match "${filter}".`
		: isActiveFilter
			? "No active patients found."
			: "No inactive patients found."

	const clearCoordinatorFilters = () => {
		setFilter("")
		setPatientStatusFilter("active")
		setMrnFilter("")
		setDateOfBirthFilter("")
		setPhilhealthFilter("")
	}

	return (
		<>
			{!isOnline && (
				<div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
					<WifiOff className="mt-0.5 size-4 shrink-0 text-amber-600" />
					<div>
						<p className="font-medium text-amber-800 dark:text-amber-300">Working offline</p>
						<p className="text-amber-700 dark:text-amber-400">
							{offlinePatients.length > 0
								? `Showing ${offlinePatients.length.toLocaleString()} cached patients${cachedAt ? ` · Last updated ${new Date(cachedAt).toLocaleString("en-PH")}` : ""}.`
								: "No offline cache available. Reconnect to load patients."}
						</p>
					</div>
				</div>
			)}

			<Card className="border-border/60 bg-card shadow-sm">
				<CardHeader className="border-border/60 border-b pb-3">
					<div className="flex items-start gap-3">
						<div className="bg-secondary/60 text-muted-foreground flex size-10 items-center justify-center rounded-xl">
							<UserRound className="size-4" />
						</div>
						<div className="space-y-1">
							<CardTitle className="tracking-tight">Patient List</CardTitle>
							<CardDescription>
								{showCoordinatorFilters
									? "Browse patient records. Filter by name, MRN, date of birth, PhilHealth, or status."
									: "Browse all active patients. Search by name or MRN to open a chart."}
							</CardDescription>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-3 pt-3">
					{showCoordinatorFilters ? (
						<div className="bg-muted/25 rounded-lg border px-4 py-5">
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(220px,1.4fr)_minmax(130px,0.8fr)_minmax(130px,0.8fr)_minmax(140px,0.8fr)_minmax(170px,1fr)_auto] xl:items-start">
								<div className={coordinatorFilterFieldClassName}>
									<label className={coordinatorFilterLabelClassName}>Search</label>
									<Input
										value={filter}
										onChange={event => setFilter(event.target.value)}
										placeholder="Patient name"
										aria-label="Search patients"
										className={coordinatorFilterControlClassName}
									/>
								</div>
								<div className={coordinatorFilterFieldClassName}>
									<label className={coordinatorFilterLabelClassName}>Status</label>
									<Select
										value={patientStatusFilter}
										onValueChange={value => setPatientStatusFilter(value as PatientStatusFilter)}
									>
										<SelectTrigger
											aria-label="Filter patient status"
											className={coordinatorFilterControlClassName}
										>
											<SelectValue>{patientStatusFilterLabels[patientStatusFilter]}</SelectValue>
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="active">Active</SelectItem>
											<SelectItem value="inactive">Inactive</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className={coordinatorFilterFieldClassName}>
									<label className={coordinatorFilterLabelClassName}>MRN</label>
									<Input
										value={mrnFilter}
										onChange={event => setMrnFilter(event.target.value)}
										placeholder="Any MRN"
										aria-label="Filter by MRN"
										className={coordinatorFilterControlClassName}
									/>
								</div>
								<div className={coordinatorFilterFieldClassName}>
									<label className={coordinatorFilterLabelClassName}>Date of Birth</label>
									<Input
										type="date"
										value={dateOfBirthFilter}
										onChange={event => setDateOfBirthFilter(event.target.value)}
										aria-label="Filter by date of birth"
										className={coordinatorFilterControlClassName}
									/>
								</div>
								<div className={coordinatorFilterFieldClassName}>
									<label className={coordinatorFilterLabelClassName}>PhilHealth</label>
									<Input
										value={philhealthFilter}
										onChange={event => setPhilhealthFilter(event.target.value)}
										placeholder="Any ID"
										aria-label="Filter by PhilHealth ID"
										className={coordinatorFilterControlClassName}
									/>
								</div>
								<div className={coordinatorFilterFieldClassName}>
									<label
										className={`${coordinatorFilterLabelClassName} invisible`}
										aria-hidden="true"
									>
										Actions
									</label>
									<Button
										type="button"
										variant="outline"
										onClick={clearCoordinatorFilters}
										disabled={!hasVisibleFilters}
										className="h-8 w-full rounded-full px-5 xl:w-fit"
									>
										Clear
									</Button>
								</div>
							</div>
						</div>
					) : (
						<div className="relative">
							<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
							<Input
								placeholder="Filter by name or MRN…"
								value={filter}
								onChange={e => setFilter(e.target.value)}
								className="border-border/60 bg-background h-9 rounded-xl pl-9"
							/>
						</div>
					)}

					{isLoading && isOnline ? (
						<div className="border-border/60 bg-secondary/40 text-muted-foreground rounded-2xl border border-dashed px-6 py-10 text-center text-sm">
							Loading patients…
						</div>
					) : pagePatients.length === 0 ? (
						<div className="border-border/60 bg-secondary/40 text-muted-foreground rounded-2xl border border-dashed px-6 py-10 text-center text-sm">
							{emptyListMessage}
						</div>
					) : (
						<>
							<p className="text-muted-foreground px-0.5 text-xs">
								Showing {pageStart}-{pageEnd} of {totalPatients}{" "}
								{totalPatients === 1 ? "patient" : "patients"}
								{filterSummary}
								{isFetching && isOnline && " · Updating..."}
							</p>
							<div className="border-border/60 bg-background divide-border/60 divide-y overflow-hidden rounded-2xl border">
								{pagePatients.map(patient => {
									const name = formatPatientName(patient)
									const dob =
										"dateOfBirth" in patient ? (patient as { dateOfBirth: string }).dateOfBirth : ""
									const newborn = dob ? isNewborn(dob) : false
									const lastEncounter =
										"lastEncounterDate" in patient
											? (patient as { lastEncounterDate?: string | null }).lastEncounterDate
											: null

									return (
										<div
											key={patient.id}
											className="hover:bg-secondary/30 flex flex-col gap-2 px-4 py-2.5 transition-colors md:flex-row md:items-center md:justify-between"
										>
											<div className="min-w-0 space-y-1.5">
												<div className="flex flex-wrap items-center gap-2">
													<span className="text-foreground text-sm font-semibold tracking-tight">
														{name}
													</span>
													<Badge
														variant="secondary"
														className="border-border/60 bg-secondary/60 text-foreground rounded-full border px-2 py-0.5 font-mono text-[0.68rem] tracking-[0.14em]"
													>
														{patient.mrn}
													</Badge>
													{newborn && (
														<Badge className="gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[0.68rem] text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
															<Baby className="size-2.5" />
															Newborn
														</Badge>
													)}
												</div>
												<p className="text-muted-foreground text-xs">
													{dob ? `DOB ${formatDate(dob)} · Age ${calculateAge(dob)}` : ""}
													{lastEncounter ? ` · Last encounter ${formatDate(lastEncounter)}` : ""}
												</p>
											</div>

											<Button
												variant="ghost"
												size="sm"
												className="shrink-0 justify-between gap-2"
												disabled={checkingPatientId === patient.id}
												onClick={() => void handleOpenChart(patient.id)}
											>
												{checkingPatientId === patient.id ? (
													<>
														Checking…
														<Loader2 className="size-4 animate-spin" />
													</>
												) : (
													<>
														Open chart
														<ArrowRight className="size-4" />
													</>
												)}
											</Button>
										</div>
									)
								})}
							</div>
							<div className="flex flex-col gap-3 px-0.5 sm:flex-row sm:items-center sm:justify-between">
								<p className="text-muted-foreground text-xs">
									Page {currentPage} of {totalPages}
								</p>
								<div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
									<Button
										variant="outline"
										size="sm"
										disabled={!hasPreviousPage}
										onClick={() => setPage(prev => Math.max(1, prev - 1))}
									>
										Previous
									</Button>
									<Button
										variant="outline"
										size="sm"
										disabled={!hasNextPage}
										onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
									>
										Next
									</Button>
								</div>
							</div>
						</>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={!!breakGlassPatientId}
				onOpenChange={open => {
					if (!open) setBreakGlassPatientId(null)
				}}
			>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<div className="flex items-center gap-3">
							<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/40">
								<ShieldAlert className="size-5 text-orange-600 dark:text-orange-400" />
							</div>
							<div>
								<DialogTitle className="text-lg">Emergency Override Access</DialogTitle>
								<DialogDescription className="mt-0.5">
									Break-glass request required to access this patient record.
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>
					{breakGlassPatientId && (
						<BreakGlassForm
							patientId={breakGlassPatientId}
							facilityId={facilityId}
							entityType="patient"
							entityId={breakGlassPatientId}
							onSuccess={() => {
								const id = breakGlassPatientId
								setBreakGlassPatientId(null)
								router.push(`/patients/${id}?from=list`)
							}}
							onCancel={() => setBreakGlassPatientId(null)}
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	)
}

// ============================================================================
// PatientListPage — layout wrapper used by /patients/search route
// ============================================================================

export function PatientListPage() {
	return (
		<div className="flex min-h-svh flex-col">
			<header className="bg-background/80 supports-backdrop-filter:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
				<div className="flex h-11 items-center gap-2 px-3">
					<div className="flex-1">
						<h1 className="text-sm font-semibold tracking-tight">Patients</h1>
					</div>
				</div>
			</header>

			<main className="flex-1 space-y-3 p-3 md:p-4">
				<PatientListCard />
			</main>
		</div>
	)
}

"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
	ArrowRight,
	CalendarDays,
	Search,
	ShieldCheck,
	Sparkles,
	UserRound,
	UserRoundPlus,
	type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Separator } from "@/core/components/ui/separator"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { usePatientSearchQuery } from "@/features/patients/api/patients.hooks"
import { PatientRegistrationForm } from "@/features/patients/components/patient-registration-form"
import { PatientRegistrationShell } from "@/features/patients/components/patient-registration-shell"

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

function buildRegisterHref({ pendingTriageId, mode }: { pendingTriageId?: string; mode?: "new" }) {
	const params = new URLSearchParams()

	if (mode) {
		params.set("mode", mode)
	}

	if (pendingTriageId) {
		params.set("pendingTriageId", pendingTriageId)
	}

	const query = params.toString()
	return query ? `/patients/register?${query}` : "/patients/register"
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

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(
		permissions.map((permission: { module: string; action: string }) => {
			return `${permission.module}:${permission.action}`
		})
	)
}

function can(permSet: Set<string>, module: string, action: string) {
	return permSet.has(`${module}:${action}`)
}

export function PatientRegisterPageContent() {
	const searchParams = useSearchParams()
	const pendingTriageId = searchParams.get("pendingTriageId") ?? ""
	const showStandaloneForm = searchParams.get("mode") === "new" && !pendingTriageId
	const permSet = usePermissionSet()
	const facilityId = useActiveFacilityId() ?? ""

	const canAccessRegisterPage = can(permSet, "adt", "create")
	const canCreatePatient = can(permSet, "patients", "create")
	const canSearchPatients = can(permSet, "patients", "view")

	const [nameFilter, setNameFilter] = useState("")
	const [birthdateFilter, setBirthdateFilter] = useState("")
	const [philhealthFilter, setPhilhealthFilter] = useState("")
	const [committedParams, setCommittedParams] = useState<{
		facilityId: string
		search?: string
		dateOfBirth?: string
		philhealthMemberId?: string
		page: number
		limit: number
	} | null>(null)

	const trimmedNameFilter = nameFilter.trim()
	const trimmedPhilhealthFilter = philhealthFilter.trim()
	const hasNameFilter = trimmedNameFilter.length > 0
	const hasBirthdateFilter = birthdateFilter.length > 0
	const hasPhilhealthFilter = trimmedPhilhealthFilter.length > 0
	const hasNameDobSearch = hasNameFilter && hasBirthdateFilter
	const hasPartialNameDob = (hasNameFilter || hasBirthdateFilter) && !hasNameDobSearch
	const hasSearchInput = hasNameFilter || hasBirthdateFilter || hasPhilhealthFilter
	const canRunSearch =
		!!facilityId && canSearchPatients && (hasPhilhealthFilter || hasNameDobSearch)

	const { data, isLoading, isFetching } = usePatientSearchQuery(
		committedParams ?? { facilityId, page: 1, limit: 50 },
		{ enabled: canSearchPatients && !!facilityId && !!committedParams }
	)

	const results = data?.data ?? []
	const hasSearched = !!committedParams
	const newPatientHref = buildRegisterHref({ mode: "new" })
	const primaryButtonClassName = "bg-foreground text-background hover:bg-foreground/90"

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault()

		if (!facilityId || !canSearchPatients) {
			return
		}

		if (!hasPhilhealthFilter && !hasNameDobSearch) {
			toast.error("Search with both the full name and date of birth, or use a PhilHealth number.")
			return
		}

		setCommittedParams({
			facilityId,
			search: trimmedNameFilter || undefined,
			dateOfBirth: birthdateFilter || undefined,
			philhealthMemberId: trimmedPhilhealthFilter || undefined,
			page: 1,
			limit: 50,
		})
	}

	const handleClear = () => {
		setNameFilter("")
		setBirthdateFilter("")
		setPhilhealthFilter("")
		setCommittedParams(null)
	}

	if (!canAccessRegisterPage) {
		return (
			<PatientRegistrationShell
				step="search"
				title="Patient registration is unavailable"
				subtitle="Your current role does not have access to open the registration workflow."
			>
				<Card className="border-border/60 bg-card shadow-sm">
					<CardContent className="text-muted-foreground flex min-h-56 items-center justify-center px-6 py-16 text-center text-sm">
						You do not have permission to register patients.
					</CardContent>
				</Card>
			</PatientRegistrationShell>
		)
	}

	if (pendingTriageId || showStandaloneForm) {
		return <PatientRegistrationForm mode={pendingTriageId ? "triage-linked" : "standalone"} />
	}

	return (
		<PatientRegistrationShell
			step="search"
			title="Find an existing record before you register"
			subtitle="Search by full name plus date of birth, or use a PhilHealth number to avoid duplicate charts before issuing a new MRN."
			headerAction={
				canCreatePatient ? (
					<Button
						variant="outline"
						className="border-border/60 bg-background"
						nativeButton={false}
						render={<Link href={newPatientHref} />}
					>
						<UserRoundPlus className="size-4" />
						Register new patient
					</Button>
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
							<CardDescription>
								Check the registry first so we only create a chart when a match does not already
								exist.
							</CardDescription>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-6 pt-6">
					<form onSubmit={handleSearch} className="space-y-6">
						<div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_auto_minmax(0,1fr)]">
							<div className="grid gap-4 md:grid-cols-2">
								<SearchField htmlFor="patient-name" label="Full name" icon={UserRound}>
									<Input
										id="patient-name"
										placeholder="Enter the patient’s full name"
										value={nameFilter}
										className="border-border/60 bg-background h-11 rounded-xl"
										onChange={e => setNameFilter(e.target.value)}
									/>
								</SearchField>

								<SearchField htmlFor="patient-birthdate" label="Date of birth" icon={CalendarDays}>
									<Input
										id="patient-birthdate"
										type="date"
										value={birthdateFilter}
										className="border-border/60 bg-background h-11 rounded-xl"
										onChange={e => setBirthdateFilter(e.target.value)}
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

								<SearchField
									htmlFor="philhealth-number"
									label="PhilHealth number"
									icon={ShieldCheck}
								>
									<Input
										id="philhealth-number"
										placeholder="Enter the PhilHealth number"
										value={philhealthFilter}
										className="border-border/60 bg-background h-11 rounded-xl"
										onChange={e => setPhilhealthFilter(e.target.value)}
									/>
								</SearchField>
							</div>
						</div>

						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="text-muted-foreground text-sm">
								{hasPartialNameDob && !hasPhilhealthFilter
									? "Full name and date of birth must be used together when searching by demographics."
									: !canSearchPatients
										? "Your current role can register patients but cannot search the registry."
										: "Use either the demographics pair or a PhilHealth number to search."}
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
								<Button type="submit" disabled={!canRunSearch} className={primaryButtonClassName}>
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
											patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1),
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
													</div>
													<p className="text-muted-foreground text-sm">{meta.join(" · ")}</p>
												</div>

												<Button
													variant="ghost"
													size="sm"
													className="justify-between self-start md:self-center"
													nativeButton={false}
													render={<Link href={`/patients/${patient.id}`} />}
												>
													Open
													<ArrowRight className="size-4" />
												</Button>
											</div>
										)
									})}
								</div>
							) : (
								<SearchStateCard
									title="No matching patient found"
									description="No existing record matched the details you entered. You can continue and register a new patient record now."
									action={
										canCreatePatient ? (
											<Button
												className={primaryButtonClassName}
												nativeButton={false}
												render={<Link href={newPatientHref} />}
											>
												<UserRoundPlus className="size-4" />
												Register new patient
											</Button>
										) : undefined
									}
								/>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</PatientRegistrationShell>
	)
}

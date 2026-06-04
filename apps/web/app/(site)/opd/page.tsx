"use client"

import { useState } from "react"
import { ArrowRight, Calendar, Loader2, Search, User, UserRound, X } from "lucide-react"

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
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	canRoleActOnOpdStep,
	getPatientActiveOpdStep,
	OpdFlow,
} from "@/features/opd/components/opd-flow"
import { usePatientSearchQuery } from "@/features/patients/api/patients.hooks"

const OPD_PATIENTS_PAGE_SIZE = 50

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

function getActiveStaffProfile(
	profile:
		| {
				staffProfiles?: Array<{ id: string; facilityId: string; roles: Array<{ id: string }> }>
				activeRole?: { id: string } | null
		  }
		| undefined
) {
	return (
		profile?.staffProfiles?.find(sp => sp.roles.some(r => r.id === profile?.activeRole?.id)) ??
		profile?.staffProfiles?.[0]
	)
}

interface SelectedPatient {
	id: string
	mrn: string
	philhealthMemberId: string | null
	firstName: string
	lastName: string
	dateOfBirth: string | null
}

export default function OpdPage() {
	const permSet = usePermissionSet()
	const { data: profile } = useMyProfile()
	const activeStaffProfile = getActiveStaffProfile(profile)
	const activeRoleName = profile?.activeRole?.name
	const facilityId = activeStaffProfile?.facilityId ?? ""

	const [search, setSearch] = useState("")
	const [page, setPage] = useState(1)
	const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null)
	const trimmedSearch = search.trim()

	const searchQuery = usePatientSearchQuery(
		{
			facilityId,
			search: trimmedSearch || undefined,
			isActive: true,
			page,
			limit: OPD_PATIENTS_PAGE_SIZE,
		},
		{ enabled: !!facilityId }
	)

	if (!can(permSet, "opd", "view")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to access OPD.
			</div>
		)
	}

	if (selectedPatient) {
		const patientName = `${selectedPatient.lastName}, ${selectedPatient.firstName}`
		const activeStep = getPatientActiveOpdStep(selectedPatient.id)
		const canOpenSelectedPatient = activeStep
			? canRoleActOnOpdStep(permSet, activeRoleName, activeStep)
			: false

		if (!canOpenSelectedPatient) {
			return (
				<div className="flex h-full flex-col p-3 md:p-4">
					<Card className="border-border/60 bg-card shadow-sm">
						<CardHeader>
							<CardTitle>OPD Patient Not Ready For Your Role</CardTitle>
							<CardDescription>
								This patient is currently waiting for{" "}
								{activeStep?.responsibleRole ?? "another role"}.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button variant="outline" onClick={() => setSelectedPatient(null)}>
								<X className="mr-1 size-3.5" />
								Back to eligible patients
							</Button>
						</CardContent>
					</Card>
				</div>
			)
		}

		return (
			<div>
				{/* Patient context bar */}
				<div className="bg-muted/40 flex items-center justify-between border-b px-6 py-3">
					<div className="flex items-center gap-3">
						<div className="bg-primary/10 flex size-8 items-center justify-center rounded-full">
							<User className="text-primary size-4" />
						</div>
						<div>
							<p className="text-sm leading-none font-semibold">{patientName}</p>
							<p className="text-muted-foreground mt-0.5 font-mono text-xs">
								{selectedPatient.mrn}
							</p>
						</div>
						{selectedPatient.dateOfBirth && (
							<>
								<div className="bg-border h-4 w-px" />
								<div className="text-muted-foreground flex items-center gap-1.5 text-sm">
									<Calendar className="size-3.5" />
									{new Date(selectedPatient.dateOfBirth).toLocaleDateString()}
								</div>
							</>
						)}
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setSelectedPatient(null)}
						className="gap-1.5"
					>
						<X className="size-3.5" />
						Change Patient
					</Button>
				</div>
				<OpdFlow
					patientId={selectedPatient.id}
					patientName={patientName}
					patientMrn={selectedPatient.mrn}
					patientPhilhealthMemberId={selectedPatient.philhealthMemberId}
				/>
			</div>
		)
	}

	const patients = searchQuery.data?.data ?? []
	const visiblePatients = patients
		.map(patient => ({ patient, activeStep: getPatientActiveOpdStep(patient.id) }))
		.filter(({ activeStep }) =>
			activeStep ? canRoleActOnOpdStep(permSet, activeRoleName, activeStep) : false
		)
	const totalPages = Math.max(searchQuery.data?.totalPages ?? 1, 1)
	const currentPage = Math.min(page, totalPages)
	const isLoading = searchQuery.isLoading
	const isFetching = searchQuery.isFetching
	const hasPreviousPage = currentPage > 1
	const hasNextPage = currentPage < totalPages
	const visiblePatientCount = visiblePatients.length

	return (
		<div className="flex h-full flex-col p-3 md:p-4">
			<Card className="border-border/60 bg-card shadow-sm">
				<CardHeader className="border-border/60 border-b pb-3">
					<div className="flex items-start gap-3">
						<div className="bg-secondary/60 text-muted-foreground flex size-10 items-center justify-center rounded-xl">
							<UserRound className="size-4" />
						</div>
						<div className="space-y-1">
							<CardTitle className="tracking-tight">Patient List</CardTitle>
							<CardDescription>
								Select a patient to begin the OPD consultation flow.
							</CardDescription>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-3 pt-3">
					<div className="relative">
						<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
						<Input
							placeholder="Filter by name or MRN..."
							value={search}
							onChange={e => {
								setSearch(e.target.value)
								setPage(1)
							}}
							className="border-border/60 bg-background h-9 rounded-xl pl-9"
							autoFocus
						/>
						{isFetching && (
							<Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
						)}
					</div>

					{isLoading ? (
						<div className="border-border/60 bg-secondary/40 text-muted-foreground rounded-2xl border border-dashed px-6 py-10 text-center text-sm">
							Loading patients...
						</div>
					) : patients.length === 0 ? (
						<div className="border-border/60 bg-secondary/40 text-muted-foreground rounded-2xl border border-dashed px-6 py-10 text-center text-sm">
							{trimmedSearch ? `No patients match "${search}".` : "No active patients found."}
						</div>
					) : visiblePatientCount === 0 ? (
						<div className="border-border/60 bg-secondary/40 text-muted-foreground rounded-2xl border border-dashed px-6 py-10 text-center text-sm">
							No OPD patients are waiting for your role on this page.
						</div>
					) : (
						<>
							<p className="text-muted-foreground px-0.5 text-xs">
								Showing {visiblePatientCount} {visiblePatientCount === 1 ? "patient" : "patients"}{" "}
								waiting for your role
								{trimmedSearch && ` matching "${search}"`}
								{isFetching && " · Updating..."}
							</p>

							<div className="border-border/60 bg-background divide-border/60 divide-y overflow-hidden rounded-2xl border">
								{visiblePatients.map(({ patient: p, activeStep }) => (
									<div
										key={p.id}
										className="hover:bg-secondary/30 flex flex-col gap-2 px-4 py-2.5 transition-colors md:flex-row md:items-center md:justify-between"
									>
										<div className="min-w-0 space-y-1.5">
											<div className="flex flex-wrap items-center gap-2">
												<span className="text-foreground text-sm font-semibold tracking-tight">
													{p.firstName} {p.lastName}
												</span>
												<Badge
													variant="secondary"
													className="border-border/60 bg-secondary/60 text-foreground rounded-full border px-2 py-0.5 font-mono text-[0.68rem] tracking-[0.14em]"
												>
													{p.mrn}
												</Badge>
												<Badge
													variant={p.isActive ? "default" : "secondary"}
													className="rounded-full px-2 py-0.5 text-[0.68rem]"
												>
													{p.isActive ? "Active" : "Inactive"}
												</Badge>
												{activeStep ? (
													<Badge
														variant="outline"
														className="rounded-full px-2 py-0.5 text-[0.68rem]"
													>
														Next: {activeStep.label}
													</Badge>
												) : null}
											</div>
											<p className="text-muted-foreground text-xs">
												{p.dateOfBirth
													? `DOB ${new Date(String(p.dateOfBirth)).toLocaleDateString()}`
													: "DOB —"}
												{p.lastEncounterDate
													? ` · Last encounter ${new Date(String(p.lastEncounterDate)).toLocaleDateString()}`
													: ""}
											</p>
										</div>

										<Button
											variant="ghost"
											size="sm"
											className="shrink-0 justify-between gap-2"
											onClick={() =>
												setSelectedPatient({
													id: p.id,
													mrn: p.mrn,
													philhealthMemberId: p.philhealthMemberId,
													firstName: p.firstName,
													lastName: p.lastName,
													dateOfBirth: p.dateOfBirth ? String(p.dateOfBirth) : null,
												})
											}
										>
											Start consultation
											<ArrowRight className="size-4" />
										</Button>
									</div>
								))}
							</div>

							<div className="flex items-center justify-between gap-3 px-0.5">
								<p className="text-muted-foreground text-xs">
									Page {currentPage} of {totalPages}
								</p>
								<div className="flex items-center gap-2">
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
		</div>
	)
}

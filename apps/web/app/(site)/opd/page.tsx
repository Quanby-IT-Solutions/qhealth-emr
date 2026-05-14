"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Calendar, Loader2, Search, User, UserRound, X } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { OpdFlow } from "@/features/opd/components/opd-flow"
import { usePatientSearchQuery } from "@/features/patients/api/patients.hooks"

const OPD_PATIENTS_PAGE_SIZE = 8

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
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
	firstName: string
	lastName: string
	dateOfBirth: string | null
}

export default function OpdPage() {
	const permSet = usePermissionSet()
	const { data: profile } = useMyProfile()
	const activeStaffProfile = getActiveStaffProfile(profile)
	const facilityId = activeStaffProfile?.facilityId ?? ""

	const [search, setSearch] = useState("")
	const [page, setPage] = useState(1)
	const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null)
	const trimmedSearch = search.trim()

	useEffect(() => {
		setPage(1)
	}, [trimmedSearch])

	const searchQuery = usePatientSearchQuery(
		{
			facilityId,
			search: trimmedSearch || undefined,
			isActive: true,
			page,
			limit: OPD_PATIENTS_PAGE_SIZE,
		},
		{ enabled: !!facilityId },
	)

	if (!can(permSet, "opd", "view")) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to access OPD.
			</div>
		)
	}

	if (selectedPatient) {
		const patientName = `${selectedPatient.lastName}, ${selectedPatient.firstName}`
		return (
			<div>
				{/* Patient context bar */}
				<div className="flex items-center justify-between border-b bg-muted/40 px-6 py-3">
					<div className="flex items-center gap-3">
						<div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
							<User className="size-4 text-primary" />
						</div>
						<div>
							<p className="text-sm font-semibold leading-none">{patientName}</p>
							<p className="mt-0.5 font-mono text-xs text-muted-foreground">{selectedPatient.mrn}</p>
						</div>
						{selectedPatient.dateOfBirth && (
							<>
								<div className="h-4 w-px bg-border" />
								<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
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
				<OpdFlow patientId={selectedPatient.id} patientName={patientName} />
			</div>
		)
	}

	const patients = searchQuery.data?.data ?? []
	const totalPatients = searchQuery.data?.total ?? 0
	const totalPages = Math.max(searchQuery.data?.totalPages ?? 1, 1)
	const currentPage = Math.min(page, totalPages)
	const isLoading = searchQuery.isLoading
	const isFetching = searchQuery.isFetching
	const hasPreviousPage = currentPage > 1
	const hasNextPage = currentPage < totalPages
	const pageStart = totalPatients === 0 ? 0 : (currentPage - 1) * OPD_PATIENTS_PAGE_SIZE + 1
	const pageEnd = Math.min(currentPage * OPD_PATIENTS_PAGE_SIZE, totalPatients)

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
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
						<Input
							placeholder="Filter by name or MRN..."
							value={search}
							onChange={e => setSearch(e.target.value)}
							className="h-9 rounded-xl border-border/60 bg-background pl-9"
							autoFocus
						/>
						{isFetching && (
							<Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
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
					) : (
						<>
							<p className="text-xs text-muted-foreground px-0.5">
								Showing {pageStart}-{pageEnd} of {totalPatients} {totalPatients === 1 ? "patient" : "patients"}
								{trimmedSearch && ` matching "${search}"`}
								{isFetching && " · Updating..."}
							</p>

							<div className="border-border/60 bg-background overflow-hidden rounded-2xl border divide-y divide-border/60">
								{patients.map(p => (
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
											</div>
											<p className="text-muted-foreground text-xs">
												{p.dateOfBirth ? `DOB ${new Date(String(p.dateOfBirth)).toLocaleDateString()}` : "DOB —"}
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
								<p className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</p>
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

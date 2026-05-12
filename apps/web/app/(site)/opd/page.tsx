"use client"

import { useState } from "react"
import { ArrowRight, Calendar, Loader2, Search, User, X } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { OpdFlow } from "@/features/opd/components/opd-flow"
import { usePatientSearchQuery } from "@/features/patients/api/patients.hooks"

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
	const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null)

	// Always fetch — show full list when empty, filtered results when searching
	const searchQuery = usePatientSearchQuery(
		{ facilityId, search: search.trim() || undefined, limit: 50 },
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
	const isLoading = searchQuery.isLoading

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="border-b px-6 py-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="text-xl font-semibold">OPD Consultation</h1>
						<p className="text-sm text-muted-foreground">Select a patient to begin the consultation flow</p>
					</div>
					<div className="relative w-full sm:w-80">
						<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							className="pl-9"
							placeholder="Search by name or MRN..."
							value={search}
							onChange={e => setSearch(e.target.value)}
							autoFocus
						/>
						{isLoading && (
							<Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
						)}
					</div>
				</div>
			</div>

			{/* Patient table */}
			<div className="flex-1 overflow-auto">
				{isLoading ? (
					<div className="flex items-center justify-center py-20 text-muted-foreground">
						<Loader2 className="mr-2 size-5 animate-spin" />
						Loading patients...
					</div>
				) : patients.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
						<User className="mb-3 size-10 opacity-30" />
						<p className="font-medium">No patients found</p>
						{search && <p className="mt-1 text-sm">Try a different name or MRN</p>}
					</div>
				) : (
					<table className="w-full text-sm">
						<thead className="sticky top-0 bg-muted/60 backdrop-blur-sm">
							<tr className="border-b">
								<th className="px-6 py-3 text-left font-medium text-muted-foreground">Patient</th>
								<th className="px-6 py-3 text-left font-medium text-muted-foreground">MRN</th>
								<th className="px-6 py-3 text-left font-medium text-muted-foreground">Date of Birth</th>
								<th className="px-6 py-3 text-left font-medium text-muted-foreground">Sex</th>
								<th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
								<th className="px-6 py-3 text-left font-medium text-muted-foreground">Last Visit</th>
								<th className="px-4 py-3" />
							</tr>
						</thead>
						<tbody className="divide-y">
							{patients.map(p => (
								<tr
									key={p.id}
									className="cursor-pointer transition-colors hover:bg-muted/40"
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
									<td className="px-6 py-3">
										<div className="flex items-center gap-3">
											<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
												<User className="size-4 text-muted-foreground" />
											</div>
											<span className="font-medium">
												{p.lastName}, {p.firstName}
												{p.middleName ? ` ${p.middleName[0]}.` : ""}
											</span>
										</div>
									</td>
									<td className="px-6 py-3 font-mono text-muted-foreground">{p.mrn}</td>
									<td className="px-6 py-3 text-muted-foreground">
										{p.dateOfBirth
											? new Date(String(p.dateOfBirth)).toLocaleDateString()
											: "—"}
									</td>
									<td className="px-6 py-3 capitalize text-muted-foreground">{p.sex ?? "—"}</td>
									<td className="px-6 py-3">
										<Badge
											variant={p.isActive ? "default" : "secondary"}
											className="text-xs"
										>
											{p.isActive ? "Active" : "Inactive"}
										</Badge>
									</td>
									<td className="px-6 py-3 text-muted-foreground">
										{p.lastEncounterDate
											? new Date(String(p.lastEncounterDate)).toLocaleDateString()
											: "—"}
									</td>
									<td className="px-4 py-3 text-right">
										<Button size="sm" variant="ghost" className="gap-1.5 text-primary hover:text-primary">
											Start Consultation
											<ArrowRight className="size-3.5" />
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>

			{/* Footer count */}
			{!isLoading && patients.length > 0 && (
				<div className="border-t px-6 py-2 text-xs text-muted-foreground">
					{patients.length} patient{patients.length !== 1 ? "s" : ""}
					{search ? ` matching "${search}"` : " in facility"}
				</div>
			)}
		</div>
	)
}

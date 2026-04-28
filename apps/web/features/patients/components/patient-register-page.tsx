"use client"

import Link from "next/link"
import { type ReactNode, useState } from "react"
import { useSearchParams } from "next/navigation"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/core/components/ui/empty"
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
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { usePatientSearchQuery } from "@/features/patients/api/patients.hooks"
import { PatientRegistrationForm } from "@/features/patients/components/patient-registration-form"

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

function buildRegisterHref({
	pendingTriageId,
	mode,
}: {
	pendingTriageId?: string
	mode?: "new"
}) {
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

function PatientSearchStateRow({
	title,
	description,
	action,
}: {
	title: string
	description: string
	action?: ReactNode
}) {
	return (
		<TableRow>
			<TableCell colSpan={5} className="whitespace-normal p-6">
				<Empty className="border border-dashed bg-muted/10 py-10">
					<EmptyHeader>
						<EmptyTitle>{title}</EmptyTitle>
						<EmptyDescription>{description}</EmptyDescription>
					</EmptyHeader>
					{action && <EmptyContent>{action}</EmptyContent>}
				</Empty>
			</TableCell>
		</TableRow>
	)
}

function usePermissionSet() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
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
	const hasPrimarySearchTerm = !!(trimmedNameFilter || trimmedPhilhealthFilter)

	const { data, isLoading, isFetching } = usePatientSearchQuery(
		committedParams ?? { facilityId, page: 1, limit: 50 },
		{ enabled: canSearchPatients && !!facilityId && !!committedParams }
	)

	const results = data?.data ?? []
	const hasSearched = !!committedParams
	const newPatientHref = buildRegisterHref({ mode: "new" })

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault()

		if (!facilityId || !canSearchPatients || !hasPrimarySearchTerm) {
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

	if (!canAccessRegisterPage) {
		return (
			<div className="flex items-center justify-center p-8 text-muted-foreground">
				You do not have permission to register patients.
			</div>
		)
	}

	if (pendingTriageId || showStandaloneForm) {
		return (
			<div className="space-y-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-1">
						<h1 className="text-2xl font-bold tracking-tight">Register New Patient</h1>
						<p className="text-muted-foreground text-sm">
							{pendingTriageId
								? "Register this walk-in patient. The pending triage intake will be linked automatically."
								: "Create a new patient record. An MRN will be auto-generated after registration."}
						</p>
					</div>
					{showStandaloneForm && (
						<Button
							variant="outline"
							nativeButton={false}
							render={<Link href="/patients/register" />}
						>
							Back to Search
						</Button>
					)}
				</div>

				<PatientRegistrationForm
					mode={pendingTriageId ? "triage-linked" : "standalone"}
				/>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-1">
					<h1 className="text-2xl font-bold tracking-tight">Register New Patient</h1>
					<p className="text-muted-foreground text-sm">
						Search by patient name and birthdate or PhilHealth number before creating a new
						record.
					</p>
				</div>
				{canCreatePatient ? (
					<Button nativeButton={false} render={<Link href={newPatientHref} />}>
						Register New Patient
					</Button>
				) : (
					<Button disabled>Register New Patient</Button>
				)}
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Search Existing Patients</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
						<div className="min-w-[220px] flex-1 space-y-1.5">
							<Label htmlFor="patient-name">Patient Name</Label>
							<Input
								id="patient-name"
								placeholder="Search by patient name"
								value={nameFilter}
								onChange={e => setNameFilter(e.target.value)}
							/>
						</div>
						<div className="w-full space-y-1.5 sm:w-52">
							<Label htmlFor="patient-birthdate">Birthdate</Label>
							<Input
								id="patient-birthdate"
								type="date"
								value={birthdateFilter}
								onChange={e => setBirthdateFilter(e.target.value)}
							/>
						</div>
						<div className="min-w-[220px] flex-1 space-y-1.5">
							<Label htmlFor="philhealth-number">PhilHealth Number</Label>
							<Input
								id="philhealth-number"
								placeholder="Search by PhilHealth number"
								value={philhealthFilter}
								onChange={e => setPhilhealthFilter(e.target.value)}
							/>
						</div>
						<Button type="submit" disabled={!facilityId || !canSearchPatients || !hasPrimarySearchTerm}>
							{isFetching ? "Searching..." : "Search"}
						</Button>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>MRN</TableHead>
								<TableHead>Patient Name</TableHead>
								<TableHead>Birthdate</TableHead>
								<TableHead>Sex</TableHead>
								<TableHead>PhilHealth Number</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{results.length > 0 &&
								results.map(patient => (
									<TableRow key={patient.id}>
										<TableCell>
											<Link
												href={`/patients/${patient.id}`}
												className="text-primary hover:underline"
											>
												{patient.mrn}
											</Link>
										</TableCell>
										<TableCell>
											<Link href={`/patients/${patient.id}`} className="hover:underline">
												{patient.lastName}, {patient.firstName}
												{patient.middleName ? ` ${patient.middleName}` : ""}
											</Link>
										</TableCell>
										<TableCell>{formatDate(patient.dateOfBirth)}</TableCell>
										<TableCell>{formatSex(patient.sex)}</TableCell>
										<TableCell>{patient.philhealthMemberId ?? "—"}</TableCell>
									</TableRow>
								))}

							{results.length === 0 && isLoading && hasSearched && (
								<PatientSearchStateRow
									title="Searching patients"
									description="Checking for existing matches in the patient registry."
								/>
							)}

							{results.length === 0 && !hasSearched && (
								<PatientSearchStateRow
									title="Search for an existing patient"
									description="Enter the patient's name and birthdate or their PhilHealth number to look for an existing record."
								/>
							)}

							{results.length === 0 && hasSearched && !isLoading && (
								<PatientSearchStateRow
									title="No matching patient found"
									description="Continue to register a new patient. An MRN will be auto-generated."
									action={
										canCreatePatient ? (
											<Button
												nativeButton={false}
												render={<Link href={newPatientHref} />}
											>
												Register New Patient
											</Button>
										) : undefined
									}
								/>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	)
}

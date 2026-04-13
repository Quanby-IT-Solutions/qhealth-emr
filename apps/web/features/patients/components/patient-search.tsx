"use client"

import { useState } from "react"
import Link from "next/link"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
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
import { usePatientSearchQuery } from "@/features/patients/api/patients.hooks"

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
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const [searchTerm, setSearchTerm] = useState("")
	const [mrnFilter, setMrnFilter] = useState("")
	const [dobFilter, setDobFilter] = useState("")

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
		{ enabled: !!committedParams && !!facilityId }
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

	return (
		<div className="space-y-6">
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
						<Button render={<Link href="/patients/register" />}>
							Register New Patient
						</Button>
					</CardContent>
				</Card>
			)}
		</div>
	)
}

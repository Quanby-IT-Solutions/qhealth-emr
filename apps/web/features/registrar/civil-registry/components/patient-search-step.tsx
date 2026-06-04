"use client"

import { useMemo, useState } from "react"
import { Search, UserRound } from "lucide-react"

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
import { Skeleton } from "@/core/components/ui/skeleton"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { useDebounce } from "@/core/hooks/use-debounce"
import { usePatientSearchQuery } from "@/features/patients/api/patients.hooks"

interface PatientSearchStepProps {
	onSelect: (patientId: string, patientName: string) => void
	title: string
}

function formatDate(dateVal: string | null | undefined) {
	if (!dateVal) return "No DOB"
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

export function PatientSearchStep({ onSelect, title }: PatientSearchStepProps) {
	const facilityId = useActiveFacilityId() ?? ""
	const [search, setSearch] = useState("")
	const debouncedSearch = useDebounce(search.trim(), 300)

	const { data, isLoading, isFetching } = usePatientSearchQuery(
		{
			facilityId,
			isActive: true,
			search: debouncedSearch || undefined,
			page: 1,
			limit: 10,
		},
		{ enabled: !!facilityId }
	)

	const patients = useMemo(() => data?.data ?? [], [data?.data])

	return (
		<Card className="border-border/60 bg-card shadow-sm">
			<CardHeader className="border-border/60 border-b pb-3">
				<div className="flex items-start gap-3">
					<div className="bg-secondary/60 text-muted-foreground flex size-10 items-center justify-center rounded-xl">
						<UserRound className="size-4" />
					</div>
					<div className="space-y-1">
						<CardTitle className="tracking-tight">{title}</CardTitle>
						<CardDescription>
							Search by patient name or MRN before generating the certificate.
						</CardDescription>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-3 pt-3">
				<div className="relative">
					<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
					<Input
						placeholder="Search by name or MRN..."
						value={search}
						onChange={e => setSearch(e.target.value)}
						className="border-border/60 bg-background h-9 rounded-xl pl-9"
					/>
				</div>

				{isLoading ? (
					<div className="space-y-2">
						{[0, 1, 2].map(i => (
							<Skeleton key={i} className="h-14 w-full rounded-xl" />
						))}
					</div>
				) : patients.length === 0 ? (
					<div className="border-border/60 bg-secondary/40 text-muted-foreground rounded-2xl border border-dashed px-6 py-10 text-center text-sm">
						{debouncedSearch
							? `No patients match "${debouncedSearch}".`
							: "No active patients found."}
					</div>
				) : (
					<>
						<p className="text-muted-foreground px-0.5 text-xs">
							Showing {patients.length} {patients.length === 1 ? "patient" : "patients"}
							{debouncedSearch && ` matching "${debouncedSearch}"`}
							{isFetching && " - Updating..."}
						</p>
						<div className="border-border/60 bg-background divide-border/60 max-h-[420px] divide-y overflow-y-auto rounded-2xl border">
							{patients.map(patient => {
								const patientName = formatPatientName(patient)

								return (
									<div
										key={patient.id}
										className="hover:bg-secondary/30 flex flex-col gap-2 px-4 py-2.5 transition-colors md:flex-row md:items-center md:justify-between"
									>
										<div className="min-w-0 space-y-1.5">
											<div className="flex flex-wrap items-center gap-2">
												<span className="text-foreground text-sm font-semibold tracking-tight">
													{patientName}
												</span>
												<Badge
													variant="secondary"
													className="border-border/60 bg-secondary/60 text-foreground rounded-full border px-2 py-0.5 font-mono text-[0.68rem] tracking-[0.14em]"
												>
													{patient.mrn}
												</Badge>
											</div>
											<p className="text-muted-foreground text-xs">
												DOB {formatDate(patient.dateOfBirth)}
											</p>
										</div>

										<Button
											type="button"
											variant="outline"
											size="sm"
											className="shrink-0"
											onClick={() => onSelect(patient.id, patientName)}
										>
											Select
										</Button>
									</div>
								)
							})}
						</div>
					</>
				)}
			</CardContent>
		</Card>
	)
}

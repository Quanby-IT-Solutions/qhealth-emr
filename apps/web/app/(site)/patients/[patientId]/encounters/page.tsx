"use client"

import { use, useState } from "react"

import { ArrowUpDown, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Badge } from "@/core/components/ui/badge"
import { Button, buttonVariants } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { useEncounterListQuery } from "@/features/encounters/api/encounters.hooks"
import { usePatientProfileQuery } from "@/features/patients/api/patients.hooks"

type EncounterStatus = "active" | "discharged" | "closed" | "cancelled"
type EncounterType = "inpatient" | "outpatient" | "emergency" | "telemedicine"
type SortDir = "asc" | "desc"

const STATUS_FILTERS: { label: string; value: EncounterStatus | undefined }[] = [
	{ label: "All", value: undefined },
	{ label: "Active", value: "active" },
	{ label: "Discharged", value: "discharged" },
	{ label: "Closed", value: "closed" },
]

const LIMIT = 10

function typeBadge(type: EncounterType) {
	switch (type) {
		case "outpatient":
			return (
				<Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
					OPD
				</Badge>
			)
		case "emergency":
			return <Badge variant="destructive">ER</Badge>
		case "inpatient":
			return <Badge variant="default">IPD</Badge>
		case "telemedicine":
			return <Badge variant="outline">Tele</Badge>
	}
}

function statusBadgeVariant(
	status: EncounterStatus
): "default" | "secondary" | "destructive" | "outline" {
	switch (status) {
		case "active":
			return "default"
		case "discharged":
			return "secondary"
		case "cancelled":
			return "destructive"
		case "closed":
			return "outline"
	}
}

function formatDate(value: Date | string | null | undefined): string {
	if (!value) return "—"
	const d = typeof value === "string" ? new Date(value) : value
	return d.toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function TableSkeleton() {
	return (
		<div className="space-y-2">
			{Array.from({ length: LIMIT }).map((_, i) => (
				<Skeleton key={i} className="h-10 w-full rounded" />
			))}
		</div>
	)
}

export default function EncounterListPage({
	params,
}: {
	params: Promise<{ patientId: string }>
}) {
	const { patientId } = use(params)
	const router = useRouter()
	const facilityId = useActiveFacilityId()
	const { data: patient } = usePatientProfileQuery(patientId)

	const [statusFilter, setStatusFilter] = useState<EncounterStatus | undefined>("active")
	const [currentPage, setCurrentPage] = useState(1)
	const [sortDir, setSortDir] = useState<SortDir>("desc")

	const { data, isLoading } = useEncounterListQuery(
		{ facilityId: facilityId ?? "", patientId, status: statusFilter, page: currentPage, limit: LIMIT },
		{ enabled: !!facilityId }
	)

	const encounters = [...(data?.data ?? [])].sort((a, b) => {
		const aTime = new Date(a.admissionDatetime).getTime()
		const bTime = new Date(b.admissionDatetime).getTime()
		return sortDir === "desc" ? bTime - aTime : aTime - bTime
	})

	const totalPages = data?.totalPages ?? 1
	const patientName = patient ? `${patient.lastName}, ${patient.firstName}` : "Patient"

	function handleStatusChange(value: EncounterStatus | undefined) {
		setStatusFilter(value)
		setCurrentPage(1)
	}

	return (
		<Card>
			<CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<CardTitle>Encounters — {patientName}</CardTitle>
				<Link
					href={`/patients/${patientId}/encounters/new`}
					className={buttonVariants({ size: "sm" })}
				>
					<Plus className="mr-1 size-4" />
					New Encounter
				</Link>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Status filter */}
				<div className="flex flex-wrap gap-1.5">
					{STATUS_FILTERS.map(f => (
						<Button
							key={String(f.value)}
							variant={statusFilter === f.value ? "default" : "outline"}
							size="sm"
							onClick={() => handleStatusChange(f.value)}
						>
							{f.label}
						</Button>
					))}
				</div>

				{isLoading ? (
					<TableSkeleton />
				) : encounters.length === 0 ? (
					<p className="text-muted-foreground py-8 text-center text-sm">
						No {statusFilter ?? ""} encounters found for this patient.
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Type</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Chief Complaint</TableHead>
								<TableHead>
									<button
										type="button"
										className="flex items-center gap-1 hover:text-foreground"
										onClick={() => setSortDir(d => (d === "desc" ? "asc" : "desc"))}
									>
										Admission Date
										<ArrowUpDown className="size-3.5" />
									</button>
								</TableHead>
								<TableHead>Attending</TableHead>
								<TableHead className="text-right">Queue #</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{encounters.map(encounter => (
								<TableRow
									key={encounter.id}
									className="cursor-pointer"
									onClick={() =>
										router.push(`/patients/${patientId}/encounters/${encounter.id}`)
									}
								>
									<TableCell>{typeBadge(encounter.encounterType)}</TableCell>
									<TableCell>
										<Badge
											variant={statusBadgeVariant(encounter.status)}
											className="capitalize"
										>
											{encounter.status}
										</Badge>
									</TableCell>
									<TableCell className="max-w-48 truncate text-sm">
										{encounter.chiefComplaint
											? encounter.chiefComplaint.slice(0, 60) +
											  (encounter.chiefComplaint.length > 60 ? "…" : "")
											: "—"}
									</TableCell>
									<TableCell className="text-sm">
										{formatDate(encounter.admissionDatetime)}
									</TableCell>
									<TableCell className="text-sm">
										{encounter.attendingStaffName ?? "—"}
									</TableCell>
									<TableCell className="text-right font-mono text-sm">
										{encounter.queueNumber ?? "—"}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}

				{/* Pagination */}
				{!isLoading && totalPages > 1 ? (
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">
							Page {currentPage} of {totalPages}
						</span>
						<div className="flex gap-1">
							<Button
								variant="outline"
								size="icon"
								onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
								disabled={currentPage <= 1}
							>
								<ChevronLeft className="size-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
								disabled={currentPage >= totalPages}
							>
								<ChevronRight className="size-4" />
							</Button>
						</div>
					</div>
				) : null}
			</CardContent>
		</Card>
	)
}

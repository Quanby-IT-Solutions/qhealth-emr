"use client"

import { use, useState } from "react"

import { ArrowUpDown, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
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

function formatEncounterType(type: EncounterType): string {
	switch (type) {
		case "inpatient":
			return "IPD"
		case "outpatient":
			return "OPD"
		case "emergency":
			return "ER"
		case "telemedicine":
			return "Telemedicine"
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

export default function EncounterListPage({
	params,
}: {
	params: Promise<{ patientId: string }>
}) {
	const { patientId } = use(params)
	const router = useRouter()
	const facilityId = useActiveFacilityId()
	const { data: patient } = usePatientProfileQuery(patientId)
	const { data, isLoading } = useEncounterListQuery(
		{ facilityId: facilityId ?? "", patientId },
		{ enabled: !!facilityId }
	)

	const [sortDir, setSortDir] = useState<SortDir>("desc")

	const encounters = [...(data?.data ?? [])].sort((a, b) => {
		const aTime = new Date(a.admissionDatetime).getTime()
		const bTime = new Date(b.admissionDatetime).getTime()
		return sortDir === "desc" ? bTime - aTime : aTime - bTime
	})

	const patientName = patient ? `${patient.lastName}, ${patient.firstName}` : "Patient"

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<CardTitle>Encounters — {patientName}</CardTitle>
				<Button asChild size="sm">
					<Link href={`/patients/${patientId}/encounters/new`}>
						<Plus className="mr-1 size-4" />
						New Encounter
					</Link>
				</Button>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<p className="text-muted-foreground py-8 text-center text-sm">Loading encounters…</p>
				) : encounters.length === 0 ? (
					<p className="text-muted-foreground py-8 text-center text-sm">
						No encounters found for this patient.
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
									<TableCell className="font-medium">
										{formatEncounterType(encounter.encounterType)}
									</TableCell>
									<TableCell>
										<Badge variant={statusBadgeVariant(encounter.status)} className="capitalize">
											{encounter.status}
										</Badge>
									</TableCell>
									<TableCell className="max-w-48 truncate text-sm">
										{encounter.chiefComplaint ?? "—"}
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
			</CardContent>
		</Card>
	)
}

"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { usePatientProfileQuery } from "@/features/patients/api/patients.hooks"
import { usePatientSummaryQuery } from "@/features/problems-allergies/api/problems-allergies.hooks"
import { ProblemsAllergiesTab } from "@/features/problems-allergies/components/problems-allergies-tab"

function formatDate(dateVal: Date | string | null | undefined) {
	if (!dateVal) return "—"
	const d = dateVal instanceof Date ? dateVal : new Date(dateVal)
	return d.toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

function formatDateTime(dateVal: Date | string | null | undefined) {
	if (!dateVal) return "—"
	const d = dateVal instanceof Date ? dateVal : new Date(dateVal)
	return d.toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function calculateAge(dateOfBirth: string): string {
	const dob = new Date(dateOfBirth)
	const today = new Date()
	let age = today.getFullYear() - dob.getFullYear()
	const monthDiff = today.getMonth() - dob.getMonth()
	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
		age--
	}
	return `${age} yrs`
}

function encounterStatusVariant(status: string) {
	switch (status) {
		case "active":
			return "default" as const
		case "discharged":
			return "secondary" as const
		case "closed":
			return "outline" as const
		case "cancelled":
			return "destructive" as const
		default:
			return "outline" as const
	}
}

interface PatientProfileProps {
	patientId: string
}

export function PatientProfile({ patientId }: PatientProfileProps) {
	const router = useRouter()
	const { data: patient, isLoading, isError, error } = usePatientProfileQuery(patientId)
	const { data: summary } = usePatientSummaryQuery(patientId)

	if (isLoading) {
		return (
			<div className="text-muted-foreground flex h-48 items-center justify-center">
				Loading patient profile…
			</div>
		)
	}

	if (isError) {
		return (
			<div className="text-destructive flex h-48 items-center justify-center">
				Failed to load patient: {error.message}
			</div>
		)
	}

	if (!patient) return null

	return (
		<div className="space-y-6">
			{/* Patient Banner */}
			<Card>
				<CardContent className="flex flex-wrap items-center gap-x-8 gap-y-2 pt-6">
					<div>
						<p className="text-lg font-semibold">
							{patient.lastName}, {patient.firstName}
							{patient.middleName ? ` ${patient.middleName}` : ""}
						</p>
						<p className="text-muted-foreground text-sm">MRN: {patient.mrn}</p>
					</div>
					<Separator orientation="vertical" className="hidden h-10 sm:block" />
					<div className="text-sm">
						<span className="text-muted-foreground">DOB:</span>{" "}
						{formatDate(patient.dateOfBirth)} ({calculateAge(patient.dateOfBirth)})
					</div>
					<div className="text-sm">
						<span className="text-muted-foreground">Sex:</span>{" "}
						{patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1)}
					</div>
					{patient.phone && (
						<div className="text-sm">
							<span className="text-muted-foreground">Phone:</span> {patient.phone}
						</div>
					)}
					{!patient.isActive && <Badge variant="destructive">Inactive</Badge>}
					{summary?.hasSevereAllergies && (
						<Badge variant="destructive">⚠ Severe Allergy</Badge>
					)}
					{summary && summary.activeAllergyCount > 0 && !summary.hasSevereAllergies && (
						<Badge variant="default">
							{summary.activeAllergyCount} Allerg{summary.activeAllergyCount === 1 ? "y" : "ies"}
						</Badge>
					)}
				</CardContent>
			</Card>

			{/* Demographics */}
			<Card>
				<CardHeader>
					<CardTitle>Demographics</CardTitle>
				</CardHeader>
				<CardContent>
					<dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
						<div>
							<dt className="text-muted-foreground">Address</dt>
							<dd>
								{[patient.addressLine1, patient.addressLine2, patient.city, patient.province, patient.zipCode]
									.filter(Boolean)
									.join(", ") || "—"}
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Email</dt>
							<dd>{patient.email ?? "—"}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">PhilHealth ID</dt>
							<dd>{patient.philhealthMemberId ?? "—"}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Emergency Contact</dt>
							<dd>
								{patient.emergencyContactName
									? `${patient.emergencyContactName}${patient.emergencyContactPhone ? ` (${patient.emergencyContactPhone})` : ""}`
									: "—"}
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Next of Kin</dt>
							<dd>
								{patient.nextOfKinName
									? `${patient.nextOfKinName}${patient.nextOfKinRelationship ? ` — ${patient.nextOfKinRelationship}` : ""}`
									: "—"}
							</dd>
						</div>
					</dl>
				</CardContent>
			</Card>

			{/* Problems & Allergies */}
			<ProblemsAllergiesTab patientId={patientId} facilityId={patient.facilityId} />

			{/* Encounter History */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Encounter History</CardTitle>
					<Button
						size="sm"
						variant="outline"
						render={<Link href={`/patients/${patientId}/encounters/new`} />}
					>
						New Encounter
					</Button>
				</CardHeader>
				<CardContent className="p-0">
					{patient.encounters.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Type</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Chief Complaint</TableHead>
									<TableHead>Admission</TableHead>
									<TableHead>Discharge</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{patient.encounters.map(enc => (
									<TableRow
										key={enc.id}
										className="cursor-pointer"
										onClick={() =>
											router.push(
												`/patients/${patientId}/encounters/${enc.id}`
											)
										}
									>
										<TableCell className="capitalize">{enc.encounterType}</TableCell>
										<TableCell>
											<Badge variant={encounterStatusVariant(enc.status)}>
												{enc.status}
											</Badge>
										</TableCell>
										<TableCell>{enc.chiefComplaint ?? "—"}</TableCell>
										<TableCell>{formatDateTime(enc.admissionDatetime)}</TableCell>
										<TableCell>
											{formatDateTime(enc.dischargeDatetime)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : (
						<div className="text-muted-foreground py-8 text-center text-sm">
							No encounters on record.
						</div>
					)}
				</CardContent>
			</Card>

			{/* Actions */}
			<div className="flex gap-3">
				<Button variant="outline" render={<Link href="/patients/search" />}>
					Back to Search
				</Button>
			</div>
		</div>
	)
}

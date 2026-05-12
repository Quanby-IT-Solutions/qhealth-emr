"use client"

import { useState } from "react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useEncounterListQuery } from "@/features/encounters/api/encounters.hooks"
import { TransferForm } from "@/features/encounters/components/transfer-form"

function formatDateTime(value: Date | string | null) {
	if (!value) return "-"
	return new Date(value).toLocaleString("en-PH", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

export default function RegistrarTransfersPage() {
	const { data: profile } = useMyProfile()
	const permissions = profile?.activeRole?.permissions ?? []
	const permSet = new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const [search, setSearch] = useState("")
	const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null)
	const [selectedPatientName, setSelectedPatientName] = useState<string>("")

	const { data, isLoading } = useEncounterListQuery(
		{ facilityId, status: "active", encounterType: "inpatient", limit: 100 },
		{ enabled: !!facilityId }
	)

	const encounters = data?.data ?? []

	const filtered = search.trim()
		? encounters.filter(e => {
				const q = search.toLowerCase()
				return (
					(e.patientName ?? "").toLowerCase().includes(q) ||
					(e.wardName ?? "").toLowerCase().includes(q) ||
					(e.bedNumber ?? "").toLowerCase().includes(q) ||
					(e.attendingStaffName ?? "").toLowerCase().includes(q)
				)
			})
		: encounters

	if (!permSet.has("adt:create") || !permSet.has("adt:edit")) {
		return (
			<div className="text-muted-foreground flex items-center justify-center p-8">
				You do not have permission to initiate patient transfers.
			</div>
		)
	}

	const selectedEncounter = encounters.find(e => e.id === selectedEncounterId)
	const hasPendingTransfer = false

	return (
		<div className="space-y-6 p-4 md:p-6">
			<div>
				<h1 className="text-2xl font-semibold">Patient Transfers</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Select an active inpatient to initiate a ward transfer.
				</p>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Active Inpatients</CardTitle>
						<Input
							placeholder="Filter by patient, ward, bed, or physician…"
							value={search}
							onChange={e => setSearch(e.target.value)}
							className="mt-2"
						/>
					</CardHeader>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Patient</TableHead>
									<TableHead>Ward / Bed</TableHead>
									<TableHead>Attending</TableHead>
									<TableHead>Admitted</TableHead>
									<TableHead className="w-24 text-right">Action</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{isLoading ? (
									Array.from({ length: 5 }).map((_, i) => (
										<TableRow key={i}>
											<TableCell colSpan={5}>
												<Skeleton className="h-5 w-full" />
											</TableCell>
										</TableRow>
									))
								) : filtered.length === 0 ? (
									<TableRow>
										<TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
											No active inpatients found.
										</TableCell>
									</TableRow>
								) : (
									filtered.map(enc => (
										<TableRow
											key={enc.id}
											className={selectedEncounterId === enc.id ? "bg-muted" : undefined}
										>
											<TableCell className="font-medium">
												{enc.patientName ?? "-"}
											</TableCell>
											<TableCell>
												<div className="text-sm">{enc.wardName ?? "-"}</div>
												{enc.bedNumber ? (
													<Badge variant="outline" className="mt-0.5 text-xs">
														Bed {enc.bedNumber}
													</Badge>
												) : null}
											</TableCell>
											<TableCell className="text-sm">
												{enc.attendingStaffName ?? "-"}
											</TableCell>
											<TableCell className="text-sm">
												{formatDateTime(enc.admissionDatetime)}
											</TableCell>
											<TableCell className="text-right">
												<Button
													size="sm"
													variant={selectedEncounterId === enc.id ? "default" : "outline"}
													onClick={() => {
														setSelectedEncounterId(enc.id)
														setSelectedPatientName(enc.patientName ?? `Encounter ${enc.id.slice(0, 8)}`)
													}}
												>
													Select
												</Button>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				<div className="space-y-4">
					{selectedEncounterId ? (
						<>
							<div>
								<p className="text-muted-foreground text-sm">
									Initiating transfer for:{" "}
									<span className="text-foreground font-medium">{selectedPatientName}</span>
								</p>
								{selectedEncounter && (
									<p className="text-muted-foreground text-sm">
										Current location:{" "}
										<span className="text-foreground">
											{selectedEncounter.wardName ?? "—"}{" "}
											{selectedEncounter.bedNumber ? `/ Bed ${selectedEncounter.bedNumber}` : ""}
										</span>
									</p>
								)}
							</div>
							<TransferForm
								encounterId={selectedEncounterId}
								hasPendingTransfer={hasPendingTransfer}
							/>
						</>
					) : (
						<Alert>
							<AlertDescription>
								Select a patient from the list to initiate a transfer.
							</AlertDescription>
						</Alert>
					)}
				</div>
			</div>
		</div>
	)
}

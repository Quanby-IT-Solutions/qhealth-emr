"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
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
	const [dialogOpen, setDialogOpen] = useState(false)

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

	return (
		<div className="space-y-6 p-4 md:p-6">
			<div>
				<h1 className="text-2xl font-semibold">Patient Transfers</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Select an active inpatient to initiate a ward transfer.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Active Inpatients</CardTitle>
					<Input
						placeholder="Filter by patient, ward, bed, or physician…"
						value={search}
						onChange={e => setSearch(e.target.value)}
						className="mt-2 max-w-sm"
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
								<TableHead className="w-28 text-right">Action</TableHead>
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
									<TableRow key={enc.id}>
										<TableCell className="font-medium">
											{enc.patientName ?? "—"}
										</TableCell>
										<TableCell>
											<div className="text-sm">{enc.wardName ?? "—"}</div>
											{enc.bedNumber && (
												<Badge variant="outline" className="mt-0.5 text-xs">
													Bed {enc.bedNumber}
												</Badge>
											)}
										</TableCell>
										<TableCell className="text-sm">
											{enc.attendingStaffName ?? "—"}
										</TableCell>
										<TableCell className="text-sm">
											{formatDateTime(enc.admissionDatetime)}
										</TableCell>
										<TableCell className="text-right">
											<Button
												size="sm"
												onClick={() => {
													setSelectedEncounterId(enc.id)
													setSelectedPatientName(enc.patientName ?? `Encounter ${enc.id.slice(0, 8)}`)
													setDialogOpen(true)
												}}
											>
												Transfer
											</Button>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<Dialog open={dialogOpen} onOpenChange={open => {
				setDialogOpen(open)
				if (!open) setSelectedEncounterId(null)
			}}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Initiate Transfer</DialogTitle>
						{selectedEncounter && (
							<p className="text-muted-foreground text-sm">
								{selectedPatientName} &mdash; {selectedEncounter.wardName ?? "—"}
								{selectedEncounter.bedNumber ? ` / Bed ${selectedEncounter.bedNumber}` : ""}
							</p>
						)}
					</DialogHeader>
					{selectedEncounterId && (
						<TransferForm
							encounterId={selectedEncounterId}
							hasPendingTransfer={false}
							onSuccess={() => setDialogOpen(false)}
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	)
}

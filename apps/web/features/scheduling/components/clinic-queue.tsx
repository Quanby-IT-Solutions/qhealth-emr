"use client"

import { useState } from "react"
import Link from "next/link"

import { Badge } from "@/core/components/ui/badge"
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
import { VitalsEntryForm } from "@/features/nursing/components/vitals-entry-form"
import {
	type UnifiedQueueEntry,
	useClinicQueueQuery,
	useUpdateAppointmentStatusMutation,
	useUpdateEncounterQueueStatusMutation,
} from "@/features/scheduling/api/scheduling.hooks"

function todayIso() {
	return new Date().toISOString().slice(0, 10)
}

function formatTime(time: string | null | undefined) {
	if (!time) return "—"
	const parts = time.includes("T") ? time.slice(11, 16) : time.slice(0, 5)
	const [h, m] = parts.split(":").map(Number)
	const period = (h ?? 0) >= 12 ? "PM" : "AM"
	const hour = ((h ?? 0) % 12 || 12).toString()
	return `${hour}:${(m ?? 0).toString().padStart(2, "0")} ${period}`
}

function queueStatusBadge(status: string) {
	switch (status) {
		case "waiting":
			return <Badge variant="default">Waiting</Badge>
		case "in_progress":
			return (
				<Badge className="bg-blue-500 text-white hover:bg-blue-500/80">
					With Doctor
				</Badge>
			)
		case "completed":
			return (
				<Badge className="bg-green-600 text-white hover:bg-green-600/80">
					Done
				</Badge>
			)
		default:
			return <Badge variant="secondary">{status}</Badge>
	}
}

interface ClinicQueueProps {
	facilityId: string
	clinicianStaffId?: string
}

export function ClinicQueue({ facilityId, clinicianStaffId }: ClinicQueueProps) {
	const [date, setDate] = useState(todayIso())
	const [vitalsEntry, setVitalsEntry] = useState<{
		encounterId: string
		patientName: string
	} | null>(null)

	const queueQuery = useClinicQueueQuery(
		{ facilityId, clinicianStaffId, date },
		{ refetchInterval: 20_000 }
	)

	const apptStatusMut = useUpdateAppointmentStatusMutation()
	const encounterQueueStatusMut = useUpdateEncounterQueueStatusMutation()

	const isPending = apptStatusMut.isPending || encounterQueueStatusMut.isPending

	const entries = queueQuery.data?.entries ?? []
	const waitingEntries = entries.filter((e) => e.status === "waiting")
	const inProgressEntry = entries.find((e) => e.status === "in_progress")

	function callNext() {
		const nextWaiting = waitingEntries.sort(
			(a, b) => (a.queueNumber ?? 9999) - (b.queueNumber ?? 9999)
		)[0]
		if (!nextWaiting) return

		if (nextWaiting.entryType === "appointment" && nextWaiting.appointmentId) {
			apptStatusMut.mutate({
				id: nextWaiting.appointmentId,
				status: "in_progress",
			})
		} else if (nextWaiting.entryType === "walk_in" && nextWaiting.encounterId) {
			encounterQueueStatusMut.mutate({
				id: nextWaiting.encounterId,
				status: "in_progress",
			})
		}
	}

	function markCompleted(entry: UnifiedQueueEntry) {
		if (entry.entryType === "appointment" && entry.appointmentId) {
			apptStatusMut.mutate({ id: entry.appointmentId, status: "completed" })
		}
		// Walk-in encounters must be finalized through the chart disposition panel (PS-016 TOR Flow 1 Step 5)
	}

	return (
		<>
		<div className="space-y-4">
			{/* Date Selector */}
			<Card>
				<CardHeader>
					<CardTitle>Queue Display</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap items-end gap-3">
						<div className="space-y-1">
							<Label>Date</Label>
							<Input
								type="date"
								className="w-40"
								value={date}
								onChange={(e) => setDate(e.target.value)}
							/>
						</div>
						<Button
							variant="outline"
							onClick={() => void queueQuery.refetch()}
						>
							Refresh
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Summary bar */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<Card>
					<CardContent className="pt-4">
						<div className="text-muted-foreground text-xs">Waiting</div>
						<div className="text-3xl font-bold">{queueQuery.data?.stats.waiting ?? 0}</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-4">
						<div className="text-muted-foreground text-xs">In Progress</div>
						<div className="truncate text-base font-semibold">
							{inProgressEntry ? inProgressEntry.patientName : "—"}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-4">
						<div className="text-muted-foreground text-xs">Completed</div>
						<div className="text-3xl font-bold">
							{queueQuery.data?.stats.completed ?? 0}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center pt-4">
						<Button
							className="w-full"
							disabled={waitingEntries.length === 0 || !!inProgressEntry || isPending}
							onClick={callNext}
						>
							{isPending ? "Calling…" : "Call Next Patient"}
						</Button>
					</CardContent>
				</Card>
			</div>

			{/* Queue table */}
			<Card>
				<CardHeader>
					<CardTitle>
						{queueQuery.data?.clinicName ?? "Clinic"} — Queue
					</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					{queueQuery.isLoading ? (
						<p className="text-muted-foreground py-8 text-center">Loading queue…</p>
					) : entries.length === 0 ? (
						<p className="text-muted-foreground py-8 text-center">
							No patients in queue.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-16">#</TableHead>
									<TableHead>Patient</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Scheduled</TableHead>
									<TableHead>Check-in Time</TableHead>
									<TableHead>Status</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{entries
									.filter(
										(e) =>
											e.status === "waiting" ||
											e.status === "in_progress"
									)
									.sort((a, b) => (a.queueNumber ?? 9999) - (b.queueNumber ?? 9999))
									.map((entry) => (
										<TableRow
											key={entry.id}
											className={
												entry.status === "in_progress"
													? "bg-blue-50 dark:bg-blue-950/20"
													: ""
											}
										>
											<TableCell className="text-center font-bold text-lg">
												{entry.queueNumber ?? "—"}
											</TableCell>
											<TableCell>
												<div className="font-medium">{entry.patientName}</div>
												<div className="text-muted-foreground text-xs">
													{entry.patientMrn}
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="outline" className="text-xs">
													{entry.entryType === "walk_in" ? "Walk-in" : "Appointment"}
												</Badge>
											</TableCell>
											<TableCell>
												{entry.slotTime ? formatTime(entry.slotTime) : "—"}
											</TableCell>
											<TableCell>
												{entry.checkInTime ? formatTime(entry.checkInTime) : "—"}
											</TableCell>
											<TableCell>{queueStatusBadge(entry.status)}</TableCell>
											<TableCell>
												{entry.status === "in_progress" && (
													<div className="flex gap-2">
														{entry.entryType === "walk_in" && entry.encounterId && (
															<>
																<Button
																	size="sm"
																	variant="outline"
																	nativeButton={false}
																	render={
																		<Link href={`/patients/${entry.patientId}/encounters/${entry.encounterId}`} />
																	}
																>
																	Open Chart
																</Button>
																<Button
																	size="sm"
																	variant="outline"
																	onClick={() =>
																		setVitalsEntry({
																			encounterId: entry.encounterId!,
																			patientName: entry.patientName ?? "",
																		})
																	}
																>
																	Vitals
																</Button>
															</>
														)}
														{entry.entryType === "appointment" && (
															<Button
																size="sm"
																disabled={isPending}
																onClick={() => markCompleted(entry)}
															>
																Mark Done
															</Button>
														)}
													</div>
												)}
												{entry.status === "waiting" &&
													entry.entryType === "walk_in" &&
													entry.encounterId && (
														<Button
															size="sm"
															variant="outline"
															onClick={() =>
																setVitalsEntry({
																	encounterId: entry.encounterId!,
																	patientName: entry.patientName ?? "",
																})
															}
														>
															Vitals
														</Button>
													)}
											</TableCell>
										</TableRow>
									))}

								{/* Completed section separator */}
								{entries.filter((e) => e.status === "completed").length > 0 && (
									<>
										<TableRow>
											<TableCell
												colSpan={7}
												className="bg-muted/30 py-1 text-center text-xs font-medium text-muted-foreground"
											>
												Completed Today
											</TableCell>
										</TableRow>
										{entries
											.filter((e) => e.status === "completed")
											.reverse()
											.map((entry) => (
												<TableRow
													key={entry.id}
													className="opacity-60"
												>
													<TableCell className="text-center text-muted-foreground">
														✓
													</TableCell>
													<TableCell>
														<div className="font-medium">{entry.patientName}</div>
														<div className="text-muted-foreground text-xs">
															{entry.patientMrn}
														</div>
													</TableCell>
													<TableCell>
														<Badge variant="outline" className="text-xs">
															{entry.entryType === "walk_in" ? "Walk-in" : "Appointment"}
														</Badge>
													</TableCell>
													<TableCell>
														{entry.slotTime ? formatTime(entry.slotTime) : "—"}
													</TableCell>
													<TableCell>—</TableCell>
													<TableCell>{queueStatusBadge(entry.status)}</TableCell>
													<TableCell />
												</TableRow>
											))}
									</>
								)}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>

		{vitalsEntry && (
			<VitalsEntryForm
				encounterId={vitalsEntry.encounterId}
				facilityId={facilityId}
				open={!!vitalsEntry}
				onOpenChange={open => {
					if (!open) setVitalsEntry(null)
				}}
			/>
		)}
		</>
	)
}

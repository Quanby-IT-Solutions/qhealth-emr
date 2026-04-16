"use client"

import { useState } from "react"

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
import {
	type AppointmentStatus,
	useClinicQueueQuery,
	useUpdateAppointmentStatusMutation,
} from "@/features/scheduling/api/scheduling.hooks"

function todayIso() {
	return new Date().toISOString().slice(0, 10)
}

function formatTime(time: string) {
	const [h, m] = time.split(":").map(Number)
	const period = (h ?? 0) >= 12 ? "PM" : "AM"
	const hour = ((h ?? 0) % 12 || 12).toString()
	return `${hour}:${(m ?? 0).toString().padStart(2, "0")} ${period}`
}

function queueStatusBadge(status: AppointmentStatus) {
	switch (status) {
		case "checked_in":
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
}

export function ClinicQueue({ facilityId }: ClinicQueueProps) {
	const [date, setDate] = useState(todayIso())

	const queueQuery = useClinicQueueQuery(
		{ facilityId, date },
		{ refetchInterval: 20_000 }
	)

	const statusMut = useUpdateAppointmentStatusMutation()

	const entries = queueQuery.data?.entries ?? []
	const waitingCount = entries.filter((e) => e.status === "checked_in").length
	const inProgressEntry = entries.find((e) => e.status === "in_progress")

	function callNext() {
		const nextWaiting = entries
			.filter((e) => e.status === "checked_in")
			.sort((a, b) => a.position - b.position)[0]
		if (nextWaiting) {
			statusMut.mutate({
				appointmentId: nextWaiting.appointmentId,
				status: "in_progress",
			})
		}
	}

	function markCompleted(appointmentId: string) {
		statusMut.mutate({ appointmentId, status: "completed" })
	}

	return (
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
						<div className="text-3xl font-bold">{waitingCount}</div>
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
							{entries.filter((e) => e.status === "completed").length}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center pt-4">
						<Button
							className="w-full"
							disabled={waitingCount === 0 || !!inProgressEntry || statusMut.isPending}
							onClick={callNext}
						>
							{statusMut.isPending ? "Calling…" : "Call Next Patient"}
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
													e.status === "checked_in" ||
													e.status === "in_progress"
											)
											.sort((a, b) => a.position - b.position)
											.map((entry) => (
												<TableRow
													key={entry.appointmentId}
													className={
														entry.status === "in_progress"
															? "bg-blue-50 dark:bg-blue-950/20"
															: ""
													}
												>
													<TableCell className="text-center font-bold text-lg">
														{entry.position}
													</TableCell>
													<TableCell>
														<div className="font-medium">{entry.patientName}</div>
														<div className="text-muted-foreground text-xs">
															{entry.patientMrn}
														</div>
													</TableCell>
													<TableCell>{formatTime(entry.slotTime)}</TableCell>
													<TableCell>
														{entry.checkInTime
															? formatTime(entry.checkInTime.slice(11, 16))
															: "—"}
													</TableCell>
													<TableCell>{queueStatusBadge(entry.status)}</TableCell>
													<TableCell>
														{entry.status === "in_progress" && (
															<Button
																size="sm"
																disabled={statusMut.isPending}
																onClick={() => markCompleted(entry.appointmentId)}
															>
																Mark Done
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
														colSpan={6}
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
															key={entry.appointmentId}
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
															<TableCell>{formatTime(entry.slotTime)}</TableCell>
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
			)
}

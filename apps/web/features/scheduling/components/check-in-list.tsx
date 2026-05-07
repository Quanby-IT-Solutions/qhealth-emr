"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
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
	useAppointmentsQuery,
	useCheckInMutation,
	useUpdateAppointmentStatusMutation,
} from "@/features/scheduling/api/scheduling.hooks"

function todayIso() {
	return new Date().toISOString().slice(0, 10)
}

function formatSlotTime(time: string) {
	const [h, m] = time.split(":").map(Number)
	const period = (h ?? 0) >= 12 ? "PM" : "AM"
	const hour = ((h ?? 0) % 12 || 12).toString()
	return `${hour}:${(m ?? 0).toString().padStart(2, "0")} ${period}`
}

function statusBadge(status: AppointmentStatus) {
	switch (status) {
		case "booked":
			return <Badge variant="outline">Booked</Badge>
		case "checked_in":
			return <Badge variant="default">Checked In</Badge>
		case "in_progress":
			return (
				<Badge className="bg-blue-500 text-white hover:bg-blue-500/80">In Progress</Badge>
			)
		case "completed":
			return (
				<Badge className="bg-green-600 text-white hover:bg-green-600/80">Completed</Badge>
			)
		case "no_show":
			return <Badge variant="destructive">No Show</Badge>
		case "cancelled":
			return <Badge variant="secondary">Cancelled</Badge>
		default:
			return <Badge variant="secondary">{status}</Badge>
	}
}

interface CheckInListProps {
	facilityId: string
}

export function CheckInList({ facilityId }: CheckInListProps) {
	const [statusFilter, setStatusFilter] = useState<string>("all")
	const [page, setPage] = useState(1)

	const { data, isLoading, refetch } = useAppointmentsQuery({
		facilityId,
		date: todayIso(),
		status: statusFilter === "all" ? undefined : (statusFilter as AppointmentStatus),
		page,
		limit: 25,
	})

	const checkInMut = useCheckInMutation()
	const statusMut = useUpdateAppointmentStatusMutation()

	const appointments = data?.items ?? []

	function handleCheckIn(appointmentId: string) {
		checkInMut.mutate({ id: appointmentId }, { onSuccess: () => void refetch() })
	}

	function handleNoShow(appointmentId: string) {
		statusMut.mutate({ id: appointmentId, status: "no_show" }, { onSuccess: () => void refetch() })
	}

	function handleCancel(appointmentId: string) {
		statusMut.mutate(
			{ id: appointmentId, status: "cancelled" },
			{ onSuccess: () => void refetch() }
		)
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h2 className="text-lg font-semibold">Today's Appointments</h2>
					<p className="text-sm text-muted-foreground">
						{new Date().toLocaleDateString("en-PH", {
							weekday: "long",
							year: "numeric",
							month: "long",
							day: "numeric",
						})}
					</p>
				</div>

				<div className="flex gap-2">
					<Select
						value={statusFilter}
						onValueChange={v => {
							if (v) {
								setStatusFilter(v)
								setPage(1)
							}
						}}
					>
						<SelectTrigger className="w-40">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Statuses</SelectItem>
							<SelectItem value="booked">Booked</SelectItem>
							<SelectItem value="checked_in">Checked In</SelectItem>
							<SelectItem value="in_progress">In Progress</SelectItem>
							<SelectItem value="completed">Completed</SelectItem>
							<SelectItem value="no_show">No Show</SelectItem>
							<SelectItem value="cancelled">Cancelled</SelectItem>
						</SelectContent>
					</Select>
					<Button size="sm" variant="outline" onClick={() => void refetch()}>
						Refresh
					</Button>
				</div>
			</div>

			<Card>
				<CardContent className="p-0">
					{isLoading ? (
						<p className="py-8 text-center text-muted-foreground">Loading appointments…</p>
					) : appointments.length === 0 ? (
						<p className="py-8 text-center text-muted-foreground">
							No appointments found for today.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Time</TableHead>
									<TableHead>Patient</TableHead>
									<TableHead>Queue #</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{appointments.map(appt => (
									<TableRow key={appt.id}>
										<TableCell className="font-medium">
											{formatSlotTime(appt.appointmentTime)}
										</TableCell>
										<TableCell>
											<div className="font-medium">{appt.patientName ?? "—"}</div>
											<div className="text-xs text-muted-foreground">
												{appt.patientMrn ?? ""}
											</div>
										</TableCell>
										<TableCell>
											{appt.queueNumber ? (
												<span className="font-bold">{appt.queueNumber}</span>
											) : (
												"—"
											)}
										</TableCell>
										<TableCell>{statusBadge(appt.status)}</TableCell>
										<TableCell>
											<div className="flex flex-wrap gap-1">
												{appt.status === "booked" && (
													<>
														<Button
															size="sm"
															disabled={checkInMut.isPending}
															onClick={() => handleCheckIn(appt.id)}
														>
															Check In
														</Button>
														<Button
															size="sm"
															variant="outline"
															disabled={statusMut.isPending}
															onClick={() => handleNoShow(appt.id)}
														>
															No Show
														</Button>
														<Button
															size="sm"
															variant="ghost"
															className="text-destructive"
															disabled={statusMut.isPending}
															onClick={() => handleCancel(appt.id)}
														>
															Cancel
														</Button>
													</>
												)}
												{appt.status === "checked_in" && (
													<span className="text-xs text-muted-foreground">
														{appt.checkedInAt
															? `Checked in at ${new Date(appt.checkedInAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}`
															: "In queue"}
													</span>
												)}
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{(data?.totalPages ?? 0) > 1 && (
				<div className="flex justify-center gap-2">
					<Button
						size="sm"
						variant="outline"
						disabled={page <= 1}
						onClick={() => setPage(p => p - 1)}
					>
						Previous
					</Button>
					<span className="self-center text-sm text-muted-foreground">
						Page {page} of {data?.totalPages}
					</span>
					<Button
						size="sm"
						variant="outline"
						disabled={page >= (data?.totalPages ?? 1)}
						onClick={() => setPage(p => p + 1)}
					>
						Next
					</Button>
				</div>
			)}
		</div>
	)
}

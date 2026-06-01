"use client"

import { useState } from "react"
import { MapPin, Video } from "lucide-react"

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
import { usePermissions } from "@/core/hooks/use-permissions"
import {
	useAppointmentsQuery,
	useCheckInMutation,
	useUpdateAppointmentStatusMutation,
	type AppointmentStatus,
} from "@/features/scheduling/api/scheduling.hooks"
import {
	useAppointmentsQuery as useTelemedicineAppointmentsQuery,
	type TelemedicineAppointment,
	type AppointmentStatus as TelemedicineAppointmentStatus,
} from "@/features/telemedicine/api/telemedicine.hooks"

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
			return <Badge className="bg-blue-500 text-white hover:bg-blue-500/80">In Progress</Badge>
		case "completed":
			return <Badge className="bg-green-600 text-white hover:bg-green-600/80">Completed</Badge>
		case "no_show":
			return <Badge variant="destructive">No Show</Badge>
		case "cancelled":
			return <Badge variant="secondary">Cancelled</Badge>
		default:
			return <Badge variant="secondary">{status}</Badge>
	}
}

function telemedicineStatusBadge(status: TelemedicineAppointmentStatus) {
	switch (status) {
		case "scheduled":
		case "confirmed":
			return <Badge variant="outline">{status}</Badge>
		case "in-progress":
			return <Badge className="bg-blue-500 text-white hover:bg-blue-500/80">In Progress</Badge>
		case "completed":
			return <Badge className="bg-green-600 text-white hover:bg-green-600/80">Completed</Badge>
		case "cancelled":
			return <Badge variant="secondary">Cancelled</Badge>
		case "no-show":
			return <Badge variant="destructive">No Show</Badge>
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
	const { canViewTelemedicine } = usePermissions()
	const today = todayIso()

	const { data, isLoading, refetch } = useAppointmentsQuery({
		facilityId,
		date: today,
		status: statusFilter === "all" ? undefined : (statusFilter as AppointmentStatus),
		page,
		limit: 25,
	})
	const telemedicineQuery = useTelemedicineAppointmentsQuery(
		facilityId,
		1,
		100,
		undefined,
		canViewTelemedicine
	)

	const checkInMut = useCheckInMutation()
	const statusMut = useUpdateAppointmentStatusMutation()

	const appointments = data?.items ?? []
	const telemedicineAppointments =
		canViewTelemedicine && statusFilter === "all"
			? (telemedicineQuery.data?.data ?? []).filter(appt => appt.scheduledDate === today)
			: []
	const isListLoading = isLoading || (canViewTelemedicine && telemedicineQuery.isLoading)

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
					<p className="text-muted-foreground text-sm">
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
					<Button
						size="sm"
						variant="outline"
						onClick={() => {
							void refetch()
							if (canViewTelemedicine) {
								void telemedicineQuery.refetch()
							}
						}}
					>
						Refresh
					</Button>
				</div>
			</div>

			<Card>
				<CardContent className="p-0">
					{isListLoading ? (
						<p className="text-muted-foreground py-8 text-center">Loading appointments…</p>
					) : appointments.length === 0 && telemedicineAppointments.length === 0 ? (
						<p className="text-muted-foreground py-8 text-center">
							No appointments found for today.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Time</TableHead>
									<TableHead>Patient</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Physician/Provider</TableHead>
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
											<div className="text-muted-foreground text-xs">{appt.patientMrn ?? ""}</div>
										</TableCell>
										<TableCell>
											<Badge variant="outline" className="gap-1">
												<MapPin className="size-3" />
												In-person
											</Badge>
										</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{appt.clinicianStaffId.slice(0, 8)}
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
													<span className="text-muted-foreground text-xs">
														{appt.checkedInAt
															? `Checked in at ${new Date(appt.checkedInAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}`
															: "In queue"}
													</span>
												)}
											</div>
										</TableCell>
									</TableRow>
								))}
								{telemedicineAppointments.map((appt: TelemedicineAppointment) => (
									<TableRow key={appt.id}>
										<TableCell className="font-medium">
											{formatSlotTime(appt.scheduledTime)}
										</TableCell>
										<TableCell>
											<div className="font-medium">{appt.patientName}</div>
											<div className="text-muted-foreground text-xs">{appt.patientMrn}</div>
										</TableCell>
										<TableCell>
											<Badge variant="secondary" className="gap-1">
												<Video className="size-3" />
												Telemedicine
											</Badge>
										</TableCell>
										<TableCell>{appt.clinicianName || "—"}</TableCell>
										<TableCell>—</TableCell>
										<TableCell>{telemedicineStatusBadge(appt.status)}</TableCell>
										<TableCell>
											<span className="text-muted-foreground text-xs">Managed in Telemedicine</span>
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
					<span className="text-muted-foreground self-center text-sm">
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

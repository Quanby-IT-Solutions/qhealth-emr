"use client"

import { useState } from "react"
import { MapPin, Video } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { usePermissions } from "@/core/hooks/use-permissions"
import { usePatientSearchQuery } from "@/features/patients/api/patients.hooks"
import {
	useAvailableSlotsQuery,
	useBookAppointmentMutation,
	useStaffClinicianListQuery,
	type TimeSlot,
} from "@/features/scheduling/api/scheduling.hooks"
import {
	TelemedicineAppointmentFields,
	type TelemedicinePlatformChoice,
} from "@/features/scheduling/components/telemedicine-appointment-fields"
import { useCreateAppointmentMutation as useCreateTelemedicineAppointmentMutation } from "@/features/telemedicine/api/telemedicine.hooks"

interface AppointmentBookingProps {
	facilityId: string
}

function todayIso() {
	return new Date().toISOString().slice(0, 10)
}

function formatSlotTime(time: string) {
	const [h, m] = time.split(":").map(Number)
	const period = (h ?? 0) >= 12 ? "PM" : "AM"
	const hour = ((h ?? 0) % 12 || 12).toString()
	return `${hour}:${(m ?? 0).toString().padStart(2, "0")} ${period}`
}

type AppointmentType = "in-person" | "telemedicine"

export function AppointmentBooking({ facilityId }: AppointmentBookingProps) {
	const [date, setDate] = useState(todayIso())
	const [clinicianId, setClinicianId] = useState<string>("")
	const [appointmentType, setAppointmentType] = useState<AppointmentType>("in-person")
	const [platform, setPlatform] = useState<TelemedicinePlatformChoice>("livekit")
	const [durationMinutes, setDurationMinutes] = useState(30)
	const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
	const [bookingOpen, setBookingOpen] = useState(false)
	const [patientSearch, setPatientSearch] = useState("")
	const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
	const [selectedPatientLabel, setSelectedPatientLabel] = useState("")
	const [chiefComplaint, setChiefComplaint] = useState("")
	const [notes, setNotes] = useState("")

	const { canCreateTelemedicine } = usePermissions()
	const isTelemedicine = appointmentType === "telemedicine"
	const cliniciansQuery = useStaffClinicianListQuery({ facilityId })
	const clinicians = cliniciansQuery.data ?? []
	const selectedClinician = clinicians.find(c => c.id === clinicianId)

	const slotsQuery = useAvailableSlotsQuery(
		{ facilityId, clinicianStaffId: clinicianId, date },
		!!clinicianId
	)

	const patientSearchQuery = usePatientSearchQuery(
		{ facilityId, search: patientSearch },
		{ enabled: bookingOpen && patientSearch.length >= 2 }
	)

	const bookMut = useBookAppointmentMutation()
	const telemedicineBookMut = useCreateTelemedicineAppointmentMutation()
	const isBooking = bookMut.isPending || telemedicineBookMut.isPending

	const slots = slotsQuery.data?.slots ?? []
	const clinicName = slotsQuery.data?.clinicName
	const availableCount = slots.filter(s => s.available).length

	function openBooking(slot: TimeSlot) {
		setSelectedSlot(slot)
		setPatientSearch("")
		setSelectedPatientId(null)
		setSelectedPatientLabel("")
		setChiefComplaint("")
		setNotes("")
		setBookingOpen(true)
	}

	function handleBook() {
		if (!selectedSlot || !selectedPatientId || !clinicianId) return
		if (isTelemedicine) {
			if (platform !== "livekit") {
				toast.error("Only LiveKit telemedicine appointments are available right now.")
				return
			}
			telemedicineBookMut.mutate(
				{
					facilityId,
					patientId: selectedPatientId,
					clinicianId,
					scheduledDate: date,
					scheduledTime: selectedSlot.time.slice(0, 5),
					durationMinutes,
					platform: "livekit",
					notes: notes || undefined,
				},
				{
					onSuccess: () => {
						setBookingOpen(false)
						toast.success("Telemedicine appointment booked.")
					},
					onError: error => {
						toast.error(error instanceof Error ? error.message : "Failed to book appointment.")
					},
				}
			)
			return
		}

		bookMut.mutate(
			{
				facilityId,
				patientId: selectedPatientId,
				clinicianStaffId: clinicianId,
				appointmentDate: date,
				appointmentTime: selectedSlot.time,
				clinicSlotId: selectedSlot.slotId,
				encounterType: "outpatient",
				chiefComplaint: chiefComplaint || undefined,
				notes: notes || undefined,
			},
			{
				onSuccess: () => {
					setBookingOpen(false)
					toast.success("Appointment booked.")
				},
				onError: error => {
					toast.error(error instanceof Error ? error.message : "Failed to book appointment.")
				},
			}
		)
	}

	return (
		<div className="space-y-4">
			{/* Filters */}
			<Card>
				<CardHeader>
					<CardTitle>Find Available Slots</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div className="space-y-1">
							<Label>Appointment Type</Label>
							<Select
								value={appointmentType}
								onValueChange={value => {
									if (!value) return
									const nextType = value as AppointmentType
									setAppointmentType(nextType)
									setSelectedSlot(null)
									setBookingOpen(false)
									if (nextType === "telemedicine") {
										setChiefComplaint("")
									}
								}}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="in-person">
										<span className="inline-flex items-center gap-2">
											<MapPin className="size-4" />
											In-person
										</span>
									</SelectItem>
									{canCreateTelemedicine && (
										<SelectItem value="telemedicine">
											<span className="inline-flex items-center gap-2">
												<Video className="size-4" />
												Telemedicine
											</span>
										</SelectItem>
									)}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1">
							<Label>{isTelemedicine ? "Physician" : "Clinician"}</Label>
							<Select
								value={clinicianId}
								onValueChange={v => {
									if (v) setClinicianId(v)
								}}
							>
								<SelectTrigger className="w-full min-w-0">
									<SelectValue className="min-w-0 truncate">
										{selectedClinician
											? `${selectedClinician.name}${selectedClinician.department ? ` — ${selectedClinician.department}` : ""}`
											: isTelemedicine
												? "Select physician"
												: "Select clinician"}
									</SelectValue>
								</SelectTrigger>
								<SelectContent className="max-w-[calc(100vw-2rem)] min-w-72 sm:min-w-96">
									{clinicians.map(c => (
										<SelectItem key={c.id} value={c.id}>
											{c.name}
											{c.department ? ` — ${c.department}` : ""}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1">
							<Label>Date</Label>
							<Input
								type="date"
								value={date}
								min={todayIso()}
								onChange={e => setDate(e.target.value)}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Slots Grid */}
			<Card>
				<CardHeader>
					<CardTitle>
						{clinicName ?? "Available Slots"}
						{availableCount > 0 && (
							<span className="text-muted-foreground ml-2 text-sm font-normal">
								{availableCount} slot{availableCount !== 1 ? "s" : ""} available
							</span>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{!clinicianId ? (
						<p className="text-muted-foreground py-6 text-center">
							Select a clinician to see available slots.
						</p>
					) : slotsQuery.isLoading ? (
						<p className="text-muted-foreground py-6 text-center">Searching for slots…</p>
					) : slots.length === 0 ? (
						<p className="text-muted-foreground py-6 text-center">
							No slots found for the selected date.
						</p>
					) : (
						<div className="flex flex-wrap gap-2">
							{slots.map(slot => (
								<Button
									key={slot.slotId}
									variant={slot.available ? "outline" : "ghost"}
									disabled={!slot.available}
									className={`min-h-11 px-4 text-sm ${!slot.available ? "cursor-not-allowed opacity-50" : ""}`}
									onClick={() => slot.available && openBooking(slot)}
								>
									{formatSlotTime(slot.time)}
									{!slot.available && (
										<Badge variant="secondary" className="ml-1 px-1 text-xs">
											Booked
										</Badge>
									)}
								</Button>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Booking Dialog */}
			<Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Book Appointment</DialogTitle>
					</DialogHeader>

					{selectedSlot && (
						<div className="space-y-4 text-sm">
							<div className="space-y-1 rounded-md border p-3">
								<div className="flex justify-between">
									<span className="text-muted-foreground">Type</span>
									<Badge variant={isTelemedicine ? "secondary" : "outline"} className="gap-1">
										{isTelemedicine ? <Video className="size-3" /> : <MapPin className="size-3" />}
										{isTelemedicine ? "Telemedicine" : "In-person"}
									</Badge>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Date</span>
									<span className="font-medium">{date}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Time</span>
									<span className="font-medium">{formatSlotTime(selectedSlot.time)}</span>
								</div>
								{clinicName && (
									<div className="flex justify-between">
										<span className="text-muted-foreground">Clinic</span>
										<span className="font-medium">{clinicName}</span>
									</div>
								)}
							</div>

							{isTelemedicine && (
								<TelemedicineAppointmentFields
									facilityId={facilityId}
									clinicianId={clinicianId}
									onClinicianChange={setClinicianId}
									platform={platform}
									onPlatformChange={setPlatform}
									durationMinutes={durationMinutes}
									onDurationChange={setDurationMinutes}
								/>
							)}

							<div className="space-y-1">
								<Label>Search Patient</Label>
								<Input
									placeholder="Name or MRN (type at least 2 characters)"
									value={patientSearch}
									onChange={e => {
										setPatientSearch(e.target.value)
										if (selectedPatientLabel !== e.target.value) {
											setSelectedPatientId(null)
											setSelectedPatientLabel("")
										}
									}}
								/>
								{patientSearch.length >= 2 && !selectedPatientId && (
									<div className="max-h-40 overflow-y-auto rounded-md border">
										{patientSearchQuery.isLoading ? (
											<p className="text-muted-foreground px-3 py-2 text-xs">Searching…</p>
										) : (patientSearchQuery.data?.data ?? []).length === 0 ? (
											<p className="text-muted-foreground px-3 py-2 text-xs">No patients found.</p>
										) : (
											patientSearchQuery.data?.data.map(p => (
												<button
													key={p.id}
													className="hover:bg-accent w-full px-3 py-2 text-left text-xs"
													onClick={() => {
														setSelectedPatientId(p.id)
														setSelectedPatientLabel(`${p.lastName}, ${p.firstName} (${p.mrn})`)
														setPatientSearch(`${p.lastName}, ${p.firstName} (${p.mrn})`)
													}}
												>
													<span className="font-medium">
														{p.lastName}, {p.firstName}
													</span>
													<span className="text-muted-foreground ml-2">{p.mrn}</span>
												</button>
											))
										)}
									</div>
								)}
								{selectedPatientId && <p className="text-xs text-green-600">Patient selected</p>}
							</div>

							{!isTelemedicine && (
								<div className="space-y-1">
									<Label>Chief Complaint</Label>
									<Input
										placeholder="Chief complaint"
										value={chiefComplaint}
										onChange={e => setChiefComplaint(e.target.value)}
									/>
								</div>
							)}

							<div className="space-y-1">
								<Label>Notes (optional)</Label>
								<Input
									placeholder="Additional notes"
									value={notes}
									onChange={e => setNotes(e.target.value)}
								/>
							</div>
						</div>
					)}

					<DialogFooter>
						<Button variant="outline" onClick={() => setBookingOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleBook} disabled={isBooking || !selectedPatientId || !clinicianId}>
							{isBooking ? "Booking…" : isTelemedicine ? "Book Telemedicine" : "Confirm Booking"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

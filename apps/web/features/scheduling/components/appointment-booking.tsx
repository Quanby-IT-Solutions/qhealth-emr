"use client"

import { useState } from "react"

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
import { usePatientSearchQuery } from "@/features/patients/api/patients.hooks"
import {
	type TimeSlot,
	useAvailableSlotsQuery,
	useBookAppointmentMutation,
	useStaffClinicianListQuery,
} from "@/features/scheduling/api/scheduling.hooks"

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

export function AppointmentBooking({ facilityId }: AppointmentBookingProps) {
	const [date, setDate] = useState(todayIso())
	const [clinicianId, setClinicianId] = useState<string>("")
	const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
	const [bookingOpen, setBookingOpen] = useState(false)
	const [patientSearch, setPatientSearch] = useState("")
	const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
	const [selectedPatientLabel, setSelectedPatientLabel] = useState("")
	const [chiefComplaint, setChiefComplaint] = useState("")
	const [notes, setNotes] = useState("")

	const cliniciansQuery = useStaffClinicianListQuery({ facilityId })
	const clinicians = cliniciansQuery.data ?? []

	const slotsQuery = useAvailableSlotsQuery(
		{ facilityId, clinicianStaffId: clinicianId, date },
		!!clinicianId
	)

	const patientSearchQuery = usePatientSearchQuery(
		{ facilityId, search: patientSearch },
		{ enabled: bookingOpen && patientSearch.length >= 2 }
	)

	const bookMut = useBookAppointmentMutation()

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
							<Label>Clinician</Label>
							<Select
								value={clinicianId}
								onValueChange={v => {
									if (v) setClinicianId(v)
								}}
							>
								<SelectTrigger>
									<SelectValue>{clinicianId ? clinicians.find(c => c.id === clinicianId)?.name : "Select clinician"}</SelectValue>
								</SelectTrigger>
								<SelectContent>
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
							<span className="ml-2 text-sm font-normal text-muted-foreground">
								{availableCount} slot{availableCount !== 1 ? "s" : ""} available
							</span>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{!clinicianId ? (
						<p className="py-6 text-center text-muted-foreground">
							Select a clinician to see available slots.
						</p>
					) : slotsQuery.isLoading ? (
						<p className="py-6 text-center text-muted-foreground">Searching for slots…</p>
					) : slots.length === 0 ? (
						<p className="py-6 text-center text-muted-foreground">
							No slots found for the selected date.
						</p>
					) : (
						<div className="flex flex-wrap gap-2">
							{slots.map(slot => (
								<Button
									key={slot.slotId}
									size="sm"
									variant={slot.available ? "outline" : "ghost"}
									disabled={!slot.available}
									className={!slot.available ? "cursor-not-allowed opacity-50" : ""}
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
							<div className="rounded-md border p-3 space-y-1">
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
											<p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
										) : (patientSearchQuery.data?.data ?? []).length === 0 ? (
											<p className="px-3 py-2 text-xs text-muted-foreground">
												No patients found.
											</p>
										) : (
											patientSearchQuery.data?.data.map(p => (
												<button
													key={p.id}
													className="w-full px-3 py-2 text-left text-xs hover:bg-accent"
													onClick={() => {
														setSelectedPatientId(p.id)
														setSelectedPatientLabel(
															`${p.lastName}, ${p.firstName} (${p.mrn})`
														)
														setPatientSearch(
															`${p.lastName}, ${p.firstName} (${p.mrn})`
														)
													}}
												>
													<span className="font-medium">
														{p.lastName}, {p.firstName}
													</span>
													<span className="ml-2 text-muted-foreground">{p.mrn}</span>
												</button>
											))
										)}
									</div>
								)}
								{selectedPatientId && (
									<p className="text-xs text-green-600">Patient selected</p>
								)}
							</div>

							<div className="space-y-1">
								<Label>Chief Complaint</Label>
								<Input
									placeholder="Chief complaint"
									value={chiefComplaint}
									onChange={e => setChiefComplaint(e.target.value)}
								/>
							</div>

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
						<Button
							onClick={handleBook}
							disabled={bookMut.isPending || !selectedPatientId}
						>
							{bookMut.isPending ? "Booking…" : "Confirm Booking"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

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
import {
	type AppointmentSlot,
	useAvailableSlotsQuery,
	useBookAppointmentMutation,
	useScheduleTemplatesQuery,
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

export function AppointmentBooking({ facilityId: _facilityId }: AppointmentBookingProps) {
	const [date, setDate] = useState(todayIso())
	const [clinicId, setClinicId] = useState<string>("all")
	const [clinicianId, setClinicianId] = useState<string>("all")
	const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null)
	const [bookingOpen, setBookingOpen] = useState(false)

	// patient form
	const [patientId, setPatientId] = useState("")
	const [notes, setNotes] = useState("")

	const templatesQuery = useScheduleTemplatesQuery({ limit: 100 })
	const clinicians = templatesQuery.data ?? []

	// Unique clinicians from templates
	const uniqueClinicians = clinicians.reduce<{ id: string; name: string }[]>(
		(acc, t) => {
			if (!acc.find((c) => c.id === t.clinicianId)) {
				acc.push({ id: t.clinicianId, name: t.clinicianName })
			}
			return acc
		},
		[]
	)

	// Unique clinics from templates
	const uniqueClinics = clinicians.reduce<{ id: string; name: string }[]>(
		(acc, t) => {
			if (!acc.find((c) => c.id === t.clinicId)) {
				acc.push({ id: t.clinicId, name: t.clinicName })
			}
			return acc
		},
		[]
	)

	const slotsQuery = useAvailableSlotsQuery(
		{
			date,
			clinicId: clinicId === "all" ? undefined : clinicId,
			clinicianId: clinicianId === "all" ? undefined : clinicianId,
		},
		!!date
	)

	const bookMut = useBookAppointmentMutation()

	const slots = slotsQuery.data?.slots ?? []
	const availableSlots = slots.filter((s) => s.isAvailable)

	function openBooking(slot: AppointmentSlot) {
		setSelectedSlot(slot)
		setPatientId("")
		setNotes("")
		setBookingOpen(true)
	}

	function handleBook() {
		if (!selectedSlot || !patientId.trim()) return
		bookMut.mutate(
			{
				patientId: patientId.trim(),
				clinicId: selectedSlot.clinicId,
				clinicianId: selectedSlot.clinicianId,
				scheduledDate: selectedSlot.date,
				slotTime: selectedSlot.time,
				notes: notes || undefined,
			},
			{
				onSuccess: () => {
					setBookingOpen(false)
					// Refresh slots
					void slotsQuery.refetch()
				},
			}
		)
	}

	return (
		<div className="space-y-4">
			{/* Search Filters */}
			<Card>
				<CardHeader>
					<CardTitle>Find Available Slots</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
						<div className="space-y-1">
							<Label>Date</Label>
							<Input
								type="date"
								value={date}
								min={todayIso()}
								onChange={(e) => setDate(e.target.value)}
							/>
						</div>

						<div className="space-y-1">
							<Label>Clinic</Label>
							<Select
								value={clinicId}
								onValueChange={(v) => {
									if (v) setClinicId(v)
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="All clinics" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Clinics</SelectItem>
									{uniqueClinics.map((c) => (
										<SelectItem key={c.id} value={c.id}>
											{c.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1">
							<Label>Clinician</Label>
							<Select
								value={clinicianId}
								onValueChange={(v) => {
									if (v) setClinicianId(v)
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="All clinicians" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Clinicians</SelectItem>
									{uniqueClinicians.map((c) => (
										<SelectItem key={c.id} value={c.id}>
											{c.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Slots Grid */}
			<Card>
				<CardHeader>
					<CardTitle>
						Available Slots
						{availableSlots.length > 0 && (
							<span className="ml-2 text-sm font-normal text-muted-foreground">
								{availableSlots.length} slot{availableSlots.length !== 1 ? "s" : ""} available
							</span>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{slotsQuery.isLoading ? (
						<p className="text-muted-foreground py-6 text-center">Searching for slots…</p>
					) : slots.length === 0 ? (
						<p className="text-muted-foreground py-6 text-center">
							No slots found for the selected date and filters.
						</p>
					) : (
						<div className="space-y-4">
							{/* Group by clinician */}
							{uniqueClinicians
								.filter(
									(c) =>
										clinicianId === "all" || c.id === clinicianId
								)
								.map((clinician) => {
									const clinicianSlots = slots.filter(
										(s) => s.clinicianId === clinician.id
									)
									if (!clinicianSlots.length) return null
									return (
										<div key={clinician.id}>
											<div className="mb-2 text-sm font-medium">
												{clinician.name}
											</div>
											<div className="flex flex-wrap gap-2">
												{clinicianSlots.map((slot) => (
													<Button
														key={`${slot.clinicianId}-${slot.time}`}
														size="sm"
														variant={slot.isAvailable ? "outline" : "ghost"}
														disabled={!slot.isAvailable}
														className={
															!slot.isAvailable
																? "cursor-not-allowed opacity-50"
																: ""
														}
														onClick={() => slot.isAvailable && openBooking(slot)}
													>
														{formatSlotTime(slot.time)}
														{slot.isAvailable && slot.remainingSlots <= 3 && (
															<Badge
																variant="destructive"
																className="ml-1 px-1 text-xs"
															>
																{slot.remainingSlots} left
															</Badge>
														)}
													</Button>
												))}
											</div>
										</div>
									)
								})}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Booking Confirm Dialog */}
			<Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Confirm Appointment</DialogTitle>
					</DialogHeader>

					{selectedSlot && (
						<div className="space-y-3 text-sm">
							<div className="rounded-md border p-3 space-y-1">
								<div className="flex justify-between">
									<span className="text-muted-foreground">Date</span>
									<span className="font-medium">{selectedSlot.date}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Time</span>
									<span className="font-medium">{formatSlotTime(selectedSlot.time)}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Clinician</span>
									<span className="font-medium">{selectedSlot.clinicianName}</span>
								</div>
							</div>

							<div className="space-y-1">
								<Label>Patient ID</Label>
								<Input
									placeholder="Enter patient ID"
									value={patientId}
									onChange={(e) => setPatientId(e.target.value)}
								/>
							</div>

							<div className="space-y-1">
								<Label>Notes (optional)</Label>
								<Input
									placeholder="Chief complaint or notes"
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
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
							disabled={bookMut.isPending || !patientId.trim()}
						>
							{bookMut.isPending ? "Booking…" : "Confirm Booking"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

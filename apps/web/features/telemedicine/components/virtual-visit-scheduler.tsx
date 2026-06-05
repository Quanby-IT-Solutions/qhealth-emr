"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, ArrowRight, Calendar, Clock, User, Video } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { usePatientSearchQuery } from "@/features/patients/api/patients.hooks"
import { useStaffClinicianListQuery } from "@/features/scheduling/api/scheduling.hooks"
import {
	formatAppointmentStatusLabel,
	getAppointmentStatusColor,
	useAppointmentsQuery,
	useCreateAppointmentMutation,
	type AppointmentStatus,
	type CreateAppointmentInput,
	type TelemedicineAppointment,
} from "@/features/telemedicine/api/telemedicine.hooks"
import { getVideoLaunchPath } from "@/features/telemedicine/lib/video-links"

// ============================================================================
// Types
// ============================================================================

interface VirtualVisitSchedulerProps {
	facilityId: string
	selectedAppointmentId?: string | null
	onAppointmentCreated?: (appointment: TelemedicineAppointment) => void
	onAppointmentSelected?: (appointmentId: string, encounterId?: string | null) => void
}

interface BookingFormState {
	patientId: string
	patientName: string
	patientMrn: string
	patientContactNumber: string
	patientEmail: string
	clinicianId: string
	clinicianName: string
	clinicianSpecialty: string
	scheduledDate: string
	scheduledTime: string
	durationMinutes: number
	notes: string
}

type BookingFormErrors = Partial<Record<keyof BookingFormState | "schedule", string>>

// ============================================================================
// Constants
// ============================================================================

const DURATION_OPTIONS = [15, 30, 45, 60] as const

const EMPTY_FORM: BookingFormState = {
	patientId: "",
	patientName: "",
	patientMrn: "",
	patientContactNumber: "",
	patientEmail: "",
	clinicianId: "",
	clinicianName: "",
	clinicianSpecialty: "",
	scheduledDate: "",
	scheduledTime: "",
	durationMinutes: 30,
	notes: "",
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(val: string): string {
	if (!val) return "-"
	const date = new Date(val)
	if (Number.isNaN(date.getTime())) return val
	return date.toLocaleDateString("en-PH", {
		month: "short",
		day: "numeric",
		year: "numeric",
	})
}

function isFutureAppointment(date: string, time: string): boolean {
	const scheduled = new Date(`${date}T${time}`)
	return Number.isFinite(scheduled.getTime()) && scheduled.getTime() > Date.now()
}

function getLocalDateTimeInputMinimum(): string {
	const now = new Date()
	now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
	return now.toISOString().slice(0, 16)
}

function appointmentsOverlap(
	leftDate: string,
	leftTime: string,
	leftDuration: number,
	rightDate: string,
	rightTime: string,
	rightDuration: number
) {
	const leftStart = new Date(`${leftDate}T${leftTime}`).getTime()
	const rightStart = new Date(`${rightDate}T${rightTime}`).getTime()
	if (!Number.isFinite(leftStart) || !Number.isFinite(rightStart)) return false
	const leftEnd = leftStart + leftDuration * 60_000
	const rightEnd = rightStart + rightDuration * 60_000
	return leftStart < rightEnd && rightStart < leftEnd
}

function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
	const colorClass = getAppointmentStatusColor(status)
	return (
		<span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
			{formatAppointmentStatusLabel(status)}
		</span>
	)
}

// ============================================================================
// Main Component
// ============================================================================

export function VirtualVisitScheduler({
	facilityId,
	selectedAppointmentId,
	onAppointmentCreated,
	onAppointmentSelected,
}: VirtualVisitSchedulerProps) {
	const [showForm, setShowForm] = useState(false)
	const [form, setForm] = useState<BookingFormState>(EMPTY_FORM)
	const [patientSearch, setPatientSearch] = useState("")
	const [debouncedPatientSearch, setDebouncedPatientSearch] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [fieldErrors, setFieldErrors] = useState<BookingFormErrors>({})

	const { data: appointments, isLoading } = useAppointmentsQuery(facilityId)
	const { data: clinicians, isLoading: cliniciansLoading } = useStaffClinicianListQuery({
		facilityId,
	})
	const { data: patientResults, isLoading: patientsLoading } = usePatientSearchQuery(
		{ facilityId, search: debouncedPatientSearch, limit: 10 },
		{ enabled: showForm && Boolean(facilityId) && debouncedPatientSearch.trim().length >= 2 }
	)
	const createMutation = useCreateAppointmentMutation()

	useEffect(() => {
		const timer = window.setTimeout(() => setDebouncedPatientSearch(patientSearch.trim()), 250)
		return () => window.clearTimeout(timer)
	}, [patientSearch])

	function patch(key: keyof BookingFormState, value: string | number) {
		setForm(prev => ({ ...prev, [key]: value }))
		setFieldErrors(prev => {
			if (!prev[key]) return prev
			const next = { ...prev }
			delete next[key]
			return next
		})
	}

	function handleClinicianSelect(clinicianId: string) {
		if (!clinicianId) {
			setForm(prev => ({
				...prev,
				clinicianId: "",
				clinicianName: "",
				clinicianSpecialty: "",
			}))
			return
		}
		const clinician = clinicians.find(c => c.id === clinicianId)
		if (clinician) {
			setForm(prev => ({
				...prev,
				clinicianId,
				clinicianName: clinician.name,
				clinicianSpecialty: clinician.department ?? "",
			}))
			setFieldErrors(prev => {
				const next = { ...prev }
				delete next.clinicianId
				return next
			})
		}
	}

	function handlePatientSelect(patient: NonNullable<typeof patientResults>["data"][number]) {
		const patientWithContact = patient as typeof patient & {
			phone?: string | null
			email?: string | null
		}
		const patientName = `${patient.lastName}, ${patient.firstName}`
		setPatientSearch(`${patientName} (${patient.mrn})`)
		setForm(prev => ({
			...prev,
			patientId: patient.id,
			patientName,
			patientMrn: patient.mrn,
			patientContactNumber: patientWithContact.phone ?? "",
			patientEmail: patientWithContact.email ?? "",
		}))
		setFieldErrors(prev => {
			const next = { ...prev }
			delete next.patientId
			return next
		})
	}

	function validateBookingForm(): BookingFormErrors {
		const nextErrors: BookingFormErrors = {}
		const activeAppointments =
			appointments?.data.filter(
				appt => !["cancelled", "no-show", "completed"].includes(appt.status)
			) ?? []

		if (!facilityId) nextErrors.schedule = "Select an active facility before booking."
		if (!form.patientId || !form.patientName || !form.patientMrn) {
			nextErrors.patientId = "Select a patient from the search results before booking."
		}
		if (!form.clinicianId) {
			nextErrors.clinicianId = "Select an available clinician."
		} else if (!clinicians.some(c => c.id === form.clinicianId)) {
			nextErrors.clinicianId = "This clinician is no longer available. Select another clinician."
		}
		if (!form.scheduledDate) nextErrors.scheduledDate = "Select an appointment date."
		if (!form.scheduledTime) nextErrors.scheduledTime = "Select an appointment time."
		if (form.scheduledDate && form.scheduledTime) {
			if (!isFutureAppointment(form.scheduledDate, form.scheduledTime)) {
				nextErrors.schedule = "Appointment date and time must be in the future."
			} else {
				const hasConflict = activeAppointments.some(
					appt =>
						appt.clinicianId === form.clinicianId &&
						appointmentsOverlap(
							form.scheduledDate,
							form.scheduledTime,
							form.durationMinutes,
							appt.scheduledDate,
							appt.scheduledTime,
							appt.durationMinutes
						)
				)
				if (hasConflict) {
					nextErrors.schedule =
						"The selected clinician already has a telemedicine appointment at that time."
				}
			}
		}

		return nextErrors
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)

		const nextErrors = validateBookingForm()
		if (Object.keys(nextErrors).length > 0) {
			setFieldErrors(nextErrors)
			const message = nextErrors.schedule ?? "Please fix the highlighted fields before booking."
			setError(message)
			toast.error("Appointment cannot be booked yet", { description: message })
			return
		}
		setFieldErrors({})

		const confirmed = window.confirm(
			`Book a ${form.durationMinutes}-minute virtual appointment for ${form.patientName} with ${form.clinicianName} on ${formatDate(form.scheduledDate)} at ${form.scheduledTime}?`
		)
		if (!confirmed) return

		const input: CreateAppointmentInput = {
			facilityId,
			patientId: form.patientId,
			clinicianId: form.clinicianId,
			scheduledDate: form.scheduledDate,
			scheduledTime: form.scheduledTime,
			durationMinutes: form.durationMinutes,
			platform: "livekit",
			notes: form.notes.trim() || undefined,
		}

		try {
			const appt = await createMutation.mutateAsync(input)
			setForm(EMPTY_FORM)
			setPatientSearch("")
			setShowForm(false)
			toast.success("Virtual appointment booked", {
				description: `${appt.patientName} is scheduled with ${appt.clinicianName}.`,
			})
			onAppointmentCreated?.(appt)
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to create appointment."
			setError(message)
			toast.error("Could not book appointment", { description: message })
		}
	}

	// Minimum date: today
	const today = new Date().toISOString().split("T")[0]
	const minDateTime = getLocalDateTimeInputMinimum()
	const canSubmit = Boolean(facilityId) && !createMutation.isPending

	return (
		<div className="min-w-0 space-y-4">
			{/* Header */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="min-w-0">
					<h2 className="text-lg font-semibold">Virtual Visit Scheduler</h2>
					<p className="text-muted-foreground text-sm">
						Book telemedicine appointments and secure patient invite links
					</p>
				</div>
				<Button
					onClick={() => setShowForm(v => !v)}
					variant={showForm ? "outline" : "default"}
					disabled={!facilityId}
					className="w-full sm:w-auto"
				>
					{showForm ? "Cancel" : "New Appointment"}
				</Button>
			</div>

			{!facilityId && (
				<div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-4 py-3 text-sm">
					<AlertCircle className="mt-0.5 size-4 shrink-0" />
					<p>
						Your account is not linked to an active facility, so appointments cannot be booked from
						this screen.
					</p>
				</div>
			)}

			{/* Booking Form */}
			{showForm && (
				<Card className="min-w-0">
					<CardHeader>
						<CardTitle className="text-base">Book Virtual Appointment</CardTitle>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-5">
							{/* Patient Info */}
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div className="relative space-y-1.5 sm:col-span-2">
									<label htmlFor="patientSearch" className="text-sm font-medium">
										Patient <span className="text-destructive">*</span>
									</label>
									<input
										id="patientSearch"
										className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
										value={patientSearch}
										onChange={e => {
											setPatientSearch(e.target.value)
											setForm(prev => ({
												...prev,
												patientId: "",
												patientName: "",
												patientMrn: "",
												patientContactNumber: "",
												patientEmail: "",
											}))
										}}
										placeholder="Search by patient name or MRN"
										aria-invalid={Boolean(fieldErrors.patientId)}
										required
									/>
									{debouncedPatientSearch.length >= 2 && !form.patientId && (
										<div className="bg-background absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border shadow-sm">
											{patientsLoading ? (
												<p className="text-muted-foreground px-3 py-2 text-sm">
													Searching patients...
												</p>
											) : patientResults?.data.length ? (
												patientResults.data.map(patient => (
													<button
														key={patient.id}
														type="button"
														className="hover:bg-muted w-full px-3 py-2 text-left text-sm"
														onClick={() => handlePatientSelect(patient)}
													>
														<span className="font-medium">
															{patient.lastName}, {patient.firstName}
														</span>
														<span className="text-muted-foreground ml-2">{patient.mrn}</span>
													</button>
												))
											) : (
												<p className="text-muted-foreground px-3 py-2 text-sm">
													No matching patients found.
												</p>
											)}
										</div>
									)}
									{fieldErrors.patientId && (
										<p className="text-destructive text-xs">{fieldErrors.patientId}</p>
									)}
								</div>
								{form.patientId && (
									<>
										<div className="bg-muted/30 rounded-md border px-3 py-2">
											<p className="text-muted-foreground text-xs">Contact Number</p>
											<p className="text-sm font-medium">
												{form.patientContactNumber || "No number on patient record"}
											</p>
										</div>
										<div className="bg-muted/30 rounded-md border px-3 py-2">
											<p className="text-muted-foreground text-xs">Email</p>
											<p className="text-sm font-medium">
												{form.patientEmail || "No email on patient record"}
											</p>
										</div>
									</>
								)}
							</div>

							{/* Clinician */}
							<div className="space-y-1.5">
								<label htmlFor="clinicianId" className="text-sm font-medium">
									Clinician <span className="text-destructive">*</span>
								</label>
								<select
									id="clinicianId"
									className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
									value={form.clinicianId}
									onChange={e => handleClinicianSelect(e.target.value)}
									required
									disabled={cliniciansLoading}
									aria-invalid={Boolean(fieldErrors.clinicianId)}
								>
									<option value="">
										{cliniciansLoading
											? "Loading clinicians..."
											: clinicians.length
												? "Select clinician"
												: "No clinicians available"}
									</option>
									{clinicians.map(c => (
										<option key={c.id} value={c.id}>
											{c.name} - {c.department ?? "Clinician"}
										</option>
									))}
								</select>
								{fieldErrors.clinicianId && (
									<p className="text-destructive text-xs">{fieldErrors.clinicianId}</p>
								)}
							</div>

							{/* Date, Time, Duration */}
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
								<div className="space-y-1.5">
									<label htmlFor="scheduledDate" className="text-sm font-medium">
										Date <span className="text-destructive">*</span>
									</label>
									<input
										id="scheduledDate"
										type="date"
										min={today}
										className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
										value={form.scheduledDate}
										onChange={e => patch("scheduledDate", e.target.value)}
										aria-invalid={Boolean(fieldErrors.scheduledDate)}
										required
									/>
									{fieldErrors.scheduledDate && (
										<p className="text-destructive text-xs">{fieldErrors.scheduledDate}</p>
									)}
								</div>
								<div className="space-y-1.5">
									<label htmlFor="scheduledTime" className="text-sm font-medium">
										Time <span className="text-destructive">*</span>
									</label>
									<input
										id="scheduledTime"
										type="time"
										className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
										value={form.scheduledTime}
										onChange={e => patch("scheduledTime", e.target.value)}
										min={form.scheduledDate === today ? minDateTime.slice(11) : undefined}
										aria-invalid={Boolean(fieldErrors.scheduledTime)}
										required
									/>
									{fieldErrors.scheduledTime && (
										<p className="text-destructive text-xs">{fieldErrors.scheduledTime}</p>
									)}
								</div>
								<div className="space-y-1.5">
									<label htmlFor="duration" className="text-sm font-medium">
										Duration
									</label>
									<select
										id="duration"
										className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
										value={form.durationMinutes}
										onChange={e => patch("durationMinutes", Number(e.target.value))}
									>
										{DURATION_OPTIONS.map(d => (
											<option key={d} value={d}>
												{d} min
											</option>
										))}
									</select>
								</div>
							</div>

							{/* Notes */}
							<div className="space-y-1.5">
								<label htmlFor="notes" className="text-sm font-medium">
									Notes
								</label>
								<textarea
									id="notes"
									className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
									rows={2}
									value={form.notes}
									onChange={e => patch("notes", e.target.value)}
									placeholder="Reason for visit, special instructions..."
								/>
							</div>

							{error && (
								<p className="text-destructive border-destructive/30 bg-destructive/10 rounded-md border px-3 py-2 text-sm">
									{error}
								</p>
							)}

							<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										setShowForm(false)
										setError(null)
										setFieldErrors({})
									}}
									disabled={createMutation.isPending}
									className="w-full sm:w-auto"
								>
									Cancel
								</Button>
								<Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
									{createMutation.isPending ? "Booking..." : "Book Appointment"}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			)}

			{/* Appointments List */}
			<Card className="min-w-0">
				<CardHeader>
					<CardTitle className="text-base">Appointments</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<p className="text-muted-foreground py-8 text-center text-sm">
							Loading appointments...
						</p>
					) : !appointments?.data.length ? (
						<p className="text-muted-foreground py-8 text-center text-sm">No appointments found</p>
					) : (
						<div className="divide-y">
							{appointments.data.map(appt => {
								const isSelected = selectedAppointmentId === appt.id
								return (
									<div
										key={appt.id}
										className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:gap-4"
									>
										<div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-full">
											<Video className="text-primary size-5" />
										</div>
										<div className="min-w-0 flex-1 space-y-1">
											<div className="flex flex-wrap items-center gap-2">
												<span className="min-w-0 text-sm font-medium">{appt.patientName}</span>
												<Badge variant="outline" className="text-xs">
													{appt.patientMrn}
												</Badge>
												<AppointmentStatusBadge status={appt.status} />
												{isSelected && (
													<Badge className="bg-primary/10 text-primary text-xs">Selected</Badge>
												)}
											</div>
											<div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
												<span className="flex items-center gap-1">
													<User className="size-3" />
													{appt.clinicianName}
												</span>
												<span className="flex items-center gap-1">
													<Calendar className="size-3" />
													{formatDate(appt.scheduledDate)}
												</span>
												<span className="flex items-center gap-1">
													<Clock className="size-3" />
													{appt.scheduledTime} ({appt.durationMinutes} min)
												</span>
											</div>
											{appt.notes && (
												<p className="text-muted-foreground truncate text-xs">{appt.notes}</p>
											)}
										</div>
										<div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
											<Button
												type="button"
												size="sm"
												variant={isSelected ? "secondary" : "outline"}
												onClick={() => onAppointmentSelected?.(appt.id, appt.encounterId)}
												className="w-full sm:w-auto"
											>
												{appt.encounterId ? "Continue Encounter" : "Start Virtual Encounter"}
												<ArrowRight className="ml-1.5 size-3.5" />
											</Button>
											<Link
												href={getVideoLaunchPath(appt.id)}
												target="_blank"
												rel="noopener noreferrer"
												className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-full items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium sm:w-auto"
											>
												<Video className="size-3" />
												Open Video
											</Link>
										</div>
									</div>
								)
							})}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

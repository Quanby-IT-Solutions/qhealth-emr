"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Calendar, Clock, User, Video } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { usePatientSearchQuery } from "@/features/patients/api/patients.hooks"
import { useStaffClinicianListQuery } from "@/features/scheduling/api/scheduling.hooks"
import {
	formatAppointmentStatusLabel,
	getAppointmentStatusColor,
	getPlatformLabel,
	useAppointmentsQuery,
	useCreateAppointmentMutation,
	type AppointmentStatus,
	type CreateAppointmentInput,
	type TelemedicinePlatform,
} from "@/features/telemedicine/api/telemedicine.hooks"
import {
	getVideoLaunchPath,
	getVideoLinkValidationMessage,
	isValidVideoLinkForPlatform,
} from "@/features/telemedicine/lib/video-links"

// ============================================================================
// Types
// ============================================================================

interface VirtualVisitSchedulerProps {
	facilityId: string
	selectedAppointmentId?: string | null
	onAppointmentCreated?: (appointmentId: string) => void
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
	platform: TelemedicinePlatform
	videoLink: string
	meetingId: string
	meetingPassword: string
	notes: string
}

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
	platform: "zoom",
	videoLink: "",
	meetingId: "",
	meetingPassword: "",
	notes: "",
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(val: string): string {
	if (!val) return "-"
	return new Date(val).toLocaleDateString("en-PH", {
		month: "short",
		day: "numeric",
		year: "numeric",
	})
}

function isValidEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isFutureAppointment(date: string, time: string): boolean {
	const scheduled = new Date(`${date}T${time}`)
	return Number.isFinite(scheduled.getTime()) && scheduled.getTime() > Date.now()
}

// ============================================================================
// Sub-components
// ============================================================================

function PlatformSelector({
	value,
	onChange,
}: {
	value: TelemedicinePlatform
	onChange: (v: TelemedicinePlatform) => void
}) {
	return (
		<div className="flex gap-3">
			{(["zoom", "teams"] as const).map(p => (
				<button
					key={p}
					type="button"
					onClick={() => onChange(p)}
					className={[
						"flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors",
						value === p
							? "border-primary bg-primary/10 text-primary"
							: "border-muted bg-background text-muted-foreground hover:border-primary/40",
					].join(" ")}
				>
					<Video className="size-4" />
					{getPlatformLabel(p)}
				</button>
			))}
		</div>
	)
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
	}

	function handleClinicianSelect(clinicianId: string) {
		const clinician = clinicians.find(c => c.id === clinicianId)
		if (clinician) {
			setForm(prev => ({
				...prev,
				clinicianId,
				clinicianName: clinician.name,
				clinicianSpecialty: clinician.department ?? "",
			}))
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
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)

		if (!form.patientId || !form.patientName || !form.patientMrn) {
			setError("Select a patient from the search results before booking.")
			return
		}
		if (!form.clinicianId) {
			setError("Please select a clinician.")
			return
		}
		if (!form.scheduledDate || !form.scheduledTime) {
			setError("Please select a date and time.")
			return
		}
		if (!isFutureAppointment(form.scheduledDate, form.scheduledTime)) {
			setError("Appointment date and time must be in the future.")
			return
		}
		if (form.patientEmail.trim() && !isValidEmail(form.patientEmail.trim())) {
			setError("Enter a valid patient email address.")
			return
		}
		const trimmedVideoLink = form.videoLink.trim()
		if (trimmedVideoLink && !isValidVideoLinkForPlatform(trimmedVideoLink, form.platform)) {
			setError(getVideoLinkValidationMessage(form.platform))
			return
		}

		const input: CreateAppointmentInput = {
			facilityId,
			patientId: form.patientId,
			clinicianId: form.clinicianId,
			scheduledDate: form.scheduledDate,
			scheduledTime: form.scheduledTime,
			durationMinutes: form.durationMinutes,
			platform: form.platform,
			videoLink: trimmedVideoLink || undefined,
			meetingId: form.meetingId.trim() || undefined,
			meetingPassword: form.meetingPassword.trim() || undefined,
			notes: form.notes.trim() || undefined,
		}

		try {
			const appt = await createMutation.mutateAsync(input)
			setForm(EMPTY_FORM)
			setPatientSearch("")
			setShowForm(false)
			onAppointmentCreated?.(appt.id)
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create appointment.")
		}
	}

	// Minimum date: today
	const today = new Date().toISOString().split("T")[0]

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">Virtual Visit Scheduler</h2>
					<p className="text-muted-foreground text-sm">
						Book telemedicine appointments via Zoom or Microsoft Teams
					</p>
				</div>
				<Button onClick={() => setShowForm(v => !v)} variant={showForm ? "outline" : "default"}>
					{showForm ? "Cancel" : "New Appointment"}
				</Button>
			</div>

			{/* Booking Form */}
			{showForm && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Book Virtual Appointment</CardTitle>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-5">
							{/* Platform */}
							<div className="space-y-1.5">
								<label className="text-sm font-medium">Video Platform</label>
								<PlatformSelector value={form.platform} onChange={v => patch("platform", v)} />
							</div>

							{/* Meeting Details */}
							<div className="grid grid-cols-2 gap-4">
								<div className="col-span-2 space-y-1.5">
									<label htmlFor="videoLink" className="text-sm font-medium">
										Meeting Link (optional)
									</label>
									<input
										id="videoLink"
										type="url"
										className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
										value={form.videoLink}
										onChange={e => patch("videoLink", e.target.value)}
										placeholder={
											form.platform === "zoom"
												? "https://us02web.zoom.us/j/..."
												: "https://teams.microsoft.com/l/meetup-join/..."
										}
									/>
								</div>
								<div className="space-y-1.5">
									<label htmlFor="meetingId" className="text-sm font-medium">
										Meeting ID
									</label>
									<input
										id="meetingId"
										className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
										value={form.meetingId}
										onChange={e => patch("meetingId", e.target.value)}
										placeholder="Meeting ID"
									/>
								</div>
								<div className="space-y-1.5">
									<label htmlFor="meetingPassword" className="text-sm font-medium">
										Passcode
									</label>
									<input
										id="meetingPassword"
										className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
										value={form.meetingPassword}
										onChange={e => patch("meetingPassword", e.target.value)}
										placeholder="Passcode"
									/>
								</div>
							</div>

							{/* Patient Info */}
							<div className="grid grid-cols-2 gap-4">
								<div className="relative col-span-2 space-y-1.5">
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
								</div>
								<div className="space-y-1.5">
									<label htmlFor="patientContact" className="text-sm font-medium">
										Contact Number
									</label>
									<input
										id="patientContact"
										className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
										value={form.patientContactNumber}
										onChange={e => patch("patientContactNumber", e.target.value)}
										placeholder="+63 9XX XXX XXXX"
									/>
								</div>
								<div className="space-y-1.5">
									<label htmlFor="patientEmail" className="text-sm font-medium">
										Email (optional)
									</label>
									<input
										id="patientEmail"
										type="email"
										className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
										value={form.patientEmail}
										onChange={e => patch("patientEmail", e.target.value)}
										placeholder="patient@email.com"
									/>
								</div>
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
								>
									<option value="">
										{cliniciansLoading ? "Loading clinicians..." : "Select clinician"}
									</option>
									{clinicians.map(c => (
										<option key={c.id} value={c.id}>
											{c.name} - {c.department ?? "Clinician"}
										</option>
									))}
								</select>
							</div>

							{/* Date, Time, Duration */}
							<div className="grid grid-cols-3 gap-4">
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
										required
									/>
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
										required
									/>
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
								<p className="text-destructive rounded-md bg-red-50 px-3 py-2 text-sm">{error}</p>
							)}

							<div className="flex justify-end gap-3">
								<Button type="button" variant="outline" onClick={() => setShowForm(false)}>
									Cancel
								</Button>
								<Button type="submit" disabled={createMutation.isPending}>
									{createMutation.isPending ? "Booking..." : "Book Appointment"}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			)}

			{/* Appointments List */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Upcoming Appointments</CardTitle>
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
									<div key={appt.id} className="flex items-start gap-4 py-4">
										<div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-full">
											<Video className="text-primary size-5" />
										</div>
										<div className="min-w-0 flex-1 space-y-1">
											<div className="flex items-center gap-2">
												<span className="text-sm font-medium">{appt.patientName}</span>
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
												<span className="flex items-center gap-1">
													<Video className="size-3" />
													{getPlatformLabel(appt.platform)}
												</span>
											</div>
											{appt.notes && (
												<p className="text-muted-foreground truncate text-xs">{appt.notes}</p>
											)}
										</div>
										<div className="flex shrink-0 flex-wrap justify-end gap-2">
											<Button
												type="button"
												size="sm"
												variant={isSelected ? "secondary" : "outline"}
												onClick={() => onAppointmentSelected?.(appt.id, appt.encounterId)}
											>
												{appt.encounterId ? "Continue Encounter" : "Start Virtual Encounter"}
												<ArrowRight className="ml-1.5 size-3.5" />
											</Button>
											{appt.videoLink && (
												<Link
													href={getVideoLaunchPath(appt.id)}
													target="_blank"
													rel="noopener noreferrer"
													className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium"
												>
													<Video className="size-3" />
													Launch Video
												</Link>
											)}
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

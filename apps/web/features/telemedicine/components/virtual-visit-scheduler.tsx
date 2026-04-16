"use client"

import { useState } from "react"
import { Calendar, Clock, User, Video } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	type AppointmentStatus,
	type CreateAppointmentInput,
	type TelemedicinePlatform,
	formatAppointmentStatusLabel,
	getAppointmentStatusColor,
	getPlatformLabel,
	useAppointmentsQuery,
	useCreateAppointmentMutation,
} from "@/features/telemedicine/api/telemedicine.hooks"

// ============================================================================
// Types
// ============================================================================

interface VirtualVisitSchedulerProps {
	facilityId: string
	onAppointmentCreated?: (appointmentId: string) => void
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
	notes: string
}

// ============================================================================
// Constants
// ============================================================================

const DURATION_OPTIONS = [15, 30, 45, 60] as const

const CLINICIAN_SPECIMENS = [
	{ id: "c001", name: "Dr. Maria Santos", specialty: "Internal Medicine" },
	{ id: "c002", name: "Dr. Jose Reyes", specialty: "General Practice" },
	{ id: "c003", name: "Dr. Ana Dela Cruz", specialty: "Pediatrics" },
]

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
	notes: "",
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(val: string): string {
	if (!val) return "—"
	return new Date(val).toLocaleDateString("en-PH", {
		month: "short",
		day: "numeric",
		year: "numeric",
	})
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
			{(["zoom", "teams"] as const).map((p) => (
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

export function VirtualVisitScheduler({ facilityId, onAppointmentCreated }: VirtualVisitSchedulerProps) {
	const [showForm, setShowForm] = useState(false)
	const [form, setForm] = useState<BookingFormState>(EMPTY_FORM)
	const [error, setError] = useState<string | null>(null)

	const { data: appointments, isLoading } = useAppointmentsQuery(facilityId)
	const createMutation = useCreateAppointmentMutation()

	function patch(key: keyof BookingFormState, value: string | number) {
		setForm((prev) => ({ ...prev, [key]: value }))
	}

	function handleClinicianSelect(clinicianId: string) {
		const clinician = CLINICIAN_SPECIMENS.find((c) => c.id === clinicianId)
		if (clinician) {
			setForm((prev) => ({
				...prev,
				clinicianId,
				clinicianName: clinician.name,
				clinicianSpecialty: clinician.specialty,
			}))
		}
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)

		if (!form.patientId || !form.patientName || !form.patientMrn) {
			setError("Patient information is required.")
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

		const input: CreateAppointmentInput = {
			patientId: form.patientId || `P-${Date.now()}`,
			clinicianId: form.clinicianId,
			scheduledDate: form.scheduledDate,
			scheduledTime: form.scheduledTime,
			durationMinutes: form.durationMinutes,
			platform: form.platform,
			notes: form.notes || undefined,
		}

		try {
			const appt = await createMutation.mutateAsync(input)
			setForm(EMPTY_FORM)
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
					<p className="text-muted-foreground text-sm">Book telemedicine appointments via Zoom or Microsoft Teams</p>
				</div>
				<Button onClick={() => setShowForm((v) => !v)} variant={showForm ? "outline" : "default"}>
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
								<PlatformSelector
									value={form.platform}
									onChange={(v) => patch("platform", v)}
								/>
							</div>

							{/* Patient Info */}
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-1.5">
									<label htmlFor="patientName" className="text-sm font-medium">
										Patient Name <span className="text-destructive">*</span>
									</label>
									<input
										id="patientName"
										className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
										value={form.patientName}
										onChange={(e) => patch("patientName", e.target.value)}
										placeholder="Full name"
										required
									/>
								</div>
								<div className="space-y-1.5">
									<label htmlFor="patientMrn" className="text-sm font-medium">
										MRN <span className="text-destructive">*</span>
									</label>
									<input
										id="patientMrn"
										className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
										value={form.patientMrn}
										onChange={(e) => patch("patientMrn", e.target.value)}
										placeholder="e.g. MRN-00001"
										required
									/>
								</div>
								<div className="space-y-1.5">
									<label htmlFor="patientContact" className="text-sm font-medium">
										Contact Number <span className="text-destructive">*</span>
									</label>
									<input
										id="patientContact"
										className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
										value={form.patientContactNumber}
										onChange={(e) => patch("patientContactNumber", e.target.value)}
										placeholder="+63 9XX XXX XXXX"
										required
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
										onChange={(e) => patch("patientEmail", e.target.value)}
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
									onChange={(e) => handleClinicianSelect(e.target.value)}
									required
								>
									<option value="">Select clinician</option>
									{CLINICIAN_SPECIMENS.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name} — {c.specialty}
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
										onChange={(e) => patch("scheduledDate", e.target.value)}
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
										onChange={(e) => patch("scheduledTime", e.target.value)}
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
										onChange={(e) => patch("durationMinutes", Number(e.target.value))}
									>
										{DURATION_OPTIONS.map((d) => (
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
									onChange={(e) => patch("notes", e.target.value)}
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
						<p className="text-muted-foreground py-8 text-center text-sm">Loading appointments...</p>
					) : !appointments?.data.length ? (
						<p className="text-muted-foreground py-8 text-center text-sm">No appointments found</p>
					) : (
						<div className="divide-y">
							{appointments.data.map((appt) => (
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
									{appt.videoLink && (
										<a
											href={appt.videoLink}
											target="_blank"
											rel="noopener noreferrer"
											className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium"
										>
											<Video className="size-3" />
											Join
										</a>
									)}
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

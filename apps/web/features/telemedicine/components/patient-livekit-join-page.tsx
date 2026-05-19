"use client"

import { useState, type ComponentType } from "react"
import { motion } from "framer-motion"
import {
	Calendar,
	CalendarDays,
	CalendarX,
	ChevronDown,
	ChevronUp,
	Clock,
	Hospital,
	Info,
	Loader2,
	LogOut,
	Mic,
	MicOff,
	ShieldCheck,
	Stethoscope,
	User,
	Video,
	VideoOff,
} from "lucide-react"

import { cn } from "@/core/lib/utils"
import {
	formatAppointmentStatusLabel,
	type AppointmentStatus,
	type LiveKitTokenResponse,
	type PatientInvitePreview,
	useJoinPatientLiveKitRoomMutation,
	usePatientInvitePreviewQuery,
} from "@/features/telemedicine/api/telemedicine.hooks"
import {
	CameraPreview,
	DeviceSelectors,
	LiveKitTokenRoom,
	type PreJoinChoices,
} from "@/features/telemedicine/components/livekit-room"
import { useDevicePreview } from "@/features/telemedicine/components/use-device-preview"

interface PatientLiveKitJoinPageProps {
	inviteToken: string
}

function formatDate(value: string): string {
	if (!value) return "-"
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return date.toLocaleDateString("en-PH", {
		month: "long",
		day: "numeric",
		year: "numeric",
	})
}

function formatDateTime(value: string): string {
	if (!value) return "-"
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return date.toLocaleString("en-PH", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function formatTimeOnly(value: string): string {
	if (!value) return "-"
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return date.toLocaleString("en-PH", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

type JoinWindowState =
	| { kind: "open" }
	| { kind: "pending"; opensAt: string }
	| { kind: "closed"; message: string }

function getJoinWindowState(preview: PatientInvitePreview): JoinWindowState {
	if (!preview.isValid) {
		return {
			kind: "closed",
			message: "This invite is not valid. Contact your care team for a new link.",
		}
	}
	if (preview.isRevoked) {
		return {
			kind: "closed",
			message: "This invite has been revoked. Contact your care team for a new link.",
		}
	}
	if (preview.isExpired) {
		return {
			kind: "closed",
			message: "This invite has expired. Contact your care team for a new link.",
		}
	}
	if (!["scheduled", "confirmed", "in-progress"].includes(preview.appointmentStatus)) {
		return {
			kind: "closed",
			message: `This appointment is ${formatAppointmentStatusLabel(preview.appointmentStatus).toLowerCase()} and cannot be joined.`,
		}
	}
	if (preview.canJoinNow) {
		return { kind: "open" }
	}

	const now = Date.now()
	const startsAt = new Date(preview.joinWindowStartsAt).getTime()
	const endsAt = new Date(preview.joinWindowEndsAt).getTime()

	if (Number.isFinite(startsAt) && now < startsAt) {
		return { kind: "pending", opensAt: preview.joinWindowStartsAt }
	}
	if (Number.isFinite(endsAt) && now > endsAt) {
		return {
			kind: "closed",
			message: `This room closed at ${formatDateTime(preview.joinWindowEndsAt)}.`,
		}
	}
	return { kind: "closed", message: "This appointment cannot be joined right now." }
}

function getStatusBadgeClass(status: AppointmentStatus): string {
	switch (status) {
		case "scheduled":
		case "confirmed":
			return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
		case "in-progress":
			return "bg-amber-500/15 text-amber-300 border-amber-500/30"
		case "completed":
		case "cancelled":
		case "no-show":
			return "bg-rose-500/15 text-rose-300 border-rose-500/30"
		default:
			return "bg-muted text-muted-foreground border-border"
	}
}

function PreviewField({
	icon: Icon,
	label,
	value,
	badgeClass,
}: {
	icon: ComponentType<{ className?: string }>
	label: string
	value: string
	badgeClass?: string
}) {
	return (
		<div className="border-border bg-muted/40 rounded-xl border p-3">
			<p className="text-muted-foreground mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider">
				<Icon className="size-3" aria-hidden="true" />
				{label}
			</p>
			{badgeClass ? (
				<span
					className={cn(
						"inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
						badgeClass
					)}
				>
					{value}
				</span>
			) : (
				<p className="text-foreground text-sm font-medium">{value}</p>
			)}
		</div>
	)
}

function JoinWindowBanner({ state }: { state: JoinWindowState }) {
	if (state.kind === "open") {
		return (
			<div
				role="status"
				aria-live="polite"
				className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3"
			>
				<span className="relative flex size-2.5">
					<span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
					<span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
				</span>
				<div className="text-sm">
					<p className="font-medium text-emerald-200">Room is open</p>
					<p className="text-xs text-emerald-300/80">
						Your clinician is ready. Verify below to join.
					</p>
				</div>
			</div>
		)
	}

	if (state.kind === "pending") {
		return (
			<div
				role="status"
				aria-live="polite"
				className="flex items-center gap-3 rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3"
			>
				<Clock className="size-5 text-sky-300" aria-hidden="true" />
				<div className="text-sm">
					<p className="font-medium text-sky-200">Room opens at {formatTimeOnly(state.opensAt)}</p>
					<p className="text-xs text-sky-300/80">
						Please come back at that time to join your visit.
					</p>
				</div>
			</div>
		)
	}

	return (
		<div
			role="status"
			aria-live="polite"
			className="flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3"
		>
			<CalendarX className="mt-0.5 size-5 text-rose-300" aria-hidden="true" />
			<div className="text-sm">
				<p className="font-medium text-rose-200">Room has closed</p>
				<p className="text-xs text-rose-300/80">{state.message}</p>
			</div>
		</div>
	)
}

interface PatientLiveKitConferenceShellProps {
	preview: PatientInvitePreview | null
	response: LiveKitTokenResponse
	choices: PreJoinChoices
	onDisconnected: () => void
	rejoinCount: number
}

function PatientLiveKitConferenceShell({
	preview,
	response,
	choices,
	onDisconnected,
	rejoinCount,
}: PatientLiveKitConferenceShellProps) {
	const [detailsOpen, setDetailsOpen] = useState(false)

	const statusLabel = preview
		? formatAppointmentStatusLabel(preview.appointmentStatus)
		: null
	const statusBadgeClass = preview ? getStatusBadgeClass(preview.appointmentStatus) : ""
	const headerSummary = preview
		? `${preview.clinicianName} · ${formatDate(preview.scheduledDate)} · ${preview.scheduledTime}`
		: "Telemedicine visit"

	return (
		<div className="bg-background text-foreground flex h-screen min-h-screen flex-col overflow-hidden">
			<header className="bg-card/80 border-border flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur-xl">
				<div className="flex shrink-0 items-center gap-2">
					<div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-xl shadow-lg">
						<Stethoscope className="size-4" aria-hidden="true" />
					</div>
					<span className="text-foreground hidden text-sm font-semibold sm:inline">
						Telemedicine Visit
					</span>
				</div>
				<div className="bg-border hidden h-5 w-px sm:block" />
				<div className="flex min-w-0 flex-1 items-center justify-center gap-2 text-center">
					<Video className="text-primary hidden size-4 shrink-0 sm:inline" />
					<p className="text-muted-foreground truncate text-sm">
						<span className="hidden sm:inline">{headerSummary}</span>
						<span className="sm:hidden">{preview?.clinicianName ?? "Appointment"}</span>
					</p>
					{statusLabel && preview && (
						<span
							className={cn(
								"hidden shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium tracking-wide uppercase sm:inline-flex",
								statusBadgeClass
							)}
						>
							{statusLabel}
						</span>
					)}
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<button
						type="button"
						onClick={() => setDetailsOpen(open => !open)}
						aria-expanded={detailsOpen}
						aria-controls="patient-appointment-details-panel"
						className="border-border bg-muted text-foreground hover:bg-accent focus-visible:ring-ring inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors outline-none focus-visible:ring-2"
					>
						<Info className="size-3.5" />
						<span className="hidden sm:inline">Details</span>
						{detailsOpen ? (
							<ChevronUp className="size-3.5" />
						) : (
							<ChevronDown className="size-3.5" />
						)}
					</button>
					<button
						type="button"
						onClick={onDisconnected}
						aria-label="Leave video call"
						className="focus-visible:ring-ring inline-flex items-center gap-1 rounded-full border border-transparent bg-rose-600 px-2.5 py-1 text-xs font-medium text-white transition-colors outline-none hover:bg-rose-500 focus-visible:ring-2"
					>
						<LogOut className="size-3.5" />
						<span className="hidden sm:inline">Leave</span>
					</button>
				</div>
			</header>

			{detailsOpen && (
				<section
					id="patient-appointment-details-panel"
					className="border-border bg-card/60 shrink-0 border-b px-4 py-3"
				>
					{preview ? (
						<div className="grid gap-3 md:grid-cols-4">
							<Field icon={User} label="Clinician" value={preview.clinicianName} />
							<Field icon={Hospital} label="Facility" value={preview.facilityName} />
							<Field icon={Calendar} label="Date" value={formatDate(preview.scheduledDate)} />
							<Field
								icon={Clock}
								label="Time"
								value={`${preview.scheduledTime} (${preview.durationMinutes} min)`}
							/>
							<Field
								icon={ShieldCheck}
								label="Status"
								value={formatAppointmentStatusLabel(preview.appointmentStatus)}
							/>
							<Field
								icon={Clock}
								label="Access Window"
								value={`${formatTimeOnly(preview.joinWindowStartsAt)} - ${formatTimeOnly(preview.joinWindowEndsAt)}`}
							/>
						</div>
					) : (
						<p className="text-muted-foreground text-xs">No appointment details available.</p>
					)}
				</section>
			)}

			<main className="relative flex min-h-[360px] flex-1 flex-col overflow-hidden">
				<LiveKitTokenRoom
					key={`patient-livekit:${rejoinCount}`}
					response={response}
					choices={choices}
					className="qhealth-livekit-room flex h-full min-h-0 flex-1 flex-col"
					onDisconnected={onDisconnected}
					fullViewport
				/>
			</main>
		</div>
	)
}

function Field({
	icon: Icon,
	label,
	value,
}: {
	icon?: ComponentType<{ className?: string }>
	label: string
	value?: string | null
}) {
	return (
		<div>
			<p className="text-muted-foreground flex items-center gap-1 text-xs">
				{Icon && <Icon className="size-3" />}
				{label}
			</p>
			<p className="text-foreground text-sm font-medium">{value || "-"}</p>
		</div>
	)
}

function AppointmentSkeletonCard() {
	return (
		<div className="space-y-3" aria-busy="true" aria-label="Loading appointment details">
			<div className="bg-muted/50 h-10 animate-pulse rounded-xl" />
			<div className="grid gap-3 sm:grid-cols-3">
				<div className="bg-muted/40 h-16 animate-pulse rounded-xl" />
				<div className="bg-muted/40 h-16 animate-pulse rounded-xl" />
				<div className="bg-muted/40 h-16 animate-pulse rounded-xl" />
			</div>
		</div>
	)
}

export function PatientLiveKitJoinPage({ inviteToken }: PatientLiveKitJoinPageProps) {
	const [dateOfBirth, setDateOfBirth] = useState("")
	const [mrn, setMrn] = useState("")
	const [formError, setFormError] = useState<string | null>(null)
	const [hasDisconnected, setHasDisconnected] = useState(false)
	const [rejoinCount, setRejoinCount] = useState(0)
	const [choices, setChoices] = useState<PreJoinChoices>({
		audioEnabled: false,
		videoEnabled: false,
	})
	const previewQuery = usePatientInvitePreviewQuery(inviteToken)
	const joinRoom = useJoinPatientLiveKitRoomMutation()
	const devicePreview = useDevicePreview(choices.videoEnabled, choices.audioEnabled)

	const preview = previewQuery.data
	const joinWindowState: JoinWindowState | null = preview ? getJoinWindowState(preview) : null
	const canSubmit = Boolean(
		preview && joinWindowState?.kind === "open" && !joinRoom.data
	)

	async function handleJoin(e: React.FormEvent) {
		e.preventDefault()
		setFormError(null)

		if (!dateOfBirth && !mrn.trim()) {
			setFormError("Enter your date of birth or MRN to verify this appointment.")
			return
		}

		try {
			joinRoom.reset()
			setHasDisconnected(false)
			setChoices(prev => ({
				...prev,
				videoDeviceId: devicePreview.videoDeviceId,
				audioDeviceId: devicePreview.audioDeviceId,
			}))
			await joinRoom.mutateAsync({
				token: inviteToken,
				dateOfBirth: dateOfBirth || undefined,
				mrn: mrn.trim() || undefined,
			})
		} catch {
			setFormError(null)
		}
	}

	function handleDisconnected() {
		joinRoom.reset()
		setHasDisconnected(true)
		setRejoinCount(n => n + 1)
	}

	if (joinRoom.data) {
		return (
			<PatientLiveKitConferenceShell
				preview={preview ?? null}
				response={joinRoom.data}
				choices={choices}
				onDisconnected={handleDisconnected}
				rejoinCount={rejoinCount}
			/>
		)
	}

	const inputBaseClass =
		"border-border bg-muted/60 text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/30 w-full rounded-xl border px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"

	return (
		<main className="bg-background relative min-h-screen overflow-hidden">
			<div className="relative mx-auto w-full max-w-2xl space-y-6 px-4 py-10 lg:max-w-4xl">
				<motion.section
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, ease: "easeOut" }}
					className="border-border bg-card rounded-3xl border p-6 shadow-2xl sm:p-8"
				>
					<header className="mb-5 flex flex-col items-center text-center">
						<div className="bg-primary text-primary-foreground mb-3 flex size-12 items-center justify-center rounded-2xl shadow-lg">
							<Stethoscope className="size-6" aria-hidden="true" />
						</div>
						<h1 className="text-foreground text-xl font-semibold">Your Telemedicine Visit</h1>
						<p className="text-muted-foreground mt-1 text-sm">
							Please verify your identity to join your consultation
						</p>
					</header>

					{previewQuery.isLoading ? (
						<AppointmentSkeletonCard />
					) : previewQuery.error ? (
						<div
							role="alert"
							className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-200"
						>
							<p className="font-medium">This invite is no longer available.</p>
							<p className="mt-1 text-rose-300/80">Please contact your care team.</p>
						</div>
					) : preview ? (
						<div className="space-y-4">
							<div className="grid gap-3 md:grid-cols-3">
								<PreviewField
									icon={CalendarDays}
									label="Date"
									value={formatDate(preview.scheduledDate)}
								/>
								<PreviewField
									icon={Clock}
									label="Time"
									value={`${preview.scheduledTime} (${preview.durationMinutes} min)`}
								/>
								<PreviewField
									icon={User}
									label="Clinician"
									value={preview.clinicianName}
								/>
								<PreviewField
									icon={Hospital}
									label="Facility"
									value={preview.facilityName}
								/>
								<PreviewField
									icon={ShieldCheck}
									label="Status"
									value={formatAppointmentStatusLabel(preview.appointmentStatus)}
									badgeClass={getStatusBadgeClass(preview.appointmentStatus)}
								/>
								<PreviewField
									icon={Clock}
									label="Access Window"
									value={`${formatTimeOnly(preview.joinWindowStartsAt)} - ${formatTimeOnly(preview.joinWindowEndsAt)}`}
								/>
							</div>

							{joinWindowState && <JoinWindowBanner state={joinWindowState} />}
						</div>
					) : null}
				</motion.section>

				{preview && (
					<motion.section
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4, ease: "easeOut", delay: 0.08 }}
						className="border-border bg-card rounded-3xl border p-6 shadow-2xl sm:p-8"
					>
						<header className="mb-5 flex items-center gap-2">
							<ShieldCheck className="text-primary size-5" aria-hidden="true" />
							<h2 className="text-foreground text-base font-semibold">
								{hasDisconnected ? "Verify and Join Again" : "Verify Your Identity"}
							</h2>
						</header>

						<form onSubmit={handleJoin} className="space-y-5" noValidate>
							<div className="grid gap-5 lg:grid-cols-2 lg:items-stretch lg:gap-6">
								<div className="border-border bg-muted/40 flex flex-col gap-4 rounded-2xl border p-4">
									<p className="text-muted-foreground text-[10px] font-medium uppercase tracking-widest">
										Set up your camera & microphone
									</p>

									<CameraPreview
										stream={devicePreview.stream}
										videoEnabled={choices.videoEnabled}
										displayName={
											preview.clinicianName ? `Joining ${preview.clinicianName}` : "Patient"
										}
										className="border-border rounded-2xl border shadow-none ring-0"
									/>

									<div className="flex items-center justify-center gap-6">
										<div className="flex flex-col items-center gap-1.5">
											<button
												type="button"
												aria-pressed={choices.audioEnabled}
												aria-label={
													choices.audioEnabled ? "Mute microphone" : "Unmute microphone"
												}
												onClick={() =>
													setChoices(prev => ({
														...prev,
														audioEnabled: !prev.audioEnabled,
													}))
												}
												className={cn(
													"focus-visible:ring-ring focus-visible:ring-offset-background flex size-12 items-center justify-center rounded-full border transition-all hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
													choices.audioEnabled
														? "border-border bg-muted text-emerald-500 dark:text-emerald-400"
														: "border-rose-500/30 bg-rose-500/10 text-rose-500 dark:text-rose-400"
												)}
											>
												{choices.audioEnabled ? (
													<Mic className="size-5" />
												) : (
													<MicOff className="size-5" />
												)}
											</button>
											<span className="text-muted-foreground text-xs">Mic</span>
										</div>
										<div className="flex flex-col items-center gap-1.5">
											<button
												type="button"
												aria-pressed={choices.videoEnabled}
												aria-label={
													choices.videoEnabled ? "Turn camera off" : "Turn camera on"
												}
												onClick={() =>
													setChoices(prev => ({
														...prev,
														videoEnabled: !prev.videoEnabled,
													}))
												}
												className={cn(
													"focus-visible:ring-ring focus-visible:ring-offset-background flex size-12 items-center justify-center rounded-full border transition-all hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
													choices.videoEnabled
														? "border-border bg-muted text-emerald-500 dark:text-emerald-400"
														: "border-rose-500/30 bg-rose-500/10 text-rose-500 dark:text-rose-400"
												)}
											>
												{choices.videoEnabled ? (
													<Video className="size-5" />
												) : (
													<VideoOff className="size-5" />
												)}
											</button>
											<span className="text-muted-foreground text-xs">Camera</span>
										</div>
									</div>

									<DeviceSelectors
										dark
										videoEnabled={choices.videoEnabled}
										audioEnabled={choices.audioEnabled}
										videoDevices={devicePreview.videoDevices}
										audioDevices={devicePreview.audioDevices}
										videoDeviceId={devicePreview.videoDeviceId}
										audioDeviceId={devicePreview.audioDeviceId}
										onVideoDeviceChange={devicePreview.setVideoDeviceId}
										onAudioDeviceChange={devicePreview.setAudioDeviceId}
									/>

									{devicePreview.permissionError && (
										<p className="text-xs text-rose-400" role="alert">
											{devicePreview.permissionError}
										</p>
									)}
								</div>

								<div className="flex flex-col">
									<div className="space-y-3">
										<div className="space-y-1.5">
											<label
												htmlFor="dateOfBirth"
												className="text-muted-foreground text-xs font-medium uppercase tracking-wider"
											>
												Date of Birth
											</label>
											<input
												id="dateOfBirth"
												type="date"
												className={inputBaseClass}
												value={dateOfBirth}
												onChange={e => setDateOfBirth(e.target.value)}
												disabled={!canSubmit || joinRoom.isPending}
												aria-describedby="verify-help"
											/>
										</div>

										<div
											className="text-muted-foreground/80 flex items-center gap-3 text-[10px] font-medium uppercase tracking-widest"
											aria-hidden="true"
										>
											<span className="bg-border h-px flex-1" />
											<span>Or</span>
											<span className="bg-border h-px flex-1" />
										</div>

										<div className="space-y-1.5">
											<label
												htmlFor="mrn"
												className="text-muted-foreground text-xs font-medium uppercase tracking-wider"
											>
												MRN
											</label>
											<input
												id="mrn"
												className={inputBaseClass}
												value={mrn}
												onChange={e => setMrn(e.target.value)}
												disabled={!canSubmit || joinRoom.isPending}
												autoComplete="off"
												aria-describedby="verify-help"
											/>
										</div>

										<p id="verify-help" className="text-muted-foreground text-xs">
											Either field is enough to verify your visit.
										</p>
									</div>

									{(formError || joinRoom.error) && (
										<div
											role="alert"
											className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
										>
											{formError ?? joinRoom.error?.message ?? "Unable to join this visit."}
										</div>
									)}

									<button
										type="submit"
										disabled={!canSubmit || joinRoom.isPending}
										aria-label={hasDisconnected ? "Join Again" : "Join Video Room"}
										className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring focus-visible:ring-offset-background mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full text-base font-semibold shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 lg:mt-auto"
									>
										{joinRoom.isPending ? (
											<>
												<Loader2 className="size-4 animate-spin" />
												Verifying...
											</>
										) : (
											<>
												<Video className="size-4" />
												{hasDisconnected ? "Join Again" : "Join Video Room"}
											</>
										)}
									</button>
								</div>
							</div>
						</form>
					</motion.section>
				)}
			</div>
		</main>
	)
}

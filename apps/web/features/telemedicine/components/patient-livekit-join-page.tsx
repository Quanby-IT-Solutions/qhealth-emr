"use client"

import { useState, type ComponentType } from "react"
import {
	AlertTriangle,
	Calendar,
	Clock,
	Hospital,
	Loader2,
	Mic,
	MicOff,
	ShieldCheck,
	User,
	Video,
	VideoOff,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { Switch } from "@/core/components/ui/switch"
import {
	formatAppointmentStatusLabel,
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

function getJoinBlockMessage(preview: PatientInvitePreview): string | null {
	if (!preview.isValid) {
		return "This invite is not valid. Contact your care team for a new link."
	}
	if (preview.isRevoked) {
		return "This invite has been revoked. Contact your care team for a new link."
	}
	if (preview.isExpired) {
		return "This invite has expired. Contact your care team for a new link."
	}
	if (!["scheduled", "confirmed", "in-progress"].includes(preview.appointmentStatus)) {
		return `This appointment is ${formatAppointmentStatusLabel(preview.appointmentStatus).toLowerCase()} and cannot be joined.`
	}
	if (!preview.canJoinNow) {
		const now = Date.now()
		const startsAt = new Date(preview.joinWindowStartsAt).getTime()
		const endsAt = new Date(preview.joinWindowEndsAt).getTime()

		if (Number.isFinite(startsAt) && now < startsAt) {
			return `This room opens at ${formatDateTime(preview.joinWindowStartsAt)}.`
		}
		if (Number.isFinite(endsAt) && now > endsAt) {
			return `This room closed at ${formatDateTime(preview.joinWindowEndsAt)}.`
		}
		return "This appointment cannot be joined right now."
	}
	return null
}

function PreviewField({
	icon: Icon,
	label,
	value,
}: {
	icon: ComponentType<{ className?: string }>
	label: string
	value: string
}) {
	return (
		<div className="rounded-lg border p-3">
			<p className="text-muted-foreground mb-1 flex items-center gap-1 text-xs">
				<Icon className="size-3" />
				{label}
			</p>
			<p className="text-sm font-medium">{value}</p>
		</div>
	)
}

export function PatientLiveKitJoinPage({ inviteToken }: PatientLiveKitJoinPageProps) {
	const [dateOfBirth, setDateOfBirth] = useState("")
	const [mrn, setMrn] = useState("")
	const [formError, setFormError] = useState<string | null>(null)
	const [hasDisconnected, setHasDisconnected] = useState(false)
	const [choices, setChoices] = useState<PreJoinChoices>({
		audioEnabled: false,
		videoEnabled: false,
	})
	const previewQuery = usePatientInvitePreviewQuery(inviteToken)
	const joinRoom = useJoinPatientLiveKitRoomMutation()
	const devicePreview = useDevicePreview(choices.videoEnabled, choices.audioEnabled)

	const preview = previewQuery.data
	const joinBlockMessage = preview ? getJoinBlockMessage(preview) : null
	const canSubmit = Boolean(preview && !joinBlockMessage && !joinRoom.data)

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
	}

	return (
		<main className="bg-muted/30 min-h-screen px-4 py-8">
			<div className="mx-auto max-w-4xl space-y-4">
				<div>
					<h1 className="flex items-center gap-2 text-2xl font-bold">
						<Video className="text-primary size-6" />
						Telemedicine Visit
					</h1>
					<p className="text-muted-foreground text-sm">
						Verify your appointment before entering the video room.
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<ShieldCheck className="text-primary size-5" />
							Appointment Preview
						</CardTitle>
					</CardHeader>
					<CardContent>
						{previewQuery.isLoading ? (
							<div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
								<Loader2 className="size-4 animate-spin" />
								Loading appointment...
							</div>
						) : previewQuery.error ? (
							<Alert variant="destructive">
								<AlertTriangle className="size-4" />
								<AlertTitle>Invite unavailable</AlertTitle>
								<AlertDescription>
									This invite is missing, invalid, or no longer available.
								</AlertDescription>
							</Alert>
						) : preview ? (
							<div className="space-y-4">
								<div className="grid gap-3 md:grid-cols-3">
									<PreviewField
										icon={Calendar}
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
									<PreviewField icon={Hospital} label="Facility" value={preview.facilityName} />
									<PreviewField
										icon={ShieldCheck}
										label="Status"
										value={formatAppointmentStatusLabel(preview.appointmentStatus)}
									/>
									<PreviewField
										icon={Clock}
										label="Access Window"
										value={`${formatDateTime(preview.joinWindowStartsAt)} - ${formatDateTime(preview.joinWindowEndsAt)}`}
									/>
								</div>

								{joinBlockMessage && (
									<Alert className="border-yellow-300 bg-yellow-50 text-yellow-950">
										<AlertTriangle className="size-4" />
										<AlertTitle>Room unavailable</AlertTitle>
										<AlertDescription>{joinBlockMessage}</AlertDescription>
									</Alert>
								)}
							</div>
						) : null}
					</CardContent>
				</Card>

				{joinRoom.data ? (
					<LiveKitTokenRoom
						response={joinRoom.data}
						choices={choices}
						className="qhealth-livekit-room min-h-[520px]"
						onDisconnected={handleDisconnected}
					/>
				) : preview && (
					<Card>
						<CardHeader>
							<CardTitle className="text-base">
								{hasDisconnected ? "Verify and Join Again" : "Verify and Join"}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleJoin} className="space-y-4">
								<div className="grid gap-4 md:grid-cols-2">
									<div className="space-y-1.5">
										<label htmlFor="dateOfBirth" className="text-sm font-medium">
											Date of Birth
										</label>
										<input
											id="dateOfBirth"
											type="date"
											className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
											value={dateOfBirth}
											onChange={e => setDateOfBirth(e.target.value)}
											disabled={!canSubmit || joinRoom.isPending}
										/>
									</div>
									<div className="space-y-1.5">
										<label htmlFor="mrn" className="text-sm font-medium">
											MRN
										</label>
										<input
											id="mrn"
											className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
											value={mrn}
											onChange={e => setMrn(e.target.value)}
											disabled={!canSubmit || joinRoom.isPending}
											autoComplete="off"
										/>
									</div>
								</div>

								<div className="space-y-4 rounded-lg border p-4">
									<p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
										Device permissions
									</p>
									<div className="grid gap-4 md:grid-cols-2">
										<CameraPreview
											stream={devicePreview.stream}
											videoEnabled={choices.videoEnabled}
											displayName={preview.clinicianName ? `Joining ${preview.clinicianName}` : "Patient"}
										/>
										<div className="space-y-3">
											<label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
												<span className="flex items-center gap-2">
													{choices.videoEnabled ? (
														<Video className="size-4 text-emerald-600" />
													) : (
														<VideoOff className="text-muted-foreground size-4" />
													)}
													<span>Camera</span>
												</span>
												<Switch
													checked={choices.videoEnabled}
													onCheckedChange={videoEnabled =>
														setChoices(prev => ({ ...prev, videoEnabled }))
													}
												/>
											</label>
											<label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
												<span className="flex items-center gap-2">
													{choices.audioEnabled ? (
														<Mic className="size-4 text-emerald-600" />
													) : (
														<MicOff className="text-muted-foreground size-4" />
													)}
													<span>Microphone</span>
												</span>
												<Switch
													checked={choices.audioEnabled}
													onCheckedChange={audioEnabled =>
														setChoices(prev => ({ ...prev, audioEnabled }))
													}
												/>
											</label>
										</div>
									</div>
									<DeviceSelectors
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
										<p className="text-destructive text-xs">{devicePreview.permissionError}</p>
									)}
								</div>

								{(formError || joinRoom.error) && (
									<p className="text-destructive rounded-md bg-red-50 px-3 py-2 text-sm">
										{formError ?? joinRoom.error?.message ?? "Unable to join this visit."}
									</p>
								)}

								<Separator />

								<Button type="submit" disabled={!canSubmit || joinRoom.isPending}>
									{joinRoom.isPending ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<Video className="size-4" />
									)}
									{hasDisconnected ? "Join Again" : "Join Video Room"}
								</Button>
							</form>
						</CardContent>
					</Card>
				)}
			</div>
		</main>
	)
}

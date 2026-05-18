"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"

import {
	AlertTriangle,
	Loader2,
	Mic,
	MicOff,
	RefreshCw,
	Settings,
	ShieldCheck,
	Video,
	VideoOff,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Switch } from "@/core/components/ui/switch"
import {
	type LiveKitTokenResponse,
	useEndLiveKitSessionMutation,
	useJoinLiveKitRoomMutation,
} from "@/features/telemedicine/api/telemedicine.hooks"
import { useDevicePreview } from "@/features/telemedicine/components/use-device-preview"

interface LiveKitVideoRoomProps {
	appointmentId?: string | null
	patientName?: string | null
	clinicianName?: string | null
}

export interface PreJoinChoices {
	audioEnabled: boolean
	videoEnabled: boolean
	videoDeviceId?: string
	audioDeviceId?: string
}

interface RoomJoinState {
	appointmentId: string | null
	choices: PreJoinChoices | null
	hasDisconnected: boolean
}

const LiveKitConferenceInner = dynamic(
	() => import("@/features/telemedicine/components/livekit-conference-inner"),
	{ ssr: false, loading: () => <VideoSessionSkeleton /> }
)

function getInitials(name?: string | null): string {
	if (!name) return "?"
	const parts = name.trim().split(/\s+/).filter(Boolean)
	if (!parts.length) return "?"
	const first = parts[0]?.[0] ?? ""
	const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : ""
	return (first + second).toUpperCase() || "?"
}

function getAvatarGradient(seed: string): string {
	const palettes = [
		"from-sky-500 to-indigo-600",
		"from-emerald-500 to-teal-600",
		"from-amber-500 to-orange-600",
		"from-fuchsia-500 to-pink-600",
		"from-violet-500 to-purple-600",
		"from-rose-500 to-red-600",
	]
	let hash = 0
	for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
	return palettes[Math.abs(hash) % palettes.length] ?? palettes[0]!
}

interface CameraPreviewProps {
	stream: MediaStream | null
	videoEnabled: boolean
	displayName: string
}

export function CameraPreview({ stream, videoEnabled, displayName }: CameraPreviewProps) {
	const videoRef = useRef<HTMLVideoElement>(null)
	const initials = getInitials(displayName)
	const gradient = getAvatarGradient(displayName)
	const hasVideoTrack =
		videoEnabled && Boolean(stream && stream.getVideoTracks().some(t => t.readyState === "live"))

	useEffect(() => {
		const el = videoRef.current
		if (!el) return
		if (hasVideoTrack && stream) {
			el.srcObject = stream
		} else {
			el.srcObject = null
		}
	}, [stream, hasVideoTrack])

	return (
		<div className="relative aspect-video w-full overflow-hidden rounded-lg bg-neutral-900">
			{hasVideoTrack ? (
				<video
					ref={videoRef}
					autoPlay
					muted
					playsInline
					className="size-full object-cover [transform:scaleX(-1)]"
				/>
			) : (
				<div className="flex size-full items-center justify-center">
					<div
						className={[
							"bg-gradient-to-br shadow-xl",
							gradient,
							"flex size-24 items-center justify-center rounded-full text-3xl font-semibold text-white sm:size-28 sm:text-4xl",
						].join(" ")}
					>
						{initials}
					</div>
				</div>
			)}
		</div>
	)
}

interface DeviceSelectorsProps {
	videoEnabled: boolean
	audioEnabled: boolean
	videoDevices: MediaDeviceInfo[]
	audioDevices: MediaDeviceInfo[]
	videoDeviceId: string | undefined
	audioDeviceId: string | undefined
	onVideoDeviceChange: (id: string | undefined) => void
	onAudioDeviceChange: (id: string | undefined) => void
}

export function DeviceSelectors({
	videoEnabled,
	audioEnabled,
	videoDevices,
	audioDevices,
	videoDeviceId,
	audioDeviceId,
	onVideoDeviceChange,
	onAudioDeviceChange,
}: DeviceSelectorsProps) {
	return (
		<div className="space-y-3">
			<div className="space-y-1.5">
				<p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Camera</p>
				<Select
					value={videoDeviceId ?? videoDevices[0]?.deviceId ?? ""}
					onValueChange={value => onVideoDeviceChange(value ?? undefined)}
					disabled={!videoEnabled || videoDevices.length === 0}
				>
					<SelectTrigger className="w-full">
						<SelectValue
							placeholder={
								videoEnabled ? "Enable camera to see devices" : "Camera is off"
							}
						/>
					</SelectTrigger>
					<SelectContent>
						{videoDevices.map(device => (
							<SelectItem key={device.deviceId} value={device.deviceId}>
								{device.label || `Camera (${device.deviceId.slice(0, 6)})`}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="space-y-1.5">
				<p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
					Microphone
				</p>
				<Select
					value={audioDeviceId ?? audioDevices[0]?.deviceId ?? ""}
					onValueChange={value => onAudioDeviceChange(value ?? undefined)}
					disabled={!audioEnabled || audioDevices.length === 0}
				>
					<SelectTrigger className="w-full">
						<SelectValue
							placeholder={
								audioEnabled ? "Enable microphone to see devices" : "Microphone is off"
							}
						/>
					</SelectTrigger>
					<SelectContent>
						{audioDevices.map(device => (
							<SelectItem key={device.deviceId} value={device.deviceId}>
								{device.label || `Microphone (${device.deviceId.slice(0, 6)})`}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	)
}

function LiveKitPreJoin({
	clinicianName,
	patientName,
	joinLabel = "Join Session",
	onJoin,
}: {
	clinicianName?: string | null
	patientName?: string | null
	joinLabel?: string
	onJoin: (choices: PreJoinChoices) => void
}) {
	const [audioEnabled, setAudioEnabled] = useState(false)
	const [videoEnabled, setVideoEnabled] = useState(false)
	const displayName = clinicianName?.trim() || "You"
	const preview = useDevicePreview(videoEnabled, audioEnabled)

	return (
		<div className="flex min-h-[520px] flex-col items-center justify-center gap-6 bg-neutral-950 p-6 text-white">
			<div className="w-full max-w-md">
				<CameraPreview
					stream={preview.stream}
					videoEnabled={videoEnabled}
					displayName={displayName}
				/>
			</div>
			<div className="space-y-1 text-center">
				<p className="text-lg font-semibold">{displayName}</p>
				{patientName && (
					<p className="text-sm text-neutral-300">
						Ready to meet with <span className="font-medium text-white">{patientName}</span>
					</p>
				)}
				<p className="flex items-center justify-center gap-1 text-xs text-neutral-400">
					<ShieldCheck className="size-3" />
					Secure encrypted session
				</p>
			</div>

			<div className="w-full max-w-md space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
				<p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
					Device permissions
				</p>
				<label className="flex items-center justify-between gap-3 text-sm">
					<span className="flex items-center gap-2">
						{videoEnabled ? (
							<Video className="size-4 text-emerald-400" />
						) : (
							<VideoOff className="size-4 text-neutral-400" />
						)}
						<span>Camera</span>
					</span>
					<Switch checked={videoEnabled} onCheckedChange={setVideoEnabled} />
				</label>
				<label className="flex items-center justify-between gap-3 text-sm">
					<span className="flex items-center gap-2">
						{audioEnabled ? (
							<Mic className="size-4 text-emerald-400" />
						) : (
							<MicOff className="size-4 text-neutral-400" />
						)}
						<span>Microphone</span>
					</span>
					<Switch checked={audioEnabled} onCheckedChange={setAudioEnabled} />
				</label>
				<DeviceSelectors
					videoEnabled={videoEnabled}
					audioEnabled={audioEnabled}
					videoDevices={preview.videoDevices}
					audioDevices={preview.audioDevices}
					videoDeviceId={preview.videoDeviceId}
					audioDeviceId={preview.audioDeviceId}
					onVideoDeviceChange={preview.setVideoDeviceId}
					onAudioDeviceChange={preview.setAudioDeviceId}
				/>
				{preview.permissionError && (
					<p className="text-xs text-rose-300">{preview.permissionError}</p>
				)}
				<p className="text-xs text-neutral-400">
					Your browser will ask for permission when you turn these on. You can change them anytime
					inside the call.
				</p>
			</div>

			<Button
				type="button"
				size="lg"
				className="w-full max-w-md"
				onClick={() =>
					onJoin({
						audioEnabled,
						videoEnabled,
						videoDeviceId: preview.videoDeviceId,
						audioDeviceId: preview.audioDeviceId,
					})
				}
			>
				{joinLabel}
			</Button>
		</div>
	)
}

function VideoSessionSkeleton() {
	return (
		<div className="overflow-hidden rounded-lg border bg-neutral-950">
			<div className="flex min-h-[520px] flex-col">
				<div className="flex flex-1 items-center justify-center p-3">
					<div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
						<VideoTileSkeleton />
						<VideoTileSkeleton />
					</div>
				</div>
				<div className="border-t border-neutral-800 bg-neutral-900 p-3">
					<div className="flex flex-wrap items-center justify-center gap-2">
						<Skeleton className="h-9 w-24 bg-neutral-800" />
						<Skeleton className="h-9 w-24 bg-neutral-800" />
						<Skeleton className="h-9 w-32 bg-neutral-800" />
						<Skeleton className="h-9 w-9 bg-neutral-800" />
						<Skeleton className="h-9 w-24 bg-neutral-800" />
					</div>
				</div>
			</div>
			<div className="flex items-center justify-center gap-2 border-t border-neutral-800 bg-neutral-900 px-4 py-2 text-xs text-neutral-400">
				<Loader2 className="size-3.5 animate-spin text-neutral-400" />
				Preparing secure video session...
			</div>
		</div>
	)
}

function VideoTileSkeleton() {
	return (
		<div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-neutral-900">
			<Skeleton className="size-24 rounded-full bg-neutral-800 sm:size-28" />
			<div className="absolute bottom-2 left-2">
				<Skeleton className="h-6 w-28 rounded bg-neutral-800" />
			</div>
		</div>
	)
}

export function LiveKitSetupBanner() {
	return (
		<Alert className="border-yellow-300 bg-yellow-50 px-4 py-4 text-yellow-950">
			<Settings className="size-4" />
			<AlertTitle>Video conferencing not yet configured</AlertTitle>
			<AlertDescription className="text-yellow-900">
				<p>
					LiveKit credentials have not been set up on this server yet. An administrator needs to
					enable the integration before video sessions can be started.
				</p>
				<div className="mt-3 rounded-md border border-yellow-200 bg-white p-3">
					<p className="mb-2 text-xs font-semibold text-yellow-900">
						Administrator setup required:
					</p>
					<ul className="list-disc space-y-1 pl-5 text-xs">
						<li>
							Set <code className="rounded bg-yellow-100 px-1">LIVEKIT_MODE=real</code> in the
							backend environment.
						</li>
						<li>
							Set <code className="rounded bg-yellow-100 px-1">LIVEKIT_API_KEY</code> in the backend
							environment.
						</li>
						<li>
							Set <code className="rounded bg-yellow-100 px-1">LIVEKIT_API_SECRET</code> in the
							backend environment.
						</li>
						<li>
							Set <code className="rounded bg-yellow-100 px-1">LIVEKIT_WS_URL</code> in the backend
							environment.
						</li>
						<li>Restart the backend after setting credentials.</li>
					</ul>
				</div>
			</AlertDescription>
		</Alert>
	)
}

export function LiveKitErrorCard({
	message,
	title = "Unable to start video session",
	onRetry,
}: {
	message: string
	title?: string
	onRetry?: () => void
}) {
	let displayMessage = message
	try {
		const parsed = JSON.parse(message) as { message?: unknown; error?: unknown }
		if (typeof parsed.message === "string" && parsed.message.trim()) {
			displayMessage = parsed.message
		} else if (typeof parsed.error === "string" && parsed.error.trim()) {
			displayMessage = parsed.error
		}
	} catch {
		displayMessage = message
	}

	return (
		<Alert variant="destructive" className="px-4 py-4">
			<AlertTriangle className="size-4" />
			<AlertTitle>{title}</AlertTitle>
			<AlertDescription className="space-y-3">
				<p>{displayMessage}</p>
				{onRetry && (
					<Button type="button" variant="outline" size="sm" onClick={onRetry}>
						<RefreshCw className="size-3.5" />
						Try again
					</Button>
				)}
			</AlertDescription>
		</Alert>
	)
}

interface LiveKitConferenceProps {
	token: string
	serverUrl: string
	audioEnabled: boolean
	videoEnabled: boolean
	videoDeviceId?: string
	audioDeviceId?: string
	className?: string
	onDisconnected?: () => void
}

export function LiveKitConference(props: LiveKitConferenceProps) {
	return <LiveKitConferenceInner {...props} />
}

interface LiveKitTokenRoomProps {
	response?: LiveKitTokenResponse
	choices?: PreJoinChoices
	className?: string
	errorMessage?: string
	onDisconnected?: () => void
}

const DEFAULT_PREJOIN_CHOICES: PreJoinChoices = { audioEnabled: false, videoEnabled: false }

export function LiveKitTokenRoom({
	response,
	choices = DEFAULT_PREJOIN_CHOICES,
	className,
	errorMessage = "The server did not return a usable LiveKit token or websocket URL.",
	onDisconnected,
}: LiveKitTokenRoomProps) {
	const serverUrl = response?.wsUrl

	if (response?.isConfigured === false) {
		return <LiveKitSetupBanner />
	}

	if (response?.isConfigured && response.token && serverUrl) {
		return (
			<LiveKitConference
				token={response.token}
				serverUrl={serverUrl}
				audioEnabled={choices.audioEnabled}
				videoEnabled={choices.videoEnabled}
				videoDeviceId={choices.videoDeviceId}
				audioDeviceId={choices.audioDeviceId}
				className={className}
				onDisconnected={onDisconnected}
			/>
		)
	}

	return <LiveKitErrorCard message={errorMessage} />
}

export function LiveKitVideoRoom({
	appointmentId,
	patientName,
	clinicianName,
}: LiveKitVideoRoomProps) {
	return (
		<LiveKitVideoRoomSession
			key={appointmentId ?? "no-appointment"}
			appointmentId={appointmentId}
			patientName={patientName}
			clinicianName={clinicianName}
		/>
	)
}

function LiveKitVideoRoomSession({
	appointmentId,
	patientName,
	clinicianName,
}: LiveKitVideoRoomProps) {
	const joinRoom = useJoinLiveKitRoomMutation()
	const endSession = useEndLiveKitSessionMutation()
	const { mutate, reset } = joinRoom
	const [joinState, setJoinState] = useState<RoomJoinState>({
		appointmentId: null,
		choices: null,
		hasDisconnected: false,
	})
	const activeAppointmentId = appointmentId ?? null
	const choices = joinState.appointmentId === activeAppointmentId ? joinState.choices : null
	const hasDisconnected =
		joinState.appointmentId === activeAppointmentId ? joinState.hasDisconnected : false

	function handleRetry() {
		if (activeAppointmentId && choices) {
			reset()
			mutate(activeAppointmentId)
		}
	}

	function handleJoin(nextChoices: PreJoinChoices) {
		if (!activeAppointmentId) return
		reset()
		setJoinState({
			appointmentId: activeAppointmentId,
			choices: nextChoices,
			hasDisconnected: false,
		})
		mutate(activeAppointmentId)
	}

	function handleDisconnected() {
		if (activeAppointmentId) {
			endSession.mutate(activeAppointmentId)
		}
		reset()
		setJoinState(prev =>
			prev.appointmentId === activeAppointmentId
				? { ...prev, choices: null, hasDisconnected: true }
				: prev
		)
	}

	const isPreparing = Boolean(choices) && (joinRoom.isPending || joinRoom.status === "idle")

	const subtitle = useMemo(() => {
		const parts: string[] = []
		if (clinicianName) parts.push(`Clinician: ${clinicianName}`)
		if (patientName) parts.push(`Patient: ${patientName}`)
		return parts.join(" · ")
	}, [clinicianName, patientName])

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<Video className="text-primary size-5" />
						LiveKit Video Session
					</CardTitle>
					{subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
				</div>
			</CardHeader>
			<CardContent>
				{!appointmentId ? (
					<div className="flex flex-col items-center gap-2 py-10 text-center">
						<Video className="text-muted-foreground size-8" />
						<p className="text-sm font-medium">No appointment selected</p>
						<p className="text-muted-foreground text-xs">
							Select an appointment to start the video session.
						</p>
					</div>
				) : isPreparing ? (
					<VideoSessionSkeleton />
				) : joinRoom.error ? (
					<LiveKitErrorCard message={joinRoom.error.message} onRetry={handleRetry} />
				) : joinRoom.data?.isConfigured === false ? (
					<LiveKitSetupBanner />
				) : !choices ? (
					<div className="overflow-hidden rounded-lg border bg-black">
						<LiveKitPreJoin
							clinicianName={clinicianName}
							patientName={patientName}
							joinLabel={hasDisconnected ? "Join Again" : "Join Session"}
							onJoin={handleJoin}
						/>
					</div>
				) : (
					<LiveKitTokenRoom
						response={joinRoom.data}
						choices={choices}
						className="qhealth-livekit-room min-h-[520px]"
						onDisconnected={handleDisconnected}
					/>
				)}
			</CardContent>
		</Card>
	)
}

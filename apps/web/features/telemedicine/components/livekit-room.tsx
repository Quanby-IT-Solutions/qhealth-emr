"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import {
	AlertTriangle,
	Loader2,
	Mic,
	MicOff,
	RefreshCw,
	Settings,
	ShieldCheck,
	Stethoscope,
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
import { cn } from "@/core/lib/utils"
import {
	useEndLiveKitSessionMutation,
	useJoinLiveKitRoomMutation,
	type LiveKitTokenResponse,
} from "@/features/telemedicine/api/telemedicine.hooks"
import type { LiveKitConferenceInnerProps } from "@/features/telemedicine/components/livekit-conference-inner"
import { useDevicePreview } from "@/features/telemedicine/components/use-device-preview"

interface LiveKitVideoRoomProps {
	appointmentId?: string | null
	patientName?: string | null
	clinicianName?: string | null
	fullViewport?: boolean
	waitingRoomPatientName?: string | null
	patientInviteUrl?: string | null
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
	sessionCount: number
}

const LiveKitConferenceInner = dynamic<LiveKitConferenceInnerProps>(
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
	className?: string
}

export function CameraPreview({
	stream,
	videoEnabled,
	displayName,
	className,
}: CameraPreviewProps) {
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
		<div
			className={cn(
				"bg-muted ring-border/60 relative aspect-video w-full overflow-hidden rounded-2xl shadow-lg ring-1",
				className
			)}
		>
			{hasVideoTrack ? (
				<video
					ref={videoRef}
					autoPlay
					muted
					playsInline
					className="size-full [transform:scaleX(-1)] object-cover"
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

interface MicVisualizerProps {
	stream: MediaStream | null
	audioEnabled: boolean
}

const MIC_VISUALIZER_BAR_COUNT = 5
const MIC_VISUALIZER_ZERO_LEVELS: number[] = Array(MIC_VISUALIZER_BAR_COUNT).fill(0)

function MicVisualizer({ stream, audioEnabled }: MicVisualizerProps) {
	const [levels, setLevels] = useState<number[]>(MIC_VISUALIZER_ZERO_LEVELS)

	useEffect(() => {
		if (!audioEnabled || !stream || stream.getAudioTracks().length === 0) {
			return
		}

		if (typeof window === "undefined") return

		const AudioContextCtor: typeof AudioContext | undefined =
			window.AudioContext ??
			(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
		if (!AudioContextCtor) return

		let cancelled = false
		let rafId: number | null = null
		let audioCtx: AudioContext | null = null
		let analyser: AnalyserNode | null = null
		let source: MediaStreamAudioSourceNode | null = null

		try {
			audioCtx = new AudioContextCtor()
			analyser = audioCtx.createAnalyser()
			analyser.fftSize = 64
			analyser.smoothingTimeConstant = 0.7
			source = audioCtx.createMediaStreamSource(stream)
			source.connect(analyser)
			const data = new Uint8Array(analyser.frequencyBinCount)

			const tick = () => {
				if (cancelled || !analyser) return
				analyser.getByteFrequencyData(data)
				const bucketSize = Math.max(1, Math.floor(data.length / MIC_VISUALIZER_BAR_COUNT))
				const next: number[] = []
				for (let i = 0; i < MIC_VISUALIZER_BAR_COUNT; i++) {
					let sum = 0
					const start = i * bucketSize
					const end = Math.min(data.length, start + bucketSize)
					for (let j = start; j < end; j++) sum += data[j] ?? 0
					const avg = sum / Math.max(1, end - start)
					next.push(Math.min(1, avg / 160))
				}
				setLevels(next)
				rafId = requestAnimationFrame(tick)
			}
			rafId = requestAnimationFrame(tick)
		} catch {
			// ignore — visualizer is non-critical
		}

		return () => {
			cancelled = true
			if (rafId !== null) cancelAnimationFrame(rafId)
			try {
				source?.disconnect()
			} catch {
				/* noop */
			}
			try {
				analyser?.disconnect()
			} catch {
				/* noop */
			}
			if (audioCtx && audioCtx.state !== "closed") {
				void audioCtx.close().catch(() => undefined)
			}
		}
	}, [stream, audioEnabled])

	const display = audioEnabled ? levels : MIC_VISUALIZER_ZERO_LEVELS

	return (
		<div
			className="flex h-8 items-center justify-center gap-1.5"
			role="img"
			aria-label={audioEnabled ? "Microphone audio level" : "Microphone muted"}
		>
			{display.map((level, i) => {
				const height = audioEnabled ? Math.max(4, Math.round(level * 32)) : 4
				return (
					<motion.span
						key={i}
						className={cn(
							"block w-1 rounded-full",
							audioEnabled ? "bg-success" : "bg-muted-foreground/40"
						)}
						initial={false}
						animate={{ height }}
						transition={{ type: "spring", stiffness: 300, damping: 20 }}
					/>
				)
			})}
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
	dark?: boolean
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
	dark = false,
}: DeviceSelectorsProps) {
	const labelClass = dark
		? "text-muted-foreground text-[10px] uppercase tracking-widest font-medium"
		: "text-muted-foreground text-xs font-medium tracking-wider uppercase"
	const triggerClass = dark
		? "w-full min-w-0 bg-muted/60 border-border text-foreground hover:bg-muted focus:ring-ring/40 data-[placeholder]:text-muted-foreground"
		: "w-full min-w-0"

	return (
		<div className="space-y-3">
			<div className="space-y-1.5">
				<p className={labelClass}>Camera</p>
				<Select
					value={videoDeviceId ?? videoDevices[0]?.deviceId ?? ""}
					onValueChange={value => onVideoDeviceChange(value ?? undefined)}
					disabled={!videoEnabled || videoDevices.length === 0}
				>
					<SelectTrigger className={triggerClass}>
						<SelectValue
							placeholder={videoEnabled ? "Enable camera to see devices" : "Camera is off"}
						/>
					</SelectTrigger>
					<SelectContent className="max-w-[var(--anchor-width)]">
						{videoDevices.map(device => (
							<SelectItem key={device.deviceId} value={device.deviceId}>
								<span className="block min-w-0 truncate" title={device.label}>
									{device.label || `Camera (${device.deviceId.slice(0, 6)})`}
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="space-y-1.5">
				<p className={labelClass}>Microphone</p>
				<Select
					value={audioDeviceId ?? audioDevices[0]?.deviceId ?? ""}
					onValueChange={value => onAudioDeviceChange(value ?? undefined)}
					disabled={!audioEnabled || audioDevices.length === 0}
				>
					<SelectTrigger className={triggerClass}>
						<SelectValue
							placeholder={audioEnabled ? "Enable microphone to see devices" : "Microphone is off"}
						/>
					</SelectTrigger>
					<SelectContent className="max-w-[var(--anchor-width)]">
						{audioDevices.map(device => (
							<SelectItem key={device.deviceId} value={device.deviceId}>
								<span className="block min-w-0 truncate" title={device.label}>
									{device.label || `Microphone (${device.deviceId.slice(0, 6)})`}
								</span>
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
	fullViewport = false,
}: {
	clinicianName?: string | null
	patientName?: string | null
	joinLabel?: string
	onJoin: (choices: PreJoinChoices) => void
	fullViewport?: boolean
}) {
	const [audioEnabled, setAudioEnabled] = useState(false)
	const [videoEnabled, setVideoEnabled] = useState(false)
	const displayName = clinicianName?.trim() || "You"
	const preview = useDevicePreview(videoEnabled, audioEnabled)

	const toggleBase =
		"focus-visible:ring-ring focus-visible:ring-offset-background flex size-12 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
	const toggleOn = "border-border bg-muted text-success"
	const toggleOff = "border-destructive/30 bg-destructive/10 text-destructive"

	return (
		<div
			className={cn(
				"bg-background relative flex w-full items-center justify-center overflow-hidden p-4 sm:p-6",
				fullViewport ? "min-h-[360px] flex-1 self-stretch" : "min-h-[640px]"
			)}
		>
			<div
				data-testid="livekit-prejoin-card"
				className="border-border bg-card relative mx-auto w-full max-w-md rounded-3xl border p-5 shadow-2xl sm:p-6 lg:max-w-4xl lg:p-8"
			>
				<div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
					<div className="flex min-w-0 flex-col">
						<div className="mb-4 flex flex-col items-center text-center lg:items-start lg:text-left">
							<div className="bg-primary text-primary-foreground mb-3 flex size-12 items-center justify-center rounded-2xl shadow-lg">
								<Stethoscope className="size-6" aria-hidden="true" />
							</div>
							<h2 className="text-foreground text-lg font-semibold">Telemedicine Consultation</h2>
							<p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
								<ShieldCheck className="size-3" aria-hidden="true" />
								Secure encrypted session
							</p>
						</div>

						<CameraPreview
							stream={preview.stream}
							videoEnabled={videoEnabled}
							displayName={displayName}
							className="border-border rounded-2xl border shadow-none ring-0"
						/>

						<div className="mt-4">
							<MicVisualizer stream={preview.stream} audioEnabled={audioEnabled} />
						</div>

						<div className="mt-4 flex items-start justify-center gap-8">
							<div className="flex flex-col items-center gap-1.5">
								<button
									type="button"
									aria-pressed={audioEnabled}
									aria-label={audioEnabled ? "Mute microphone" : "Unmute microphone"}
									onClick={() => setAudioEnabled(v => !v)}
									className={cn(toggleBase, audioEnabled ? toggleOn : toggleOff)}
								>
									{audioEnabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
								</button>
								<span className="text-muted-foreground text-xs">Mic</span>
							</div>
							<div className="flex flex-col items-center gap-1.5">
								<button
									type="button"
									aria-pressed={videoEnabled}
									aria-label={videoEnabled ? "Turn camera off" : "Turn camera on"}
									onClick={() => setVideoEnabled(v => !v)}
									className={cn(toggleBase, videoEnabled ? toggleOn : toggleOff)}
								>
									{videoEnabled ? <Video className="size-5" /> : <VideoOff className="size-5" />}
								</button>
								<span className="text-muted-foreground text-xs">Camera</span>
							</div>
						</div>
					</div>

					<div className="flex min-w-0 flex-col">
						<div className="mb-4 space-y-1 text-center lg:text-left">
							<p className="text-foreground text-lg font-semibold">{displayName}</p>
							{patientName && (
								<p className="text-muted-foreground text-sm">
									Ready to meet with{" "}
									<span className="text-foreground font-medium">{patientName}</span>
								</p>
							)}
							<p className="text-muted-foreground flex items-center justify-center gap-1 text-xs lg:justify-start">
								<ShieldCheck className="size-3" aria-hidden="true" />
								End-to-end encrypted
							</p>
						</div>

						<div className="border-border bg-muted/40 mb-4 space-y-3 rounded-2xl border p-4">
							<DeviceSelectors
								dark
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
								<p className="text-destructive text-xs" role="alert">
									{preview.permissionError}
								</p>
							)}
							<p className="text-muted-foreground text-xs">
								Your browser will ask for permission when you turn these on. You can change them
								anytime inside the call.
							</p>
						</div>

						<button
							type="button"
							aria-label={joinLabel}
							className="mt-auto flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 text-base font-semibold text-white shadow-lg shadow-sky-500/20 transition-colors hover:from-sky-400 hover:to-indigo-400 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 focus-visible:outline-none"
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
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

function VideoSessionSkeleton() {
	return (
		<div className="bg-muted/40 text-foreground border-border/60 overflow-hidden rounded-2xl border">
			<div className="flex min-h-[520px] flex-col">
				<div className="flex flex-1 items-center justify-center p-3">
					<div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
						<VideoTileSkeleton />
						<VideoTileSkeleton />
					</div>
				</div>
				<div className="bg-card border-border/60 border-t p-3">
					<div className="flex flex-wrap items-center justify-center gap-3">
						<Skeleton className="size-12 rounded-full" />
						<Skeleton className="size-12 rounded-full" />
						<Skeleton className="size-12 rounded-full" />
						<Skeleton className="size-12 rounded-full" />
						<Skeleton className="size-12 rounded-full" />
					</div>
				</div>
			</div>
			<div className="text-muted-foreground bg-card border-border/60 flex items-center justify-center gap-2 border-t px-4 py-2 text-xs">
				<Loader2 className="text-muted-foreground size-3.5 animate-spin" />
				Preparing secure video session...
			</div>
		</div>
	)
}

function VideoTileSkeleton() {
	return (
		<div className="bg-muted relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl">
			<Skeleton className="size-24 rounded-full sm:size-28" />
			<div className="absolute bottom-2 left-2">
				<Skeleton className="h-6 w-28 rounded-full" />
			</div>
		</div>
	)
}

export function LiveKitSetupBanner() {
	return (
		<Alert className="border-amber-500/40 bg-amber-500/10 px-4 py-4 text-amber-900 dark:text-amber-100">
			<Settings className="size-4" />
			<AlertTitle>Video conferencing not yet configured</AlertTitle>
			<AlertDescription className="text-amber-900/90 dark:text-amber-100/90">
				<p>
					Video conferencing credentials have not been set up on this server yet. An
					administrator needs to enable the integration before video sessions can be started.
				</p>
				<p className="mt-2 text-xs">
					Contact your system administrator to complete video service setup.
				</p>
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
	fullViewport?: boolean
	waitingRoom?: { patientName?: string | null; inviteUrl?: string | null }
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
	fullViewport?: boolean
	waitingRoom?: { patientName?: string | null; inviteUrl?: string | null }
}

const DEFAULT_PREJOIN_CHOICES: PreJoinChoices = { audioEnabled: false, videoEnabled: false }

export function LiveKitTokenRoom({
	response,
	choices = DEFAULT_PREJOIN_CHOICES,
	className,
	errorMessage = "The server did not return usable video session credentials.",
	onDisconnected,
	fullViewport,
	waitingRoom,
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
				fullViewport={fullViewport}
				waitingRoom={waitingRoom}
			/>
		)
	}

	return <LiveKitErrorCard message={errorMessage} />
}

export function LiveKitVideoRoom({
	appointmentId,
	patientName,
	clinicianName,
	fullViewport,
	waitingRoomPatientName,
	patientInviteUrl,
}: LiveKitVideoRoomProps) {
	return (
		<LiveKitVideoRoomSession
			appointmentId={appointmentId}
			patientName={patientName}
			clinicianName={clinicianName}
			fullViewport={fullViewport}
			waitingRoomPatientName={waitingRoomPatientName}
			patientInviteUrl={patientInviteUrl}
		/>
	)
}

interface LiveKitVideoRoomSessionProps extends LiveKitVideoRoomProps {}

function LiveKitVideoRoomSession({
	appointmentId,
	patientName,
	clinicianName,
	fullViewport,
	waitingRoomPatientName,
	patientInviteUrl,
}: LiveKitVideoRoomSessionProps) {
	const joinRoom = useJoinLiveKitRoomMutation()
	const endSession = useEndLiveKitSessionMutation()
	const { mutate, reset } = joinRoom
	const [joinState, setJoinState] = useState<RoomJoinState>({
		appointmentId: null,
		choices: null,
		hasDisconnected: false,
		sessionCount: 0,
	})
	const activeAppointmentId = appointmentId ?? null
	const choices = joinState.appointmentId === activeAppointmentId ? joinState.choices : null
	const hasDisconnected =
		joinState.appointmentId === activeAppointmentId ? joinState.hasDisconnected : false
	const sessionCount =
		joinState.appointmentId === activeAppointmentId ? joinState.sessionCount : 0

	function handleRetry() {
		if (activeAppointmentId && choices) {
			reset()
			mutate(activeAppointmentId)
		}
	}

	function handleJoin(nextChoices: PreJoinChoices) {
		if (!activeAppointmentId) return
		reset()
		setJoinState(prev => ({
			appointmentId: activeAppointmentId,
			choices: nextChoices,
			hasDisconnected: false,
			sessionCount:
				(prev.appointmentId === activeAppointmentId ? prev.sessionCount : 0) + 1,
		}))
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

	const waitingRoomConfig = useMemo(
		() => ({
			patientName: waitingRoomPatientName ?? patientName ?? null,
			inviteUrl: patientInviteUrl ?? null,
		}),
		[waitingRoomPatientName, patientName, patientInviteUrl]
	)

	const content = !appointmentId ? (
		<div
			className={cn(
				"flex flex-col items-center gap-2 text-center",
				fullViewport ? "flex-1 justify-center text-muted-foreground" : "py-10"
			)}
		>
			<Video className={cn("size-8 text-muted-foreground")} />
			<p className="text-sm font-medium">No appointment selected</p>
			<p className={cn("text-xs text-muted-foreground")}>
				Select an appointment to start the video session.
			</p>
		</div>
	) : isPreparing ? (
		fullViewport ? (
			<div className="flex min-h-[360px] flex-1 items-center justify-center">
				<VideoSessionSkeleton />
			</div>
		) : (
			<VideoSessionSkeleton />
		)
	) : joinRoom.error ? (
		fullViewport ? (
			<div className="flex min-h-[360px] flex-1 items-center justify-center p-6">
				<div className="w-full max-w-md">
					<LiveKitErrorCard message={joinRoom.error.message} onRetry={handleRetry} />
				</div>
			</div>
		) : (
			<LiveKitErrorCard message={joinRoom.error.message} onRetry={handleRetry} />
		)
	) : joinRoom.data?.isConfigured === false ? (
		fullViewport ? (
			<div className="flex min-h-[360px] flex-1 items-center justify-center p-6">
				<div className="w-full max-w-2xl">
					<LiveKitSetupBanner />
				</div>
			</div>
		) : (
			<LiveKitSetupBanner />
		)
	) : !choices ? (
		fullViewport ? (
			<div className="flex min-h-[360px] flex-1 items-stretch overflow-hidden">
				<LiveKitPreJoin
					clinicianName={clinicianName}
					patientName={patientName}
					joinLabel={hasDisconnected ? "Join Again" : "Join Session"}
					onJoin={handleJoin}
					fullViewport
				/>
			</div>
		) : (
			<div className="border-border/60 overflow-hidden rounded-2xl border">
				<LiveKitPreJoin
					clinicianName={clinicianName}
					patientName={patientName}
					joinLabel={hasDisconnected ? "Join Again" : "Join Session"}
					onJoin={handleJoin}
				/>
			</div>
		)
	) : (
		<LiveKitTokenRoom
			key={`clinician-livekit:${activeAppointmentId ?? "none"}:${sessionCount}`}
			response={joinRoom.data}
			choices={choices}
			className={cn(
				"qhealth-livekit-room",
				fullViewport ? "flex h-full min-h-0 flex-1 flex-col" : "min-h-[520px]"
			)}
			onDisconnected={handleDisconnected}
			fullViewport={fullViewport}
			waitingRoom={fullViewport ? waitingRoomConfig : undefined}
		/>
	)

	if (fullViewport) {
		return (
			<div className="bg-background text-foreground flex h-full min-h-[360px] flex-1 flex-col overflow-hidden">
				{content}
			</div>
		)
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<Video className="text-primary size-5" />
						Video Session
					</CardTitle>
					{subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
				</div>
			</CardHeader>
			<CardContent>{content}</CardContent>
		</Card>
	)
}

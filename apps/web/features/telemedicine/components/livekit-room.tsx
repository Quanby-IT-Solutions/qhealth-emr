"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import {
	AlertTriangle,
	CalendarClock,
	ChevronDown,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
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

interface JoinWindowMessage {
	start: string
	end: string
}

interface FriendlyJoinWindow {
	date?: string
	startTime: string
	endTime: string
	timezoneLabel: string
}

function parseErrorMessage(message: string): string {
	try {
		const parsed = JSON.parse(message) as { message?: unknown; error?: unknown }
		if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message
		if (typeof parsed.error === "string" && parsed.error.trim()) return parsed.error
	} catch {
		return message
	}
	return message
}

function parseJoinWindowMessage(message: string): JoinWindowMessage | null {
	const displayMessage = parseErrorMessage(message)
	const match = /^Video room can be joined from (.+) until (.+)\.$/.exec(displayMessage)
	if (!match) return null
	return { start: match[1] ?? "", end: match[2] ?? "" }
}

function toFriendlyJoinWindow(window: JoinWindowMessage): FriendlyJoinWindow {
	const startMatch = /^(.+), (\d{1,2}:\d{2} [AP]M) GMT\+8$/.exec(window.start)
	const endMatch = /^(.+), (\d{1,2}:\d{2} [AP]M) GMT\+8$/.exec(window.end)
	if (startMatch && endMatch) {
		const startDate = startMatch[1]
		const endDate = endMatch[1]
		return {
			date: startDate === endDate ? startDate : undefined,
			startTime: startDate === endDate ? (startMatch[2] ?? window.start) : window.start,
			endTime: startDate === endDate ? (endMatch[2] ?? window.end) : window.end,
			timezoneLabel: "Philippine time",
		}
	}

	return {
		startTime: window.start.replace("GMT+8", "Philippine time"),
		endTime: window.end.replace("GMT+8", "Philippine time"),
		timezoneLabel: "Philippine time",
	}
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
	videoDevices: MediaDeviceInfo[]
	audioDevices: MediaDeviceInfo[]
	videoDeviceId: string | undefined
	audioDeviceId: string | undefined
	onVideoDeviceChange: (id: string | undefined) => void
	onAudioDeviceChange: (id: string | undefined) => void
	dark?: boolean
}

function getDeviceDisplayName(
	device: MediaDeviceInfo | undefined,
	fallbackPrefix: "Camera" | "Microphone",
	index?: number
) {
	const label = device?.label.trim()
	if (label) return label
	return typeof index === "number"
		? `${fallbackPrefix} ${index + 1}`
		: `Selected ${fallbackPrefix.toLowerCase()}`
}

export function DeviceSelectors({
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
	const selectedVideoDeviceId = videoDeviceId ?? videoDevices[0]?.deviceId ?? ""
	const selectedAudioDeviceId = audioDeviceId ?? audioDevices[0]?.deviceId ?? ""
	const selectedVideoDevice = videoDevices.find(device => device.deviceId === selectedVideoDeviceId)
	const selectedAudioDevice = audioDevices.find(device => device.deviceId === selectedAudioDeviceId)
	const selectedVideoDeviceLabel = getDeviceDisplayName(selectedVideoDevice, "Camera")
	const selectedAudioDeviceLabel = getDeviceDisplayName(selectedAudioDevice, "Microphone")

	return (
		<div className="space-y-3">
			<div className="space-y-1.5">
				<p className={labelClass}>Camera</p>
				<Select
					value={selectedVideoDeviceId}
					onValueChange={value => onVideoDeviceChange(value ?? undefined)}
					disabled={videoDevices.length === 0}
				>
					<SelectTrigger className={triggerClass}>
						<SelectValue placeholder="No camera found">{selectedVideoDeviceLabel}</SelectValue>
					</SelectTrigger>
					<SelectContent className="max-w-[var(--anchor-width)]">
						{videoDevices.map((device, index) => (
							<SelectItem key={device.deviceId} value={device.deviceId}>
								<span className="block min-w-0 truncate" title={device.label || undefined}>
									{getDeviceDisplayName(device, "Camera", index)}
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="space-y-1.5">
				<p className={labelClass}>Microphone</p>
				<Select
					value={selectedAudioDeviceId}
					onValueChange={value => onAudioDeviceChange(value ?? undefined)}
					disabled={audioDevices.length === 0}
				>
					<SelectTrigger className={triggerClass}>
						<SelectValue placeholder="No microphone found">{selectedAudioDeviceLabel}</SelectValue>
					</SelectTrigger>
					<SelectContent className="max-w-[var(--anchor-width)]">
						{audioDevices.map((device, index) => (
							<SelectItem key={device.deviceId} value={device.deviceId}>
								<span className="block min-w-0 truncate" title={device.label || undefined}>
									{getDeviceDisplayName(device, "Microphone", index)}
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	)
}

interface DeviceControlProps {
	type: "audio" | "video"
	enabled: boolean
	devices: MediaDeviceInfo[]
	deviceId: string | undefined
	onDeviceChange: (id: string | undefined) => void
	onEnabledChange: (enabled: boolean) => void
}

export function DeviceControl({
	type,
	enabled,
	devices,
	deviceId,
	onDeviceChange,
	onEnabledChange,
}: DeviceControlProps) {
	const isAudio = type === "audio"
	const selectedDeviceId = deviceId ?? devices[0]?.deviceId ?? ""
	const selectedDevice = devices.find(device => device.deviceId === selectedDeviceId)
	const label = isAudio ? "Microphone" : "Camera"
	const Icon = isAudio ? (enabled ? Mic : MicOff) : enabled ? Video : VideoOff

	return (
		<div className="flex flex-col items-center gap-1.5">
			<Popover>
				<div className="relative">
					<button
						type="button"
						aria-pressed={enabled}
						aria-label={
							enabled ? `Turn ${label.toLowerCase()} off` : `Turn ${label.toLowerCase()} on`
						}
						onClick={() => onEnabledChange(!enabled)}
						className={cn(
							"focus-visible:ring-ring focus-visible:ring-offset-background flex size-12 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
							enabled
								? "border-border bg-muted text-success"
								: "border-destructive/30 bg-destructive/10 text-destructive"
						)}
					>
						<Icon className="size-5" />
					</button>
					<PopoverTrigger
						type="button"
						aria-label={`${label} device options`}
						className="bg-card text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
					>
						<ChevronDown className="size-3.5" />
					</PopoverTrigger>
				</div>
				<PopoverContent align="center" className="w-[min(calc(100vw-2rem),20rem)] space-y-3 p-3">
					<div className="flex items-center justify-between gap-3">
						<div className="min-w-0">
							<p className="text-sm font-medium">{label}</p>
							<p className="text-muted-foreground truncate text-xs">
								{getDeviceDisplayName(selectedDevice, label)}
							</p>
						</div>
						<Button
							type="button"
							size="sm"
							variant={enabled ? "outline" : "default"}
							onClick={() => onEnabledChange(!enabled)}
							className="shrink-0"
						>
							{enabled ? "Off" : "On"}
						</Button>
					</div>
					<Select
						value={selectedDeviceId}
						onValueChange={value => onDeviceChange(value || undefined)}
						disabled={devices.length === 0}
					>
						<SelectTrigger className="w-full min-w-0">
							<SelectValue placeholder={`No ${label.toLowerCase()} found`}>
								{getDeviceDisplayName(selectedDevice, label)}
							</SelectValue>
						</SelectTrigger>
						<SelectContent className="max-w-[var(--anchor-width)]">
							{devices.map((device, index) => (
								<SelectItem key={device.deviceId} value={device.deviceId}>
									<span className="block min-w-0 truncate" title={device.label || undefined}>
										{getDeviceDisplayName(device, label, index)}
									</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</PopoverContent>
			</Popover>
			<span className="text-muted-foreground text-xs">{isAudio ? "Mic" : "Camera"}</span>
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

	return (
		<div
			className={cn(
				"bg-background relative flex w-full items-start justify-center overflow-y-auto p-3 pb-4 sm:p-5 lg:p-6",
				fullViewport ? "min-h-0 flex-1 self-stretch" : "min-h-[640px] sm:items-center"
			)}
		>
			<div
				data-testid="livekit-prejoin-card"
				className="border-border bg-card relative mx-auto w-full max-w-md rounded-3xl border p-4 shadow-2xl sm:p-5 lg:max-w-5xl lg:p-8"
			>
				<div className="grid gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.8fr)] lg:items-stretch lg:gap-8">
					<div className="flex min-w-0 flex-col">
						<div className="mb-4 flex items-start gap-3 lg:mb-5">
							<div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-2xl shadow-lg lg:size-11">
								<Stethoscope className="size-5" aria-hidden="true" />
							</div>
							<div className="min-w-0 pt-0.5">
								<h2 className="text-foreground text-base font-semibold lg:text-lg">
									Telemedicine Consultation
								</h2>
								<p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
									<ShieldCheck className="size-3" aria-hidden="true" />
									Secure encrypted session
								</p>
							</div>
						</div>

						<div className="mb-4 lg:hidden">
							<p className="text-foreground text-sm font-semibold">{displayName}</p>
							{patientName && (
								<p className="text-muted-foreground text-xs">
									Meeting with <span className="text-foreground font-medium">{patientName}</span>
								</p>
							)}
						</div>

						<CameraPreview
							stream={preview.stream}
							videoEnabled={videoEnabled}
							displayName={displayName}
							className="border-border max-h-[34dvh] rounded-2xl border shadow-none ring-0 lg:max-h-none lg:min-h-[268px]"
						/>

						<div className="mt-3 lg:mt-5">
							<MicVisualizer stream={preview.stream} audioEnabled={audioEnabled} />
						</div>

						<div className="mt-4 flex items-start justify-center gap-10 lg:mt-5">
							<DeviceControl
								type="audio"
								enabled={audioEnabled}
								devices={preview.audioDevices}
								deviceId={preview.audioDeviceId}
								onDeviceChange={preview.setAudioDeviceId}
								onEnabledChange={setAudioEnabled}
							/>
							<DeviceControl
								type="video"
								enabled={videoEnabled}
								devices={preview.videoDevices}
								deviceId={preview.videoDeviceId}
								onDeviceChange={preview.setVideoDeviceId}
								onEnabledChange={setVideoEnabled}
							/>
						</div>

						{preview.permissionError && (
							<p className="text-destructive mt-3 text-center text-xs lg:hidden" role="alert">
								{preview.permissionError}
							</p>
						)}

						<button
							type="button"
							aria-label={joinLabel}
							className="mt-4 flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-colors hover:from-sky-400 hover:to-indigo-400 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 focus-visible:outline-none lg:hidden"
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

					<div className="bg-muted/20 hidden min-w-0 flex-col justify-between gap-5 rounded-2xl border p-4 lg:flex">
						<div className="space-y-4">
							<div className="bg-background/70 rounded-xl border p-4">
								<p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
									Clinician
								</p>
								<p className="text-foreground mt-1 text-lg font-semibold">{displayName}</p>
								{patientName && (
									<p className="text-muted-foreground mt-1 text-sm">
										Ready to meet with{" "}
										<span className="text-foreground font-medium">{patientName}</span>
									</p>
								)}
								<p className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
									<ShieldCheck className="size-3" aria-hidden="true" />
									End-to-end encrypted
								</p>
							</div>

							<div className="border-border bg-background/70 space-y-3 rounded-xl border p-4">
								<div>
									<p className="text-foreground text-sm font-medium">Ready check</p>
									<p className="text-muted-foreground mt-1 text-xs">
										Toggle devices on the preview controls. Use each small chevron to choose a
										device.
									</p>
								</div>
								<div className="space-y-2 text-xs">
									<div className="bg-muted/30 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
										<div className="flex min-w-0 items-center gap-2">
											<Mic className="text-muted-foreground size-3.5 shrink-0" />
											<p className="text-muted-foreground">Microphone</p>
										</div>
										<p
											className={cn(
												"shrink-0 font-medium",
												audioEnabled ? "text-success" : "text-destructive"
											)}
										>
											{audioEnabled ? "On" : "Muted"}
										</p>
									</div>
									<div className="bg-muted/30 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
										<div className="flex min-w-0 items-center gap-2">
											<Video className="text-muted-foreground size-3.5 shrink-0" />
											<p className="text-muted-foreground">Camera</p>
										</div>
										<p
											className={cn(
												"shrink-0 font-medium",
												videoEnabled ? "text-success" : "text-destructive"
											)}
										>
											{videoEnabled ? "On" : "Off"}
										</p>
									</div>
								</div>
								<p className="text-muted-foreground text-xs">
									Your browser may ask for permission when devices are turned on.
								</p>
								{preview.permissionError && (
									<p className="text-destructive text-xs" role="alert">
										{preview.permissionError}
									</p>
								)}
							</div>
						</div>

						<button
							type="button"
							aria-label={joinLabel}
							className="flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 text-base font-semibold text-white shadow-lg shadow-sky-500/20 transition-colors hover:from-sky-400 hover:to-indigo-400 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 focus-visible:outline-none"
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
					Video conferencing credentials have not been set up on this server yet. An administrator
					needs to enable the integration before video sessions can be started.
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
	const displayMessage = parseErrorMessage(message)
	const joinWindow = parseJoinWindowMessage(message)
	const friendlyJoinWindow = joinWindow ? toFriendlyJoinWindow(joinWindow) : null

	if (friendlyJoinWindow) {
		return (
			<Alert className="border-amber-500/40 bg-amber-500/10 px-4 py-4 text-amber-900 dark:text-amber-100">
				<CalendarClock className="size-4" />
				<AlertTitle>Video room opens later</AlertTitle>
				<AlertDescription className="space-y-3 text-amber-900/90 dark:text-amber-100/90">
					<p>
						You can join this appointment&apos;s video room
						{friendlyJoinWindow.date ? ` on ${friendlyJoinWindow.date}` : ""} from{" "}
						<strong>{friendlyJoinWindow.startTime}</strong> to{" "}
						<strong>{friendlyJoinWindow.endTime}</strong>, {friendlyJoinWindow.timezoneLabel}.
					</p>
					<p className="text-xs">Please come back during that time window, then check again.</p>
					{onRetry && (
						<Button type="button" variant="outline" size="sm" onClick={onRetry}>
							<RefreshCw className="size-3.5" />
							Check again
						</Button>
					)}
				</AlertDescription>
			</Alert>
		)
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
	const sessionCount = joinState.appointmentId === activeAppointmentId ? joinState.sessionCount : 0

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
			sessionCount: (prev.appointmentId === activeAppointmentId ? prev.sessionCount : 0) + 1,
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
				fullViewport ? "text-muted-foreground flex-1 justify-center" : "py-10"
			)}
		>
			<Video className={cn("text-muted-foreground size-8")} />
			<p className="text-sm font-medium">No appointment selected</p>
			<p className={cn("text-muted-foreground text-xs")}>
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
			<div className="flex min-h-0 flex-1 items-stretch overflow-y-auto">
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
				"juanmeds-livekit-room",
				fullViewport ? "flex h-full min-h-0 flex-1 flex-col" : "min-h-[520px]"
			)}
			onDisconnected={handleDisconnected}
			fullViewport={fullViewport}
			waitingRoom={fullViewport ? waitingRoomConfig : undefined}
		/>
	)

	if (fullViewport) {
		return (
			<div className="bg-background text-foreground flex h-full min-h-0 flex-1 flex-col overflow-y-auto">
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

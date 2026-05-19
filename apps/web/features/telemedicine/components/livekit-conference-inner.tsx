"use client"

import {
	forwardRef,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
	type RefObject,
} from "react"
import {
	ConnectionStateToast,
	isTrackReference,
	LiveKitRoom as LiveKitRoomProvider,
	MediaDeviceSelect,
	RoomAudioRenderer,
	useConnectionQualityIndicator,
	useConnectionState,
	useLocalParticipant,
	useParticipants,
	useRoomContext,
	useTracks,
	VideoTrack,
	type TrackReferenceOrPlaceholder,
} from "@livekit/components-react"
import { AnimatePresence, motion, useAnimationControls, type PanInfo } from "framer-motion"
import { ConnectionQuality, ConnectionState, Track, type Participant } from "livekit-client"

import "@livekit/components-styles"

import {
	AlertTriangle,
	Check,
	Copy,
	Mic,
	MicOff,
	Monitor,
	MonitorOff,
	PhoneOff,
	Repeat2,
	Settings2,
	Video,
	VideoOff,
	X,
} from "lucide-react"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/core/components/ui/alert-dialog"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip"
import { cn } from "@/core/lib/utils"

// ============================================================================
// Helpers
// ============================================================================

type PipCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right"

const PIP_CORNER_STORAGE_KEY = "qhealth:pip-corner"
const PIP_SPRING = { type: "spring", stiffness: 380, damping: 34 } as const

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

function parseRoleFromMetadata(metadata?: string): string | null {
	if (!metadata) return null
	try {
		const parsed = JSON.parse(metadata) as { role?: unknown }
		return typeof parsed.role === "string" ? parsed.role : null
	} catch {
		return null
	}
}

function formatRoleLabel(role: string | null): string | null {
	if (!role) return null
	const map: Record<string, string> = {
		clinician: "Clinician",
		physician: "Physician",
		patient: "Patient",
		guest: "Guest",
	}
	return map[role.toLowerCase()] ?? role
}

function isParticipantReady(participant: Participant): boolean {
	const name = participant.name?.trim()
	const identity = participant.identity?.trim()
	return Boolean(name || identity)
}

function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false
	const tag = target.tagName.toLowerCase()
	return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable
}

function isPipCorner(value: string | null): value is PipCorner {
	return (
		value === "top-left" ||
		value === "top-right" ||
		value === "bottom-left" ||
		value === "bottom-right"
	)
}

function formatElapsed(seconds: number): string {
	const minutes = Math.floor(seconds / 60)
	const remainingSeconds = seconds % 60
	return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
}

function useConsultationTimer() {
	const startedAtRef = useRef<number | null>(null)
	const [elapsedSeconds, setElapsedSeconds] = useState(0)

	useEffect(() => {
		startedAtRef.current = Date.now()
		const interval = window.setInterval(() => {
			if (startedAtRef.current === null) return
			setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000))
		}, 1000)

		return () => window.clearInterval(interval)
	}, [])

	return formatElapsed(elapsedSeconds)
}

function useDockVisibility(timeoutMs = 3000) {
	const [visible, setVisible] = useState(true)

	useEffect(() => {
		let timeoutId: number | undefined

		function isMobileViewport() {
			return (
				typeof window.matchMedia === "function" && window.matchMedia("(max-width: 639px)").matches
			)
		}

		function showDock() {
			setVisible(true)
			if (timeoutId) window.clearTimeout(timeoutId)
			if (!isMobileViewport()) {
				timeoutId = window.setTimeout(() => setVisible(false), timeoutMs)
			}
		}

		showDock()
		window.addEventListener("mousemove", showDock)
		window.addEventListener("keydown", showDock)
		window.addEventListener("touchstart", showDock)
		window.addEventListener("resize", showDock)

		return () => {
			if (timeoutId) window.clearTimeout(timeoutId)
			window.removeEventListener("mousemove", showDock)
			window.removeEventListener("keydown", showDock)
			window.removeEventListener("touchstart", showDock)
			window.removeEventListener("resize", showDock)
		}
	}, [timeoutMs])

	return visible
}

// ============================================================================
// Tile
// ============================================================================

type AvatarSize = "sm" | "md" | "lg"

const AVATAR_CLASSES: Record<AvatarSize, string> = {
	sm: "size-16 text-xl sm:size-20 sm:text-2xl",
	md: "size-24 text-3xl sm:size-32 sm:text-4xl",
	lg: "size-32 text-4xl sm:size-44 sm:text-5xl md:size-52 md:text-6xl",
}

const SKELETON_AVATAR_CLASSES: Record<AvatarSize, string> = {
	sm: "size-16 sm:size-20",
	md: "size-24 sm:size-32",
	lg: "size-32 sm:size-44 md:size-52",
}

function ParticipantTileSkeleton({ avatarSize = "md" }: { avatarSize?: AvatarSize }) {
	return (
		<div
			data-testid="participant-tile-skeleton"
			className="relative flex size-full min-h-0 animate-pulse items-center justify-center overflow-hidden rounded-2xl bg-zinc-900"
		>
			<Skeleton className={`rounded-full bg-zinc-800 ${SKELETON_AVATAR_CLASSES[avatarSize]}`} />
			<div className="pointer-events-none absolute" style={{ bottom: "0.5rem", left: "0.5rem" }}>
				<Skeleton className="h-6 w-28 rounded-full bg-zinc-800" />
			</div>
		</div>
	)
}

interface ParticipantVideoTileProps {
	participant: Participant
	source?: Track.Source
	trackRef?: TrackReferenceOrPlaceholder
	avatarSize?: AvatarSize
	avoidControlDock?: boolean
}

function ParticipantVideoTile({
	participant,
	source = Track.Source.Camera,
	trackRef,
	avatarSize = "md",
	avoidControlDock = false,
}: ParticipantVideoTileProps) {
	if (!isParticipantReady(participant)) {
		return <ParticipantTileSkeleton avatarSize={avatarSize} />
	}

	const displayName = participant.name?.trim() || participant.identity || "Participant"
	const initials = getInitials(displayName)
	const gradient = getAvatarGradient(participant.identity || displayName)
	const role = formatRoleLabel(parseRoleFromMetadata(participant.metadata))
	const isLocal = participant.isLocal
	const isSpeaking = participant.isSpeaking
	const isMicMuted = participant.isMicrophoneEnabled === false
	const trackSource = trackRef?.source ?? source
	const isScreenShare = trackSource === Track.Source.ScreenShare
	const trackReference = trackRef && isTrackReference(trackRef) ? trackRef : null
	const isCameraEnabled = isScreenShare || participant.isCameraEnabled !== false

	const hasLiveVideo =
		!!trackReference?.publication?.track && !trackReference.publication.isMuted && isCameraEnabled
	const unavailableLabel = isScreenShare ? "Screen share stopped" : "Camera off"

	return (
		<div
			data-lk-local-participant={isLocal}
			data-lk-speaking={isSpeaking}
			data-testid="participant-video-tile"
			className={cn(
				"relative flex size-full min-h-0 items-center justify-center overflow-hidden rounded-2xl bg-zinc-900 shadow-sm transition-shadow",
				isSpeaking && "ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-zinc-950"
			)}
		>
			{hasLiveVideo && trackReference ? (
				<VideoTrack
					trackRef={trackReference}
					className={cn(
						"size-full",
						isScreenShare ? "object-contain" : "object-cover",
						isLocal && !isScreenShare && "[transform:scaleX(-1)]"
					)}
				/>
			) : (
				<div
					aria-label={`${displayName} ${unavailableLabel.toLowerCase()}`}
					data-testid="off-camera-placeholder"
					className="flex size-full flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,#27272a,#09090b)] p-4 text-center"
				>
					<div
						className={cn(
							"flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-lg",
							gradient,
							AVATAR_CLASSES[avatarSize]
						)}
					>
						{initials}
					</div>
					<span className="sr-only">{unavailableLabel}</span>
				</div>
			)}

			<div
				className="pointer-events-none absolute z-10 flex max-w-[calc(100%-1rem)] items-center gap-1.5"
				style={{
					bottom: avoidControlDock ? "6rem" : "0.5rem",
					left: "0.5rem",
				}}
			>
				<span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-md">
					{isMicMuted && (
						<MicOff
							className="size-3 shrink-0 text-rose-300"
							aria-label="Microphone muted"
						/>
					)}
					<span className="truncate">
						{displayName}
						{isLocal ? " (You)" : ""}
						{isScreenShare ? " · Screen" : ""}
					</span>
					{role && !isScreenShare && (
						<span className="border-l border-white/20 pl-1.5 text-[10px] font-medium tracking-wide text-white/70 uppercase">
							{role}
						</span>
					)}
				</span>
			</div>
		</div>
	)
}

function ParticipantTrackTile({
	track,
	avatarSize,
	avoidControlDock,
}: {
	track: TrackReferenceOrPlaceholder
	avatarSize: AvatarSize
	avoidControlDock?: boolean
}) {
	return (
		<ParticipantVideoTile
			participant={track.participant}
			source={track.source}
			trackRef={track}
			avatarSize={avatarSize}
			avoidControlDock={avoidControlDock}
		/>
	)
}

function ParticipantFallbackTile({
	participant,
	avatarSize,
	avoidControlDock,
}: {
	participant: Participant
	avatarSize: AvatarSize
	avoidControlDock?: boolean
}) {
	return (
		<ParticipantVideoTile
			participant={participant}
			source={Track.Source.Camera}
			avatarSize={avatarSize}
			avoidControlDock={avoidControlDock}
		/>
	)
}

function EmptyConferenceTile() {
	return (
		<div className="bg-muted/40 relative flex size-full min-h-[320px] flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl">
			<div className="bg-muted text-muted-foreground flex size-24 items-center justify-center rounded-full sm:size-32">
				<VideoOff className="size-10 sm:size-12" />
			</div>
			<p className="text-muted-foreground text-sm">Waiting for others to join...</p>
		</div>
	)
}

// ============================================================================
// Layout model
// ============================================================================

function trackKey(track: TrackReferenceOrPlaceholder): string {
	const sid = isTrackReference(track) ? track.publication.trackSid : ""
	return `${track.participant.identity}:${track.source}:${sid}`
}

interface CameraTile {
	participant: Participant
	track?: TrackReferenceOrPlaceholder
}

function participantKey(participant: Participant): string {
	return participant.sid || participant.identity
}

function cameraTileKey(tile: CameraTile): string {
	return tile.track ? trackKey(tile.track) : `${participantKey(tile.participant)}:camera:fallback`
}

function getAvatarSizeFor(count: number, hasScreen: boolean): AvatarSize {
	if (hasScreen) return "sm"
	if (count <= 1) return "lg"
	if (count <= 4) return "md"
	return "sm"
}

function renderCameraTile(tile: CameraTile, avatarSize: AvatarSize, avoidControlDock = false) {
	return tile.track ? (
		<ParticipantTrackTile
			track={tile.track}
			avatarSize={avatarSize}
			avoidControlDock={avoidControlDock}
		/>
	) : (
		<ParticipantFallbackTile
			participant={tile.participant}
			avatarSize={avatarSize}
			avoidControlDock={avoidControlDock}
		/>
	)
}

function selectSpotlightTiles(cameraTiles: CameraTile[], swapped: boolean) {
	const localTile = cameraTiles.find(tile => tile.participant.isLocal)
	const remoteTiles = cameraTiles.filter(tile => !tile.participant.isLocal)
	const defaultMain = remoteTiles[0] ?? localTile ?? cameraTiles[0]
	const defaultPip = defaultMain === localTile ? remoteTiles[0] : localTile

	if (!defaultMain) {
		return { mainTile: undefined, pipTile: undefined }
	}

	if (swapped && defaultPip) {
		return { mainTile: defaultPip, pipTile: defaultMain }
	}

	return { mainTile: defaultMain, pipTile: defaultPip }
}

function getPipTargets(stageRect: DOMRect, pipRect: DOMRect) {
	const compact = stageRect.width < 640
	const sideMargin = compact ? 12 : 16
	const topMargin = compact ? 12 : 16
	const bottomMargin = compact ? 84 : 96
	const right = Math.max(sideMargin, stageRect.width - pipRect.width - sideMargin)
	const bottom = Math.max(topMargin, stageRect.height - pipRect.height - bottomMargin)

	return {
		"top-left": { x: sideMargin, y: topMargin },
		"top-right": { x: right, y: topMargin },
		"bottom-left": { x: sideMargin, y: bottom },
		"bottom-right": { x: right, y: bottom },
	} satisfies Record<PipCorner, { x: number; y: number }>
}

function findNearestPipCorner(
	stageRect: DOMRect,
	pipRect: DOMRect,
	targets: Record<PipCorner, { x: number; y: number }>
): PipCorner {
	const currentCenter = {
		x: pipRect.left - stageRect.left + pipRect.width / 2,
		y: pipRect.top - stageRect.top + pipRect.height / 2,
	}

	return (Object.keys(targets) as PipCorner[]).reduce((nearest, corner) => {
		const nearestTarget = targets[nearest]
		const target = targets[corner]
		const nearestDistance = Math.hypot(
			currentCenter.x - (nearestTarget.x + pipRect.width / 2),
			currentCenter.y - (nearestTarget.y + pipRect.height / 2)
		)
		const distance = Math.hypot(
			currentCenter.x - (target.x + pipRect.width / 2),
			currentCenter.y - (target.y + pipRect.height / 2)
		)

		return distance < nearestDistance ? corner : nearest
	}, "bottom-right" as PipCorner)
}

// ============================================================================
// Stage chrome
// ============================================================================

function ConsultationTimer() {
	const elapsed = useConsultationTimer()

	return (
		<div
			data-testid="consultation-timer"
			aria-label={`Consultation time ${elapsed}`}
			className="absolute top-3 left-3 z-30 inline-flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-md sm:top-4 sm:left-4"
		>
			<span className="relative flex size-1.5">
				<span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-500 opacity-75" />
				<span className="relative inline-flex size-1.5 rounded-full bg-rose-500" />
			</span>
			<span className="tabular-nums">{elapsed}</span>
		</div>
	)
}

function getQualityPresentation(quality: ConnectionQuality) {
	switch (quality) {
		case ConnectionQuality.Excellent:
			return { label: "Excellent", dot: "bg-emerald-400", text: "text-emerald-300" }
		case ConnectionQuality.Good:
			return { label: "Good", dot: "bg-emerald-400", text: "text-emerald-300" }
		case ConnectionQuality.Poor:
			return { label: "Poor", dot: "bg-amber-400", text: "text-amber-300" }
		case ConnectionQuality.Lost:
			return { label: "Lost", dot: "bg-rose-400", text: "text-rose-300" }
		default:
			return { label: "Unknown", dot: "bg-zinc-500", text: "text-zinc-400" }
	}
}

function NetworkQualityBadge() {
	const { localParticipant } = useLocalParticipant()
	const { quality } = useConnectionQualityIndicator({ participant: localParticipant })
	const presentation = getQualityPresentation(quality)

	return (
		<div
			data-testid="network-quality-badge"
			aria-label={`Connection quality ${presentation.label}`}
			className={cn(
				"absolute top-3 right-3 z-30 inline-flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium shadow-sm backdrop-blur-md sm:top-4 sm:right-4",
				presentation.text
			)}
		>
			<span className={cn("size-1.5 rounded-full", presentation.dot)} />
			<span className="hidden sm:inline">{presentation.label}</span>
		</div>
	)
}

interface DockButtonProps {
	label: string
	pressed?: boolean
	disabled?: boolean
	variant?: "default" | "active" | "muted" | "danger"
	className?: string
	children: ReactNode
	onClick?: () => void
}

function DockButton({
	label,
	pressed,
	disabled,
	variant = "default",
	className,
	children,
	onClick,
}: DockButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger
				type="button"
				aria-label={label}
				aria-pressed={pressed}
				disabled={disabled}
				className={cn(
					"inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-zinc-100 shadow-sm transition-transform duration-150 outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:pointer-events-none disabled:opacity-50 sm:size-11",
					variant === "active" && "bg-white/15 text-emerald-300",
					variant === "muted" && "border-rose-400/20 bg-rose-500/20 text-rose-300",
					variant === "danger" &&
						"size-12 border-transparent bg-rose-600 text-white hover:bg-rose-500 sm:size-[52px]",
					className
				)}
				onClick={onClick}
			>
				{children}
			</TooltipTrigger>
			<TooltipContent side="top">{label}</TooltipContent>
		</Tooltip>
	)
}

function FloatingControlDock({ visible }: { visible: boolean }) {
	const room = useRoomContext()
	const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
		useLocalParticipant()
	const [settingsOpen, setSettingsOpen] = useState(false)
	const [endDialogOpen, setEndDialogOpen] = useState(false)
	const [pendingControl, setPendingControl] = useState<"microphone" | "camera" | "screen" | null>(
		null
	)
	const [controlError, setControlError] = useState<string | null>(null)
	const localControlsReady = Boolean(localParticipant)
	const dockIsVisible = visible || settingsOpen || endDialogOpen || Boolean(controlError)

	useEffect(() => {
		if (!controlError) return
		const timeoutId = window.setTimeout(() => setControlError(null), 6000)
		return () => window.clearTimeout(timeoutId)
	}, [controlError])

	const toggleMicrophone = useCallback(async () => {
		if (!localParticipant) {
			setControlError("Call controls are still connecting. Try again in a moment.")
			return
		}
		setPendingControl("microphone")
		setControlError(null)
		try {
			await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
		} catch (error) {
			setControlError(error instanceof Error ? error.message : "Unable to change microphone")
		} finally {
			setPendingControl(null)
		}
	}, [isMicrophoneEnabled, localParticipant])

	const toggleCamera = useCallback(async () => {
		if (!localParticipant) {
			setControlError("Call controls are still connecting. Try again in a moment.")
			return
		}
		setPendingControl("camera")
		setControlError(null)
		try {
			await localParticipant.setCameraEnabled(!isCameraEnabled)
		} catch (error) {
			setControlError(error instanceof Error ? error.message : "Unable to change camera")
		} finally {
			setPendingControl(null)
		}
	}, [isCameraEnabled, localParticipant])

	const toggleScreenShare = useCallback(async () => {
		if (!localParticipant) {
			setControlError("Call controls are still connecting. Try again in a moment.")
			return
		}
		setPendingControl("screen")
		setControlError(null)
		try {
			await localParticipant.setScreenShareEnabled(!isScreenShareEnabled, {
				audio: true,
				selfBrowserSurface: "include",
			})
		} catch (error) {
			setControlError(error instanceof Error ? error.message : "Unable to change screen share")
		} finally {
			setPendingControl(null)
		}
	}, [isScreenShareEnabled, localParticipant])

	useEffect(() => {
		function handleShortcut(event: KeyboardEvent) {
			if (isEditableTarget(event.target)) return
			const key = event.key.toLowerCase()

			if (key === "m") {
				event.preventDefault()
				void toggleMicrophone()
			}

			if (key === "v") {
				event.preventDefault()
				void toggleCamera()
			}

			if (event.key === "Escape" && !endDialogOpen) {
				event.preventDefault()
				setEndDialogOpen(true)
			}
		}

		window.addEventListener("keydown", handleShortcut)
		return () => window.removeEventListener("keydown", handleShortcut)
	}, [endDialogOpen, toggleCamera, toggleMicrophone])

	return (
		<>
			<AnimatePresence>
				{settingsOpen && (
					<div className="absolute bottom-20 left-1/2 z-50 w-[min(calc(100vw-2rem),22rem)] -translate-x-1/2">
						<motion.div
							initial={{ opacity: 0, y: 8, scale: 0.98 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: 8, scale: 0.98 }}
							transition={{ duration: 0.16 }}
							role="dialog"
							aria-label="Call device settings"
							className="rounded-2xl border border-white/10 bg-zinc-900/90 p-4 text-zinc-100 shadow-2xl backdrop-blur-xl"
						>
							<div className="mb-3 flex items-center justify-between gap-3">
								<p className="text-sm font-semibold">Devices</p>
								<button
									type="button"
									aria-label="Close device settings"
									className="rounded-full px-2 py-1 text-xs text-zinc-400 outline-none hover:bg-white/10 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-cyan-400"
									onClick={() => setSettingsOpen(false)}
								>
									Close
								</button>
							</div>
							<div className="space-y-4">
								<div className="space-y-2">
									<p className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
										Microphone
									</p>
									<MediaDeviceSelect
										kind="audioinput"
										className="[&_button]:w-full [&_button]:rounded-lg [&_button]:px-3 [&_button]:py-2 [&_button]:text-left [&_button]:text-sm [&_button]:text-zinc-200 [&_button]:hover:bg-white/10 [&_li[data-lk-active=true]_button]:bg-cyan-400/15 [&_li[data-lk-active=true]_button]:text-cyan-200"
									/>
								</div>
								<div className="space-y-2">
									<p className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
										Camera
									</p>
									<MediaDeviceSelect
										kind="videoinput"
										className="[&_button]:w-full [&_button]:rounded-lg [&_button]:px-3 [&_button]:py-2 [&_button]:text-left [&_button]:text-sm [&_button]:text-zinc-200 [&_button]:hover:bg-white/10 [&_li[data-lk-active=true]_button]:bg-cyan-400/15 [&_li[data-lk-active=true]_button]:text-cyan-200"
									/>
								</div>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{controlError && (
					<div className="pointer-events-none absolute inset-x-0 bottom-20 z-50 flex justify-center px-4 sm:bottom-24">
						<motion.div
							role="alert"
							initial={{ opacity: 0, y: 8, scale: 0.98 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: 8, scale: 0.98 }}
							transition={{ duration: 0.16 }}
							className="pointer-events-auto flex w-[min(calc(100vw-2rem),30rem)] items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-950/85 px-3 py-2 text-sm text-rose-100 shadow-2xl backdrop-blur-xl"
						>
							<AlertTriangle className="size-4 shrink-0 text-rose-300" aria-hidden="true" />
							<span className="min-w-0 flex-1">{controlError}</span>
							<button
								type="button"
								aria-label="Dismiss control error"
								className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-rose-200 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-rose-200"
								onClick={() => setControlError(null)}
							>
								<X className="size-3.5" />
							</button>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			<div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-3">
				<motion.div
					data-testid="floating-control-dock"
					initial={false}
					animate={dockIsVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
					transition={dockIsVisible ? { duration: 0.12 } : { duration: 0.2 }}
					className={cn(
						"pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/75 px-3 py-2 shadow-2xl backdrop-blur-xl sm:gap-2.5 sm:px-5 sm:py-2.5",
						!dockIsVisible && "pointer-events-none"
					)}
				>
					<DockButton
						label={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
						pressed={isMicrophoneEnabled}
						variant={isMicrophoneEnabled ? "active" : "muted"}
						disabled={!localControlsReady || pendingControl === "microphone"}
						onClick={() => void toggleMicrophone()}
					>
						{isMicrophoneEnabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
					</DockButton>
					<DockButton
						label={isCameraEnabled ? "Turn camera off" : "Turn camera on"}
						pressed={isCameraEnabled}
						variant={isCameraEnabled ? "active" : "muted"}
						disabled={!localControlsReady || pendingControl === "camera"}
						onClick={() => void toggleCamera()}
					>
						{isCameraEnabled ? <Video className="size-5" /> : <VideoOff className="size-5" />}
					</DockButton>
					<DockButton
						label={isScreenShareEnabled ? "Stop screen share" : "Share screen"}
						pressed={isScreenShareEnabled}
						variant={isScreenShareEnabled ? "active" : "default"}
						disabled={!localControlsReady || pendingControl === "screen"}
						onClick={() => void toggleScreenShare()}
						className={isScreenShareEnabled ? "text-cyan-300" : undefined}
					>
						{isScreenShareEnabled ? (
							<MonitorOff className="size-5" />
						) : (
							<Monitor className="size-5" />
						)}
					</DockButton>
					<DockButton
						label="Settings"
						pressed={settingsOpen}
						variant={settingsOpen ? "active" : "default"}
						onClick={() => setSettingsOpen(open => !open)}
					>
						<Settings2 className="size-5" />
					</DockButton>
					<div className="mx-1 h-8 w-px bg-white/10" />
					<DockButton label="End call" variant="danger" onClick={() => setEndDialogOpen(true)}>
						<PhoneOff className="size-5" />
					</DockButton>
				</motion.div>
			</div>

			<AlertDialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<div
							aria-hidden="true"
							className="flex size-10 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"
						>
							<PhoneOff className="size-5" />
						</div>
						<AlertDialogTitle>End this video call?</AlertDialogTitle>
						<AlertDialogDescription>
							The LiveKit room will disconnect for you and the session can be joined again if
							needed.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Stay in call</AlertDialogCancel>
						<AlertDialogAction
							className="bg-rose-600 text-white hover:bg-rose-500"
							onClick={() => void room.disconnect()}
						>
							End call
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

// ============================================================================
// Stage variants
// ============================================================================

interface FloatingSelfViewProps {
	tile: CameraTile
	stageRef: RefObject<HTMLDivElement | null>
	swapped: boolean
	onSwap: () => void
	avatarSize: AvatarSize
}

const FloatingSelfView = forwardRef<HTMLDivElement, FloatingSelfViewProps>(
	function FloatingSelfView({ tile, stageRef, swapped, onSwap, avatarSize }, forwardedRef) {
		const pipRef = useRef<HTMLDivElement>(null)
		const cornerRef = useRef<PipCorner>("bottom-right")
		const controls = useAnimationControls()
		const key = cameraTileKey(tile)
		const speakingClass = tile.participant.isSpeaking
			? tile.participant.isLocal
				? "ring-2 ring-cyan-400/60 ring-offset-2 ring-offset-zinc-950 animate-pulse"
				: "ring-2 ring-emerald-400/60 ring-offset-2 ring-offset-zinc-950"
			: ""

		const animateToCorner = useCallback(
			(nextCorner: PipCorner, immediate = false) => {
				const stage = stageRef.current
				const pip = pipRef.current
				if (!stage || !pip) return

				const targets = getPipTargets(stage.getBoundingClientRect(), pip.getBoundingClientRect())
				const target = targets[nextCorner]
				void controls.start({
					x: target.x,
					y: target.y,
					transition: immediate ? { duration: 0 } : PIP_SPRING,
				})
			},
			[controls, stageRef]
		)

		const setPipRef = useCallback(
			(node: HTMLDivElement | null) => {
				pipRef.current = node
				if (typeof forwardedRef === "function") {
					forwardedRef(node)
				} else if (forwardedRef) {
					;(forwardedRef as { current: HTMLDivElement | null }).current = node
				}
			},
			[forwardedRef]
		)

		useEffect(() => {
			if (typeof window === "undefined") return
			const storedCorner = window.localStorage.getItem(PIP_CORNER_STORAGE_KEY)
			if (isPipCorner(storedCorner)) {
				cornerRef.current = storedCorner
				animateToCorner(storedCorner, true)
			} else {
				animateToCorner("bottom-right", true)
			}
		}, [animateToCorner])

		useEffect(() => {
			animateToCorner(cornerRef.current, true)
		}, [animateToCorner, swapped, key])

		useEffect(() => {
			function handleResize() {
				animateToCorner(cornerRef.current, true)
			}

			window.addEventListener("resize", handleResize)
			return () => window.removeEventListener("resize", handleResize)
		}, [animateToCorner])

		function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, _info: PanInfo) {
			const stage = stageRef.current
			const pip = pipRef.current
			if (!stage || !pip) return

			const stageRect = stage.getBoundingClientRect()
			const pipRect = pip.getBoundingClientRect()
			const targets = getPipTargets(stageRect, pipRect)
			const nextCorner = findNearestPipCorner(stageRect, pipRect, targets)

			cornerRef.current = nextCorner
			if (typeof window !== "undefined") {
				window.localStorage.setItem(PIP_CORNER_STORAGE_KEY, nextCorner)
			}
			void controls.start({
				x: targets[nextCorner].x,
				y: targets[nextCorner].y,
				transition: PIP_SPRING,
			})
		}

		return (
			<motion.div
				ref={setPipRef}
				key={`pip-${key}`}
				layoutId={`participant-tile-${key}`}
				data-testid="floating-self-view"
				drag
				dragConstraints={stageRef}
				dragElastic={0.08}
				dragMomentum={false}
				animate={controls}
				onDragEnd={handleDragEnd}
				onDoubleClick={onSwap}
				className={cn(
					"group absolute top-0 left-0 z-30 aspect-video w-[180px] cursor-grab overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl active:cursor-grabbing sm:w-[280px]",
					speakingClass
				)}
			>
				{renderCameraTile(tile, avatarSize)}
				<Tooltip>
					<TooltipTrigger
						type="button"
						aria-label="Swap views"
						className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white opacity-0 shadow-sm backdrop-blur-sm transition-opacity outline-none group-hover:opacity-100 hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-cyan-400"
						onClick={event => {
							event.stopPropagation()
							onSwap()
						}}
					>
						<Repeat2 className="size-3.5" />
					</TooltipTrigger>
					<TooltipContent>Swap views</TooltipContent>
				</Tooltip>
			</motion.div>
		)
	}
)

function SpotlightStage({
	cameraTiles,
	stageRef,
}: {
	cameraTiles: CameraTile[]
	stageRef: RefObject<HTMLDivElement | null>
}) {
	const [swapped, setSwapped] = useState(false)
	const avatarSize = getAvatarSizeFor(cameraTiles.length, false)
	const { mainTile, pipTile } = selectSpotlightTiles(cameraTiles, swapped)

	if (!mainTile) {
		return (
			<div className="absolute inset-0 p-3 pb-24">
				<EmptyConferenceTile />
			</div>
		)
	}

	const mainKey = cameraTileKey(mainTile)

	return (
		<AnimatePresence mode="popLayout">
			<motion.div
				key={`main-${mainKey}`}
				layoutId={`participant-tile-${mainKey}`}
				data-testid="main-video-stage"
				className="absolute inset-0 p-2 pb-24 sm:p-3 sm:pb-28"
			>
				{renderCameraTile(mainTile, avatarSize, true)}
			</motion.div>
			{pipTile && (
				<FloatingSelfView
					key={`floating-${cameraTileKey(pipTile)}`}
					tile={pipTile}
					stageRef={stageRef}
					swapped={swapped}
					onSwap={() => setSwapped(value => !value)}
					avatarSize="sm"
				/>
			)}
		</AnimatePresence>
	)
}

function ScreenShareStage({
	screenTracks,
	cameraTiles,
}: {
	screenTracks: TrackReferenceOrPlaceholder[]
	cameraTiles: CameraTile[]
}) {
	const screenTrack = screenTracks[0]
	const stripAvatarSize = getAvatarSizeFor(cameraTiles.length, true)

	return (
		<>
			<div data-testid="screen-share-stage" className="absolute inset-0 p-2 pb-56 sm:p-3 sm:pb-60">
				{screenTrack ? (
					<motion.div
						key={trackKey(screenTrack)}
						layoutId={`participant-tile-${trackKey(screenTrack)}`}
						className="size-full"
					>
						<ParticipantTrackTile track={screenTrack} avatarSize="md" avoidControlDock />
					</motion.div>
				) : (
					<EmptyConferenceTile />
				)}
			</div>
			<div
				data-testid="screen-share-camera-strip"
				className="absolute right-3 bottom-24 left-3 z-20 flex h-28 items-center justify-center gap-2 overflow-x-auto sm:h-36 sm:gap-3"
			>
				{cameraTiles.length > 0 ? (
					cameraTiles.map(tile => (
						<div
							key={cameraTileKey(tile)}
							className="border-border bg-card aspect-video h-full shrink-0 overflow-hidden rounded-2xl border shadow-lg"
						>
							{renderCameraTile(tile, stripAvatarSize)}
						</div>
					))
				) : (
					<div className="border-border bg-card aspect-video h-full shrink-0 overflow-hidden rounded-2xl border shadow-lg">
						<ParticipantTileSkeleton avatarSize="sm" />
					</div>
				)}
			</div>
		</>
	)
}

function ConnectingStage() {
	return (
		<>
			<div data-testid="main-video-stage" className="absolute inset-0 p-2 pb-24 sm:p-3 sm:pb-28">
				<ParticipantTileSkeleton avatarSize="lg" />
			</div>
			<div className="absolute right-4 bottom-24 z-30 aspect-video w-[180px] overflow-hidden rounded-2xl border border-white/10 shadow-2xl sm:bottom-28 sm:w-[280px]">
				<ParticipantTileSkeleton avatarSize="sm" />
			</div>
		</>
	)
}

export interface WaitingRoomConfig {
	patientName?: string | null
	inviteUrl?: string | null
}

function WaitingRoomOverlay({ patientName, inviteUrl }: WaitingRoomConfig) {
	const [copied, setCopied] = useState(false)
	const displayName = patientName?.trim() || "your patient"
	const initials = getInitials(patientName)
	const gradient = getAvatarGradient(patientName || "patient")

	async function copyLink() {
		if (!inviteUrl) return
		try {
			await navigator.clipboard.writeText(inviteUrl)
			setCopied(true)
			window.setTimeout(() => setCopied(false), 2000)
		} catch {
			// noop — non-critical
		}
	}

	return (
		<motion.div
			data-testid="waiting-room-overlay"
			role="status"
			aria-live="polite"
			initial={{ opacity: 0, scale: 0.98 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.98 }}
			transition={{ duration: 0.3, ease: "easeOut" }}
			className="absolute inset-0 z-10 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#1f1f23,#09090b)] px-6 pt-16 pb-32"
		>
			<div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
				<div className="relative flex items-center justify-center">
					<span className="absolute size-32 animate-ping rounded-full bg-cyan-400/15 sm:size-36" />
					<span className="absolute size-28 animate-[spin_8s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,rgba(14,165,233,0.55),rgba(99,102,241,0.55),rgba(14,165,233,0.55))] opacity-60 blur-[2px] sm:size-32" />
					<div
						className={cn(
							"relative flex size-24 items-center justify-center rounded-full bg-gradient-to-br text-3xl font-semibold text-white shadow-2xl sm:size-28 sm:text-4xl",
							gradient
						)}
					>
						{initials}
					</div>
				</div>
				<div className="flex flex-col items-center gap-1.5">
					<p className="text-base font-medium text-zinc-100 sm:text-lg">
						Waiting for {displayName} to join…
					</p>
					<p className="max-w-xs text-xs text-zinc-400 sm:text-sm">
						They will appear here automatically once connected.
					</p>
				</div>
				{inviteUrl && (
					<button
						type="button"
						onClick={() => void copyLink()}
						className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-zinc-100 backdrop-blur-md transition-colors outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-cyan-400"
						aria-label="Copy patient join link"
					>
						{copied ? (
							<Check className="size-3.5 text-emerald-300" />
						) : (
							<Copy className="size-3.5" />
						)}
						{copied ? "Link copied" : "Copy patient link"}
					</button>
				)}
			</div>
		</motion.div>
	)
}

function WaitingRoomStage({
	cameraTiles,
	stageRef,
	waitingRoom,
}: {
	cameraTiles: CameraTile[]
	stageRef: RefObject<HTMLDivElement | null>
	waitingRoom: WaitingRoomConfig
}) {
	const localTile = cameraTiles.find(tile => tile.participant.isLocal)

	return (
		<>
			<WaitingRoomOverlay
				patientName={waitingRoom.patientName}
				inviteUrl={waitingRoom.inviteUrl}
			/>
			{localTile && (
				<FloatingSelfView
					key={`waiting-pip-${cameraTileKey(localTile)}`}
					tile={localTile}
					stageRef={stageRef}
					swapped={false}
					onSwap={() => undefined}
					avatarSize="sm"
				/>
			)}
		</>
	)
}

interface VideoConferenceLayoutProps {
	fullViewport?: boolean
	waitingRoom?: WaitingRoomConfig
}

function VideoConferenceLayout({ fullViewport, waitingRoom }: VideoConferenceLayoutProps) {
	const stageRef = useRef<HTMLDivElement>(null)
	const connectionState = useConnectionState()
	const participants = useParticipants()
	const cameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
		onlySubscribed: false,
	})
	const screenTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }], {
		onlySubscribed: false,
	})
	const dockVisible = useDockVisibility()
	const cameraTiles = useMemo(() => {
		const tiles: CameraTile[] = []
		const trackedParticipants = new Set<string>()

		for (const track of cameraTracks) {
			const key = participantKey(track.participant)
			trackedParticipants.add(key)
			tiles.push({
				participant: track.participant,
				track,
			})
		}

		for (const participant of participants) {
			const key = participantKey(participant)
			if (trackedParticipants.has(key)) continue
			tiles.push({ participant })
		}

		return tiles
	}, [cameraTracks, participants])
	const hasScreen = screenTracks.length > 0
	const isConnecting =
		connectionState === ConnectionState.Connecting ||
		connectionState === ConnectionState.Reconnecting
	const showWaitingRoom =
		!!waitingRoom && connectionState === ConnectionState.Connected && participants.length === 1

	return (
		<div
			data-qhealth-livekit-layout
			className={cn(
				"bg-background text-foreground flex flex-1 flex-col",
				fullViewport ? "h-full min-h-0" : "min-h-[560px] sm:min-h-[640px]"
			)}
			style={fullViewport ? { minHeight: 0 } : { minHeight: 560 }}
		>
			<div
				ref={stageRef}
				data-testid="livekit-spotlight-stage"
				className={cn(
					"bg-background relative isolate flex-1 overflow-hidden",
					fullViewport ? "h-full min-h-0" : "min-h-[560px] sm:min-h-[640px]"
				)}
				style={fullViewport ? { minHeight: 0 } : { minHeight: 560 }}
			>
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.06),transparent_34%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.10),transparent_34%),linear-gradient(145deg,#09090b,#18181b_55%,#09090b)]" />
				{isConnecting ? (
					<ConnectingStage />
				) : hasScreen ? (
					<ScreenShareStage screenTracks={screenTracks} cameraTiles={cameraTiles} />
				) : showWaitingRoom && waitingRoom ? (
					<WaitingRoomStage
						cameraTiles={cameraTiles}
						stageRef={stageRef}
						waitingRoom={waitingRoom}
					/>
				) : (
					<SpotlightStage cameraTiles={cameraTiles} stageRef={stageRef} />
				)}
				<ConsultationTimer />
				<NetworkQualityBadge />
				<FloatingControlDock visible={dockVisible} />
			</div>
			<RoomAudioRenderer />
			<ConnectionStateToast />
		</div>
	)
}

// ============================================================================
// Public component (default export for dynamic import)
// ============================================================================

export interface LiveKitConferenceInnerProps {
	token: string
	serverUrl: string
	audioEnabled: boolean
	videoEnabled: boolean
	videoDeviceId?: string
	audioDeviceId?: string
	className?: string
	onDisconnected?: () => void
	fullViewport?: boolean
	waitingRoom?: WaitingRoomConfig
}

export default function LiveKitConferenceInner({
	token,
	serverUrl,
	audioEnabled,
	videoEnabled,
	videoDeviceId,
	audioDeviceId,
	className,
	onDisconnected,
	fullViewport = false,
	waitingRoom,
}: LiveKitConferenceInnerProps) {
	const audioProp = audioEnabled ? (audioDeviceId ? { deviceId: audioDeviceId } : true) : false
	const videoProp = videoEnabled ? (videoDeviceId ? { deviceId: videoDeviceId } : true) : false

	return (
		<div
			className={cn(
				"qhealth-livekit-room bg-background text-foreground",
				fullViewport
					? "qhealth-livekit-full-room flex h-full min-h-0 flex-col"
					: "border-border overflow-hidden rounded-2xl border shadow-sm",
				className
			)}
			style={fullViewport ? { minHeight: 0 } : { minHeight: 560 }}
		>
			<LiveKitRoomProvider
				serverUrl={serverUrl}
				token={token}
				connect={true}
				audio={audioProp}
				video={videoProp}
				onDisconnected={onDisconnected}
				data-lk-theme="default"
				className={cn(
					"qhealth-livekit-custom-room flex flex-col",
					fullViewport ? "h-full min-h-0 flex-1" : "min-h-[560px]"
				)}
				style={fullViewport ? { minHeight: 0 } : { minHeight: 560 }}
			>
				<VideoConferenceLayout fullViewport={fullViewport} waitingRoom={waitingRoom} />
			</LiveKitRoomProvider>
		</div>
	)
}

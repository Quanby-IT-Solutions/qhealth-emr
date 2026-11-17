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
	RoomAudioRenderer,
	useChat,
	useConnectionQualityIndicator,
	useConnectionState,
	useLocalParticipant,
	useParticipants,
	useRoomContext,
	useTracks,
	VideoTrack,
	type ReceivedChatMessage,
	type TrackReferenceOrPlaceholder,
} from "@livekit/components-react"
import { AnimatePresence, motion, useAnimationControls, type PanInfo } from "framer-motion"
import { ConnectionQuality, ConnectionState, Track, type Participant } from "livekit-client"

import "@livekit/components-styles"

import {
	AlertTriangle,
	Check,
	ChevronDown,
	Copy,
	MessageSquare,
	Mic,
	MicOff,
	Monitor,
	MonitorOff,
	Paperclip,
	PhoneOff,
	Repeat2,
	Send,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip"
import { cn } from "@/core/lib/utils"

// ============================================================================
// Helpers
// ============================================================================

type PipCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right"

const PIP_CORNER_STORAGE_KEY = "juanmeds:pip-corner"
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

function detectParticipantRole(participant: Participant): "clinician" | "patient" | null {
	const fromMeta = parseRoleFromMetadata(participant.metadata)
	if (fromMeta === "clinician" || fromMeta === "patient") return fromMeta
	if (participant.identity.startsWith("clinician:")) return "clinician"
	if (participant.identity.startsWith("patient:")) return "patient"
	return null
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

type ConsultationTimerState =
	| { state: "connecting"; elapsed: null }
	| { state: "waiting-clinician"; elapsed: null }
	| { state: "waiting-patient"; elapsed: null }
	| { state: "active"; elapsed: string }

function useConsultationTimer(): ConsultationTimerState {
	const participants = useParticipants()
	const anchorRef = useRef<number | null>(null)
	const [, forceTick] = useState(0)

	useEffect(() => {
		const interval = window.setInterval(() => forceTick(value => value + 1), 1000)
		return () => window.clearInterval(interval)
	}, [])

	let clinicianJoin: number | null = null
	let patientJoin: number | null = null
	for (const participant of participants) {
		const role = detectParticipantRole(participant)
		const joinedAt = participant.joinedAt
		if (!role || !joinedAt) continue
		const time = joinedAt.getTime()
		if (role === "clinician" && (clinicianJoin === null || time < clinicianJoin)) {
			clinicianJoin = time
		} else if (role === "patient" && (patientJoin === null || time < patientJoin)) {
			patientJoin = time
		}
	}

	useEffect(() => {
		if (anchorRef.current !== null) return
		if (clinicianJoin !== null && patientJoin !== null) {
			anchorRef.current = Math.max(clinicianJoin, patientJoin)
			forceTick(value => value + 1)
		}
	}, [clinicianJoin, patientJoin])

	if (anchorRef.current !== null) {
		const elapsedSeconds = Math.max(0, Math.floor((Date.now() - anchorRef.current) / 1000))
		return { state: "active", elapsed: formatElapsed(elapsedSeconds) }
	}

	if (clinicianJoin !== null && patientJoin === null) {
		return { state: "waiting-patient", elapsed: null }
	}
	if (patientJoin !== null && clinicianJoin === null) {
		return { state: "waiting-clinician", elapsed: null }
	}
	return { state: "connecting", elapsed: null }
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
						<MicOff className="size-3 shrink-0 text-rose-300" aria-label="Microphone muted" />
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
	const { state, elapsed } = useConsultationTimer()

	if (state === "connecting") return null

	const isWaiting = state === "waiting-clinician" || state === "waiting-patient"
	const label =
		state === "waiting-patient"
			? "Waiting for patient"
			: state === "waiting-clinician"
				? "Waiting for clinician"
				: elapsed

	return (
		<div
			data-testid="consultation-timer"
			data-state={state}
			aria-label={
				state === "active" ? `Consultation time ${elapsed}` : (label ?? "Consultation timer")
			}
			className={cn(
				"absolute top-3 left-3 z-30 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-md sm:top-4 sm:left-4",
				isWaiting ? "bg-amber-600/85" : "bg-black/60"
			)}
		>
			<span className="relative flex size-1.5">
				<span
					className={cn(
						"absolute inline-flex size-full animate-ping rounded-full opacity-75",
						isWaiting ? "bg-amber-300" : "bg-rose-500"
					)}
				/>
				<span
					className={cn(
						"relative inline-flex size-1.5 rounded-full",
						isWaiting ? "bg-amber-300" : "bg-rose-500"
					)}
				/>
			</span>
			<span className="tabular-nums">{label}</span>
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

interface InCallDeviceButtonProps {
	label: string
	deviceLabel: string
	pressed?: boolean
	disabled?: boolean
	variant: "active" | "muted"
	devices: MediaDeviceInfo[]
	open: boolean
	onOpenChange: (open: boolean) => void
	onDeviceSelect: (deviceId: string) => void
	onToggle: () => void
	children: ReactNode
}

function InCallDeviceButton({
	label,
	deviceLabel,
	pressed,
	disabled,
	variant,
	devices,
	open,
	onOpenChange,
	onDeviceSelect,
	onToggle,
	children,
}: InCallDeviceButtonProps) {
	return (
		<div className="relative">
			<DockButton
				label={label}
				pressed={pressed}
				variant={variant}
				disabled={disabled}
				onClick={onToggle}
			>
				{children}
			</DockButton>
			<Popover open={open} onOpenChange={onOpenChange}>
				<PopoverTrigger
					type="button"
					aria-label={`${deviceLabel} device options`}
					disabled={disabled}
					className="absolute -right-1 -bottom-1 z-10 inline-flex size-5 items-center justify-center rounded-full border border-white/10 bg-zinc-900 text-zinc-300 shadow-sm transition-colors outline-none hover:bg-zinc-800 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:pointer-events-none disabled:opacity-50"
				>
					<ChevronDown className="size-3" />
				</PopoverTrigger>
				<PopoverContent
					side="top"
					align="center"
					sideOffset={12}
					className="w-[min(calc(100vw-2rem),20rem)] gap-3 rounded-2xl border border-white/10 bg-zinc-900/95 p-3 text-zinc-100 shadow-2xl backdrop-blur-xl"
				>
					<div className="space-y-1">
						<p className="text-sm font-semibold">{deviceLabel}</p>
						<p className="text-xs text-zinc-400">Choose which device to use in this call.</p>
					</div>
					<div className="max-h-64 space-y-1 overflow-y-auto pr-1">
						{devices.length ? (
							devices.map((device, index) => (
								<button
									key={device.deviceId || `${device.kind}-${index}`}
									type="button"
									className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-100 transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
									onClick={() => {
										onDeviceSelect(device.deviceId)
										onOpenChange(false)
									}}
								>
									<span className="block truncate">
										{device.label || `${deviceLabel} ${index + 1}`}
									</span>
								</button>
							))
						) : (
							<p className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-400">
								No {deviceLabel.toLowerCase()} found.
							</p>
						)}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	)
}

interface FloatingControlDockProps {
	visible: boolean
	chatOpen: boolean
	unreadCount: number
	onToggleChat: () => void
}

function FloatingControlDock({
	visible,
	chatOpen,
	unreadCount,
	onToggleChat,
}: FloatingControlDockProps) {
	const room = useRoomContext()
	const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
		useLocalParticipant()
	const [deviceMenuOpen, setDeviceMenuOpen] = useState<"microphone" | "camera" | null>(null)
	const [mediaDevices, setMediaDevices] = useState<MediaDeviceInfo[]>([])
	const [endDialogOpen, setEndDialogOpen] = useState(false)
	const [pendingControl, setPendingControl] = useState<"microphone" | "camera" | "screen" | null>(
		null
	)
	const [controlError, setControlError] = useState<string | null>(null)
	const localControlsReady = Boolean(localParticipant)
	const dockIsVisible = visible || Boolean(deviceMenuOpen) || endDialogOpen || Boolean(controlError)
	const audioDevices = mediaDevices.filter(device => device.kind === "audioinput")
	const videoDevices = mediaDevices.filter(device => device.kind === "videoinput")

	const refreshMediaDevices = useCallback(async () => {
		if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return
		try {
			setMediaDevices(await navigator.mediaDevices.enumerateDevices())
		} catch (error) {
			setControlError(error instanceof Error ? error.message : "Unable to load media devices")
		}
	}, [])

	useEffect(() => {
		void refreshMediaDevices()
	}, [refreshMediaDevices])

	useEffect(() => {
		if (deviceMenuOpen) void refreshMediaDevices()
	}, [deviceMenuOpen, refreshMediaDevices])

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

	const selectDevice = useCallback(
		async (kind: "audioinput" | "videoinput", deviceId: string) => {
			if (!deviceId) return
			setControlError(null)
			try {
				await room.switchActiveDevice(kind, deviceId)
				await refreshMediaDevices()
			} catch (error) {
				setControlError(error instanceof Error ? error.message : "Unable to switch device")
			}
		},
		[refreshMediaDevices, room]
	)

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
					<InCallDeviceButton
						label={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
						deviceLabel="Microphone"
						pressed={isMicrophoneEnabled}
						variant={isMicrophoneEnabled ? "active" : "muted"}
						disabled={!localControlsReady || pendingControl === "microphone"}
						devices={audioDevices}
						open={deviceMenuOpen === "microphone"}
						onOpenChange={open => setDeviceMenuOpen(open ? "microphone" : null)}
						onDeviceSelect={deviceId => void selectDevice("audioinput", deviceId)}
						onToggle={() => void toggleMicrophone()}
					>
						{isMicrophoneEnabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
					</InCallDeviceButton>
					<InCallDeviceButton
						label={isCameraEnabled ? "Turn camera off" : "Turn camera on"}
						deviceLabel="Camera"
						pressed={isCameraEnabled}
						variant={isCameraEnabled ? "active" : "muted"}
						disabled={!localControlsReady || pendingControl === "camera"}
						devices={videoDevices}
						open={deviceMenuOpen === "camera"}
						onOpenChange={open => setDeviceMenuOpen(open ? "camera" : null)}
						onDeviceSelect={deviceId => void selectDevice("videoinput", deviceId)}
						onToggle={() => void toggleCamera()}
					>
						{isCameraEnabled ? <Video className="size-5" /> : <VideoOff className="size-5" />}
					</InCallDeviceButton>
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
					<div className="relative">
						<DockButton
							label={
								unreadCount > 0
									? `Open chat (${unreadCount} unread)`
									: chatOpen
										? "Close chat"
										: "Open chat"
							}
							pressed={chatOpen}
							variant={chatOpen ? "active" : "default"}
							onClick={onToggleChat}
						>
							<MessageSquare className="size-5" />
						</DockButton>
						{unreadCount > 0 && (
							<span
								aria-hidden="true"
								data-testid="chat-unread-badge"
								className="pointer-events-none absolute -top-0.5 -right-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-md ring-2 ring-zinc-900"
							>
								{unreadCount > 9 ? "9+" : unreadCount}
							</span>
						)}
					</div>
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
							className="bg-destructive/10 text-destructive flex size-10 items-center justify-center rounded-full"
						>
							<PhoneOff className="size-5" />
						</div>
						<AlertDialogTitle>End this video call?</AlertDialogTitle>
						<AlertDialogDescription>
							The video room will disconnect for you and the session can be joined again if needed.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Stay in call</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
// Chat panel
// ============================================================================

function formatChatTimestamp(timestamp: number): string {
	try {
		return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
	} catch {
		return ""
	}
}

function getMessageSenderName(message: ReceivedChatMessage): string {
	const from = message.from
	if (!from) return "Unknown"
	if (from.name && from.name.trim().length > 0) return from.name
	const role = parseRoleFromMetadata(from.metadata)
	if (role) return role
	return from.identity || "Unknown"
}

interface ChatPanelProps {
	open: boolean
	onClose: () => void
	messages: ReceivedChatMessage[]
	send: (message: string) => Promise<unknown>
	isSending: boolean
}

function ChatPanel({ open, onClose, messages, send, isSending }: ChatPanelProps) {
	const { localParticipant } = useLocalParticipant()
	const [draft, setDraft] = useState("")
	const [sendError, setSendError] = useState<string | null>(null)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const localIdentity = localParticipant?.identity

	useEffect(() => {
		if (!open) return
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
	}, [messages.length, open])

	useEffect(() => {
		if (open) {
			const id = window.setTimeout(() => textareaRef.current?.focus(), 120)
			return () => window.clearTimeout(id)
		}
	}, [open])

	useEffect(() => {
		if (!open) return
		function handleKey(event: KeyboardEvent) {
			if (event.key === "Escape") {
				event.preventDefault()
				onClose()
			}
		}
		window.addEventListener("keydown", handleKey)
		return () => window.removeEventListener("keydown", handleKey)
	}, [open, onClose])

	useEffect(() => {
		if (!sendError) return
		const id = window.setTimeout(() => setSendError(null), 5000)
		return () => window.clearTimeout(id)
	}, [sendError])

	const handleSend = useCallback(async () => {
		const trimmed = draft.trim()
		if (!trimmed || isSending) return
		setSendError(null)
		try {
			await send(trimmed)
			setDraft("")
		} catch (error) {
			setSendError(error instanceof Error ? error.message : "Unable to send message")
		}
	}, [draft, isSending, send])

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (event.key === "Enter" && !event.shiftKey) {
				event.preventDefault()
				void handleSend()
			}
		},
		[handleSend]
	)

	return (
		<aside
			aria-label="In-call chat"
			aria-hidden={!open}
			data-testid="chat-panel"
			data-state={open ? "open" : "closed"}
			className={cn(
				"bg-card text-card-foreground shrink-0 overflow-hidden shadow-2xl backdrop-blur-xl transition-[width,border-color] duration-300 ease-out",
				open ? "border-border w-full border-l sm:w-[380px]" : "w-0 border-l-0"
			)}
		>
			<div className="flex h-full w-full flex-col sm:w-[380px]">
				<header className="border-border flex items-center justify-between border-b px-4 py-3">
					<div className="min-w-0">
						<p className="text-foreground text-sm font-semibold">In-call chat</p>
						<p className="text-muted-foreground text-xs">
							Messages are visible to everyone in the room.
						</p>
					</div>
					<button
						type="button"
						aria-label="Close chat"
						tabIndex={open ? 0 : -1}
						onClick={onClose}
						className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex size-8 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2"
					>
						<X className="size-4" />
					</button>
				</header>

				<div data-testid="chat-message-list" className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
					{messages.length === 0 ? (
						<div className="text-muted-foreground flex h-full flex-col items-center justify-center text-center text-xs">
							<MessageSquare className="text-muted-foreground/70 mb-2 size-6" />
							<p className="text-foreground font-medium">No messages yet</p>
							<p className="text-muted-foreground mt-1 max-w-[16rem]">
								Send a note, share a link, or confirm next steps without interrupting the
								conversation.
							</p>
						</div>
					) : (
						messages.map((message, index) => {
							const isLocal =
								message.from?.isLocal === true ||
								(localIdentity != null && message.from?.identity === localIdentity)
							const sender = getMessageSenderName(message)
							const previous = messages[index - 1]
							const showSenderHeader =
								!previous ||
								previous.from?.identity !== message.from?.identity ||
								message.timestamp - (previous.timestamp ?? 0) > 5 * 60 * 1000
							return (
								<div
									key={`${message.timestamp}-${index}`}
									className={cn("flex flex-col gap-1", isLocal ? "items-end" : "items-start")}
								>
									{showSenderHeader && (
										<div
											className={cn(
												"text-muted-foreground flex items-center gap-2 text-[11px]",
												isLocal && "flex-row-reverse"
											)}
										>
											<span className="text-foreground font-medium">
												{isLocal ? "You" : sender}
											</span>
											<span aria-hidden="true">·</span>
											<span className="tabular-nums">{formatChatTimestamp(message.timestamp)}</span>
										</div>
									)}
									<div
										className={cn(
											"max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap shadow-sm",
											isLocal
												? "bg-primary text-primary-foreground rounded-br-sm"
												: "bg-muted text-foreground rounded-bl-sm"
										)}
									>
										{message.message}
									</div>
								</div>
							)
						})
					)}
					<div ref={messagesEndRef} />
				</div>

				{sendError && (
					<div
						role="alert"
						className="border-destructive/30 bg-destructive/10 text-destructive mx-4 mb-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
					>
						<AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
						<span className="min-w-0 flex-1">{sendError}</span>
					</div>
				)}

				<form
					className="border-border bg-background/60 flex items-end gap-2 border-t px-3 pt-3 pb-5"
					onSubmit={event => {
						event.preventDefault()
						void handleSend()
					}}
				>
					<label htmlFor="telemed-chat-input" className="sr-only">
						Type a message
					</label>
					<Tooltip>
						<TooltipTrigger
							type="button"
							aria-label="Attach file (coming soon)"
							aria-disabled="true"
							disabled
							tabIndex={open ? 0 : -1}
							className="text-muted-foreground hover:bg-muted relative inline-flex size-10 shrink-0 items-center justify-center rounded-full outline-none disabled:cursor-not-allowed disabled:opacity-60"
						>
							<Paperclip className="size-4" />
							<span
								aria-hidden="true"
								className="bg-accent text-accent-foreground absolute -top-1 -right-1 rounded-full px-1.5 py-[1px] text-[8px] font-bold tracking-wide uppercase shadow-sm"
							>
								Soon
							</span>
						</TooltipTrigger>
						<TooltipContent side="top">
							File attachments coming soon — labs, photos, prescriptions
						</TooltipContent>
					</Tooltip>
					<textarea
						id="telemed-chat-input"
						ref={textareaRef}
						value={draft}
						onChange={event => setDraft(event.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Type a message"
						rows={1}
						maxLength={2000}
						tabIndex={open ? 0 : -1}
						className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/40 max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
					/>
					<button
						type="submit"
						aria-label="Send message"
						disabled={isSending || draft.trim().length === 0}
						tabIndex={open ? 0 : -1}
						className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex size-10 shrink-0 items-center justify-center rounded-full shadow-sm transition-transform duration-150 outline-none hover:scale-105 focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50"
					>
						<Send className="size-4" />
					</button>
				</form>
			</div>
		</aside>
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

			const stage = stageRef.current
			let observer: ResizeObserver | null = null
			if (stage && typeof ResizeObserver !== "undefined") {
				observer = new ResizeObserver(() => {
					animateToCorner(cornerRef.current, true)
				})
				observer.observe(stage)
			}

			return () => {
				window.removeEventListener("resize", handleResize)
				observer?.disconnect()
			}
		}, [animateToCorner, stageRef])

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
			<WaitingRoomOverlay patientName={waitingRoom.patientName} inviteUrl={waitingRoom.inviteUrl} />
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
	const { chatMessages, send: sendChatMessage, isSending: isSendingChat } = useChat()
	const [chatOpen, setChatOpen] = useState(false)
	const [lastSeenChatCount, setLastSeenChatCount] = useState(0)

	useEffect(() => {
		if (chatOpen) {
			setLastSeenChatCount(chatMessages.length)
		}
	}, [chatOpen, chatMessages.length])

	const unreadChatCount = chatOpen ? 0 : Math.max(0, chatMessages.length - lastSeenChatCount)

	const toggleChat = useCallback(() => setChatOpen(open => !open), [])
	const closeChat = useCallback(() => setChatOpen(false), [])
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
			data-juanmeds-livekit-layout
			className={cn(
				"bg-background text-foreground flex flex-1 flex-col",
				fullViewport ? "h-full min-h-0" : "min-h-[560px] sm:min-h-[640px]"
			)}
			style={fullViewport ? { minHeight: 0 } : { minHeight: 560 }}
		>
			<div
				className={cn(
					"flex min-h-0 flex-1 flex-row",
					fullViewport ? "h-full" : "min-h-[560px] sm:min-h-[640px]"
				)}
			>
				<div
					ref={stageRef}
					data-testid="livekit-spotlight-stage"
					className={cn(
						"bg-background relative isolate min-w-0 flex-1 overflow-hidden",
						fullViewport ? "h-full min-h-0" : "min-h-[560px] sm:min-h-[640px]",
						chatOpen && "hidden sm:block"
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
					<FloatingControlDock
						visible={dockVisible}
						chatOpen={chatOpen}
						unreadCount={unreadChatCount}
						onToggleChat={toggleChat}
					/>
				</div>
				<ChatPanel
					open={chatOpen}
					onClose={closeChat}
					messages={chatMessages}
					send={sendChatMessage}
					isSending={isSendingChat}
				/>
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
				"juanmeds-livekit-room bg-background text-foreground",
				fullViewport
					? "juanmeds-livekit-full-room flex h-full min-h-0 flex-col"
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
					"juanmeds-livekit-custom-room flex flex-col",
					fullViewport ? "h-full min-h-0 flex-1" : "min-h-[560px]"
				)}
				style={fullViewport ? { minHeight: 0 } : { minHeight: 560 }}
			>
				<VideoConferenceLayout fullViewport={fullViewport} waitingRoom={waitingRoom} />
			</LiveKitRoomProvider>
		</div>
	)
}

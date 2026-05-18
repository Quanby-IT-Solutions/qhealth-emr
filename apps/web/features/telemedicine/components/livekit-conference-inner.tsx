"use client"

import { useMemo } from "react"
import {
	ConnectionStateToast,
	ControlBar,
	isTrackReference,
	LiveKitRoom as LiveKitRoomProvider,
	RoomAudioRenderer,
	type TrackReferenceOrPlaceholder,
	useParticipants,
	useTracks,
	VideoTrack,
} from "@livekit/components-react"
import { Track, type Participant } from "livekit-client"

import "@livekit/components-styles"

import { Mic, MicOff, VideoOff } from "lucide-react"

// ============================================================================
// Helpers
// ============================================================================

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

// ============================================================================
// Tile
// ============================================================================

type AvatarSize = "sm" | "md" | "lg"

const AVATAR_CLASSES: Record<AvatarSize, string> = {
	sm: "size-16 text-xl sm:size-20 sm:text-2xl",
	md: "size-24 text-3xl sm:size-32 sm:text-4xl",
	lg: "size-32 text-4xl sm:size-44 sm:text-5xl md:size-52 md:text-6xl",
}

interface ParticipantVideoTileProps {
	participant: Participant
	source?: Track.Source
	trackRef?: TrackReferenceOrPlaceholder
	avatarSize?: AvatarSize
}

function ParticipantVideoTile({
	participant,
	source = Track.Source.Camera,
	trackRef,
	avatarSize = "md",
}: ParticipantVideoTileProps) {
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
		!!trackReference?.publication?.track &&
		!trackReference.publication.isMuted &&
		isCameraEnabled
	const unavailableLabel = isScreenShare ? "Screen share stopped" : "Camera off"

	return (
		<div
			data-lk-local-participant={isLocal}
			data-lk-speaking={isSpeaking}
			data-testid="participant-video-tile"
			className={[
				"relative flex size-full min-h-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-900 transition-shadow",
				isSpeaking ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-neutral-950" : "",
			].join(" ")}
		>
			{hasLiveVideo && trackReference ? (
				<VideoTrack
					trackRef={trackReference}
					className={[
						"size-full",
						isScreenShare ? "object-contain" : "object-cover",
						isLocal && !isScreenShare ? "[transform:scaleX(-1)]" : "",
					].join(" ")}
				/>
			) : (
				<div
					aria-label={`${displayName} ${unavailableLabel.toLowerCase()}`}
					data-testid="off-camera-placeholder"
					className={[
						"flex size-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_top,rgba(38,38,38,0.9),rgba(10,10,10,1))] p-4 text-center",
					].join(" ")}
				>
					<div
						className={[
							"bg-gradient-to-br text-white shadow-lg",
							gradient,
							"flex items-center justify-center rounded-full font-semibold",
							AVATAR_CLASSES[avatarSize],
						].join(" ")}
					>
						{initials}
					</div>
					<div className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-neutral-200">
						<VideoOff className="size-3.5 text-neutral-300" />
						<span>{unavailableLabel}</span>
					</div>
				</div>
			)}

			<div
				className="pointer-events-none absolute z-10 flex items-center gap-1.5"
				style={{ bottom: "0.5rem", left: "0.5rem", right: "auto", maxWidth: "calc(100% - 1rem)" }}
			>
				<span className="inline-flex max-w-full items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
					{isMicMuted ? (
						<MicOff className="size-3 shrink-0 text-rose-400" />
					) : (
						<Mic className="size-3 shrink-0 text-emerald-400" />
					)}
					{!hasLiveVideo && <VideoOff className="size-3 shrink-0 text-neutral-300" />}
					<span className="truncate">
						{displayName}
						{isLocal ? " (You)" : ""}
						{isScreenShare ? " · Screen" : ""}
					</span>
				</span>
				{role && (
					<span className="shrink-0 rounded bg-black/70 px-1.5 py-1 text-[10px] uppercase tracking-wider text-white backdrop-blur-sm">
						{role}
					</span>
				)}
			</div>
		</div>
	)
}

function ParticipantTrackTile({
	track,
	avatarSize,
}: {
	track: TrackReferenceOrPlaceholder
	avatarSize: AvatarSize
}) {
	return (
		<ParticipantVideoTile
			participant={track.participant}
			source={track.source}
			trackRef={track}
			avatarSize={avatarSize}
		/>
	)
}

function ParticipantFallbackTile({
	participant,
	avatarSize,
}: {
	participant: Participant
	avatarSize: AvatarSize
}) {
	return (
		<ParticipantVideoTile
			participant={participant}
			source={Track.Source.Camera}
			avatarSize={avatarSize}
		/>
	)
}

function EmptyConferenceTile() {
	return (
		<div className="relative flex aspect-video size-full min-h-[320px] max-h-full max-w-4xl items-center justify-center overflow-hidden rounded-xl bg-neutral-900">
			<div className="flex size-24 items-center justify-center rounded-full bg-neutral-800 text-neutral-300 sm:size-32">
				<VideoOff className="size-10 sm:size-12" />
			</div>
		</div>
	)
}

// ============================================================================
// Layout
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

function getGridClass(count: number): string {
	if (count <= 1) return "grid grid-cols-1 place-items-center"
	if (count === 2) return "grid grid-cols-1 sm:grid-cols-2"
	if (count <= 4) return "grid grid-cols-1 sm:grid-cols-2"
	if (count <= 6) return "grid grid-cols-2 md:grid-cols-3"
	return "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
}

function getAvatarSizeFor(count: number, hasScreen: boolean): AvatarSize {
	if (hasScreen) return "sm"
	if (count <= 1) return "lg"
	if (count <= 4) return "md"
	return "sm"
}

function VideoConferenceLayout() {
	const participants = useParticipants()
	const cameraTracks = useTracks(
		[{ source: Track.Source.Camera, withPlaceholder: true }],
		{ onlySubscribed: false }
	)
	const screenTracks = useTracks(
		[{ source: Track.Source.ScreenShare, withPlaceholder: false }],
		{ onlySubscribed: false }
	)
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
	const count = cameraTiles.length
	const gridClass = getGridClass(count)
	const avatarSize = getAvatarSizeFor(count, hasScreen)

	return (
		<div
			data-qhealth-livekit-layout
			className="flex min-h-[520px] flex-1 flex-col bg-neutral-950"
			style={{ minHeight: 520 }}
		>
			<div className="flex min-h-[420px] flex-1 flex-col gap-2 p-2 sm:p-3">
				{hasScreen && (
					<div className="min-h-[280px] flex-1 overflow-hidden rounded-xl border border-neutral-800 bg-black">
						{screenTracks.map(track => (
							<ParticipantTrackTile key={trackKey(track)} track={track} avatarSize="md" />
						))}
					</div>
				)}
				<div
					data-qhealth-livekit-grid
					className={[
						hasScreen
							? "grid h-32 grid-flow-col auto-cols-[minmax(8rem,1fr)] gap-2 sm:h-40"
							: `${gridClass} min-h-[420px] flex-1 gap-2 sm:gap-3`,
					].join(" ")}
				>
					{cameraTiles.length > 0 ? (
						cameraTiles.map(tile => (
							<div
								key={cameraTileKey(tile)}
								className={[
									"relative w-full min-h-[220px]",
									hasScreen
										? "aspect-video"
										: count <= 1
											? "aspect-video min-h-[360px] max-h-full max-w-4xl"
											: "aspect-video",
								].join(" ")}
							>
								{tile.track ? (
									<ParticipantTrackTile track={tile.track} avatarSize={avatarSize} />
								) : (
									<ParticipantFallbackTile
										participant={tile.participant}
										avatarSize={avatarSize}
									/>
								)}
							</div>
						))
					) : (
						<EmptyConferenceTile />
					)}
				</div>
			</div>
			<div className="shrink-0 border-t border-neutral-800 bg-neutral-900">
				<ControlBar variation="verbose" controls={{ chat: false, leave: true }} />
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
}: LiveKitConferenceInnerProps) {
	const audioProp = audioEnabled
		? audioDeviceId
			? { deviceId: audioDeviceId }
			: true
		: false
	const videoProp = videoEnabled
		? videoDeviceId
			? { deviceId: videoDeviceId }
			: true
		: false

	return (
		<div
			className={["qhealth-livekit-room overflow-hidden rounded-lg border bg-black", className]
				.filter(Boolean)
				.join(" ")}
			style={{ minHeight: 520 }}
		>
			<LiveKitRoomProvider
				serverUrl={serverUrl}
				token={token}
				connect={true}
				audio={audioProp}
				video={videoProp}
				onDisconnected={onDisconnected}
				data-lk-theme="default"
				className="qhealth-livekit-custom-room flex min-h-[520px] flex-col"
				style={{ minHeight: 520 }}
			>
				<VideoConferenceLayout />
			</LiveKitRoomProvider>
		</div>
	)
}

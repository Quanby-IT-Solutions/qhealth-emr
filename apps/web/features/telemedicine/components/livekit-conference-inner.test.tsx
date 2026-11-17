import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import LiveKitConferenceInner from "./livekit-conference-inner"

interface MockParticipant {
	identity: string
	sid?: string
	name?: string
	metadata?: string
	joinedAt?: Date
	isLocal?: boolean
	isSpeaking?: boolean
	isMicrophoneEnabled?: boolean
	isCameraEnabled?: boolean
	isScreenShareEnabled?: boolean
	setMicrophoneEnabled?: (enabled: boolean) => Promise<unknown>
	setCameraEnabled?: (enabled: boolean) => Promise<unknown>
	setScreenShareEnabled?: (enabled: boolean, options?: unknown) => Promise<unknown>
}

interface MockTrackReference {
	participant: MockParticipant
	source: string
	publication?: {
		trackSid?: string
		track?: unknown
		isMuted?: boolean
	}
}

const liveKitState = vi.hoisted(() => ({
	connectionState: "connected",
	quality: "good",
	participants: [] as MockParticipant[],
	cameraTracks: [] as MockTrackReference[],
	screenTracks: [] as MockTrackReference[],
	localParticipant: undefined as MockParticipant | undefined,
	room: {
		disconnect: vi.fn(),
	},
}))

vi.mock("framer-motion", async () => {
	const React = await import("react")

	const MotionDiv = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
		(
			{
				children,
				layoutId: _layoutId,
				initial: _initial,
				animate: _animate,
				exit: _exit,
				transition: _transition,
				drag: _drag,
				dragConstraints: _dragConstraints,
				dragElastic: _dragElastic,
				dragMomentum: _dragMomentum,
				whileHover: _whileHover,
				whileTap: _whileTap,
				...props
			},
			ref
		) => (
			<div ref={ref} {...props}>
				{children as React.ReactNode}
			</div>
		)
	)
	MotionDiv.displayName = "MotionDiv"

	return {
		AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
		motion: {
			div: MotionDiv,
		},
		useAnimationControls: () => ({ start: vi.fn() }),
	}
})

vi.mock("livekit-client", () => ({
	ConnectionQuality: {
		Excellent: "excellent",
		Good: "good",
		Poor: "poor",
		Lost: "lost",
		Unknown: "unknown",
	},
	ConnectionState: {
		Connected: "connected",
		Connecting: "connecting",
		Reconnecting: "reconnecting",
	},
	Track: {
		Source: {
			Camera: "camera",
			Microphone: "microphone",
			ScreenShare: "screen_share",
		},
	},
}))

vi.mock("@livekit/components-react", async () => {
	const React = await import("react")

	return {
		ConnectionStateToast: () => <div data-testid="connection-state-toast" />,
		LiveKitRoom: ({
			children,
			className,
			style,
		}: {
			children?: React.ReactNode
			className?: string
			style?: React.CSSProperties
		}) => (
			<div data-testid="livekit-room" className={className} style={style}>
				{children}
			</div>
		),
		MediaDeviceSelect: ({ kind }: { kind: string }) => (
			<ul data-testid={`media-device-select-${kind}`} />
		),
		RoomAudioRenderer: () => <div data-testid="room-audio-renderer" />,
		VideoTrack: () => <video data-testid="live-video-track" />,
		isTrackReference: (track: MockTrackReference) => Boolean(track.publication),
		useConnectionQualityIndicator: () => ({ quality: liveKitState.quality }),
		useConnectionState: () => liveKitState.connectionState,
		useChat: () => ({
			chatMessages: [],
			send: vi.fn().mockResolvedValue(undefined),
			isSending: false,
		}),
		useLocalParticipant: () => {
			const localParticipant =
				liveKitState.localParticipant ??
				liveKitState.participants.find(participant => participant.isLocal)

			return {
				localParticipant,
				isMicrophoneEnabled: localParticipant?.isMicrophoneEnabled ?? false,
				isCameraEnabled: localParticipant?.isCameraEnabled ?? false,
				isScreenShareEnabled: localParticipant?.isScreenShareEnabled ?? false,
			}
		},
		useParticipants: () => liveKitState.participants,
		useRoomContext: () => liveKitState.room,
		useTracks: (sources: Array<{ source: string }>) => {
			const source = sources[0]?.source
			return source === "screen_share" ? liveKitState.screenTracks : liveKitState.cameraTracks
		},
	}
})

function buildParticipant(overrides: Partial<MockParticipant> = {}): MockParticipant {
	return {
		identity: "clinician-1",
		sid: "sid-clinician-1",
		name: "Dr. Miguel Santos",
		metadata: JSON.stringify({ role: "clinician" }),
		joinedAt: new Date("2026-05-22T00:00:00.000Z"),
		isLocal: true,
		isSpeaking: false,
		isMicrophoneEnabled: false,
		isCameraEnabled: false,
		isScreenShareEnabled: false,
		setMicrophoneEnabled: vi.fn().mockResolvedValue(undefined),
		setCameraEnabled: vi.fn().mockResolvedValue(undefined),
		setScreenShareEnabled: vi.fn().mockResolvedValue(undefined),
		...overrides,
	}
}

function renderRoom() {
	return render(
		<LiveKitConferenceInner
			token="token"
			serverUrl="wss://livekit.test"
			audioEnabled={true}
			videoEnabled={true}
		/>
	)
}

describe("LiveKitConferenceInner", () => {
	beforeEach(() => {
		liveKitState.connectionState = "connected"
		liveKitState.quality = "good"
		liveKitState.participants = []
		liveKitState.cameraTracks = []
		liveKitState.screenTracks = []
		liveKitState.localParticipant = undefined
		liveKitState.room.disconnect.mockClear()
		window.localStorage.clear()
	})

	it("keeps the spotlight stage visible with a participant placeholder when camera is off", () => {
		const participant = buildParticipant()
		liveKitState.localParticipant = participant
		liveKitState.participants = [participant]
		liveKitState.cameraTracks = [{ participant, source: "camera" }]

		renderRoom()

		expect(screen.getByTestId("livekit-room")).toHaveStyle({ minHeight: "560px" })
		expect(screen.getByTestId("livekit-room")).toHaveClass("juanmeds-livekit-custom-room")
		expect(screen.getByTestId("livekit-spotlight-stage")).toBeVisible()
		expect(screen.getByTestId("main-video-stage")).toBeVisible()
		expect(screen.getByTestId("participant-video-tile")).toBeVisible()
		expect(screen.getByTestId("off-camera-placeholder")).toHaveAccessibleName(
			/dr\. miguel santos camera off/i
		)
		expect(screen.getByText("Camera off")).toBeVisible()
		expect(screen.getByTestId("floating-control-dock")).toBeVisible()
		expect(screen.getByTestId("consultation-timer")).toHaveTextContent("Waiting for patient")
		expect(screen.getByTestId("network-quality-badge")).toHaveAccessibleName(
			/connection quality good/i
		)
	})

	it("puts the remote participant in the main spotlight and local participant in PiP", () => {
		const clinician = buildParticipant({
			isMicrophoneEnabled: true,
			isCameraEnabled: true,
		})
		const patient = buildParticipant({
			identity: "patient-1",
			sid: "sid-patient-1",
			name: "Juan Dela Cruz",
			metadata: JSON.stringify({ role: "patient" }),
			isLocal: false,
			isMicrophoneEnabled: true,
			isCameraEnabled: true,
		})
		liveKitState.localParticipant = clinician
		liveKitState.participants = [clinician, patient]
		liveKitState.cameraTracks = [
			{
				participant: clinician,
				source: "camera",
				publication: { trackSid: "track-clinician", track: {}, isMuted: false },
			},
			{
				participant: patient,
				source: "camera",
				publication: { trackSid: "track-patient", track: {}, isMuted: false },
			},
		]

		renderRoom()

		expect(
			within(screen.getByTestId("main-video-stage")).getByText(/juan dela cruz/i)
		).toBeVisible()
		expect(
			within(screen.getByTestId("floating-self-view")).getByText(/dr\. miguel santos \(you\)/i)
		).toBeVisible()
		expect(screen.getByRole("button", { name: /mute microphone/i })).toHaveAttribute(
			"aria-pressed",
			"true"
		)
		expect(screen.getByRole("button", { name: /turn camera off/i })).toHaveAttribute(
			"aria-pressed",
			"true"
		)
		expect(screen.getByRole("button", { name: /share screen/i })).toBeVisible()
		expect(screen.getByRole("button", { name: /microphone device options/i })).toBeVisible()
		expect(screen.getByRole("button", { name: /camera device options/i })).toBeVisible()
		expect(screen.getByRole("button", { name: /end call/i })).toBeVisible()
	})

	it("renders live video instead of the placeholder when an unmuted camera track exists", () => {
		const participant = buildParticipant({ isCameraEnabled: true })
		liveKitState.localParticipant = participant
		liveKitState.participants = [participant]
		liveKitState.cameraTracks = [
			{
				participant,
				source: "camera",
				publication: {
					trackSid: "track-camera-1",
					track: {},
					isMuted: false,
				},
			},
		]

		renderRoom()

		expect(screen.getByTestId("live-video-track")).toBeVisible()
		expect(screen.queryByTestId("off-camera-placeholder")).not.toBeInTheDocument()
	})

	it("uses the screen share as the main stage and moves cameras into a bottom strip", () => {
		const clinician = buildParticipant({ isCameraEnabled: true })
		const patient = buildParticipant({
			identity: "patient-1",
			sid: "sid-patient-1",
			name: "Juan Dela Cruz",
			isLocal: false,
			isCameraEnabled: true,
		})
		liveKitState.localParticipant = clinician
		liveKitState.participants = [clinician, patient]
		liveKitState.cameraTracks = [
			{ participant: clinician, source: "camera" },
			{ participant: patient, source: "camera" },
		]
		liveKitState.screenTracks = [
			{
				participant: clinician,
				source: "screen_share",
				publication: { trackSid: "screen-1", track: {}, isMuted: false },
			},
		]

		renderRoom()

		expect(screen.getByTestId("screen-share-stage")).toBeVisible()
		expect(screen.getByTestId("screen-share-camera-strip")).toBeVisible()
		expect(screen.queryByTestId("floating-self-view")).not.toBeInTheDocument()
		expect(screen.getByTestId("floating-control-dock")).toBeVisible()
	})

	it("toggles microphone and camera with keyboard shortcuts", async () => {
		const setMicrophoneEnabled = vi.fn().mockResolvedValue(undefined)
		const setCameraEnabled = vi.fn().mockResolvedValue(undefined)
		const clinician = buildParticipant({
			setMicrophoneEnabled,
			setCameraEnabled,
		})
		liveKitState.localParticipant = clinician
		liveKitState.participants = [clinician]
		liveKitState.cameraTracks = [{ participant: clinician, source: "camera" }]

		renderRoom()

		fireEvent.keyDown(window, { key: "m" })
		fireEvent.keyDown(window, { key: "v" })

		await waitFor(() => {
			expect(setMicrophoneEnabled).toHaveBeenCalledWith(true)
			expect(setCameraEnabled).toHaveBeenCalledWith(true)
		})
	})

	it("routes dock button clicks to LiveKit local participant controls", async () => {
		const setMicrophoneEnabled = vi.fn().mockResolvedValue(undefined)
		const setCameraEnabled = vi.fn().mockResolvedValue(undefined)
		const setScreenShareEnabled = vi.fn().mockResolvedValue(undefined)
		const clinician = buildParticipant({
			setMicrophoneEnabled,
			setCameraEnabled,
			setScreenShareEnabled,
		})
		liveKitState.localParticipant = clinician
		liveKitState.participants = [clinician]
		liveKitState.cameraTracks = [{ participant: clinician, source: "camera" }]

		renderRoom()

		fireEvent.click(screen.getByRole("button", { name: /unmute microphone/i }))
		fireEvent.click(screen.getByRole("button", { name: /turn camera on/i }))
		fireEvent.click(screen.getByRole("button", { name: /share screen/i }))

		await waitFor(() => {
			expect(setMicrophoneEnabled).toHaveBeenCalledWith(true)
			expect(setCameraEnabled).toHaveBeenCalledWith(true)
			expect(setScreenShareEnabled).toHaveBeenCalledWith(
				true,
				expect.objectContaining({ audio: true, selfBrowserSurface: "include" })
			)
		})
	})

	it("opens device settings and confirms end-call disconnect from the dock", async () => {
		const clinician = buildParticipant()
		liveKitState.localParticipant = clinician
		liveKitState.participants = [clinician]
		liveKitState.cameraTracks = [{ participant: clinician, source: "camera" }]

		renderRoom()

		fireEvent.click(screen.getByRole("button", { name: /microphone device options/i }))
		expect(await screen.findByText("Microphone")).toBeVisible()
		expect(screen.getByText(/choose which device to use in this call/i)).toBeVisible()
		expect(screen.getByText(/no microphone found/i)).toBeVisible()

		fireEvent.click(screen.getByRole("button", { name: /end call/i }))
		expect(screen.getByText(/end this video call/i)).toBeVisible()

		const endCallButtons = screen.getAllByRole("button", { name: /end call/i })
		fireEvent.click(endCallButtons[endCallButtons.length - 1]!)

		await waitFor(() => {
			expect(liveKitState.room.disconnect).toHaveBeenCalled()
		})
	})

	it("shows a visible control error when a LiveKit toggle fails", async () => {
		const setCameraEnabled = vi.fn().mockRejectedValue(new Error("Camera permission blocked"))
		const clinician = buildParticipant({ setCameraEnabled })
		liveKitState.localParticipant = clinician
		liveKitState.participants = [clinician]
		liveKitState.cameraTracks = [{ participant: clinician, source: "camera" }]

		renderRoom()

		fireEvent.click(screen.getByRole("button", { name: /turn camera on/i }))

		expect(await screen.findByRole("alert")).toHaveTextContent("Camera permission blocked")
	})

	it("renders the waiting room overlay with self-view PIP and no duplicate main stage", () => {
		const clinician = buildParticipant()
		liveKitState.localParticipant = clinician
		liveKitState.participants = [clinician]
		liveKitState.cameraTracks = [{ participant: clinician, source: "camera" }]

		render(
			<LiveKitConferenceInner
				token="token"
				serverUrl="wss://livekit.test"
				audioEnabled={true}
				videoEnabled={true}
				waitingRoom={{
					patientName: "Juan Dela Cruz",
					inviteUrl: "https://invite.test/abc",
				}}
			/>
		)

		const overlay = screen.getByTestId("waiting-room-overlay")
		expect(overlay).toBeVisible()
		expect(within(overlay).getByText(/waiting for juan dela cruz to join/i)).toBeVisible()
		expect(within(overlay).getByText(/automatically once connected/i)).toBeVisible()
		expect(within(overlay).getByRole("button", { name: /copy patient join link/i })).toBeVisible()
		expect(screen.queryByTestId("main-video-stage")).not.toBeInTheDocument()
		expect(screen.getByTestId("floating-self-view")).toBeVisible()
		expect(screen.getByTestId("consultation-timer")).toBeVisible()
		expect(screen.getByTestId("network-quality-badge")).toBeVisible()
		expect(screen.getByTestId("floating-control-dock")).toBeVisible()
	})
})

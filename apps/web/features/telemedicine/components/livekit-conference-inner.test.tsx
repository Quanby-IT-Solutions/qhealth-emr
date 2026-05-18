import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import LiveKitConferenceInner from "./livekit-conference-inner"

interface MockParticipant {
	identity: string
	sid?: string
	name?: string
	metadata?: string
	isLocal?: boolean
	isSpeaking?: boolean
	isMicrophoneEnabled?: boolean
	isCameraEnabled?: boolean
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
	participants: [] as MockParticipant[],
	cameraTracks: [] as MockTrackReference[],
	screenTracks: [] as MockTrackReference[],
}))

vi.mock("livekit-client", () => ({
	Track: {
		Source: {
			Camera: "camera",
			ScreenShare: "screen_share",
		},
	},
}))

vi.mock("@livekit/components-react", async () => {
	const React = await import("react")

	return {
		ConnectionStateToast: () => <div data-testid="connection-state-toast" />,
		ControlBar: () => <div data-testid="control-bar" />,
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
		RoomAudioRenderer: () => <div data-testid="room-audio-renderer" />,
		VideoTrack: () => <video data-testid="live-video-track" />,
		isTrackReference: (track: MockTrackReference) => Boolean(track.publication),
		useParticipants: () => liveKitState.participants,
		useTracks: (sources: Array<{ source: string }>) => {
			const source = sources[0]?.source
			return source === "screen_share"
				? liveKitState.screenTracks
				: liveKitState.cameraTracks
		},
	}
})

function buildParticipant(overrides: Partial<MockParticipant> = {}): MockParticipant {
	return {
		identity: "clinician-1",
		sid: "sid-clinician-1",
		name: "Dr. Miguel Santos",
		isLocal: true,
		isSpeaking: false,
		isMicrophoneEnabled: false,
		isCameraEnabled: false,
		...overrides,
	}
}

describe("LiveKitConferenceInner", () => {
	beforeEach(() => {
		liveKitState.participants = []
		liveKitState.cameraTracks = []
		liveKitState.screenTracks = []
	})

	it("keeps the call stage visible with a participant placeholder when camera is off", () => {
		const participant = buildParticipant()
		liveKitState.participants = [participant]
		liveKitState.cameraTracks = [{ participant, source: "camera" }]

		render(
			<LiveKitConferenceInner
				token="token"
				serverUrl="wss://livekit.test"
				audioEnabled={false}
				videoEnabled={false}
			/>
		)

		expect(screen.getByTestId("livekit-room")).toHaveStyle({ minHeight: "520px" })
		expect(screen.getByTestId("livekit-room")).toHaveClass("qhealth-livekit-custom-room")
		expect(screen.getByTestId("participant-video-tile")).toBeVisible()
		expect(screen.getByTestId("off-camera-placeholder")).toHaveAccessibleName(
			/dr\. miguel santos camera off/i
		)
		expect(screen.getByText("Camera off")).toBeVisible()
		expect(screen.getByTestId("control-bar")).toBeVisible()
	})

	it("renders live video instead of the placeholder when an unmuted camera track exists", () => {
		const participant = buildParticipant({ isCameraEnabled: true })
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

		render(
			<LiveKitConferenceInner
				token="token"
				serverUrl="wss://livekit.test"
				audioEnabled={true}
				videoEnabled={true}
			/>
		)

		expect(screen.getByTestId("live-video-track")).toBeVisible()
		expect(screen.queryByTestId("off-camera-placeholder")).not.toBeInTheDocument()
	})
})

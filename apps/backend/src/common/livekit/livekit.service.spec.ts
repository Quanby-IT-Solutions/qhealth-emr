import { ServiceUnavailableException } from "@nestjs/common"
import { TokenVerifier } from "livekit-server-sdk"

describe("LiveKitService", () => {
	afterEach(() => {
		jest.resetModules()
		jest.dontMock("@/config/env.config")
	})

	it("reports unconfigured and does not generate tokens without credentials", async () => {
		jest.doMock("@/config/env.config", () => ({
			env: {
				LIVEKIT_MODE: "mock",
				LIVEKIT_API_KEY: "",
				LIVEKIT_API_SECRET: "",
				LIVEKIT_WS_URL: "",
			},
		}))

		const { LiveKitService } = await import("./livekit.service")
		const service = new LiveKitService()

		expect(service.isConfigured()).toBe(false)
		await expect(
			service.generateToken({
				roomName: "telemed-appointment",
				identity: "clinician:staff-profile",
				name: "Dr. Reyes",
				role: "clinician",
				appointmentId: "appointment",
			})
		).rejects.toThrow(ServiceUnavailableException)
	})

	it("generates room join tokens with role metadata and display name", async () => {
		const apiKey = "devkey"
		const apiSecret = "secretsecret"
		const roomName = "telemed-550e8400-e29b-41d4-a716-446655440000"
		const appointmentId = "550e8400-e29b-41d4-a716-446655440000"
		const participantIdentity = "clinician:550e8400-e29b-41d4-a716-446655440002"

		jest.doMock("@/config/env.config", () => ({
			env: {
				LIVEKIT_MODE: "real",
				LIVEKIT_API_KEY: apiKey,
				LIVEKIT_API_SECRET: apiSecret,
				LIVEKIT_WS_URL: "wss://livekit.example.test",
			},
		}))

		const { LiveKitService } = await import("./livekit.service")
		const service = new LiveKitService()

		const token = await service.generateToken({
			roomName,
			identity: participantIdentity,
			name: "Dr. Reyes",
			role: "clinician",
			appointmentId,
			ttl: "90m",
		})
		const verifier = new TokenVerifier(apiKey, apiSecret)
		const claims = await verifier.verify(token)
		const payload = JSON.parse(Buffer.from(token.split(".")[1]!, "base64url").toString("utf8")) as {
			exp: number
			nbf: number
			sub: string
			name: string
			metadata: string
			attributes: Record<string, string>
		}

		expect(service.isConfigured()).toBe(true)
		expect(service.getRoomName("appointment-id")).toBe("telemed-appointment-id")
		expect(payload.sub).toBe(participantIdentity)
		expect(payload.name).toBe("Dr. Reyes")
		expect(JSON.parse(payload.metadata)).toEqual({ role: "clinician", appointmentId })
		expect(payload.attributes).toEqual({ role: "clinician", appointmentId })
		expect(payload.exp - payload.nbf).toBe(5400)
		expect(claims.video).toMatchObject({
			roomJoin: true,
			canPublish: true,
			canPublishSources: ["camera", "microphone", "screen_share", "screen_share_audio"],
			canSubscribe: true,
			room: roomName,
		})
	})

	it("limits patient publish grants to camera and microphone", async () => {
		const apiKey = "devkey"
		const apiSecret = "secretsecret"

		jest.doMock("@/config/env.config", () => ({
			env: {
				LIVEKIT_MODE: "real",
				LIVEKIT_API_KEY: apiKey,
				LIVEKIT_API_SECRET: apiSecret,
				LIVEKIT_WS_URL: "wss://livekit.example.test",
			},
		}))

		const { LiveKitService } = await import("./livekit.service")
		const service = new LiveKitService()

		const token = await service.generateToken({
			roomName: "telemed-appointment",
			identity: "patient:appointment",
			name: "Juan Dela Cruz",
			role: "patient",
			appointmentId: "appointment",
		})
		const verifier = new TokenVerifier(apiKey, apiSecret)
		const claims = await verifier.verify(token)

		expect(claims.video).toMatchObject({
			canPublishSources: ["camera", "microphone"],
		})
	})
})

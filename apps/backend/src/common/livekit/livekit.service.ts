import { Injectable, ServiceUnavailableException } from "@nestjs/common"
import { AccessToken, TrackSource, WebhookReceiver, type WebhookEvent } from "livekit-server-sdk"

import { env } from "@/config/env.config"

export type LiveKitParticipantRole = "clinician" | "patient"

export interface GenerateLiveKitTokenInput {
	roomName: string
	identity: string
	name: string
	role: LiveKitParticipantRole
	appointmentId: string
	ttl?: number | string
}

@Injectable()
export class LiveKitService {
	private webhookReceiver: WebhookReceiver | null = null

	isConfigured(): boolean {
		return Boolean(
			env.LIVEKIT_MODE === "real" &&
			env.LIVEKIT_API_KEY?.trim() &&
			env.LIVEKIT_API_SECRET?.trim() &&
			env.LIVEKIT_WS_URL?.trim()
		)
	}

	async verifyWebhook(body: string, authHeader: string | undefined): Promise<WebhookEvent> {
		const apiKey = env.LIVEKIT_API_KEY?.trim()
		const apiSecret = env.LIVEKIT_API_SECRET?.trim()

		if (!apiKey || !apiSecret) {
			throw new ServiceUnavailableException("LiveKit is not configured on this server.")
		}

		if (!this.webhookReceiver) {
			this.webhookReceiver = new WebhookReceiver(apiKey, apiSecret)
		}

		return this.webhookReceiver.receive(body, authHeader)
	}

	async generateToken(input: GenerateLiveKitTokenInput): Promise<string> {
		const apiKey = env.LIVEKIT_API_KEY?.trim()
		const apiSecret = env.LIVEKIT_API_SECRET?.trim()

		if (!this.isConfigured() || !apiKey || !apiSecret) {
			throw new ServiceUnavailableException("LiveKit is not configured on this server.")
		}

		const accessToken = new AccessToken(apiKey, apiSecret, {
			identity: input.identity,
			name: input.name,
			ttl: input.ttl ?? "2h",
			metadata: JSON.stringify({
				role: input.role,
				appointmentId: input.appointmentId,
			}),
			attributes: {
				role: input.role,
				appointmentId: input.appointmentId,
			},
		})
		accessToken.addGrant({
			roomJoin: true,
			canPublish: true,
			canPublishSources:
				input.role === "clinician"
					? [
							TrackSource.CAMERA,
							TrackSource.MICROPHONE,
							TrackSource.SCREEN_SHARE,
							TrackSource.SCREEN_SHARE_AUDIO,
						]
					: [TrackSource.CAMERA, TrackSource.MICROPHONE],
			canSubscribe: true,
			room: input.roomName,
		})

		return accessToken.toJwt()
	}

	getRoomName(appointmentId: string): string {
		return `telemed-${appointmentId}`
	}
}

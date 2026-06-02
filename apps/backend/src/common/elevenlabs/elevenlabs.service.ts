import {
	BadGatewayException,
	Injectable,
	Logger,
	ServiceUnavailableException,
} from "@nestjs/common"

import { env } from "@/config/env.config"

@Injectable()
export class ElevenLabsService {
	private readonly logger = new Logger(ElevenLabsService.name)

	isConfigured(): boolean {
		return Boolean(env.ELEVENLABS_API_KEY?.trim())
	}

	async transcribeAudio(buffer: Buffer, mimeType: string): Promise<{ text: string }> {
		if (!this.isConfigured()) {
			throw new ServiceUnavailableException("Speech-to-text is not configured on this server.")
		}

		const apiKey = env.ELEVENLABS_API_KEY!.trim()
		const formData = new FormData()
		formData.append("file", new Blob([buffer], { type: mimeType }), "audio.webm")
		formData.append("model_id", "scribe_v2")
		formData.append("enable_logging", "false")

		this.logger.log("ElevenLabs STT request sent")

		let response: Response
		try {
			response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
				method: "POST",
				headers: { "xi-api-key": apiKey },
				body: formData,
			})
		} catch {
			this.logger.warn("ElevenLabs STT request failed")
			throw new BadGatewayException("Speech-to-text service error. Please try again.")
		}

		if (!response.ok) {
			this.logger.warn(`ElevenLabs STT returned ${response.status}`)
			throw new BadGatewayException("Speech-to-text service error. Please try again.")
		}

		let data: { text?: unknown }
		try {
			data = (await response.json()) as { text?: unknown }
		} catch {
			this.logger.warn("ElevenLabs STT returned malformed JSON")
			throw new BadGatewayException("Speech-to-text service error. Please try again.")
		}

		if (typeof data.text !== "string") {
			this.logger.warn("ElevenLabs STT response missing text field")
			throw new BadGatewayException("Speech-to-text service error. Please try again.")
		}

		this.logger.log("ElevenLabs STT response received")
		return { text: data.text }
	}
}

import {
	BadGatewayException,
	Injectable,
	Logger,
	ServiceUnavailableException,
} from "@nestjs/common"

import { env } from "@/config/env.config"

import type {
	FaceScanRequest,
	FaceScanResponse,
	InsightGenieAuthResponse,
} from "./insight-genie.types"

@Injectable()
export class InsightGenieService {
	private readonly logger = new Logger(InsightGenieService.name)
	private cachedTokenPromise: Promise<string> | null = null

	isEnabled(): boolean {
		return env.FACE_SCAN_ENABLED && this.isConfigured()
	}

	isConfigured(): boolean {
		return Boolean(env.INSIGHT_GENIE_API_KEY?.trim() && env.INSIGHT_GENIE_API_SECRET?.trim())
	}

	private getBaseUrl(): string {
		return (env.INSIGHT_GENIE_BASE_URL ?? "https://api.insightgenie.ai").replace(/\/$/, "")
	}

	async authenticateInstitution(): Promise<string> {
		if (!this.isConfigured()) {
			throw new ServiceUnavailableException("Face scan is not configured on this server.")
		}

		if (this.cachedTokenPromise) {
			return this.cachedTokenPromise
		}

		const baseURL = this.getBaseUrl()
		const apiKey = env.INSIGHT_GENIE_API_KEY!.trim()
		const apiSecret = env.INSIGHT_GENIE_API_SECRET!.trim()

		this.cachedTokenPromise = (async () => {
			let response: Response
			try {
				response = await fetch(`${baseURL}/auth/authenticate`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ key: apiKey, secret: apiSecret }),
				})
			} catch {
				this.cachedTokenPromise = null
				this.logger.warn("Insight-Genie auth request failed")
				throw new BadGatewayException("Face scan service error. Please try again.")
			}

			if (!response.ok) {
				this.cachedTokenPromise = null
				this.logger.warn(`Insight-Genie auth returned ${response.status}`)
				throw new BadGatewayException("Face scan service error. Please try again.")
			}

			let data: InsightGenieAuthResponse
			try {
				data = (await response.json()) as InsightGenieAuthResponse
			} catch {
				this.cachedTokenPromise = null
				throw new BadGatewayException("Face scan service error. Please try again.")
			}

			if (!data.token) {
				this.cachedTokenPromise = null
				throw new BadGatewayException("Face scan service error. Please try again.")
			}

			return data.token
		})()

		return this.cachedTokenPromise
	}

	createDefaultRequest(
		clientId: string,
		options?: { age?: number; gender?: string }
	): FaceScanRequest {
		const request: FaceScanRequest = {
			clientId,
			showResults: "display",
			noDesign: false,
			faceOutline: true,
			buttonBgColor: "#4068B8",
			buttonTextColor: "#ffffff",
			isVoiceAnalysisOn: false,
			forceFrontCamera: true,
			language: "en",
			showDisclaimer: true,
		}

		if (options?.age !== undefined) request.age = options.age
		if (options?.gender !== undefined) request.gender = options.gender

		return request
	}

	/** IG requires every diabetesHypertensionParameters field if present; pass height/weight via URL. */
	appendIframeDemographics(
		videoIframeUrl: string,
		options?: {
			age?: number
			gender?: string
			smoking?: boolean
			heightCm?: number
			weightKg?: number
		}
	): string {
		const url = new URL(videoIframeUrl)

		if (options?.heightCm !== undefined) {
			url.searchParams.set("height", String(Math.round(options.heightCm)))
		}
		if (options?.weightKg !== undefined) {
			url.searchParams.set("weight", String(Math.round(options.weightKg)))
		}

		const age = options?.age ?? 30
		const sex = options?.gender ?? "male"
		const smoking = options?.smoking ?? false
		url.searchParams.set("age", String(Math.round(age)))
		url.searchParams.set("sex", sex)
		url.searchParams.set("smoking", String(smoking))

		return url.toString()
	}

	private clearAuthCache(): void {
		this.cachedTokenPromise = null
	}

	private async fetchVideoToken(
		baseURL: string,
		authToken: string,
		request: FaceScanRequest
	): Promise<Response> {
		return fetch(`${baseURL}/face-scan/generate-video-token`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${authToken}`,
			},
			body: JSON.stringify(request),
		})
	}

	async generateVideoToken(
		request: FaceScanRequest,
		iframeOptions?: {
			age?: number
			gender?: string
			smoking?: boolean
			heightCm?: number
			weightKg?: number
		}
	): Promise<FaceScanResponse> {
		if (!this.isEnabled()) {
			throw new ServiceUnavailableException("Face scan is not available.")
		}

		const token = await this.authenticateInstitution()
		const baseURL = this.getBaseUrl()

		let response: Response
		try {
			response = await this.fetchVideoToken(baseURL, token, request)
			if (response.status === 401) {
				this.clearAuthCache()
				const refreshedToken = await this.authenticateInstitution()
				response = await this.fetchVideoToken(baseURL, refreshedToken, request)
			}
		} catch (err) {
			if (err instanceof BadGatewayException || err instanceof ServiceUnavailableException) {
				throw err
			}
			this.logger.warn("Insight-Genie generateVideoToken request failed")
			throw new BadGatewayException("Face scan service error. Please try again.")
		}

		if (!response.ok) {
			const errorText = await response.text().catch(() => "")
			this.logger.warn(
				`Insight-Genie generateVideoToken returned ${response.status}: ${errorText.slice(0, 500)}`
			)
			throw new BadGatewayException("Face scan service error. Please try again.")
		}

		let data: FaceScanResponse & { failureMessage?: string[] }
		try {
			data = (await response.json()) as FaceScanResponse & { failureMessage?: string[] }
		} catch {
			throw new BadGatewayException("Face scan service error. Please try again.")
		}

		if (!data.success || !data.videoIframeUrl) {
			const detail = data.failureMessage?.length
				? data.failureMessage.join("; ")
				: "Face scan service did not return a video URL."
			this.logger.warn(`Insight-Genie generateVideoToken failed: ${detail}`)
			throw new BadGatewayException("Face scan service error. Please try again.")
		}

		return {
			success: data.success,
			videoIframeUrl: this.appendIframeDemographics(data.videoIframeUrl, iframeOptions),
		}
	}
}

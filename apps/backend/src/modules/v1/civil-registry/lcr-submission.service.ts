import { BadRequestException, Injectable, Logger } from "@nestjs/common"
import { eq } from "drizzle-orm"

import { birthRegistrations, deathCertificateRegistrations, lcrTracking } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { FileStorageService } from "@/common/file-storage/file-storage.service"
import { env } from "@/config/env.config"

export interface LcrSubmissionResult {
	success: boolean
	acknowledgementNumber?: string
	referenceNumber?: string
	error?: string
}

@Injectable()
export class LcrSubmissionService {
	private readonly logger = new Logger(LcrSubmissionService.name)

	constructor(private readonly fileStorageService: FileStorageService) {}

	async submitBirthCertificate(registrationId: string): Promise<LcrSubmissionResult> {
		const { tracking } = await this.getReadyTracking(registrationId)
		const [registration] = await db
			.select()
			.from(birthRegistrations)
			.where(eq(birthRegistrations.id, registrationId))
			.limit(1)

		if (!registration) throw new BadRequestException("Birth registration not found")
		if (!registration.releasedAt) {
			throw new BadRequestException("Birth certificate must be released before submission")
		}

		return this.submitToLcr("/birth-certificates/submit", {
			registrationId: registration.id,
			certificateNumber: registration.certificateNumber,
			facilityId: registration.facilityId,
			patientId: registration.patientId,
			birthDatetime: registration.birthDatetime.toISOString(),
			pdfUrl: await this.fileStorageService.getArtifactSignedUrl(tracking.pdfUrl!, 3600),
			xmlUrl: await this.fileStorageService.getArtifactSignedUrl(tracking.xmlUrl!, 3600),
		})
	}

	async submitDeathCertificate(registrationId: string): Promise<LcrSubmissionResult> {
		const { tracking } = await this.getReadyTracking(registrationId)
		const [registration] = await db
			.select()
			.from(deathCertificateRegistrations)
			.where(eq(deathCertificateRegistrations.id, registrationId))
			.limit(1)

		if (!registration) throw new BadRequestException("Death certificate registration not found")
		if (!registration.releasedAt) {
			throw new BadRequestException("Death certificate must be released before submission")
		}

		return this.submitToLcr("/death-certificates/submit", {
			registrationId: registration.id,
			certificateNumber: registration.certificateNumber,
			facilityId: registration.facilityId,
			patientId: registration.patientId,
			deathDatetime: registration.deathDatetime.toISOString(),
			pdfUrl: await this.fileStorageService.getArtifactSignedUrl(tracking.pdfUrl!, 3600),
			xmlUrl: await this.fileStorageService.getArtifactSignedUrl(tracking.xmlUrl!, 3600),
		})
	}

	private async getReadyTracking(registrationId: string) {
		const [tracking] = await db
			.select()
			.from(lcrTracking)
			.where(eq(lcrTracking.sourceRecordId, registrationId))
			.limit(1)

		if (!tracking) throw new BadRequestException("LCR tracking record not found")
		if (
			tracking.pdfStatus !== "generated" ||
			tracking.xmlStatus !== "generated" ||
			!tracking.pdfUrl?.trim() ||
			!tracking.xmlUrl?.trim()
		) {
			throw new BadRequestException("PDF and XML artifacts must be generated before submission")
		}

		return { tracking }
	}

	private async submitToLcr(
		path: string,
		payload: Record<string, unknown>
	): Promise<LcrSubmissionResult> {
		if (!env.LCR_API_ENABLED) {
			const timestamp = Date.now()
			this.logger.warn("LCR API is disabled. Recording manual submission acknowledgement.")
			return {
				success: true,
				acknowledgementNumber: `MANUAL-${timestamp}`,
				referenceNumber: `REF-${timestamp}`,
			}
		}

		if (!env.LCR_API_BASE_URL || !env.LCR_API_KEY) {
			throw new BadRequestException("LCR API is enabled but base URL or API key is missing")
		}

		try {
			const controller = new AbortController()
			const timeout = setTimeout(() => controller.abort(), env.LCR_API_TIMEOUT_MS)
			const response = await fetch(new URL(path, env.LCR_API_BASE_URL), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-API-Key": env.LCR_API_KEY,
				},
				body: JSON.stringify(payload),
				signal: controller.signal,
			})
			clearTimeout(timeout)

			const data = (await response.json().catch(() => ({}))) as {
				acknowledgementNumber?: string
				referenceNumber?: string
				error?: string
			}
			if (!response.ok) {
				return { success: false, error: data.error ?? `LCR API returned HTTP ${response.status}` }
			}

			return {
				success: true,
				acknowledgementNumber: data.acknowledgementNumber,
				referenceNumber: data.referenceNumber,
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown LCR submission error",
			}
		}
	}
}

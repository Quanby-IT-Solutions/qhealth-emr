import { BadRequestException, Injectable, Logger } from "@nestjs/common"

import { env } from "@/config/env.config"

import { LocalStorageProvider } from "./storage-providers/local-storage.provider"
import { S3StorageProvider } from "./storage-providers/s3-storage.provider"
import type {
	StorageProvider,
	StorageProviderMetadata,
} from "./storage-providers/storage-provider.interface"

export type LcrCertificateType = "birth" | "death"
export type LcrArtifactType = "pdf" | "xml"

export interface UploadLcrArtifactOptions {
	facilityId: string
	certificateType: LcrCertificateType
	registrationId: string
	artifactType: LcrArtifactType
	year: number
}

@Injectable()
export class FileStorageService {
	private readonly logger = new Logger(FileStorageService.name)
	private readonly provider: StorageProvider

	constructor(
		private readonly localStorageProvider: LocalStorageProvider,
		private readonly s3StorageProvider: S3StorageProvider
	) {
		this.provider =
			env.FILE_STORAGE_TYPE === "s3" ? this.s3StorageProvider : this.localStorageProvider
		this.logger.log(`File storage initialized with provider: ${env.FILE_STORAGE_TYPE}`)
	}

	async uploadLcrArtifact(buffer: Buffer, options: UploadLcrArtifactOptions): Promise<string> {
		const key = this.buildLcrArtifactKey(options)
		const contentType = options.artifactType === "pdf" ? "application/pdf" : "application/xml"

		return this.provider.upload(buffer, key, {
			contentType,
			metadata: {
				facilityId: options.facilityId,
				certificateType: options.certificateType,
				registrationId: options.registrationId,
				artifactType: options.artifactType,
				year: String(options.year),
			},
		})
	}

	async getArtifactSignedUrl(urlOrKey: string, expiresIn = 3600): Promise<string> {
		return this.provider.getSignedUrl(this.extractKeyFromUrl(urlOrKey), expiresIn)
	}

	async deleteArtifact(urlOrKey: string): Promise<void> {
		await this.provider.delete(this.extractKeyFromUrl(urlOrKey))
	}

	async artifactExists(urlOrKey: string): Promise<boolean> {
		return this.provider.exists(this.extractKeyFromUrl(urlOrKey))
	}

	async getArtifactMetadata(urlOrKey: string): Promise<StorageProviderMetadata> {
		return this.provider.getMetadata(this.extractKeyFromUrl(urlOrKey))
	}

	private buildLcrArtifactKey(options: UploadLcrArtifactOptions): string {
		const year = Math.trunc(options.year)
		if (year < 1900 || year > 3000) {
			throw new BadRequestException("Invalid artifact year")
		}

		return [
			"lcr-certificates",
			options.certificateType,
			this.sanitizeKeySegment(options.facilityId, "facilityId"),
			String(year),
			`${this.sanitizeKeySegment(options.registrationId, "registrationId")}.${options.artifactType}`,
		].join("/")
	}

	private sanitizeKeySegment(value: string, fieldName: string): string {
		const trimmed = value.trim()
		if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(trimmed)) {
			throw new BadRequestException(`Invalid ${fieldName} for artifact storage`)
		}

		return trimmed
	}

	private extractKeyFromUrl(urlOrKey: string): string {
		const value = urlOrKey.trim()
		if (!value) {
			throw new BadRequestException("Artifact URL or key is required")
		}

		if (!this.looksLikeUrl(value)) {
			return value.replace(/^\/+/, "")
		}

		const parsedUrl = new URL(value, "http://local-storage")
		const basePath = this.looksLikeAbsoluteUrl(env.FILE_STORAGE_BASE_URL)
			? new URL(env.FILE_STORAGE_BASE_URL).pathname
			: env.FILE_STORAGE_BASE_URL

		const normalizedBasePath = `/${basePath.replace(/^\/+|\/+$/g, "")}`
		const pathname = decodeURIComponent(parsedUrl.pathname)

		if (normalizedBasePath !== "/" && pathname.startsWith(`${normalizedBasePath}/`)) {
			return pathname.slice(normalizedBasePath.length + 1)
		}

		return pathname.replace(/^\/+/, "")
	}

	private looksLikeUrl(value: string): boolean {
		return this.looksLikeAbsoluteUrl(value) || value.startsWith("/")
	}

	private looksLikeAbsoluteUrl(value: string): boolean {
		return /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
	}
}

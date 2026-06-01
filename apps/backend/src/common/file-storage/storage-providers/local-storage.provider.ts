import { BadRequestException, Injectable, Logger } from "@nestjs/common"
import { access, mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

import { env } from "@/config/env.config"

import type {
	StorageProvider,
	StorageProviderMetadata,
	StorageProviderUploadOptions,
} from "./storage-provider.interface"

interface LocalStorageMetadataFile {
	contentType?: string
	metadata?: Record<string, string>
	uploadedAt?: string
}

@Injectable()
export class LocalStorageProvider implements StorageProvider {
	private readonly logger = new Logger(LocalStorageProvider.name)
	private readonly basePath = path.resolve(env.FILE_STORAGE_PATH)

	async upload(
		buffer: Buffer,
		key: string,
		options: StorageProviderUploadOptions
	): Promise<string> {
		const fullPath = this.resolveStoragePath(key)
		await mkdir(path.dirname(fullPath), { recursive: true })
		await writeFile(fullPath, buffer)
		await writeFile(
			this.getMetadataPath(fullPath),
			JSON.stringify(
				{
					contentType: options.contentType,
					metadata: options.metadata ?? {},
					uploadedAt: new Date().toISOString(),
				} satisfies LocalStorageMetadataFile,
				null,
				2
			)
		)

		this.logger.log(`File uploaded to local storage: ${key}`)
		return this.buildPublicUrl(key)
	}

	async getSignedUrl(key: string, _expiresIn: number): Promise<string> {
		return this.buildPublicUrl(key)
	}

	async delete(key: string): Promise<void> {
		const fullPath = this.resolveStoragePath(key)
		await Promise.all([
			unlink(fullPath).catch(() => undefined),
			unlink(this.getMetadataPath(fullPath)).catch(() => undefined),
		])
		this.logger.log(`File deleted from local storage: ${key}`)
	}

	async exists(key: string): Promise<boolean> {
		try {
			await access(this.resolveStoragePath(key))
			return true
		} catch {
			return false
		}
	}

	async getMetadata(key: string): Promise<StorageProviderMetadata> {
		const fullPath = this.resolveStoragePath(key)
		const [fileStats, metadata] = await Promise.all([
			stat(fullPath),
			this.readMetadata(this.getMetadataPath(fullPath)),
		])

		return {
			size: fileStats.size,
			contentType: metadata.contentType ?? "application/octet-stream",
			lastModified: fileStats.mtime,
		}
	}

	private resolveStoragePath(key: string): string {
		const normalizedKey = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "")
		const fullPath = path.resolve(this.basePath, normalizedKey)

		if (fullPath !== this.basePath && !fullPath.startsWith(`${this.basePath}${path.sep}`)) {
			throw new BadRequestException("Invalid storage key")
		}

		return fullPath
	}

	private getMetadataPath(fullPath: string): string {
		return `${fullPath}.meta.json`
	}

	private async readMetadata(metadataPath: string): Promise<LocalStorageMetadataFile> {
		try {
			return JSON.parse(await readFile(metadataPath, "utf8")) as LocalStorageMetadataFile
		} catch {
			return {}
		}
	}

	private buildPublicUrl(key: string): string {
		const baseUrl = env.FILE_STORAGE_BASE_URL.replace(/\/+$/, "")
		const encodedKey = key
			.split("/")
			.map(segment => encodeURIComponent(segment))
			.join("/")

		return `${baseUrl}/${encodedKey}`
	}
}

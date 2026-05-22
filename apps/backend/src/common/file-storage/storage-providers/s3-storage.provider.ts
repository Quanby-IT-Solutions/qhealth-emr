import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"
import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { env } from "@/config/env.config"

import type {
	StorageProvider,
	StorageProviderMetadata,
	StorageProviderUploadOptions,
} from "./storage-provider.interface"

@Injectable()
export class S3StorageProvider implements StorageProvider {
	private readonly logger = new Logger(S3StorageProvider.name)
	private s3Client?: S3Client

	async upload(
		buffer: Buffer,
		key: string,
		options: StorageProviderUploadOptions
	): Promise<string> {
		const bucket = this.getBucket()
		await this.getClient().send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: key,
				Body: buffer,
				ContentType: options.contentType,
				Metadata: options.metadata,
			})
		)

		this.logger.log(`File uploaded to S3: ${key}`)
		return `https://${bucket}.s3.${env.AWS_REGION}.amazonaws.com/${encodeURI(key)}`
	}

	async getSignedUrl(key: string, expiresIn: number): Promise<string> {
		return getSignedUrl(
			this.getClient(),
			new GetObjectCommand({
				Bucket: this.getBucket(),
				Key: key,
			}),
			{ expiresIn }
		)
	}

	async delete(key: string): Promise<void> {
		await this.getClient().send(
			new DeleteObjectCommand({
				Bucket: this.getBucket(),
				Key: key,
			})
		)
		this.logger.log(`File deleted from S3: ${key}`)
	}

	async exists(key: string): Promise<boolean> {
		try {
			await this.getClient().send(
				new HeadObjectCommand({
					Bucket: this.getBucket(),
					Key: key,
				})
			)
			return true
		} catch {
			return false
		}
	}

	async getMetadata(key: string): Promise<StorageProviderMetadata> {
		const response = await this.getClient().send(
			new HeadObjectCommand({
				Bucket: this.getBucket(),
				Key: key,
			})
		)

		return {
			size: response.ContentLength ?? 0,
			contentType: response.ContentType ?? "application/octet-stream",
			lastModified: response.LastModified ?? new Date(),
		}
	}

	private getClient(): S3Client {
		const missingConfig = [
			["AWS_S3_BUCKET", env.AWS_S3_BUCKET],
			["AWS_ACCESS_KEY_ID", env.AWS_ACCESS_KEY_ID],
			["AWS_SECRET_ACCESS_KEY", env.AWS_SECRET_ACCESS_KEY],
		]
			.filter(([, value]) => !value?.trim())
			.map(([name]) => name)

		if (missingConfig.length > 0) {
			throw new ServiceUnavailableException(
				`S3 file storage is missing configuration: ${missingConfig.join(", ")}`
			)
		}

		this.s3Client ??= new S3Client({
			region: env.AWS_REGION,
			credentials: {
				accessKeyId: env.AWS_ACCESS_KEY_ID!,
				secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
			},
		})

		return this.s3Client
	}

	private getBucket(): string {
		if (!env.AWS_S3_BUCKET?.trim()) {
			throw new ServiceUnavailableException(
				"S3 file storage is missing configuration: AWS_S3_BUCKET"
			)
		}

		return env.AWS_S3_BUCKET
	}
}

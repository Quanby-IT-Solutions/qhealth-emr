export const storageProviderContract = Symbol("StorageProvider")

export interface StorageProviderUploadOptions {
	contentType: string
	metadata?: Record<string, string>
}

export interface StorageProviderMetadata {
	size: number
	contentType: string
	lastModified: Date
}

export interface StorageProvider {
	upload(buffer: Buffer, key: string, options: StorageProviderUploadOptions): Promise<string>
	getSignedUrl(key: string, expiresIn: number): Promise<string>
	delete(key: string): Promise<void>
	exists(key: string): Promise<boolean>
	getMetadata(key: string): Promise<StorageProviderMetadata>
}

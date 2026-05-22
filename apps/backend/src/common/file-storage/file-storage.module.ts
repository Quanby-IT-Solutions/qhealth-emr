import { Module } from "@nestjs/common"

import { FileStorageService } from "./file-storage.service"
import { LocalStorageProvider } from "./storage-providers/local-storage.provider"
import { S3StorageProvider } from "./storage-providers/s3-storage.provider"

@Module({
	providers: [FileStorageService, LocalStorageProvider, S3StorageProvider],
	exports: [FileStorageService],
})
export class FileStorageModule {}

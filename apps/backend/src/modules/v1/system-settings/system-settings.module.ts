import { Module } from "@nestjs/common"

import { AuditModule } from "@/modules/v1/audit/audit.module"

import { OfflineCacheService } from "./offline-cache.service"
import { SystemSettingsController } from "./system-settings.controller"
import { SystemSettingsService } from "./system-settings.service"

@Module({
	imports: [AuditModule],
	controllers: [SystemSettingsController],
	providers: [SystemSettingsService, OfflineCacheService],
	exports: [SystemSettingsService, OfflineCacheService],
})
export class SystemSettingsModule {}

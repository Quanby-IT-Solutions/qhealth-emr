import { Module } from "@nestjs/common"

import { AuditModule } from "@/modules/v1/audit/audit.module"

import { IntegrationRegistryController } from "./integration-registry.controller"
import { IntegrationRegistryService } from "./integration-registry.service"

@Module({
	imports: [AuditModule],
	controllers: [IntegrationRegistryController],
	providers: [IntegrationRegistryService],
	exports: [IntegrationRegistryService],
})
export class IntegrationRegistryModule {}

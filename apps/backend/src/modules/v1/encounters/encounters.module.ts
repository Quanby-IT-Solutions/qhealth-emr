import { Module } from "@nestjs/common"

import { AuditModule } from "../audit/audit.module"
import { NotificationModule } from "../notifications/notification.module"
import { EncountersController } from "./encounters.controller"
import { EncountersService } from "./encounters.service"

@Module({
	imports: [AuditModule, NotificationModule],
	controllers: [EncountersController],
	providers: [EncountersService],
	exports: [EncountersService],
})
export class EncountersModule {}

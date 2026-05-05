import { Module } from "@nestjs/common"

import { AuditModule } from "../audit/audit.module"
import { EncountersController } from "./encounters.controller"
import { EncountersService } from "./encounters.service"

@Module({
	imports: [AuditModule],
	controllers: [EncountersController],
	providers: [EncountersService],
	exports: [EncountersService],
})
export class EncountersModule {}

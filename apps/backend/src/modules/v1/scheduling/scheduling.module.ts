import { Module } from "@nestjs/common"

import { AuditModule } from "@/modules/v1/audit/audit.module"

import { SchedulingController } from "./scheduling.controller"
import { SchedulingService } from "./scheduling.service"
import { SlotGeneratorService } from "./slot-generator.service"

@Module({
	imports: [AuditModule],
	controllers: [SchedulingController],
	providers: [SchedulingService, SlotGeneratorService],
	exports: [SchedulingService],
})
export class SchedulingModule {}

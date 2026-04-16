import { Module } from "@nestjs/common"

import { DeathReportingController } from "./death-reporting.controller"
import { DeathReportingService } from "./death-reporting.service"

@Module({
	controllers: [DeathReportingController],
	providers: [DeathReportingService],
	exports: [DeathReportingService],
})
export class DeathReportingModule {}

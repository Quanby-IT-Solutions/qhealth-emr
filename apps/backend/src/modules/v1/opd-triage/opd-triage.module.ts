import { Module } from "@nestjs/common"

import { OpdTriageController } from "./opd-triage.controller"
import { OpdTriageService } from "./opd-triage.service"

@Module({
	controllers: [OpdTriageController],
	providers: [OpdTriageService],
	exports: [OpdTriageService],
})
export class OpdTriageModule {}

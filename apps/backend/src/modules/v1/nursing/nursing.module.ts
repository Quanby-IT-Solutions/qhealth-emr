import { Module } from "@nestjs/common"

import { InsightGenieModule } from "@/common/insight-genie/insight-genie.module"

import { NursingController } from "./nursing.controller"
import { NursingService } from "./nursing.service"

@Module({
	imports: [InsightGenieModule],
	controllers: [NursingController],
	providers: [NursingService],
	exports: [NursingService],
})
export class NursingModule {}

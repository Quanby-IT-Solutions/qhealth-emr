import { Module } from "@nestjs/common"

import { SurgicalController } from "./surgical.controller"
import { SurgicalService } from "./surgical.service"

@Module({
	controllers: [SurgicalController],
	providers: [SurgicalService],
	exports: [SurgicalService],
})
export class SurgicalModule {}

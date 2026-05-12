import { Module } from "@nestjs/common"

import { DrgController } from "./drg.controller"
import { DrgService } from "./drg.service"

// TODO: BIL-BE-05 — implement DRG mapping + CF5 service
@Module({
	controllers: [DrgController],
	providers: [DrgService],
	exports: [DrgService],
})
export class DrgModule {}

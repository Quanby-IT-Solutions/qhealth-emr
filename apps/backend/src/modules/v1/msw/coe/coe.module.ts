import { Module } from "@nestjs/common"

import { CoeController } from "./coe.controller"
import { CoeService } from "./coe.service"

@Module({
	controllers: [CoeController],
	providers: [CoeService],
	exports: [CoeService],
})
export class CoeModule {}

import { Module } from "@nestjs/common"

import { CewsController } from "./cews.controller"
import { CewsService } from "./cews.service"

// TODO: BIL-BE-07 — implement PhilHealth CEWS eligibility client
@Module({
	controllers: [CewsController],
	providers: [CewsService],
	exports: [CewsService],
})
export class CewsModule {}

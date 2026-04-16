import { Module } from "@nestjs/common"

import { NbsController } from "./nbs.controller"
import { NbsService } from "./nbs.service"

@Module({
	controllers: [NbsController],
	providers: [NbsService],
	exports: [NbsService],
})
export class NbsModule {}

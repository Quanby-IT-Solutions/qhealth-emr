import { Module } from "@nestjs/common"

import { MalasakitController } from "./malasakit.controller"
import { MalasakitService } from "./malasakit.service"

@Module({
	controllers: [MalasakitController],
	providers: [MalasakitService],
	exports: [MalasakitService],
})
export class MalasakitModule {}

import { Module } from "@nestjs/common"

import { MswController } from "./msw.controller"
import { MswService } from "./msw.service"

@Module({
	controllers: [MswController],
	providers: [MswService],
	exports: [MswService],
})
export class MswModule {}
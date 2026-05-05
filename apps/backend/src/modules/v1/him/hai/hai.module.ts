import { Module } from "@nestjs/common"

import { HimSharedModule } from "../him-shared.module"

import { HaiController } from "./hai.controller"
import { HaiService } from "./hai.service"

@Module({
	imports: [HimSharedModule],
	controllers: [HaiController],
	providers: [HaiService],
	exports: [HaiService],
})
export class HaiModule {}
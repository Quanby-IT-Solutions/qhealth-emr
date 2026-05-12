import { Module } from "@nestjs/common"

import { HimSharedModule } from "../him-shared.module"
import { CodingController } from "./coding.controller"
import { CodingService } from "./coding.service"

@Module({
	imports: [HimSharedModule],
	controllers: [CodingController],
	providers: [CodingService],
	exports: [CodingService],
})
export class CodingModule {}

import { Module } from "@nestjs/common"

import { HimSharedModule } from "../him-shared.module"
import { DeficienciesController } from "./deficiencies.controller"
import { DeficienciesService } from "./deficiencies.service"

@Module({
	imports: [HimSharedModule],
	controllers: [DeficienciesController],
	providers: [DeficienciesService],
	exports: [DeficienciesService],
})
export class DeficienciesModule {}

import { Module } from "@nestjs/common"

import { HimSharedModule } from "../him-shared.module"

import { RecordsRequestsController } from "./records-requests.controller"
import { RecordsRequestsService } from "./records-requests.service"

@Module({
	imports: [HimSharedModule],
	controllers: [RecordsRequestsController],
	providers: [RecordsRequestsService],
	exports: [RecordsRequestsService],
})
export class RecordsRequestsModule {}
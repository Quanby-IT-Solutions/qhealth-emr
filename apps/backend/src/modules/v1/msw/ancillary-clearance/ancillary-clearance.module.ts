import { Module } from "@nestjs/common"

import { AncillaryClearanceController } from "./ancillary-clearance.controller"
import { AncillaryClearanceService } from "./ancillary-clearance.service"

@Module({
	controllers: [AncillaryClearanceController],
	providers: [AncillaryClearanceService],
	exports: [AncillaryClearanceService],
})
export class AncillaryClearanceModule {}

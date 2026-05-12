import { Module } from "@nestjs/common"

import { DischargeClearancesController } from "./discharge-clearances.controller"
import { DischargeClearancesService } from "./discharge-clearances.service"
import { GatePassController } from "./gate-pass.controller"
import { GatePassService } from "./gate-pass.service"

@Module({
	controllers: [DischargeClearancesController, GatePassController],
	providers: [DischargeClearancesService, GatePassService],
	exports: [DischargeClearancesService, GatePassService],
})
export class DischargeModule {}

import { Module } from "@nestjs/common"

import { DischargeClearancesController } from "./discharge-clearances.controller"
import { DischargeClearancesService } from "./discharge-clearances.service"

@Module({
    controllers: [DischargeClearancesController],
    providers: [DischargeClearancesService],
    exports: [DischargeClearancesService],
})
export class DischargeClearancesModule {}

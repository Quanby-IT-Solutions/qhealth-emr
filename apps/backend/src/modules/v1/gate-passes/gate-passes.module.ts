import { Module } from "@nestjs/common"

import { GatePassesController } from "./gate-passes.controller"
import { GatePassesService } from "./gate-passes.service"

@Module({
    controllers: [GatePassesController],
    providers: [GatePassesService],
    exports: [GatePassesService],
})
export class GatePassesModule {}

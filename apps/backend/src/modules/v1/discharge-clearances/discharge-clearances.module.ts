import { Module } from "@nestjs/common"

import { DischargeClearancesController } from "./discharge-clearances.controller"
import { DischargeClearancesService } from "./discharge-clearances.service"
import { AuditModule } from "../audit/audit.module"

@Module({
    imports: [AuditModule],
    controllers: [DischargeClearancesController],
    providers: [DischargeClearancesService],
    exports: [DischargeClearancesService],
})
export class DischargeClearancesModule {}

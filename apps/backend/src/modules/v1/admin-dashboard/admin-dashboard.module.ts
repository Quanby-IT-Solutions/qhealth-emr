import { Module } from "@nestjs/common"

import { ReportingModule } from "../reporting/reporting.module"
import { SlaModule } from "../sla/sla.module"
import { AdminDashboardController } from "./admin-dashboard.controller"
import { AdminDashboardService } from "./admin-dashboard.service"

@Module({
	imports: [SlaModule, ReportingModule],
	controllers: [AdminDashboardController],
	providers: [AdminDashboardService],
})
export class AdminDashboardModule {}

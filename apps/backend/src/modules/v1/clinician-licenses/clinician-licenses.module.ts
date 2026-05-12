import { Module } from "@nestjs/common"

import { AuditModule } from "../audit/audit.module"
import { ClinicianLicensesController } from "./clinician-licenses.controller"
import { ClinicianLicensesService } from "./clinician-licenses.service"

@Module({
	imports: [AuditModule],
	controllers: [ClinicianLicensesController],
	providers: [ClinicianLicensesService],
	exports: [ClinicianLicensesService],
})
export class ClinicianLicensesModule {}

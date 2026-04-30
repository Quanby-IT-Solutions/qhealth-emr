import { Module } from "@nestjs/common"

import { AuditModule } from "@/modules/v1/audit/audit.module"

import { FormularyController } from "./formulary.controller"
import { FormularyService } from "./formulary.service"

@Module({
	imports: [AuditModule],
	controllers: [FormularyController],
	providers: [FormularyService],
	exports: [FormularyService],
})
export class FormularyModule {}

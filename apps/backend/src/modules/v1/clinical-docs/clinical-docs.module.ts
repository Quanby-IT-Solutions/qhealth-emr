import { Module } from "@nestjs/common"

import { AuditModule } from "../audit/audit.module"
import { ClinicalDocsController } from "./clinical-docs.controller"
import { ClinicalDocsService } from "./clinical-docs.service"

@Module({
	imports: [AuditModule],
	controllers: [ClinicalDocsController],
	providers: [ClinicalDocsService],
	exports: [ClinicalDocsService],
})
export class ClinicalDocsModule {}

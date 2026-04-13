import { Module } from "@nestjs/common"

import { ClinicalDocsController } from "./clinical-docs.controller"
import { ClinicalDocsService } from "./clinical-docs.service"

@Module({
	controllers: [ClinicalDocsController],
	providers: [ClinicalDocsService],
	exports: [ClinicalDocsService],
})
export class ClinicalDocsModule {}

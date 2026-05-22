import { Module } from "@nestjs/common"

import { ElevenLabsModule } from "@/common/elevenlabs/elevenlabs.module"

import { AuditModule } from "../audit/audit.module"
import { ClinicalDocsController } from "./clinical-docs.controller"
import { ClinicalDocsService } from "./clinical-docs.service"
import { SpeechToTextController } from "./speech-to-text.controller"

@Module({
	imports: [AuditModule, ElevenLabsModule],
	controllers: [ClinicalDocsController, SpeechToTextController],
	providers: [ClinicalDocsService],
	exports: [ClinicalDocsService],
})
export class ClinicalDocsModule {}

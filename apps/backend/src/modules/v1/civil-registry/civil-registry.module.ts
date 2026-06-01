import { Module } from "@nestjs/common"

import { FileStorageModule } from "@/common/file-storage/file-storage.module"

import { CivilRegistryController } from "./civil-registry.controller"
import { CivilRegistryService } from "./civil-registry.service"
import { LcrArtifactGeneratorService } from "./lcr-artifact-generator.service"
import { LcrSubmissionService } from "./lcr-submission.service"

@Module({
	imports: [FileStorageModule],
	controllers: [CivilRegistryController],
	providers: [CivilRegistryService, LcrArtifactGeneratorService, LcrSubmissionService],
	exports: [CivilRegistryService],
})
export class CivilRegistryModule {}

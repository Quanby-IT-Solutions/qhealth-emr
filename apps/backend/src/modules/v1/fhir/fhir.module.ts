import { Module } from "@nestjs/common"

import { FhirBundleBuilderService } from "./fhir-bundle-builder.service"
import { FhirCanonicalValidatorService } from "./fhir-canonical-validator.service"
import { FhirValidatorService } from "./fhir-validator.service"
import { FhirController } from "./fhir.controller"
import { FhirService } from "./fhir.service"
import { NhdrAdapterService } from "./nhdr-adapter.service"

@Module({
	controllers: [FhirController],
	providers: [
		FhirService,
		FhirBundleBuilderService,
		FhirValidatorService,
		FhirCanonicalValidatorService,
		NhdrAdapterService,
	],
	exports: [FhirService],
})
export class FhirModule {}

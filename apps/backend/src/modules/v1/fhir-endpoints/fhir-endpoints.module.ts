import { Module } from "@nestjs/common"

import { AuditModule } from "../audit/audit.module"
import { FhirEndpointsController } from "./fhir-endpoints.controller"
import { FhirEndpointsService } from "./fhir-endpoints.service"

@Module({
	imports: [AuditModule],
	controllers: [FhirEndpointsController],
	providers: [FhirEndpointsService],
	exports: [FhirEndpointsService],
})
export class FhirEndpointsModule {}

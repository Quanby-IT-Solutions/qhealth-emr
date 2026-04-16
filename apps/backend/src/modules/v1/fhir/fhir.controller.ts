import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"

import { FhirService } from "./fhir.service"

@Controller()
export class FhirController {
	constructor(private readonly fhirService: FhirService) {}

	// ========================================================================
	// Exports
	// ========================================================================

	@Implement(v1.fhir.listExports)
	async listExports() {
		return implement(v1.fhir.listExports).handler(async ({ input }) => {
			return this.fhirService.listExports(input)
		})
	}

	@Implement(v1.fhir.getExport)
	async getExport() {
		return implement(v1.fhir.getExport).handler(async ({ input }) => {
			return this.fhirService.getExport(input.exportId)
		})
	}

	@Implement(v1.fhir.createExport)
	async createExport(@Session() session: UserSession) {
		return implement(v1.fhir.createExport).handler(async ({ input }) => {
			return this.fhirService.createExport(input, session.user.id, session.user.name)
		})
	}

	@Implement(v1.fhir.getValidationReport)
	async getValidationReport() {
		return implement(v1.fhir.getValidationReport).handler(async ({ input }) => {
			return this.fhirService.getValidationReport(input.exportId)
		})
	}

	@Implement(v1.fhir.submitToNhdr)
	async submitToNhdr(@Session() session: UserSession) {
		return implement(v1.fhir.submitToNhdr).handler(async ({ input }) => {
			return this.fhirService.submitToNhdr(input.exportId, session.user.id, session.user.name)
		})
	}

	// ========================================================================
	// NHDR Submissions
	// ========================================================================

	@Implement(v1.fhir.listNhdrSubmissions)
	async listNhdrSubmissions() {
		return implement(v1.fhir.listNhdrSubmissions).handler(async ({ input }) => {
			return this.fhirService.listNhdrSubmissions(input)
		})
	}
}

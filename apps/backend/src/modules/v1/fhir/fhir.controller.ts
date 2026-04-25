import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/modules/v1/rbac/rbac.guard"

import { FhirService } from "./fhir.service"

@Controller()
export class FhirController {
	constructor(private readonly fhirService: FhirService) {}

	// ========================================================================
	// Exports
	// ========================================================================

	@RequirePermissions([{ module: "admin", action: "view" }, { module: "fhir", action: "view" }])
	@Implement(v1.fhir.listExports)
	async listExports() {
		return implement(v1.fhir.listExports).handler(async ({ input }) => {
			return this.fhirService.listExports(input)
		})
	}

	@RequirePermissions([{ module: "admin", action: "view" }, { module: "fhir", action: "view" }])
	@Implement(v1.fhir.getExport)
	async getExport() {
		return implement(v1.fhir.getExport).handler(async ({ input }) => {
			return this.fhirService.getExport(input.exportId)
		})
	}

	@RequirePermissions([{ module: "admin", action: "view" }, { module: "fhir", action: "export" }])
	@Implement(v1.fhir.createExport)
	async createExport(@Session() session: UserSession) {
		return implement(v1.fhir.createExport).handler(async ({ input }) => {
			return this.fhirService.createExport(input, session.user.id, session.user.name)
		})
	}

	@RequirePermissions([{ module: "admin", action: "view" }, { module: "fhir", action: "view" }])
	@Implement(v1.fhir.getValidationReport)
	async getValidationReport() {
		return implement(v1.fhir.getValidationReport).handler(async ({ input }) => {
			return this.fhirService.getValidationReport(input.exportId)
		})
	}

	@RequirePermissions([{ module: "admin", action: "view" }, { module: "fhir", action: "export" }])
	@Implement(v1.fhir.submitToNhdr)
	async submitToNhdr(@Session() session: UserSession) {
		return implement(v1.fhir.submitToNhdr).handler(async ({ input }) => {
			return this.fhirService.submitToNhdr(input.exportId, session.user.id, session.user.name)
		})
	}

	// ========================================================================
	// NHDR Submissions
	// ========================================================================

	@RequirePermissions([{ module: "admin", action: "view" }, { module: "fhir", action: "view" }])
	@Implement(v1.fhir.listNhdrSubmissions)
	async listNhdrSubmissions() {
		return implement(v1.fhir.listNhdrSubmissions).handler(async ({ input }) => {
			return this.fhirService.listNhdrSubmissions(input)
		})
	}

	// ========================================================================
	// Bundle download
	// ========================================================================

	@RequirePermissions([{ module: "admin", action: "view" }, { module: "fhir", action: "export" }])
	@Implement(v1.fhir.downloadBundle)
	async downloadBundle(@Session() session: UserSession) {
		return implement(v1.fhir.downloadBundle).handler(async ({ input }) => {
			return this.fhirService.getBundleData(input.exportId, session.user.id)
		})
	}

	// ========================================================================
	// System status
	// ========================================================================

	@RequirePermissions([{ module: "admin", action: "view" }, { module: "fhir", action: "view" }])
	@Implement(v1.fhir.getSystemStatus)
	async getSystemStatus() {
		return implement(v1.fhir.getSystemStatus).handler(async () => {
			return this.fhirService.getSystemStatus()
		})
	}
}

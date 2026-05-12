import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequireAnyPermissions } from "@/modules/v1/rbac/rbac.guard"

import { FhirEndpointsService } from "./fhir-endpoints.service"

@Controller()
export class FhirEndpointsController {
	constructor(private readonly fhirEndpointsService: FhirEndpointsService) {}

	@RequireAnyPermissions([
		{ module: "admin.fhir", action: "read" },
		{ module: "admin", action: "view" },
	])
	@Implement(v1.fhirEndpoints.list)
	async list() {
		return implement(v1.fhirEndpoints.list).handler(async ({ input }) => {
			return this.fhirEndpointsService.list(input.facilityId)
		})
	}

	@RequireAnyPermissions([
		{ module: "admin.fhir", action: "read" },
		{ module: "admin", action: "view" },
	])
	@Implement(v1.fhirEndpoints.get)
	async get() {
		return implement(v1.fhirEndpoints.get).handler(async ({ input }) => {
			return this.fhirEndpointsService.get(input.id)
		})
	}

	@RequireAnyPermissions([
		{ module: "admin.fhir", action: "write" },
		{ module: "admin", action: "edit" },
	])
	@Implement(v1.fhirEndpoints.upsert)
	async upsert(@Session() session: UserSession) {
		return implement(v1.fhirEndpoints.upsert).handler(async ({ input }) => {
			return this.fhirEndpointsService.upsert(input, session.user.id)
		})
	}

	@RequireAnyPermissions([
		{ module: "admin.fhir", action: "write" },
		{ module: "admin", action: "delete" },
	])
	@Implement(v1.fhirEndpoints.delete)
	async deleteFhirEndpoint(@Session() session: UserSession) {
		return implement(v1.fhirEndpoints.delete).handler(async ({ input }) => {
			// facilityId resolved from session; endpoint lookup does facility check internally
			return this.fhirEndpointsService.delete(input.id, "", session.user.id)
		})
	}

	@RequireAnyPermissions([
		{ module: "admin.fhir", action: "write" },
		{ module: "admin", action: "edit" },
	])
	@Implement(v1.fhirEndpoints.testConnection)
	async testConnection(@Session() session: UserSession) {
		return implement(v1.fhirEndpoints.testConnection).handler(async ({ input }) => {
			return this.fhirEndpointsService.testConnection(input.id, session.user.id)
		})
	}

	@RequireAnyPermissions([
		{ module: "admin.fhir", action: "read" },
		{ module: "admin", action: "view" },
	])
	@Implement(v1.fhirEndpoints.listExchangeLog)
	async listExchangeLog() {
		return implement(v1.fhirEndpoints.listExchangeLog).handler(async ({ input }) => {
			return this.fhirEndpointsService.listExchangeLog(input)
		})
	}

	@RequireAnyPermissions([
		{ module: "admin.fhir", action: "write" },
		{ module: "admin", action: "edit" },
	])
	@Implement(v1.fhirEndpoints.retryExchange)
	async retryExchange() {
		return implement(v1.fhirEndpoints.retryExchange).handler(async ({ input }) => {
			return this.fhirEndpointsService.retryExchange(input.logId)
		})
	}
}

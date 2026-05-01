import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/modules/v1/rbac/rbac.guard"

import { TerminologyService } from "./terminology.service"

@Controller()
export class TerminologyController {
	constructor(private readonly terminologyService: TerminologyService) {}

	@RequirePermissions([{ module: "admin", action: "view" }])
	@Implement(v1.terminology.listSystems)
	async listSystems() {
		return implement(v1.terminology.listSystems).handler(async () => {
			return this.terminologyService.listSystems()
		})
	}

	@RequirePermissions([{ module: "admin", action: "view" }])
	@Implement(v1.terminology.searchCodes)
	async searchCodes() {
		return implement(v1.terminology.searchCodes).handler(async ({ input }) => {
			return this.terminologyService.searchCodes(input)
		})
	}

	@RequirePermissions([{ module: "admin", action: "view" }])
	@Implement(v1.terminology.getCode)
	async getCode() {
		return implement(v1.terminology.getCode).handler(async ({ input }) => {
			return this.terminologyService.getCode(input.id)
		})
	}

	@RequirePermissions([{ module: "admin", action: "edit" }])
	@Implement(v1.terminology.deprecate)
	async deprecate(@Session() _session: UserSession) {
		return implement(v1.terminology.deprecate).handler(async ({ input }) => {
			return this.terminologyService.deprecate(input)
		})
	}

	@RequirePermissions([{ module: "admin", action: "edit" }])
	@Implement(v1.terminology.import)
	async import(@Session() _session: UserSession) {
		return implement(v1.terminology.import).handler(async ({ input }) => {
			return this.terminologyService.import(input)
		})
	}

	@RequirePermissions([{ module: "admin", action: "view" }])
	@Implement(v1.terminology.diffVersions)
	async diffVersions() {
		return implement(v1.terminology.diffVersions).handler(async ({ input }) => {
			return this.terminologyService.diffVersions(input)
		})
	}
}

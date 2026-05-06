import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { himContract } from "@repo/contracts"
import { v1 } from "@/config/api-versions.config"

import { RequireAnyPermissions } from "@/modules/v1/rbac/rbac.guard"

import { DeficienciesService } from "./deficiencies.service"

// Runtime deficiency procedures with full /v1/him/* paths, typed via himContract
const himV1 = v1.him as unknown as typeof himContract

@Controller()
export class DeficienciesController {
	constructor(private readonly deficienciesService: DeficienciesService) {}

	@RequireAnyPermissions([
		{ module: "him.deficiencies", action: "read" },
	])
	@Implement(himV1.listDeficiencies)
	async listDeficiencies() {
		return implement(himV1.listDeficiencies).handler(async ({ input }) => {
			return this.deficienciesService.listDeficiencies(input) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "him.deficiencies", action: "read" },
	])
	@Implement(himV1.getDeficiency)
	async getDeficiency() {
		return implement(himV1.getDeficiency).handler(async ({ input }) => {
			return this.deficienciesService.getDeficiency(input) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "him.deficiencies", action: "write" },
	])
	@Implement(himV1.notifyDeficiency)
	async notifyDeficiency(@Session() session: UserSession) {
		return implement(himV1.notifyDeficiency).handler(async ({ input }) => {
			return this.deficienciesService.notifyDeficiency({ ...input, staffId: session.user.id }) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "him.deficiencies", action: "write" },
	])
	@Implement(himV1.markDeficiencyResolved)
	async markDeficiencyResolved(@Session() session: UserSession) {
		return implement(himV1.markDeficiencyResolved).handler(async ({ input }) => {
			return this.deficienciesService.markDeficiencyResolved({ ...input, staffId: session.user.id }) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "him.deficiencies", action: "write" },
	])
	@Implement(himV1.scanDeficiencies)
	async scanDeficiencies(@Session() session: UserSession) {
		return implement(himV1.scanDeficiencies).handler(async ({ input }) => {
			return this.deficienciesService.scanDeficiencies({ ...input, staffId: session.user.id }) as never
		})
	}
}
import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { MswService } from "./msw.service"

@Controller()
export class MswController {
	constructor(private readonly mswService: MswService) {}

	@RequirePermission("msw", "view")
	@Implement(v1.msw.list)
	async list() {
		return implement(v1.msw.list).handler(async ({ input }) => {
			return this.mswService.list(input)
		})
	}

	@RequirePermission("msw", "view")
	@Implement(v1.msw.get)
	async get() {
		return implement(v1.msw.get).handler(async ({ input }) => {
			return this.mswService.get(input.id)
		})
	}

	@RequirePermission("msw", "view")
	@Implement(v1.msw.getByEncounter)
	async getByEncounter() {
		return implement(v1.msw.getByEncounter).handler(async ({ input }) => {
			return this.mswService.getByEncounter(input.encounterId)
		})
	}

	@RequirePermission("msw", "create")
	@Implement(v1.msw.create)
	async create(@Session() session: UserSession) {
		return implement(v1.msw.create).handler(async ({ input }) => {
			return this.mswService.create(input, session.user.id)
		})
	}

	@RequirePermission("msw", "edit")
	@Implement(v1.msw.update)
	async update(@Session() session: UserSession) {
		return implement(v1.msw.update).handler(async ({ input }) => {
			void session
			return this.mswService.update(input)
		})
	}

	@RequirePermission("msw", "edit")
	@Implement(v1.msw.issueCoe)
	async issueCoe(@Session() session: UserSession) {
		return implement(v1.msw.issueCoe).handler(async ({ input }) => {
			return this.mswService.issueCoe(input, session.user.id)
		})
	}

	@RequirePermission("msw", "edit")
	@Implement(v1.msw.addMalasakit)
	async addMalasakit(@Session() session: UserSession) {
		return implement(v1.msw.addMalasakit).handler(async ({ input }) => {
			void session
			return this.mswService.addMalasakit(input)
		})
	}

	@RequirePermission("msw", "edit")
	@Implement(v1.msw.captureAnnexSignature)
	async captureAnnexSignature(@Session() session: UserSession) {
		return implement(v1.msw.captureAnnexSignature).handler(async ({ input }) => {
			void session
			return this.mswService.captureAnnexSignature(input)
		})
	}

	@RequirePermission("msw", "edit")
	@Implement(v1.msw.tagBenefits)
	async tagBenefits(@Session() session: UserSession) {
		return implement(v1.msw.tagBenefits).handler(async ({ input }) => {
			void session
			return this.mswService.tagBenefits(input)
		})
	}
}

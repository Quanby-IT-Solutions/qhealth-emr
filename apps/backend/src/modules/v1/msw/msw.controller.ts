import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { mswBaseContract } from "@repo/contracts"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { MswService } from "./msw.service"

// v1.msw is `any` due to TS7056 workaround in v1.msw.ts; cast back via the flat base contract
const mswV1 = v1.msw as unknown as typeof mswBaseContract

@Controller()
export class MswController {
	constructor(private readonly mswService: MswService) {}

	@RequirePermission("msw", "view")
	@Implement(mswV1.list)
	async list() {
		return implement(mswV1.list).handler(async ({ input }) => {
			return this.mswService.list(input)
		})
	}

	@RequirePermission("msw", "view")
	@Implement(mswV1.get)
	async get() {
		return implement(mswV1.get).handler(async ({ input }) => {
			return this.mswService.get(input.id)
		})
	}

	@RequirePermission("msw", "view")
	@Implement(mswV1.getByEncounter)
	async getByEncounter() {
		return implement(mswV1.getByEncounter).handler(async ({ input }) => {
			return this.mswService.getByEncounter(input.encounterId)
		})
	}

	@RequirePermission("msw", "create")
	@Implement(mswV1.create)
	async create(@Session() session: UserSession) {
		return implement(mswV1.create).handler(async ({ input }) => {
			return this.mswService.create(input, session.user.id)
		})
	}

	@RequirePermission("msw", "edit")
	@Implement(mswV1.update)
	async update(@Session() session: UserSession) {
		return implement(mswV1.update).handler(async ({ input }) => {
			void session
			return this.mswService.update(input)
		})
	}

	@RequirePermission("msw", "edit")
	@Implement(mswV1.issueCoe)
	async issueCoe(@Session() session: UserSession) {
		return implement(mswV1.issueCoe).handler(async ({ input }) => {
			return this.mswService.issueCoe(input, session.user.id)
		})
	}

	@RequirePermission("msw", "edit")
	@Implement(mswV1.addMalasakit)
	async addMalasakit(@Session() session: UserSession) {
		return implement(mswV1.addMalasakit).handler(async ({ input }) => {
			void session
			return this.mswService.addMalasakit(input)
		})
	}

	@RequirePermission("msw", "edit")
	@Implement(mswV1.captureAnnexSignature)
	async captureAnnexSignature(@Session() session: UserSession) {
		return implement(mswV1.captureAnnexSignature).handler(async ({ input }) => {
			void session
			return this.mswService.captureAnnexSignature(input)
		})
	}

	@RequirePermission("msw", "edit")
	@Implement(mswV1.tagBenefits)
	async tagBenefits(@Session() session: UserSession) {
		return implement(mswV1.tagBenefits).handler(async ({ input }) => {
			void session
			return this.mswService.tagBenefits(input)
		})
	}
}

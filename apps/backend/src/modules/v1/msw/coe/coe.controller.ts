import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { coeContract } from "@repo/contracts"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { CoeService } from "./coe.service"

const coeV1 = (v1.msw as unknown as { coe: typeof coeContract }).coe

@Controller()
export class CoeController {
	constructor(private readonly coeService: CoeService) {}

	@RequirePermission("msw", "view")
	@Implement(coeV1.list)
	async list() {
		return implement(coeV1.list).handler(async ({ input }) => {
			return this.coeService.list(input)
		})
	}

	@RequirePermission("msw", "view")
	@Implement(coeV1.get)
	async get() {
		return implement(coeV1.get).handler(async ({ input }) => {
			return this.coeService.get(input.id)
		})
	}

	@RequirePermission("msw", "create")
	@Implement(coeV1.issue)
	async issue(@Session() session: UserSession) {
		return implement(coeV1.issue).handler(async ({ input }) => {
			return this.coeService.issue({ ...input, staffId: session.user.id })
		})
	}

	@RequirePermission("msw", "edit")
	@Implement(coeV1.revoke)
	async revoke() {
		return implement(coeV1.revoke).handler(async ({ input }) => {
			return this.coeService.revoke(input)
		})
	}
}

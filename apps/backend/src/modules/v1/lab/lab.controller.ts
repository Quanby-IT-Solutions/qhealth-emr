import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { LabService } from "./lab.service"

@Controller()
export class LabController {
	constructor(private readonly labService: LabService) {}

	// ========================================================================
	// Blood Bank — Cross-Match Requests
	// ========================================================================

	@RequirePermission("laboratory", "view")
	@Implement(v1.lab.listCrossMatches)
	async listCrossMatches() {
		return implement(v1.lab.listCrossMatches).handler(async ({ input }) => {
			return this.labService.listCrossMatches(input)
		})
	}

	@RequirePermission("laboratory", "view")
	@Implement(v1.lab.getCrossMatch)
	async getCrossMatch() {
		return implement(v1.lab.getCrossMatch).handler(async ({ input }) => {
			return this.labService.getCrossMatch(input.id)
		})
	}

	@RequirePermission("laboratory", "create")
	@Implement(v1.lab.createCrossMatch)
	async createCrossMatch(@Session() session: UserSession) {
		return implement(v1.lab.createCrossMatch).handler(async ({ input }) => {
			return this.labService.createCrossMatch(input, session.user.id)
		})
	}

	@RequirePermission("laboratory", "edit")
	@Implement(v1.lab.approveCrossMatch)
	async approveCrossMatch(@Session() session: UserSession) {
		return implement(v1.lab.approveCrossMatch).handler(async ({ input }) => {
			return this.labService.approveCrossMatch(input, session.user.id)
		})
	}

	// ========================================================================
	// Blood Bank — Bedside Verification
	// ========================================================================

	@RequirePermission("laboratory", "edit")
	@Implement(v1.lab.bedsideVerify)
	async bedsideVerify(@Session() session: UserSession) {
		return implement(v1.lab.bedsideVerify).handler(async ({ input }) => {
			void session
			return this.labService.bedsideVerify(input)
		})
	}
}

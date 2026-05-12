import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { assessmentsContract } from "@repo/contracts"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { AssessmentsService } from "./assessments.service"

// Cast to typed procedures with full /v1/msw/assessments/* paths (v1.msw.assessments is `any` due to TS7056 workaround)
const assessmentsV1 = (v1.msw as unknown as { assessments: typeof assessmentsContract }).assessments

@Controller()
export class AssessmentsController {
	constructor(private readonly assessmentsService: AssessmentsService) {}

	@RequirePermission("msw", "view")
	@Implement(assessmentsV1.list)
	async list() {
		return implement(assessmentsV1.list).handler(async ({ input }) => {
			return this.assessmentsService.list(input)
		})
	}

	@RequirePermission("msw", "view")
	@Implement(assessmentsV1.get)
	async get() {
		return implement(assessmentsV1.get).handler(async ({ input }) => {
			return this.assessmentsService.get(input.id)
		})
	}

	@RequirePermission("msw", "create")
	@Implement(assessmentsV1.upsert)
	async upsert(@Session() session: UserSession) {
		return implement(assessmentsV1.upsert).handler(async ({ input }) => {
			return this.assessmentsService.upsert({ ...input, staffId: session.user.id })
		})
	}

	@RequirePermission("msw", "create")
	@Implement(assessmentsV1.attachDocument)
	async attachDocument() {
		return implement(assessmentsV1.attachDocument).handler(async ({ input }) => {
			return this.assessmentsService.attachDocument(input)
		})
	}
}

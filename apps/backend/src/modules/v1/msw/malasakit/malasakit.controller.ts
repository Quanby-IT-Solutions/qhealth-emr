import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"

import { malasakitContract } from "@repo/contracts"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { MalasakitService } from "./malasakit.service"

const malasakitV1 = (v1.msw as unknown as { malasakit: typeof malasakitContract }).malasakit

@Controller()
export class MalasakitController {
	constructor(private readonly malasakitService: MalasakitService) {}

	@RequirePermission("msw", "view")
	@Implement(malasakitV1.list)
	async list() {
		return implement(malasakitV1.list).handler(async ({ input }) => {
			return this.malasakitService.list(input)
		})
	}

	@RequirePermission("msw", "view")
	@Implement(malasakitV1.get)
	async get() {
		return implement(malasakitV1.get).handler(async ({ input }) => {
			return this.malasakitService.get(input.id)
		})
	}

	@RequirePermission("msw", "create")
	@Implement(malasakitV1.create)
	async create() {
		return implement(malasakitV1.create).handler(async ({ input }) => {
			return this.malasakitService.create(input)
		})
	}

	@RequirePermission("msw", "edit")
	@Implement(malasakitV1.update)
	async update() {
		return implement(malasakitV1.update).handler(async ({ input }) => {
			return this.malasakitService.update(input)
		})
	}

	@RequirePermission("msw", "view")
	@Implement(malasakitV1.statusLog)
	async statusLog() {
		return implement(malasakitV1.statusLog).handler(async ({ input }) => {
			return this.malasakitService.statusLog(input.caseId)
		})
	}

	@RequirePermission("msw", "edit")
	@Implement(malasakitV1.reconcile)
	async reconcile() {
		return implement(malasakitV1.reconcile).handler(async ({ input }) => {
			return this.malasakitService.reconcile(input)
		})
	}
}

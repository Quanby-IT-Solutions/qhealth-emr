import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { EncountersService } from "./encounters.service"

@Controller()
export class EncountersController {
	constructor(private readonly encountersService: EncountersService) {}

	@RequirePermission("patients", "view")
	@Implement(v1.encounter.list)
	async list() {
		return implement(v1.encounter.list).handler(async ({ input }) => {
			return this.encountersService.list(input)
		})
	}

	@RequirePermission("patients", "view")
	@Implement(v1.encounter.get)
	async get() {
		return implement(v1.encounter.get).handler(async ({ input }) => {
			return this.encountersService.findById(input)
		})
	}

	@RequirePermission("adt", "view")
	@Implement(v1.encounter.getLinked)
	async getLinked() {
		return implement(v1.encounter.getLinked).handler(async ({ input }) => {
			return this.encountersService.getLinked(input)
		})
	}

	@RequirePermission("adt", "create")
	@Implement(v1.encounter.create)
	async create(@Session() session: UserSession) {
		return implement(v1.encounter.create).handler(async ({ input }) => {
			return this.encountersService.create(input, session.user.id)
		})
	}

	@RequirePermission("adt", "edit")
	@Implement(v1.encounter.transfer)
	async transfer(@Session() session: UserSession) {
		return implement(v1.encounter.transfer).handler(async ({ input }) => {
			void session
			return this.encountersService.transfer(input)
		})
	}

	@RequirePermission("adt", "edit")
	@Implement(v1.encounter.discharge)
	async discharge(@Session() session: UserSession) {
		return implement(v1.encounter.discharge).handler(async ({ input }) => {
			void session
			return this.encountersService.discharge(input)
		})
	}

	@RequirePermission("adt", "edit")
	@Implement(v1.encounter.close)
	async close(@Session() session: UserSession) {
		return implement(v1.encounter.close).handler(async ({ input }) => {
			void session
			return this.encountersService.close(input)
		})
	}

	@RequirePermission("adt", "view")
	@Implement(v1.encounter.checklist)
	async checklist() {
		return implement(v1.encounter.checklist).handler(async ({ input }) => {
			return this.encountersService.getDischargeChecklist(input)
		})
	}
}

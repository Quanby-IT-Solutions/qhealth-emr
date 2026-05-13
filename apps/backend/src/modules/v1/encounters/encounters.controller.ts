import { Controller, Req } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import type { Request } from "express"

import { v1 } from "@/config/api-versions.config"
import { buildChartAccessActor } from "@/modules/v1/audit/chart-access.service"
import { RequireAnyPermissions, RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { EncountersService } from "./encounters.service"

@Controller()
export class EncountersController {
	constructor(private readonly encountersService: EncountersService) {}

	@RequireAnyPermissions([
		{ module: "patients", action: "view" },
		{ module: "nutrition", action: "view" },
		{ module: "nutrition", action: "edit" },
	])
	@Implement(v1.encounter.list)
	async list(@Session() session: UserSession, @Req() req: Request) {
		return implement(v1.encounter.list).handler(async ({ input }) => {
			return this.encountersService.list(input, buildChartAccessActor(session, req))
		})
	}

	@RequireAnyPermissions([
		{ module: "patients", action: "view" },
		{ module: "nutrition", action: "view" },
		{ module: "nutrition", action: "edit" },
	])
	@Implement(v1.encounter.get)
	async get(@Session() session: UserSession, @Req() req: Request) {
		return implement(v1.encounter.get).handler(async ({ input }) => {
			return this.encountersService.findById(input, buildChartAccessActor(session, req))
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
	@Implement(v1.encounter.initiateTransfer)
	async initiateTransfer(@Session() session: UserSession) {
		return implement(v1.encounter.initiateTransfer).handler(async ({ input }) => {
			void session
			return this.encountersService.initiateTransfer(input)
		})
	}

	@RequirePermission("nursing", "create")
	@Implement(v1.encounter.receiveTransfer)
	async receiveTransfer(@Session() session: UserSession) {
		return implement(v1.encounter.receiveTransfer).handler(async ({ input }) => {
			void session
			return this.encountersService.receiveTransfer(input)
		})
	}

	@RequirePermission("nursing", "view")
	@Implement(v1.encounter.listPendingTransfers)
	async listPendingTransfers() {
		return implement(v1.encounter.listPendingTransfers).handler(async ({ input }) => {
			return this.encountersService.listPendingTransfers(input)
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

	@RequirePermission("clinical_docs", "sign")
	@Implement(v1.encounter.signMayGoHomeOrder)
	async signMayGoHomeOrder(@Session() session: UserSession) {
		return implement(v1.encounter.signMayGoHomeOrder).handler(async ({ input }) => {
			return this.encountersService.signMayGoHomeOrder(input, session.user.id)
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

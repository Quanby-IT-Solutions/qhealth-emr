import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequireAnyPermissions, RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { EdService } from "./ed.service"

@Controller()
export class EdController {
	constructor(private readonly edService: EdService) {}

	// Pre-Encounter CRUD

	@RequirePermission("ed", "create")
	@Implement(v1.ed.createPreEncounter)
	async createPreEncounter(@Session() _session: UserSession) {
		return implement(v1.ed.createPreEncounter).handler(async ({ input }) => {
			return this.edService.createPreEncounter(input)
		})
	}

	@RequirePermission("ed", "view")
	@Implement(v1.ed.getPreEncounter)
	async getPreEncounter() {
		return implement(v1.ed.getPreEncounter).handler(async ({ input }) => {
			return this.edService.getPreEncounter(input.id)
		})
	}

	@RequirePermission("ed", "edit")
	@Implement(v1.ed.updatePreEncounter)
	async updatePreEncounter(@Session() _session: UserSession) {
		return implement(v1.ed.updatePreEncounter).handler(async ({ input }) => {
			return this.edService.updatePreEncounter(input)
		})
	}

	@RequirePermission("ed", "create")
	@Implement(v1.ed.cancelPreEncounter)
	async cancelPreEncounter(@Session() _session: UserSession) {
		return implement(v1.ed.cancelPreEncounter).handler(async ({ input }) => {
			return this.edService.cancelPreEncounter(input.id)
		})
	}

	@RequireAnyPermissions([
		{ module: "ed", action: "view" },
		{ module: "adt", action: "edit" },
	])
	@Implement(v1.ed.listPreEncounters)
	async listPreEncounters() {
		return implement(v1.ed.listPreEncounters).handler(async ({ input }) => {
			return this.edService.listPreEncounters(input)
		})
	}

	// Chart Merge

	@RequireAnyPermissions([
		{ module: "ed", action: "view" },
		{ module: "adt", action: "edit" },
	])
	@Implement(v1.ed.mergePreview)
	async mergePreview() {
		return implement(v1.ed.mergePreview).handler(async ({ input }) => {
			return this.edService.getMergePreview(input)
		})
	}

	@RequireAnyPermissions([
		{ module: "ed", action: "edit" },
		{ module: "adt", action: "edit" },
	])
	@Implement(v1.ed.merge)
	async merge(@Session() _session: UserSession) {
		return implement(v1.ed.merge).handler(async ({ input }) => {
			return this.edService.mergePreEncounter(input)
		})
	}

	// ED Queue

	@RequirePermission("ed", "view")
	@Implement(v1.ed.getQueue)
	async getQueue() {
		return implement(v1.ed.getQueue).handler(async ({ input }) => {
			return this.edService.getQueue(input)
		})
	}

	@RequirePermission("ed", "edit")
	@Implement(v1.ed.updateQueueStatus)
	async updateQueueStatus(@Session() _session: UserSession) {
		return implement(v1.ed.updateQueueStatus).handler(async ({ input }) => {
			return this.edService.updateQueueStatus(input)
		})
	}

	// Disposition

	@RequirePermission("ed", "edit")
	@Implement(v1.ed.dispose)
	async dispose(@Session() _session: UserSession) {
		return implement(v1.ed.dispose).handler(async ({ input }) => {
			return this.edService.dispose(input)
		})
	}

	// Tele-Triage

	@RequirePermission("ed", "create")
	@Implement(v1.ed.createInboundTriage)
	async createInboundTriage(@Session() _session: UserSession) {
		return implement(v1.ed.createInboundTriage).handler(async ({ input }) => {
			return this.edService.createInboundTriage(input)
		})
	}

	@RequirePermission("ed", "view")
	@Implement(v1.ed.listInboundTriage)
	async listInboundTriage() {
		return implement(v1.ed.listInboundTriage).handler(async ({ input }) => {
			return this.edService.listInboundTriage(input)
		})
	}

	@RequirePermission("ed", "edit")
	@Implement(v1.ed.markInboundArrived)
	async markInboundArrived(@Session() _session: UserSession) {
		return implement(v1.ed.markInboundArrived).handler(async ({ input }) => {
			return this.edService.markInboundArrived(input)
		})
	}

	@RequirePermission("ed", "edit")
	@Implement(v1.ed.cancelInboundTriage)
	async cancelInboundTriage(@Session() _session: UserSession) {
		return implement(v1.ed.cancelInboundTriage).handler(async ({ input }) => {
			return this.edService.cancelInboundTriage(input)
		})
	}
}

import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"

import { EdService } from "./ed.service"

@Controller()
export class EdController {
	constructor(private readonly edService: EdService) {}

	// Pre-Encounter CRUD

	@Implement(v1.ed.createPreEncounter)
	async createPreEncounter(@Session() session: UserSession) {
		return implement(v1.ed.createPreEncounter).handler(async ({ input }) => {
			return this.edService.createPreEncounter(input)
		})
	}

	@Implement(v1.ed.getPreEncounter)
	async getPreEncounter() {
		return implement(v1.ed.getPreEncounter).handler(async ({ input }) => {
			return this.edService.getPreEncounter(input.id)
		})
	}

	@Implement(v1.ed.updatePreEncounter)
	async updatePreEncounter(@Session() session: UserSession) {
		return implement(v1.ed.updatePreEncounter).handler(async ({ input }) => {
			return this.edService.updatePreEncounter(input)
		})
	}

	@Implement(v1.ed.listPreEncounters)
	async listPreEncounters() {
		return implement(v1.ed.listPreEncounters).handler(async ({ input }) => {
			return this.edService.listPreEncounters(input)
		})
	}

	// Chart Merge

	@Implement(v1.ed.mergePreview)
	async mergePreview() {
		return implement(v1.ed.mergePreview).handler(async ({ input }) => {
			return this.edService.getMergePreview(input)
		})
	}

	@Implement(v1.ed.merge)
	async merge(@Session() session: UserSession) {
		return implement(v1.ed.merge).handler(async ({ input }) => {
			return this.edService.mergePreEncounter(input)
		})
	}

	// ED Queue

	@Implement(v1.ed.getQueue)
	async getQueue() {
		return implement(v1.ed.getQueue).handler(async ({ input }) => {
			return this.edService.getQueue(input)
		})
	}

	@Implement(v1.ed.updateQueueStatus)
	async updateQueueStatus(@Session() session: UserSession) {
		return implement(v1.ed.updateQueueStatus).handler(async ({ input }) => {
			return this.edService.updateQueueStatus(input)
		})
	}

	// Disposition

	@Implement(v1.ed.dispose)
	async dispose(@Session() session: UserSession) {
		return implement(v1.ed.dispose).handler(async ({ input }) => {
			return this.edService.dispose(input)
		})
	}
}

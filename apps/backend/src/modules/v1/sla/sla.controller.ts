import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"

import { SlaService } from "./sla.service"

@Controller()
export class SlaController {
	constructor(private readonly slaService: SlaService) {}

	// ========================================================================
	// SLA Events
	// ========================================================================

	@Implement(v1.sla.listEvents)
	async listEvents() {
		return implement(v1.sla.listEvents).handler(async ({ input }) => {
			return this.slaService.listEvents(input)
		})
	}

	@Implement(v1.sla.getEventsByEncounter)
	async getEventsByEncounter() {
		return implement(v1.sla.getEventsByEncounter).handler(async ({ input }) => {
			return this.slaService.getEventsByEncounter(input.encounterId)
		})
	}

	// ========================================================================
	// SLA Configs
	// ========================================================================

	@Implement(v1.sla.listConfigs)
	async listConfigs() {
		return implement(v1.sla.listConfigs).handler(async ({ input }) => {
			return this.slaService.listConfigs(input)
		})
	}

	@Implement(v1.sla.createConfig)
	async createConfig(@Session() session: UserSession) {
		return implement(v1.sla.createConfig).handler(async ({ input }) => {
			void session
			return this.slaService.createConfig(input)
		})
	}

	@Implement(v1.sla.updateConfig)
	async updateConfig(@Session() session: UserSession) {
		return implement(v1.sla.updateConfig).handler(async ({ input }) => {
			void session
			return this.slaService.updateConfig(input)
		})
	}

	@Implement(v1.sla.deleteConfig)
	async deleteConfig(@Session() session: UserSession) {
		return implement(v1.sla.deleteConfig).handler(async ({ input }) => {
			void session
			return this.slaService.deleteConfig(input.id)
		})
	}

	// ========================================================================
	// SLA Compliance Report
	// ========================================================================

	@Implement(v1.sla.getComplianceReport)
	async getComplianceReport() {
		return implement(v1.sla.getComplianceReport).handler(async ({ input }) => {
			return this.slaService.getComplianceReport(input)
		})
	}
}

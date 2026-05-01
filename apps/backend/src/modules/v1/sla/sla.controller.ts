import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { SlaService } from "./sla.service"

@Controller()
export class SlaController {
	constructor(private readonly slaService: SlaService) {}

	// ========================================================================
	// SLA Events
	// ========================================================================

	@RequirePermission("admin", "view")
	@Implement(v1.sla.listEvents)
	async listEvents() {
		return implement(v1.sla.listEvents).handler(async ({ input }) => {
			return this.slaService.listEvents(input)
		})
	}

	@RequirePermission("patients", "view")
	@Implement(v1.sla.getEventsByEncounter)
	async getEventsByEncounter() {
		return implement(v1.sla.getEventsByEncounter).handler(async ({ input }) => {
			return this.slaService.getEventsByEncounter(input.encounterId)
		})
	}

	// ========================================================================
	// SLA Configs
	// ========================================================================

	@RequirePermission("admin", "view")
	@Implement(v1.sla.listConfigs)
	async listConfigs() {
		return implement(v1.sla.listConfigs).handler(async ({ input }) => {
			return this.slaService.listConfigs(input)
		})
	}

	@RequirePermission("admin", "edit")
	@Implement(v1.sla.createConfig)
	async createConfig(@Session() session: UserSession) {
		return implement(v1.sla.createConfig).handler(async ({ input }) => {
			void session
			return this.slaService.createConfig(input)
		})
	}

	@RequirePermission("admin", "edit")
	@Implement(v1.sla.updateConfig)
	async updateConfig(@Session() session: UserSession) {
		return implement(v1.sla.updateConfig).handler(async ({ input }) => {
			void session
			return this.slaService.updateConfig(input)
		})
	}

	@RequirePermission("admin", "delete")
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

	@RequirePermission("admin", "view")
	@Implement(v1.sla.getComplianceReport)
	async getComplianceReport() {
		return implement(v1.sla.getComplianceReport).handler(async ({ input }) => {
			return this.slaService.getComplianceReport(input)
		})
	}

	// ========================================================================
	// SLA Step Configs
	// ========================================================================

	@RequirePermission("admin", "view")
	@Implement(v1.sla.listStepConfigs)
	async listStepConfigs() {
		return implement(v1.sla.listStepConfigs).handler(async ({ input }) => {
			return this.slaService.listStepConfigs(input)
		})
	}

	@RequirePermission("admin", "edit")
	@Implement(v1.sla.createStepConfig)
	async createStepConfig(@Session() session: UserSession) {
		return implement(v1.sla.createStepConfig).handler(async ({ input }) => {
			void session
			return this.slaService.createStepConfig(input)
		})
	}

	@RequirePermission("admin", "edit")
	@Implement(v1.sla.updateStepConfig)
	async updateStepConfig(@Session() session: UserSession) {
		return implement(v1.sla.updateStepConfig).handler(async ({ input }) => {
			void session
			return this.slaService.updateStepConfig(input)
		})
	}

	@RequirePermission("admin", "delete")
	@Implement(v1.sla.deleteStepConfig)
	async deleteStepConfig(@Session() session: UserSession) {
		return implement(v1.sla.deleteStepConfig).handler(async ({ input }) => {
			void session
			return this.slaService.deleteStepConfig(input.id)
		})
	}

	@RequirePermission("admin", "edit")
	@Implement(v1.sla.appendStatusLog)
	async appendStatusLog() {
		return implement(v1.sla.appendStatusLog).handler(async ({ input }) => {
			return this.slaService.appendStatusLog(input)
		})
	}

	// ========================================================================
	// SLA Analytics (ADM-BE-10)
	// ========================================================================

	@RequirePermission('admin', 'view')
	@Implement(v1.sla.dashboard)
	async slaDashboard() {
		return implement(v1.sla.dashboard).handler(async ({ input }) => {
			return this.slaService.getSlaDashboard(input.facilityId)
		})
	}

	@RequirePermission('admin', 'view')
	@Implement(v1.sla.turnaround)
	async slaTurnaround() {
		return implement(v1.sla.turnaround).handler(async ({ input }) => {
			return this.slaService.getTurnaround(input)
		})
	}

	@RequirePermission('admin', 'view')
	@Implement(v1.sla.bottleneck)
	async slaBottleneck() {
		return implement(v1.sla.bottleneck).handler(async ({ input }) => {
			return this.slaService.getBottleneck(input)
		})
	}

	@RequirePermission('admin', 'view')
	@Implement(v1.sla.exportCompliance)
	async exportCompliance() {
		return implement(v1.sla.exportCompliance).handler(async ({ input }) => {
			return this.slaService.exportCompliance(input)
		})
	}
}

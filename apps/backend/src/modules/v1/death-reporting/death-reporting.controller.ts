import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"

import { v1 } from "@/config/api-versions.config"

import { DeathReportingService } from "./death-reporting.service"

@Controller()
export class DeathReportingController {
	constructor(private readonly deathReportingService: DeathReportingService) {}

	// ========================================================================
	// Status
	// ========================================================================

	@Implement(v1.deathReporting.getStatus)
	async getStatus() {
		return implement(v1.deathReporting.getStatus).handler(async ({ input }) => {
			return this.deathReportingService.getStatus(input)
		})
	}

	// ========================================================================
	// FMDRF
	// ========================================================================

	@Implement(v1.deathReporting.getFmdrf)
	async getFmdrf() {
		return implement(v1.deathReporting.getFmdrf).handler(async ({ input }) => {
			return this.deathReportingService.getFmdrf(input)
		})
	}

	@Implement(v1.deathReporting.createFmdrf)
	async createFmdrf() {
		return implement(v1.deathReporting.createFmdrf).handler(async ({ input }) => {
			return this.deathReportingService.createFmdrf(input)
		})
	}

	@Implement(v1.deathReporting.updateFmdrf)
	async updateFmdrf() {
		return implement(v1.deathReporting.updateFmdrf).handler(async ({ input }) => {
			return this.deathReportingService.updateFmdrf(input)
		})
	}

	// ========================================================================
	// FNDRF
	// ========================================================================

	@Implement(v1.deathReporting.getFndrf)
	async getFndrf() {
		return implement(v1.deathReporting.getFndrf).handler(async ({ input }) => {
			return this.deathReportingService.getFndrf(input)
		})
	}

	@Implement(v1.deathReporting.createFndrf)
	async createFndrf() {
		return implement(v1.deathReporting.createFndrf).handler(async ({ input }) => {
			return this.deathReportingService.createFndrf(input)
		})
	}

	@Implement(v1.deathReporting.updateFndrf)
	async updateFndrf() {
		return implement(v1.deathReporting.updateFndrf).handler(async ({ input }) => {
			return this.deathReportingService.updateFndrf(input)
		})
	}
}

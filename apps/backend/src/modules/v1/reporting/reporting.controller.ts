import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"

import { ReportingService } from "./reporting.service"

@Controller()
export class ReportingController {
	constructor(private readonly reportingService: ReportingService) {}

	// ========================================================================
	// Surveillance Flags
	// ========================================================================

	@Implement(v1.reporting.listSurveillanceFlags)
	async listSurveillanceFlags() {
		return implement(v1.reporting.listSurveillanceFlags).handler(async ({ input }) => {
			return this.reportingService.listSurveillanceFlags(input)
		})
	}

	@Implement(v1.reporting.reviewSurveillanceFlag)
	async reviewSurveillanceFlag(@Session() session: UserSession) {
		return implement(v1.reporting.reviewSurveillanceFlag).handler(async ({ input }) => {
			return this.reportingService.reviewSurveillanceFlag(input, session.user.id)
		})
	}

	@Implement(v1.reporting.scanEncounter)
	async scanEncounter() {
		return implement(v1.reporting.scanEncounter).handler(async ({ input }) => {
			return this.reportingService.scanEncounter(input)
		})
	}

	// ========================================================================
	// PIDSR Cases
	// ========================================================================

	@Implement(v1.reporting.listPidsrCases)
	async listPidsrCases() {
		return implement(v1.reporting.listPidsrCases).handler(async ({ input }) => {
			return this.reportingService.listPidsrCases(input)
		})
	}

	@Implement(v1.reporting.getPidsrCase)
	async getPidsrCase() {
		return implement(v1.reporting.getPidsrCase).handler(async ({ input }) => {
			return this.reportingService.getPidsrCase(input)
		})
	}

	@Implement(v1.reporting.submitPidsrCase)
	async submitPidsrCase() {
		return implement(v1.reporting.submitPidsrCase).handler(async ({ input }) => {
			return this.reportingService.submitPidsrCase(input)
		})
	}

	// ========================================================================
	// Weekly Report
	// ========================================================================

	@Implement(v1.reporting.generateWeeklyReport)
	async generateWeeklyReport() {
		return implement(v1.reporting.generateWeeklyReport).handler(async ({ input }) => {
			return this.reportingService.generateWeeklyReport(input)
		})
	}

	// ========================================================================
	// AHSR
	// ========================================================================

	@Implement(v1.reporting.getAhsrMetrics)
	async getAhsrMetrics() {
		return implement(v1.reporting.getAhsrMetrics).handler(async ({ input }) => {
			return this.reportingService.getAhsrMetrics(input)
		})
	}

	@Implement(v1.reporting.drilldownAhsr)
	async drilldownAhsr() {
		return implement(v1.reporting.drilldownAhsr).handler(async ({ input }) => {
			return this.reportingService.drilldownAhsr(input)
		})
	}

	@Implement(v1.reporting.exportAhsr)
	async exportAhsr(@Session() session: UserSession) {
		return implement(v1.reporting.exportAhsr).handler(async ({ input }) => {
			return this.reportingService.exportAhsr(input, session.user.id)
		})
	}
}

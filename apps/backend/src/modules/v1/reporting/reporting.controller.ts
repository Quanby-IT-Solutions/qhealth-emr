import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { ReportingService } from "./reporting.service"

@Controller()
export class ReportingController {
	constructor(private readonly reportingService: ReportingService) {}

	// ========================================================================
	// Surveillance Flags
	// ========================================================================

	@RequirePermission("reporting", "edit")
	@Implement(v1.reporting.listSurveillanceFlags)
	async listSurveillanceFlags() {
		return implement(v1.reporting.listSurveillanceFlags).handler(async ({ input }) => {
			return this.reportingService.listSurveillanceFlags(input)
		})
	}

	@RequirePermission("reporting", "edit")
	@Implement(v1.reporting.reviewSurveillanceFlag)
	async reviewSurveillanceFlag(@Session() session: UserSession) {
		return implement(v1.reporting.reviewSurveillanceFlag).handler(async ({ input }) => {
			return this.reportingService.reviewSurveillanceFlag(input, session.user.id)
		})
	}

	@RequirePermission("reporting", "edit")
	@Implement(v1.reporting.scanEncounter)
	async scanEncounter() {
		return implement(v1.reporting.scanEncounter).handler(async ({ input }) => {
			return this.reportingService.scanEncounter(input)
		})
	}

	@RequirePermission("reporting", "edit")
	@Implement(v1.reporting.listDetectionRules)
	async listDetectionRules() {
		return implement(v1.reporting.listDetectionRules).handler(async ({ input }) => {
			return this.reportingService.listDetectionRules(input)
		})
	}

	@RequirePermission("reporting", "edit")
	@Implement(v1.reporting.runAutoDetection)
	async runAutoDetection() {
		return implement(v1.reporting.runAutoDetection).handler(async ({ input }) => {
			return this.reportingService.runAutoDetection(input)
		})
	}

	// ========================================================================
	// PIDSR Cases
	// ========================================================================

	@RequirePermission("reporting", "edit")
	@Implement(v1.reporting.listPidsrCases)
	async listPidsrCases() {
		return implement(v1.reporting.listPidsrCases).handler(async ({ input }) => {
			return this.reportingService.listPidsrCases(input)
		})
	}

	@RequirePermission("reporting", "edit")
	@Implement(v1.reporting.getPidsrCase)
	async getPidsrCase() {
		return implement(v1.reporting.getPidsrCase).handler(async ({ input }) => {
			return this.reportingService.getPidsrCase(input)
		})
	}

	@RequirePermission("reporting", "edit")
	@Implement(v1.reporting.submitPidsrCase)
	async submitPidsrCase() {
		return implement(v1.reporting.submitPidsrCase).handler(async ({ input }) => {
			return this.reportingService.submitPidsrCase(input)
		})
	}

	@RequirePermission("reporting", "edit")
	@Implement(v1.reporting.dismissPidsrCase)
	async dismissPidsrCase() {
		return implement(v1.reporting.dismissPidsrCase).handler(async ({ input }) => {
			return this.reportingService.dismissPidsrCase(input)
		})
	}

	// ========================================================================
	// Weekly Report
	// ========================================================================

	@RequirePermission("reporting", "edit")
	@Implement(v1.reporting.generateWeeklyReport)
	async generateWeeklyReport() {
		return implement(v1.reporting.generateWeeklyReport).handler(async ({ input }) => {
			return this.reportingService.generateWeeklyReport(input)
		})
	}

	// ========================================================================
	// AHSR
	// ========================================================================

	@RequirePermission("reporting", "view")
	@Implement(v1.reporting.getAhsrMetrics)
	async getAhsrMetrics() {
		return implement(v1.reporting.getAhsrMetrics).handler(async ({ input }) => {
			return this.reportingService.getAhsrMetrics(input)
		})
	}

	@RequirePermission("reporting", "view")
	@Implement(v1.reporting.getAhsrRealTime)
	async getAhsrRealTime() {
		return implement(v1.reporting.getAhsrRealTime).handler(async ({ input }) => {
			return this.reportingService.getAhsrRealTime(input)
		})
	}

	@RequirePermission("reporting", "edit")
	@Implement(v1.reporting.drilldownAhsr)
	async drilldownAhsr() {
		return implement(v1.reporting.drilldownAhsr).handler(async ({ input }) => {
			return this.reportingService.drilldownAhsr(input)
		})
	}

	@RequirePermission("reporting", "export")
	@Implement(v1.reporting.exportAhsr)
	async exportAhsr(@Session() session: UserSession) {
		return implement(v1.reporting.exportAhsr).handler(async ({ input }) => {
			return this.reportingService.exportAhsr(input, session.user.id)
		})
	}

	// ========================================================================
	// AHSR Validation & Lock
	// ========================================================================

	@RequirePermission("reporting", "view")
	@Implement(v1.reporting.validateAhsr)
	async validateAhsr() {
		return implement(v1.reporting.validateAhsr).handler(async ({ input }) => {
			return this.reportingService.validateAhsr(input)
		})
	}

	@RequirePermission("reporting", "edit")
	@Implement(v1.reporting.lockAhsrPeriod)
	async lockAhsrPeriod(@Session() session: UserSession) {
		return implement(v1.reporting.lockAhsrPeriod).handler(async ({ input }) => {
			return this.reportingService.lockAhsrPeriod(input, session.user.id)
		})
	}

	// ========================================================================
	// Mortality & Morbidity
	// ========================================================================

	@RequirePermission("reporting", "view")
	@Implement(v1.reporting.getMmTop10)
	async getMmTop10() {
		return implement(v1.reporting.getMmTop10).handler(async ({ input }) => {
			return this.reportingService.getMmTop10(input)
		})
	}

	@RequirePermission("reporting", "view")
	@Implement(v1.reporting.getMmCondition)
	async getMmCondition() {
		return implement(v1.reporting.getMmCondition).handler(async ({ input }) => {
			return this.reportingService.getMmCondition(input)
		})
	}

	@RequirePermission("reporting", "export")
	@Implement(v1.reporting.exportMmPdf)
	async exportMmPdf(@Session() session: UserSession) {
		return implement(v1.reporting.exportMmPdf).handler(async ({ input }) => {
			return this.reportingService.exportMmPdf(input, session.user.id)
		})
	}
}

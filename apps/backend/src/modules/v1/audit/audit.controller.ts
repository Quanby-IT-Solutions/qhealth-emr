import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { AuditService } from "./audit.service"
import { NotificationService } from "../notifications/notification.service"

@Controller()
export class AuditController {
	constructor(
		private readonly auditService: AuditService,
		private readonly notificationService: NotificationService
	) {}

	// ===========================================================================
	// Audit Logs
	// ===========================================================================

	@RequirePermission("audit", "view")
	@Implement(v1.audit.log.list)
	async listAuditLogs() {
		return implement(v1.audit.log.list).handler(async ({ input }) => {
			return this.auditService.findAll(input)
		})
	}

	@RequirePermission("audit", "view")
	@Implement(v1.audit.log.get)
	async getAuditLog() {
		return implement(v1.audit.log.get).handler(async ({ input }) => {
			return this.auditService.findOne(input.id)
		})
	}

	@RequirePermission("audit", "export")
	@Implement(v1.audit.log.exportCsv)
	async exportAuditLogs() {
		return implement(v1.audit.log.exportCsv).handler(async ({ input }) => {
			return this.auditService.exportLogs(input)
		})
	}

	@RequirePermission("audit", "view")
	@Implement(v1.audit.log.configHistory)
	async getConfigHistory() {
		return implement(v1.audit.log.configHistory).handler(async ({ input }) => {
			return this.auditService.getConfigHistory(input)
		})
	}

	// ===========================================================================
	// Break Glass
	// ===========================================================================

	@RequirePermission("audit", "view")
	@Implement(v1.audit.breakGlass.list)
	async listBreakGlass() {
		return implement(v1.audit.breakGlass.list).handler(async ({ input }) => {
			return this.auditService.findBreakGlassEvents(input)
		})
	}

	@RequirePermission("audit", "view")
	@Implement(v1.audit.breakGlass.get)
	async getBreakGlass() {
		return implement(v1.audit.breakGlass.get).handler(async ({ input }) => {
			return this.auditService.findBreakGlassEvent(input.id)
		})
	}

	@RequirePermission("audit", "view")
	@Implement(v1.audit.breakGlass.patterns)
	async getBreakGlassPatterns() {
		return implement(v1.audit.breakGlass.patterns).handler(async ({ input }) => {
			return this.auditService.getBreakGlassPatterns(input)
		})
	}

	@RequirePermission("audit", "create")
	@Implement(v1.audit.breakGlass.create)
	async createBreakGlass(
		@Session()
		session: UserSession
	) {
		return implement(v1.audit.breakGlass.create).handler(async ({ input }) => {
			const staffProfileId = await this.auditService.resolveStaffProfileId(session.user.id)

			const event = await this.auditService.createBreakGlass({
				...input,
				clinicianStaffId: staffProfileId,
				userId: session.user.id,
			})

			await this.notificationService.send({
				facilityId: input.facilityId,
				recipientStaffId: staffProfileId,
				topic: "break_glass",
				title: "Break-Glass Access Requested",
				body: `Emergency access requested for patient. Reason: ${input.reasonCategory}`,
				data: {
					breakGlassEventId: event.id,
					patientId: input.patientId,
					reasonCategory: input.reasonCategory,
				},
			})

			return event
		})
	}

	@RequirePermission("audit", "view")
	@Implement(v1.audit.breakGlass.review)
	async reviewBreakGlass(
		@Session()
		session: UserSession
	) {
		return implement(v1.audit.breakGlass.review).handler(async ({ input }) => {
			const reviewerStaffId = await this.auditService.resolveStaffProfileId(session.user.id)
			return this.auditService.reviewBreakGlass({
				...input,
				reviewerStaffId,
			})
		})
	}
}

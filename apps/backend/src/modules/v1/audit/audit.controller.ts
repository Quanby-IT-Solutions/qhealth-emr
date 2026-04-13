import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"

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

	@Implement(v1.audit.log.list)
	async listAuditLogs() {
		return implement(v1.audit.log.list).handler(async ({ input }) => {
			return this.auditService.findAll(input)
		})
	}

	@Implement(v1.audit.log.get)
	async getAuditLog() {
		return implement(v1.audit.log.get).handler(async ({ input }) => {
			return this.auditService.findOne(input.id)
		})
	}

	@Implement(v1.audit.log.exportCsv)
	async exportAuditLogs() {
		return implement(v1.audit.log.exportCsv).handler(async ({ input }) => {
			return this.auditService.exportLogs(input)
		})
	}

	// ===========================================================================
	// Break Glass
	// ===========================================================================

	@Implement(v1.audit.breakGlass.list)
	async listBreakGlass() {
		return implement(v1.audit.breakGlass.list).handler(async ({ input }) => {
			return this.auditService.findBreakGlassEvents(input)
		})
	}

	@Implement(v1.audit.breakGlass.get)
	async getBreakGlass() {
		return implement(v1.audit.breakGlass.get).handler(async ({ input }) => {
			return this.auditService.findBreakGlassEvent(input.id)
		})
	}

	@Implement(v1.audit.breakGlass.create)
	async createBreakGlass(
		@Session()
		session: UserSession
	) {
		return implement(v1.audit.breakGlass.create).handler(async ({ input }) => {
			// TODO: Resolve clinicianStaffId from session.user.id + facilityId
			// For now use the userId as a placeholder that will be resolved by the RBAC layer
			const event = await this.auditService.createBreakGlass({
				...input,
				clinicianStaffId: session.user.id,
				userId: session.user.id,
			})

			// TODO: Resolve privacy officer staff IDs from RBAC
			// For now, send a system notification that can be caught by the notification stream
			await this.notificationService.send({
				facilityId: input.facilityId,
				recipientStaffId: session.user.id, // placeholder — should be privacy officer
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

	@Implement(v1.audit.breakGlass.review)
	async reviewBreakGlass(
		@Session()
		session: UserSession
	) {
		return implement(v1.audit.breakGlass.review).handler(async ({ input }) => {
			return this.auditService.reviewBreakGlass({
				...input,
				reviewerStaffId: session.user.id, // TODO: resolve from RBAC
			})
		})
	}
}

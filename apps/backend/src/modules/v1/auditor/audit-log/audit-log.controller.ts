import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { AuditLogService } from "./audit-log.service"

@Controller()
export class AuditLogController {
	constructor(private readonly auditLogService: AuditLogService) {}

	@RequirePermission("audit", "view")
	@Implement(v1.auditor.events.list)
	async listEvents(@Session() session: UserSession) {
		return implement(v1.auditor.events.list).handler(async ({ input }) => {
			const result = await this.auditLogService.list({
				facilityId: input.facilityId,
				startDate: input.startDate,
				endDate: input.endDate,
				userId: input.userId,
				action: input.action,
				entityType: input.resourceType,
				sessionId: input.sessionId,
				severity: input.severity,
				outcome: input.outcome,
				page: input.page,
				limit: input.limit,
			})
			// Self-audit: record that this auditor queried the audit log
			await this.auditLogService.emitSelfAudit({
				facilityId: input.facilityId,
				auditorUserId: session.user.id,
				action: "read",
				entityType: "audit_log_list",
				entityId: input.facilityId,
				metadata: { filters: input },
			})
			return result
		})
	}

	@RequirePermission("audit", "view")
	@Implement(v1.auditor.events.get)
	async getEvent(@Session() session: UserSession) {
		return implement(v1.auditor.events.get).handler(async ({ input }) => {
			const event = await this.auditLogService.get(input.id)
			if (!event) throw new Error("Audit event not found")
			// Self-audit: record that this auditor read a specific event
			await this.auditLogService.emitSelfAudit({
				facilityId: event.facilityId,
				auditorUserId: session.user.id,
				action: "read",
				entityType: "audit_log",
				entityId: input.id,
				metadata: { readBy: session.user.id },
			})
			return event
		})
	}

	@RequirePermission("audit", "view")
	@Implement(v1.auditor.events.session)
	async getSessionEvents(@Session() session: UserSession) {
		return implement(v1.auditor.events.session).handler(async ({ input }) => {
			const events = await this.auditLogService.getSessionEvents(input.sessionId, input.facilityId)
			await this.auditLogService.emitSelfAudit({
				facilityId: input.facilityId,
				auditorUserId: session.user.id,
				action: "read",
				entityType: "audit_log_session",
				entityId: input.sessionId,
				metadata: { sessionId: input.sessionId },
			})
			return { sessionId: input.sessionId, events }
		})
	}

	@RequirePermission("audit", "export")
	@Implement(v1.auditor.events.export)
	async exportEvents(@Session() session: UserSession) {
		return implement(v1.auditor.events.export).handler(async ({ input }) => {
			const exporterStaffId = await this.auditLogService.resolveStaffProfile(
				input.facilityId,
				session.user.id
			)
			return this.auditLogService.export({
				facilityId: input.facilityId,
				exporterStaffId: exporterStaffId ?? session.user.id,
				format: input.format,
				filterSnapshot: input as Record<string, unknown>,
				filter: {
					facilityId: input.facilityId,
					startDate: input.startDate,
					endDate: input.endDate,
					userId: input.userId,
					action: input.action,
					entityType: input.resourceType,
					severity: input.severity,
					outcome: input.outcome,
				},
				auditorUserId: session.user.id,
			})
		})
	}
}

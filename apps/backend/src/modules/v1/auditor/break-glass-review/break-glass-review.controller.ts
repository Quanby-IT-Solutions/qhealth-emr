import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { BreakGlassReviewService } from "./break-glass-review.service"

@Controller()
export class BreakGlassReviewController {
	constructor(private readonly reviewService: BreakGlassReviewService) {}

	@RequirePermission("audit", "view")
	@Implement(v1.auditor.breakGlass.inboxList)
	async inboxList() {
		return implement(v1.auditor.breakGlass.inboxList).handler(async ({ input }) => {
			return this.reviewService.inbox({
				facilityId: input.facilityId,
				status: input.status,
				clinicianId: input.clinicianId,
				dateFrom: input.dateFrom,
				dateTo: input.dateTo,
				slaBreached: input.slaBreached,
				page: input.page,
				limit: input.limit,
			})
		})
	}

	@RequirePermission("audit", "view")
	@Implement(v1.auditor.breakGlass.eventGet)
	async eventGet() {
		return implement(v1.auditor.breakGlass.eventGet).handler(async ({ input }) => {
			return this.reviewService.getEvent(input.eventId)
		})
	}

	@RequirePermission("audit", "view")
	@Implement(v1.auditor.breakGlass.reviewApprove)
	async reviewApprove(@Session() session: UserSession) {
		return implement(v1.auditor.breakGlass.reviewApprove).handler(async ({ input }) => {
			const event = await this.reviewService.getEvent(input.eventId)
			const reviewerStaffId = await this.reviewService.resolveStaffProfile(
				event.facilityId,
				session.user.id
			)
			if (!reviewerStaffId) throw new Error("Reviewer staff profile not found")
			return this.reviewService.approve({
				eventId: input.eventId,
				reviewerStaffId,
				auditorUserId: session.user.id,
				action: "approve",
				reason: input.reason,
			})
		})
	}

	@RequirePermission("audit", "view")
	@Implement(v1.auditor.breakGlass.reviewFlag)
	async reviewFlag(@Session() session: UserSession) {
		return implement(v1.auditor.breakGlass.reviewFlag).handler(async ({ input }) => {
			const event = await this.reviewService.getEvent(input.eventId)
			const reviewerStaffId = await this.reviewService.resolveStaffProfile(
				event.facilityId,
				session.user.id
			)
			if (!reviewerStaffId) throw new Error("Reviewer staff profile not found")
			return this.reviewService.flag({
				eventId: input.eventId,
				reviewerStaffId,
				auditorUserId: session.user.id,
				action: "flag",
				reason: input.reason,
			})
		})
	}

	@RequirePermission("audit", "view")
	@Implement(v1.auditor.breakGlass.reviewAddNote)
	async reviewAddNote(@Session() session: UserSession) {
		return implement(v1.auditor.breakGlass.reviewAddNote).handler(async ({ input }) => {
			const event = await this.reviewService.getEvent(input.eventId)
			const reviewerStaffId = await this.reviewService.resolveStaffProfile(
				event.facilityId,
				session.user.id
			)
			if (!reviewerStaffId) throw new Error("Reviewer staff profile not found")
			return this.reviewService.addNote({
				eventId: input.eventId,
				reviewerStaffId,
				auditorUserId: session.user.id,
				action: "note",
				reason: input.reason,
			})
		})
	}

	@RequirePermission("audit", "view")
	@Implement(v1.auditor.breakGlass.historyByClinician)
	async historyByClinician() {
		return implement(v1.auditor.breakGlass.historyByClinician).handler(async ({ input }) => {
			return this.reviewService.historyByClinician({
				facilityId: input.facilityId,
				clinicianId: input.clinicianId,
			})
		})
	}
}

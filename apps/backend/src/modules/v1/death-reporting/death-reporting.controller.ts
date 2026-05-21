import { Controller, ForbiddenException, NotFoundException } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import { and, eq } from "drizzle-orm"

import { deathReports, staffProfiles } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { DeathReportingService } from "./death-reporting.service"

@Controller()
export class DeathReportingController {
	constructor(private readonly deathReportingService: DeathReportingService) {}

	private async resolveActiveStaffProfileId(userId: string, deathReportId: string) {
		const [report] = await db
			.select({ facilityId: deathReports.facilityId })
			.from(deathReports)
			.where(eq(deathReports.id, deathReportId))
			.limit(1)

		if (!report) {
			throw new NotFoundException(`Death report ${deathReportId} not found`)
		}

		const [profile] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(
				and(
					eq(staffProfiles.userId, userId),
					eq(staffProfiles.facilityId, report.facilityId),
					eq(staffProfiles.isActive, true)
				)
			)
			.limit(1)

		if (!profile) {
			throw new ForbiddenException(
				"An active staff profile in this facility is required to release a death certificate"
			)
		}

		return profile.id
	}

	// ========================================================================
	// Status
	// ========================================================================

	@RequirePermission("death_reporting", "view")
	@Implement(v1.deathReporting.getStatus)
	async getStatus() {
		return implement(v1.deathReporting.getStatus).handler(async ({ input }) => {
			return this.deathReportingService.getStatus(input)
		})
	}

	// ========================================================================
	// FMDRF
	// ========================================================================

	@RequirePermission("death_reporting", "view")
	@Implement(v1.deathReporting.getFmdrf)
	async getFmdrf() {
		return implement(v1.deathReporting.getFmdrf).handler(async ({ input }) => {
			return this.deathReportingService.getFmdrf(input)
		})
	}

	@RequirePermission("death_reporting", "create")
	@Implement(v1.deathReporting.createFmdrf)
	async createFmdrf() {
		return implement(v1.deathReporting.createFmdrf).handler(async ({ input }) => {
			return this.deathReportingService.createFmdrf(input)
		})
	}

	@RequirePermission("death_reporting", "edit")
	@Implement(v1.deathReporting.updateFmdrf)
	async updateFmdrf() {
		return implement(v1.deathReporting.updateFmdrf).handler(async ({ input }) => {
			return this.deathReportingService.updateFmdrf(input)
		})
	}

	// ========================================================================
	// FNDRF
	// ========================================================================

	@RequirePermission("death_reporting", "view")
	@Implement(v1.deathReporting.getFndrf)
	async getFndrf() {
		return implement(v1.deathReporting.getFndrf).handler(async ({ input }) => {
			return this.deathReportingService.getFndrf(input)
		})
	}

	@RequirePermission("death_reporting", "create")
	@Implement(v1.deathReporting.createFndrf)
	async createFndrf() {
		return implement(v1.deathReporting.createFndrf).handler(async ({ input }) => {
			return this.deathReportingService.createFndrf(input)
		})
	}

	@RequirePermission("death_reporting", "edit")
	@Implement(v1.deathReporting.updateFndrf)
	async updateFndrf() {
		return implement(v1.deathReporting.updateFndrf).handler(async ({ input }) => {
			return this.deathReportingService.updateFndrf(input)
		})
	}

	// SLA-017: Payment checkpoint
	@RequirePermission("death_reporting", "edit")
	@Implement(v1.deathReporting.markDeathReportPaid)
	async markDeathReportPaid() {
		return implement(v1.deathReporting.markDeathReportPaid).handler(async ({ input }) => {
			return this.deathReportingService.markDeathReportPaid({
				id: input.id,
				paidAt: input.paidAt ? new Date(input.paidAt) : undefined,
			})
		})
	}

	// SLA-021: Release audit checkpoint
	@RequirePermission("death_reporting", "edit")
	@Implement(v1.deathReporting.markDeathReportReleased)
	async markDeathReportReleased(@Session() session: UserSession) {
		return implement(v1.deathReporting.markDeathReportReleased).handler(async ({ input }) => {
			const releasedByStaffId = await this.resolveActiveStaffProfileId(session.user.id, input.id)

			return this.deathReportingService.markDeathReportReleased({
				id: input.id,
				releasedByStaffId,
				releasedAt: input.releasedAt ? new Date(input.releasedAt) : undefined,
			})
		})
	}
}

import { Controller, ForbiddenException, NotFoundException } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import { and, eq } from "drizzle-orm"

import { birthRegistrations, staffProfiles } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { CivilRegistryService } from "./civil-registry.service"

@Controller()
export class CivilRegistryController {
	constructor(private readonly civilRegistryService: CivilRegistryService) {}

	private async resolveActiveStaffProfileId(userId: string, birthRegistrationId: string) {
		const [registration] = await db
			.select({ facilityId: birthRegistrations.facilityId })
			.from(birthRegistrations)
			.where(eq(birthRegistrations.id, birthRegistrationId))
			.limit(1)

		if (!registration) {
			throw new NotFoundException(`Birth registration ${birthRegistrationId} not found`)
		}

		const [profile] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(
				and(
					eq(staffProfiles.userId, userId),
					eq(staffProfiles.facilityId, registration.facilityId),
					eq(staffProfiles.isActive, true)
				)
			)
			.limit(1)

		if (!profile) {
			throw new ForbiddenException(
				"An active staff profile in this facility is required to release a birth certificate"
			)
		}

		return profile.id
	}

	@RequirePermission("civil_registry", "view")
	@Implement(v1.civilRegistry.listBirthRegistrations)
	async listBirthRegistrations() {
		return implement(v1.civilRegistry.listBirthRegistrations).handler(async ({ input }) => {
			return this.civilRegistryService.listBirthRegistrations(input)
		})
	}

	@RequirePermission("civil_registry", "view")
	@Implement(v1.civilRegistry.getBirthRegistration)
	async getBirthRegistration() {
		return implement(v1.civilRegistry.getBirthRegistration).handler(async ({ input }) => {
			return this.civilRegistryService.getBirthRegistration(input.id)
		})
	}

	@RequirePermission("civil_registry", "create")
	@Implement(v1.civilRegistry.createBirthRegistration)
	async createBirthRegistration() {
		return implement(v1.civilRegistry.createBirthRegistration).handler(async ({ input }) => {
			return this.civilRegistryService.createBirthRegistration(input)
		})
	}

	@RequirePermission("civil_registry", "edit")
	@Implement(v1.civilRegistry.updateBirthRegistration)
	async updateBirthRegistration() {
		return implement(v1.civilRegistry.updateBirthRegistration).handler(async ({ input }) => {
			return this.civilRegistryService.updateBirthRegistration(input)
		})
	}

	// SLA-017: payment checkpoint
	@RequirePermission("civil_registry", "edit")
	@Implement(v1.civilRegistry.markBirthRegistrationPaid)
	async markBirthRegistrationPaid() {
		return implement(v1.civilRegistry.markBirthRegistrationPaid).handler(async ({ input }) => {
			return this.civilRegistryService.markBirthRegistrationPaid({
				id: input.id,
				paidAt: input.paidAt ? new Date(input.paidAt) : undefined,
			})
		})
	}

	// SLA-021: release audit checkpoint
	@RequirePermission("civil_registry", "edit")
	@Implement(v1.civilRegistry.markBirthRegistrationReleased)
	async markBirthRegistrationReleased(@Session() session: UserSession) {
		return implement(v1.civilRegistry.markBirthRegistrationReleased).handler(async ({ input }) => {
			const releasedByStaffId = await this.resolveActiveStaffProfileId(session.user.id, input.id)

			return this.civilRegistryService.markBirthRegistrationReleased({
				id: input.id,
				releasedByStaffId,
				releasedAt: input.releasedAt ? new Date(input.releasedAt) : undefined,
			})
		})
	}
}

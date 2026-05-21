import { Controller, ForbiddenException, NotFoundException } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import { and, eq } from "drizzle-orm"

import { birthRegistrations, deathCertificateRegistrations, staffProfiles } from "@repo/db/schema"

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

	private async resolveActiveStaffProfileIdForDeathCertificate(
		userId: string,
		deathCertificateRegistrationId: string
	) {
		const [registration] = await db
			.select({ facilityId: deathCertificateRegistrations.facilityId })
			.from(deathCertificateRegistrations)
			.where(eq(deathCertificateRegistrations.id, deathCertificateRegistrationId))
			.limit(1)

		if (!registration) {
			throw new NotFoundException(
				`Death certificate registration ${deathCertificateRegistrationId} not found`
			)
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
				"An active staff profile in this facility is required to release a death certificate"
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

	@RequirePermission("civil_registry", "view")
	@Implement(v1.civilRegistry.listDeathCertificateRegistrations)
	async listDeathCertificateRegistrations() {
		return implement(v1.civilRegistry.listDeathCertificateRegistrations).handler(
			async ({ input }) => {
				return this.civilRegistryService.listDeathCertificateRegistrations(input)
			}
		)
	}

	@RequirePermission("civil_registry", "view")
	@Implement(v1.civilRegistry.getDeathCertificateRegistration)
	async getDeathCertificateRegistration() {
		return implement(v1.civilRegistry.getDeathCertificateRegistration).handler(
			async ({ input }) => {
				return this.civilRegistryService.getDeathCertificateRegistration(input.id)
			}
		)
	}

	@RequirePermission("civil_registry", "create")
	@Implement(v1.civilRegistry.createDeathCertificateRegistration)
	async createDeathCertificateRegistration() {
		return implement(v1.civilRegistry.createDeathCertificateRegistration).handler(
			async ({ input }) => {
				return this.civilRegistryService.createDeathCertificateRegistration(input)
			}
		)
	}

	@RequirePermission("civil_registry", "edit")
	@Implement(v1.civilRegistry.updateDeathCertificateRegistration)
	async updateDeathCertificateRegistration() {
		return implement(v1.civilRegistry.updateDeathCertificateRegistration).handler(
			async ({ input }) => {
				return this.civilRegistryService.updateDeathCertificateRegistration(input)
			}
		)
	}

	@RequirePermission("civil_registry", "edit")
	@Implement(v1.civilRegistry.markDeathCertificateRegistrationPaid)
	async markDeathCertificateRegistrationPaid() {
		return implement(v1.civilRegistry.markDeathCertificateRegistrationPaid).handler(
			async ({ input }) => {
				return this.civilRegistryService.markDeathCertificateRegistrationPaid({
					id: input.id,
					paidAt: input.paidAt ? new Date(input.paidAt) : undefined,
				})
			}
		)
	}

	@RequirePermission("civil_registry", "edit")
	@Implement(v1.civilRegistry.markDeathCertificateRegistrationReleased)
	async markDeathCertificateRegistrationReleased(@Session() session: UserSession) {
		return implement(v1.civilRegistry.markDeathCertificateRegistrationReleased).handler(
			async ({ input }) => {
				const releasedByStaffId = await this.resolveActiveStaffProfileIdForDeathCertificate(
					session.user.id,
					input.id
				)

				return this.civilRegistryService.markDeathCertificateRegistrationReleased({
					id: input.id,
					releasedByStaffId,
					releasedAt: input.releasedAt ? new Date(input.releasedAt) : undefined,
				})
			}
		)
	}
}

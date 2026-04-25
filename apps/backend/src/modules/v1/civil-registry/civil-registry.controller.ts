import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { CivilRegistryService } from "./civil-registry.service"

@Controller()
export class CivilRegistryController {
	constructor(private readonly civilRegistryService: CivilRegistryService) {}

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
	async markBirthRegistrationReleased() {
		return implement(v1.civilRegistry.markBirthRegistrationReleased).handler(async ({ input }) => {
			return this.civilRegistryService.markBirthRegistrationReleased({
				id: input.id,
				releasedByStaffId: input.releasedByStaffId,
				releasedAt: input.releasedAt ? new Date(input.releasedAt) : undefined,
			})
		})
	}
}

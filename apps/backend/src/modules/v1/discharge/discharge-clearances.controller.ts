import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequireAnyPermissions, RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { DischargeClearancesService } from "./discharge-clearances.service"

@Controller()
export class DischargeClearancesController {
	constructor(private readonly clearancesService: DischargeClearancesService) {}

	@RequirePermission("adt", "view")
	@Implement(v1.discharge.getClearanceStatus)
	async getClearanceStatus() {
		return implement(v1.discharge.getClearanceStatus).handler(async ({ input }) => {
			return this.clearancesService.getClearanceStatus(input.encounterId)
		})
	}

	@RequireAnyPermissions([
		{ module: "orders", action: "verify" },
		{ module: "adt", action: "edit" },
	])
	@Implement(v1.discharge.confirmPharmacyClearance)
	async confirmPharmacyClearance(@Session() session: UserSession) {
		return implement(v1.discharge.confirmPharmacyClearance).handler(async ({ input }) => {
			const staffId = session.user.id
			return this.clearancesService.confirmPharmacyClearance(input.encounterId, staffId)
		})
	}

	@RequireAnyPermissions([
		{ module: "nursing", action: "create" },
		{ module: "adt", action: "edit" },
	])
	@Implement(v1.discharge.confirmNursingClearance)
	async confirmNursingClearance(@Session() session: UserSession) {
		return implement(v1.discharge.confirmNursingClearance).handler(async ({ input }) => {
			const staffId = session.user.id
			return this.clearancesService.confirmNursingClearance(input.encounterId, staffId)
		})
	}

	@RequireAnyPermissions([
		{ module: "billing", action: "create" },
		{ module: "adt", action: "edit" },
	])
	@Implement(v1.discharge.confirmBillingSignOff)
	async confirmBillingSignOff(@Session() session: UserSession) {
		return implement(v1.discharge.confirmBillingSignOff).handler(async ({ input }) => {
			const staffId = session.user.id
			return this.clearancesService.confirmBillingSignOff(input.encounterId, staffId)
		})
	}
}

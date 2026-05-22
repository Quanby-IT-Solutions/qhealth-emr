import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { ancillaryClearanceContract } from "@repo/contracts"

import { v1 } from "@/config/api-versions.config"
import { RequireAnyPermissions, RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { AncillaryClearanceService } from "./ancillary-clearance.service"

const ancillaryV1 = (v1.msw as unknown as { ancillaryClearance: typeof ancillaryClearanceContract })
	.ancillaryClearance

@Controller()
export class AncillaryClearanceController {
	constructor(private readonly ancillaryClearanceService: AncillaryClearanceService) {}

	@RequirePermission("msw", "view")
	@Implement(ancillaryV1.queue)
	async queue() {
		return implement(ancillaryV1.queue).handler(async ({ input }) => {
			return this.ancillaryClearanceService.queue(input)
		})
	}

	@RequireAnyPermissions([
		{ module: "msw", action: "view" },
		{ module: "laboratory", action: "view" },
		{ module: "radiology", action: "view" },
	])
	@Implement(ancillaryV1.procedureLog)
	async procedureLog() {
		return implement(ancillaryV1.procedureLog).handler(async ({ input }) => {
			return this.ancillaryClearanceService.procedureLog(input)
		})
	}

	@RequireAnyPermissions([
		{ module: "msw", action: "view" },
		{ module: "laboratory", action: "view" },
		{ module: "radiology", action: "view" },
	])
	@Implement(ancillaryV1.resolveProcedureClearance)
	async resolveProcedureClearance() {
		return implement(ancillaryV1.resolveProcedureClearance).handler(async ({ input }) => {
			return this.ancillaryClearanceService.resolveProcedureClearance(input)
		})
	}

	@RequireAnyPermissions([
		{ module: "laboratory", action: "edit" },
		{ module: "radiology", action: "edit" },
	])
	@Implement(ancillaryV1.saveProcedureClearance)
	async saveProcedureClearance() {
		return implement(ancillaryV1.saveProcedureClearance).handler(async ({ input }) => {
			return this.ancillaryClearanceService.saveProcedureClearance(input)
		})
	}

	@RequirePermission("msw", "create")
	@Implement(ancillaryV1.applyCoverage)
	async applyCoverage() {
		return implement(ancillaryV1.applyCoverage).handler(async ({ input }) => {
			return this.ancillaryClearanceService.applyCoverage(input)
		})
	}

	@RequirePermission("msw", "create")
	@Implement(ancillaryV1.override)
	async override() {
		return implement(ancillaryV1.override).handler(async ({ input }) => {
			return this.ancillaryClearanceService.override(input)
		})
	}

	@RequireAnyPermissions([
		{ module: "laboratory", action: "edit" },
		{ module: "radiology", action: "edit" },
	])
	@Implement(ancillaryV1.procedureScan)
	async procedureScan(@Session() session: UserSession) {
		return implement(ancillaryV1.procedureScan).handler(async ({ input }) => {
			return this.ancillaryClearanceService.procedureScan({ ...input, staffId: session.user.id })
		})
	}

	@RequirePermission("msw", "view")
	@Implement(ancillaryV1.history)
	async history() {
		return implement(ancillaryV1.history).handler(async ({ input }) => {
			return this.ancillaryClearanceService.history(input.orderId)
		})
	}
}

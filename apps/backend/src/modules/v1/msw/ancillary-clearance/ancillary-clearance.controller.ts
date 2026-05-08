import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"

import { ancillaryClearanceContract } from "@repo/contracts"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

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

	@RequirePermission("msw", "view")
	@Implement(ancillaryV1.history)
	async history() {
		return implement(ancillaryV1.history).handler(async ({ input }) => {
			return this.ancillaryClearanceService.history(input.orderId)
		})
	}
}

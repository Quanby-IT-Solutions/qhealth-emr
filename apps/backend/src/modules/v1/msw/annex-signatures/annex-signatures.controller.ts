import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"

import { annexSignaturesContract } from "@repo/contracts"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { AnnexSignaturesService } from "./annex-signatures.service"

const annexV1 = (v1.msw as unknown as { annexSignatures: typeof annexSignaturesContract })
	.annexSignatures

@Controller()
export class AnnexSignaturesController {
	constructor(private readonly annexSignaturesService: AnnexSignaturesService) {}

	@RequirePermission("msw", "view")
	@Implement(annexV1.list)
	async list() {
		return implement(annexV1.list).handler(async ({ input }) => {
			return this.annexSignaturesService.list(input)
		})
	}

	@RequirePermission("msw", "view")
	@Implement(annexV1.get)
	async get() {
		return implement(annexV1.get).handler(async ({ input }) => {
			return this.annexSignaturesService.get(input.id)
		})
	}

	@RequirePermission("msw", "create")
	@Implement(annexV1.capture)
	async capture() {
		return implement(annexV1.capture).handler(async ({ input }) => {
			return this.annexSignaturesService.capture(input)
		})
	}
}

import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { himContract } from "@repo/contracts"
import { v1 } from "@/config/api-versions.config"

import { RequireAnyPermissions } from "@/modules/v1/rbac/rbac.guard"

import { CodingService } from "./coding.service"

// Runtime coding procedures with full /v1/him/* paths, typed via himContract
const himV1 = v1.him as unknown as typeof himContract

@Controller()
export class CodingController {
	constructor(private readonly codingService: CodingService) {}

	@RequireAnyPermissions([
		{ module: "him.coding", action: "read" },
		{ module: "medical_records", action: "view" },
	])
	@Implement(himV1.listCodes)
	async listCodes() {
		return implement(himV1.listCodes).handler(async ({ input }) => {
			return this.codingService.listCodes(input) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "him.coding", action: "write" },
		{ module: "medical_records", action: "edit" },
	])
	@Implement(himV1.upsertCodes)
	async upsertCodes(@Session() session: UserSession) {
		return implement(himV1.upsertCodes).handler(async ({ input }) => {
			return this.codingService.upsertCodes({ ...input, staffId: session.user.id }) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "him.coding", action: "write" },
		{ module: "medical_records", action: "edit" },
	])
	@Implement(himV1.signCodes)
	async signCodes(@Session() session: UserSession) {
		return implement(himV1.signCodes).handler(async ({ input }) => {
			return this.codingService.signCodes({ ...input, staffId: session.user.id }) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "him.coding", action: "write" },
		{ module: "medical_records", action: "edit" },
	])
	@Implement(himV1.amendCodes)
	async amendCodes(@Session() session: UserSession) {
		return implement(himV1.amendCodes).handler(async ({ input }) => {
			return this.codingService.amendCodes({ ...input, staffId: session.user.id }) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "him.coding", action: "read" },
		{ module: "medical_records", action: "view" },
	])
	@Implement(himV1.validateCodes)
	async validateCodes() {
		return implement(himV1.validateCodes).handler(async ({ input }) => {
			return this.codingService.validateCodes(input) as never
		})
	}
}
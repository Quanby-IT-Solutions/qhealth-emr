import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { himContract } from "@repo/contracts"

import { v1 } from "@/config/api-versions.config"
import { RequireAnyPermissions } from "@/modules/v1/rbac/rbac.guard"

import { HaiService } from "./hai.service"

// Runtime HAI procedures with full /v1/him/* paths, typed via himContract
const himV1 = v1.him as unknown as typeof himContract

@Controller()
export class HaiController {
	constructor(private readonly haiService: HaiService) {}

	@RequireAnyPermissions([
		{ module: "him.hai", action: "read" },
		{ module: "reporting", action: "view" },
	])
	@Implement(himV1.listHai)
	async listHai() {
		return implement(himV1.listHai).handler(async ({ input }) => {
			return this.haiService.listHai(input) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "him.hai", action: "write" },
		{ module: "reporting", action: "edit" },
	])
	@Implement(himV1.confirmHai)
	async confirmHai(@Session() session: UserSession) {
		return implement(himV1.confirmHai).handler(async ({ input }) => {
			return this.haiService.decideHai({
				haiTagId: input.haiTagId,
				decision: "confirm",
				reason: input.reason,
				staffId: session.user.id,
			}) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "him.hai", action: "write" },
		{ module: "reporting", action: "edit" },
	])
	@Implement(himV1.reclassifyHai)
	async reclassifyHai(@Session() session: UserSession) {
		return implement(himV1.reclassifyHai).handler(async ({ input }) => {
			return this.haiService.decideHai({
				haiTagId: input.haiTagId,
				decision: "reclassify",
				newType: input.newType,
				reason: input.reason,
				staffId: session.user.id,
			}) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "him.hai", action: "write" },
		{ module: "reporting", action: "edit" },
	])
	@Implement(himV1.dismissHai)
	async dismissHai(@Session() session: UserSession) {
		return implement(himV1.dismissHai).handler(async ({ input }) => {
			return this.haiService.decideHai({
				haiTagId: input.haiTagId,
				decision: "dismiss",
				reason: input.reason,
				staffId: session.user.id,
			}) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "him.hai", action: "read" },
		{ module: "reporting", action: "view" },
	])
	@Implement(himV1.haiReport)
	async haiReport() {
		return implement(himV1.haiReport).handler(async ({ input }) => {
			return this.haiService.haiReport(input) as never
		})
	}

	@RequireAnyPermissions([
		{ module: "him.hai", action: "write" },
		{ module: "reporting", action: "edit" },
	])
	@Implement(himV1.haiExport)
	async haiExport() {
		return implement(himV1.haiExport).handler(async ({ input }) => {
			return this.haiService.haiExport(input) as never
		})
	}
}

import { Controller, Req } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import type { Request } from "express"

import { v1 } from "@/config/api-versions.config"
import { RequireAnyPermissions } from "@/modules/v1/rbac/rbac.guard"

import { DepartmentsService } from "./departments.service"

@Controller()
export class DepartmentsController {
	constructor(private readonly departmentsService: DepartmentsService) {}

	@RequireAnyPermissions([
		{ module: "admin.facility", action: "read" },
		{ module: "admin", action: "view" },
	])
	@Implement(v1.departments.list)
	async list() {
		return implement(v1.departments.list).handler(async ({ input }) => {
			return this.departmentsService.list(input.facilityId)
		})
	}

	@RequireAnyPermissions([
		{ module: "admin.facility", action: "read" },
		{ module: "admin", action: "view" },
	])
	@Implement(v1.departments.get)
	async get() {
		return implement(v1.departments.get).handler(async ({ input }) => {
			return this.departmentsService.get(input.id)
		})
	}

	@RequireAnyPermissions([
		{ module: "admin.facility", action: "write" },
		{ module: "admin", action: "edit" },
	])
	@Implement(v1.departments.upsert)
	async upsert(@Session() session: UserSession, @Req() _req: Request) {
		return implement(v1.departments.upsert).handler(async ({ input }) => {
			return this.departmentsService.upsert(input, session.user.id)
		})
	}

	@RequireAnyPermissions([
		{ module: "admin.facility", action: "write" },
		{ module: "admin", action: "delete" },
	])
	@Implement(v1.departments.delete)
	async delete(@Session() session: UserSession) {
		return implement(v1.departments.delete).handler(async ({ input }) => {
			const dept = await this.departmentsService.get(input.id)
			return this.departmentsService.delete(input.id, dept.facilityId, session.user.id)
		})
	}
}

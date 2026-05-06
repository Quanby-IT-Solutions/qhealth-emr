import { Controller, Req } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import type { Request } from "express"

import { v1 } from "@/config/api-versions.config"
import { buildChartAccessActor } from "@/modules/v1/audit/chart-access.service"
import { RequireAnyPermissions, RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { PatientsService } from "./patients.service"

@Controller()
export class PatientsController {
	constructor(private readonly patientsService: PatientsService) {}

	@RequirePermission("patients", "view")
	@Implement(v1.patient.search)
	async search() {
		return implement(v1.patient.search).handler(async ({ input }) => {
			return this.patientsService.search(input)
		})
	}

	@RequireAnyPermissions([
		{ module: "opd", action: "view" },
		{ module: "scheduling", action: "view" },
	])
	@Implement(v1.patient.listClinicians)
	async listClinicians() {
		return implement(v1.patient.listClinicians).handler(async ({ input }) => {
			return this.patientsService.listClinicians(input)
		})
	}

	@RequirePermission("patients", "view")
	@Implement(v1.patient.get)
	async get(@Session() session: UserSession, @Req() req: Request) {
		return implement(v1.patient.get).handler(async ({ input }) => {
			return this.patientsService.findById(input.id, buildChartAccessActor(session, req))
		})
	}

	@RequirePermission("patients", "create")
	@Implement(v1.patient.create)
	async create(@Session() session: UserSession) {
		return implement(v1.patient.create).handler(async ({ input }) => {
			void session // auth required
			return this.patientsService.create(input)
		})
	}

	@RequirePermission("patients", "edit")
	@Implement(v1.patient.update)
	async update(@Session() session: UserSession) {
		return implement(v1.patient.update).handler(async ({ input }) => {
			void session // auth required
			return this.patientsService.update(input)
		})
	}

	@RequirePermission("patients", "create")
	@Implement(v1.patient.registerWithOpdEncounter)
	async registerWithOpdEncounter(@Session() session: UserSession) {
		return implement(v1.patient.registerWithOpdEncounter).handler(async ({ input }) => {
			return this.patientsService.registerWithOpdEncounter(input, session.user.id)
		})
	}
}

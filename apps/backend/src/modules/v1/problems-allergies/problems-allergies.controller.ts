import { Controller, Req } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"
import type { Request } from "express"

import { v1 } from "@/config/api-versions.config"
import { buildChartAccessActor } from "@/modules/v1/audit/chart-access.service"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { ProblemsAllergiesService } from "./problems-allergies.service"

@Controller()
export class ProblemsAllergiesController {
	constructor(private readonly service: ProblemsAllergiesService) {}

	// ========================================================================
	// Problems
	// ========================================================================

	@RequirePermission("clinical_docs", "view")
	@Implement(v1.problemsAllergies.listProblems)
	async listProblems(@Session() session: UserSession, @Req() req: Request) {
		return implement(v1.problemsAllergies.listProblems).handler(async ({ input }) => {
			return this.service.listProblems(input, buildChartAccessActor(session, req))
		})
	}

	@RequirePermission("clinical_docs", "view")
	@Implement(v1.problemsAllergies.getProblem)
	async getProblem(@Session() session: UserSession, @Req() req: Request) {
		return implement(v1.problemsAllergies.getProblem).handler(async ({ input }) => {
			return this.service.getProblem(input.id, buildChartAccessActor(session, req))
		})
	}

	@RequirePermission("clinical_docs", "sign")
	@Implement(v1.problemsAllergies.createProblem)
	async createProblem(@Session() session: UserSession) {
		return implement(v1.problemsAllergies.createProblem).handler(async ({ input }) => {
			return this.service.createProblem(input, session.user.id)
		})
	}

	@RequirePermission("clinical_docs", "sign")
	@Implement(v1.problemsAllergies.updateProblem)
	async updateProblem(@Session() session: UserSession) {
		return implement(v1.problemsAllergies.updateProblem).handler(async ({ input }) => {
			return this.service.updateProblem(input, session.user.id)
		})
	}

	@RequirePermission("clinical_docs", "sign")
	@Implement(v1.problemsAllergies.resolveProblem)
	async resolveProblem(@Session() session: UserSession) {
		return implement(v1.problemsAllergies.resolveProblem).handler(async ({ input }) => {
			return this.service.resolveProblem(input, session.user.id)
		})
	}

	@RequirePermission("clinical_docs", "sign")
	@Implement(v1.problemsAllergies.deleteProblem)
	async deleteProblem(@Session() session: UserSession) {
		return implement(v1.problemsAllergies.deleteProblem).handler(async ({ input }) => {
			return this.service.deleteProblem(input.id, session.user.id)
		})
	}

	// ========================================================================
	// Allergies
	// ========================================================================

	@RequirePermission("clinical_docs", "view")
	@Implement(v1.problemsAllergies.listAllergies)
	async listAllergies(@Session() session: UserSession, @Req() req: Request) {
		return implement(v1.problemsAllergies.listAllergies).handler(async ({ input }) => {
			return this.service.listAllergies(input, buildChartAccessActor(session, req))
		})
	}

	@RequirePermission("clinical_docs", "view")
	@Implement(v1.problemsAllergies.getAllergy)
	async getAllergy(@Session() session: UserSession, @Req() req: Request) {
		return implement(v1.problemsAllergies.getAllergy).handler(async ({ input }) => {
			return this.service.getAllergy(input.id, buildChartAccessActor(session, req))
		})
	}

	@RequirePermission("clinical_docs", "sign")
	@Implement(v1.problemsAllergies.createAllergy)
	async createAllergy(@Session() session: UserSession) {
		return implement(v1.problemsAllergies.createAllergy).handler(async ({ input }) => {
			return this.service.createAllergy(input, session.user.id)
		})
	}

	@RequirePermission("clinical_docs", "sign")
	@Implement(v1.problemsAllergies.updateAllergy)
	async updateAllergy(@Session() session: UserSession) {
		return implement(v1.problemsAllergies.updateAllergy).handler(async ({ input }) => {
			return this.service.updateAllergy(input, session.user.id)
		})
	}

	@RequirePermission("clinical_docs", "sign")
	@Implement(v1.problemsAllergies.deactivateAllergy)
	async deactivateAllergy(@Session() session: UserSession) {
		return implement(v1.problemsAllergies.deactivateAllergy).handler(async ({ input }) => {
			return this.service.deactivateAllergy(input.id, session.user.id)
		})
	}

	@RequirePermission("clinical_docs", "sign")
	@Implement(v1.problemsAllergies.verifyAllergy)
	async verifyAllergy(@Session() session: UserSession) {
		return implement(v1.problemsAllergies.verifyAllergy).handler(async ({ input }) => {
			return this.service.verifyAllergy(input, session.user.id)
		})
	}

	// ========================================================================
	// Terminology / Search
	// ========================================================================

	@RequirePermission("clinical_docs", "view")
	@Implement(v1.problemsAllergies.searchIcd10)
	async searchIcd10() {
		return implement(v1.problemsAllergies.searchIcd10).handler(async ({ input }) => {
			return this.service.searchIcd10(input)
		})
	}

	@RequirePermission("clinical_docs", "view")
	@Implement(v1.problemsAllergies.searchSnomedCt)
	async searchSnomedCt() {
		return implement(v1.problemsAllergies.searchSnomedCt).handler(async ({ input }) => {
			return this.service.searchSnomedCt(input)
		})
	}

	@RequirePermission("clinical_docs", "view")
	@Implement(v1.problemsAllergies.searchAllergens)
	async searchAllergens() {
		return implement(v1.problemsAllergies.searchAllergens).handler(async ({ input }) => {
			return this.service.searchAllergens(input)
		})
	}

	// ========================================================================
	// CDS / Cross-module
	// ========================================================================

	@RequirePermission("clinical_docs", "view")
	@Implement(v1.problemsAllergies.getActiveAllergies)
	async getActiveAllergies(@Session() session: UserSession, @Req() req: Request) {
		return implement(v1.problemsAllergies.getActiveAllergies).handler(async ({ input }) => {
			return this.service.getActiveAllergies(input, buildChartAccessActor(session, req))
		})
	}

	@RequirePermission("clinical_docs", "view")
	@Implement(v1.problemsAllergies.getPatientSummary)
	async getPatientSummary(@Session() session: UserSession, @Req() req: Request) {
		return implement(v1.problemsAllergies.getPatientSummary).handler(async ({ input }) => {
			return this.service.getPatientSummary(input, buildChartAccessActor(session, req))
		})
	}
}

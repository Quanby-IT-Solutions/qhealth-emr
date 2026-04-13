import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"

import { ProblemsAllergiesService } from "./problems-allergies.service"

@Controller()
export class ProblemsAllergiesController {
	constructor(private readonly service: ProblemsAllergiesService) {}

	// ========================================================================
	// Problems
	// ========================================================================

	@Implement(v1.problemsAllergies.listProblems)
	async listProblems() {
		return implement(v1.problemsAllergies.listProblems).handler(async ({ input }) => {
			return this.service.listProblems(input)
		})
	}

	@Implement(v1.problemsAllergies.getProblem)
	async getProblem() {
		return implement(v1.problemsAllergies.getProblem).handler(async ({ input }) => {
			return this.service.getProblem(input.id)
		})
	}

	@Implement(v1.problemsAllergies.createProblem)
	async createProblem(@Session() session: UserSession) {
		return implement(v1.problemsAllergies.createProblem).handler(async ({ input }) => {
			// TODO: Resolve staffProfileId from session.user.id + facilityId via RBAC
			return this.service.createProblem(input, session.user.id)
		})
	}

	@Implement(v1.problemsAllergies.updateProblem)
	async updateProblem(@Session() session: UserSession) {
		return implement(v1.problemsAllergies.updateProblem).handler(async ({ input }) => {
			return this.service.updateProblem(input)
		})
	}

	@Implement(v1.problemsAllergies.resolveProblem)
	async resolveProblem(@Session() session: UserSession) {
		return implement(v1.problemsAllergies.resolveProblem).handler(async ({ input }) => {
			return this.service.resolveProblem(input)
		})
	}

	// ========================================================================
	// Allergies
	// ========================================================================

	@Implement(v1.problemsAllergies.listAllergies)
	async listAllergies() {
		return implement(v1.problemsAllergies.listAllergies).handler(async ({ input }) => {
			return this.service.listAllergies(input)
		})
	}

	@Implement(v1.problemsAllergies.getAllergy)
	async getAllergy() {
		return implement(v1.problemsAllergies.getAllergy).handler(async ({ input }) => {
			return this.service.getAllergy(input.id)
		})
	}

	@Implement(v1.problemsAllergies.createAllergy)
	async createAllergy(@Session() session: UserSession) {
		return implement(v1.problemsAllergies.createAllergy).handler(async ({ input }) => {
			// TODO: Resolve staffProfileId from session.user.id + facilityId via RBAC
			return this.service.createAllergy(input, session.user.id)
		})
	}

	@Implement(v1.problemsAllergies.updateAllergy)
	async updateAllergy(@Session() session: UserSession) {
		return implement(v1.problemsAllergies.updateAllergy).handler(async ({ input }) => {
			return this.service.updateAllergy(input)
		})
	}

	@Implement(v1.problemsAllergies.deactivateAllergy)
	async deactivateAllergy(@Session() session: UserSession) {
		return implement(v1.problemsAllergies.deactivateAllergy).handler(async ({ input }) => {
			return this.service.deactivateAllergy(input.id)
		})
	}

	// ========================================================================
	// CDS / Cross-module
	// ========================================================================

	@Implement(v1.problemsAllergies.getActiveAllergies)
	async getActiveAllergies() {
		return implement(v1.problemsAllergies.getActiveAllergies).handler(async ({ input }) => {
			return this.service.getActiveAllergies(input)
		})
	}

	@Implement(v1.problemsAllergies.getPatientSummary)
	async getPatientSummary() {
		return implement(v1.problemsAllergies.getPatientSummary).handler(async ({ input }) => {
			return this.service.getPatientSummary(input)
		})
	}
}

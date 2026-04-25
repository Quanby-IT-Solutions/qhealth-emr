import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermission } from "@/modules/v1/rbac/rbac.guard"

import { NutritionService } from "./nutrition.service"

@Controller()
export class NutritionController {
	constructor(private readonly nutritionService: NutritionService) {}

	@RequirePermission("nutrition", "view")
	@Implement(v1.nutrition.list)
	async list() {
		return implement(v1.nutrition.list).handler(async ({ input }) => {
			return this.nutritionService.list(input)
		})
	}

	@RequirePermission("nutrition", "view")
	@Implement(v1.nutrition.get)
	async get() {
		return implement(v1.nutrition.get).handler(async ({ input }) => {
			return this.nutritionService.get(input.id)
		})
	}

	@RequirePermission("nutrition", "view")
	@Implement(v1.nutrition.getByEncounter)
	async getByEncounter() {
		return implement(v1.nutrition.getByEncounter).handler(async ({ input }) => {
			return this.nutritionService.getByEncounter(input.encounterId)
		})
	}

	@RequirePermission("nutrition", "edit")
	@Implement(v1.nutrition.create)
	async create(@Session() session: UserSession) {
		return implement(v1.nutrition.create).handler(async ({ input }) => {
			return this.nutritionService.create(input, session.user.id)
		})
	}

	@RequirePermission("nutrition", "edit")
	@Implement(v1.nutrition.update)
	async update(@Session() session: UserSession) {
		return implement(v1.nutrition.update).handler(async ({ input }) => {
			void session
			return this.nutritionService.update(input)
		})
	}

	@RequirePermission("nutrition", "edit")
	@Implement(v1.nutrition.saveMealPlan)
	async saveMealPlan(@Session() session: UserSession) {
		return implement(v1.nutrition.saveMealPlan).handler(async ({ input }) => {
			void session
			return this.nutritionService.saveMealPlan(input)
		})
	}
}
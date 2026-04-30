import { oc } from "@orpc/contract"

import {
	CreateNutritionAssessmentSchema,
	NutritionAssessmentIdSchema,
	NutritionAssessmentListResponseSchema,
	NutritionAssessmentListSchema,
	NutritionAssessmentSchema,
	NutritionByEncounterSchema,
	SaveMealPlanSchema,
	ScreeningScoreInputSchema,
	ScreeningScoreResultSchema,
	UpdateNutritionAssessmentSchema,
} from "./nutrition.schema.js"

export const nutritionContract = {
	// ========================================================================
	// Nutrition Assessments
	// ========================================================================

	list: oc
		.route({
			method: "GET",
			path: "/assessments",
			summary: "List nutrition assessments",
			tags: ["Nutrition"],
		})
		.input(NutritionAssessmentListSchema)
		.output(NutritionAssessmentListResponseSchema),

	get: oc
		.route({
			method: "GET",
			path: "/assessments/{id}",
			summary: "Get nutrition assessment by ID",
			tags: ["Nutrition"],
		})
		.input(NutritionAssessmentIdSchema)
		.output(NutritionAssessmentSchema),

	getByEncounter: oc
		.route({
			method: "GET",
			path: "/assessments/by-encounter/{encounterId}",
			summary: "Get nutrition assessment by encounter ID",
			tags: ["Nutrition"],
		})
		.input(NutritionByEncounterSchema)
		.output(NutritionAssessmentSchema.nullable()),

	create: oc
		.route({
			method: "POST",
			path: "/assessments",
			summary: "Create nutrition screening assessment",
			tags: ["Nutrition"],
		})
		.input(CreateNutritionAssessmentSchema)
		.output(NutritionAssessmentSchema),

	update: oc
		.route({
			method: "PUT",
			path: "/assessments/{id}",
			summary: "Update nutrition assessment (full assessment)",
			tags: ["Nutrition"],
		})
		.input(UpdateNutritionAssessmentSchema)
		.output(NutritionAssessmentSchema),

	// ========================================================================
	// Meal Plans
	// ========================================================================

	saveMealPlan: oc
		.route({
			method: "POST",
			path: "/assessments/{assessmentId}/meal-plan",
			summary: "Create or update meal plan for assessment",
			tags: ["Nutrition"],
		})
		.input(SaveMealPlanSchema)
		.output(NutritionAssessmentSchema),

	// ========================================================================
	// Screening Tool Scoring
	// ========================================================================

	scoreScreening: oc
		.route({
			method: "POST",
			path: "/screening/score",
			summary: "Calculate malnutrition risk score for a screening tool",
			tags: ["Nutrition"],
		})
		.input(ScreeningScoreInputSchema)
		.output(ScreeningScoreResultSchema),
}

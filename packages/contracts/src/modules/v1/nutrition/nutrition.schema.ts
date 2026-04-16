import { z } from "zod"

// ============================================================================
// Helpers
// ============================================================================

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

const PaginationInputSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(25),
})

const PaginatedResponseSchema = z.object({
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
})

// ============================================================================
// Enums
// ============================================================================

export const ScreeningToolEnum = z.enum(["nrs_2002", "sga", "must"])
export type ScreeningTool = z.infer<typeof ScreeningToolEnum>

export const MalnutritionRiskEnum = z.enum(["low", "moderate", "high"])
export type MalnutritionRisk = z.infer<typeof MalnutritionRiskEnum>

export const NutritionStatusEnum = z.enum(["screening", "assessed", "plan_created", "monitoring"])
export type NutritionStatus = z.infer<typeof NutritionStatusEnum>

export const DietTypeEnum = z.enum([
	"regular",
	"diabetic",
	"renal",
	"cardiac",
	"low_sodium",
	"high_protein",
	"soft",
	"liquid",
	"npo",
	"enteral",
	"parenteral",
	"other",
])
export type DietType = z.infer<typeof DietTypeEnum>

// ============================================================================
// Anthropometric Data Schema
// ============================================================================

export const AnthropometricDataSchema = z.object({
	weight: z.number().positive().optional(),
	height: z.number().positive().optional(),
	bmi: z.number().positive().optional(),
	idealBodyWeight: z.number().positive().optional(),
	adjustedBodyWeight: z.number().positive().optional(),
	armCircumference: z.number().positive().optional(),
	tricepsSkinFold: z.number().positive().optional(),
	waistCircumference: z.number().positive().optional(),
	measuredAt: z.string().optional(),
})

export type AnthropometricData = z.infer<typeof AnthropometricDataSchema>

// ============================================================================
// Dietary History Schema
// ============================================================================

export const DietaryHistorySchema = z.object({
	usualIntake: z.string().optional(),
	foodAllergies: z.array(z.string()),
	intolerances: z.array(z.string()),
	dietaryRestrictions: z.array(z.string()),
	fluidIntake: z.string().optional(),
	appetiteStatus: z.enum(["good", "fair", "poor"]).optional(),
	recentWeightChange: z.string().optional(),
	chewingDifficulty: z.boolean().optional(),
	swallowingDifficulty: z.boolean().optional(),
})

export type DietaryHistory = z.infer<typeof DietaryHistorySchema>

// ============================================================================
// Lab Review Schema (nutrition-relevant labs)
// ============================================================================

export const NutritionLabReviewSchema = z.object({
	albumin: z.number().optional(),
	prealbumin: z.number().optional(),
	totalProtein: z.number().optional(),
	hemoglobin: z.number().optional(),
	hematocrit: z.number().optional(),
	glucose: z.number().optional(),
	hba1c: z.number().optional(),
	sodium: z.number().optional(),
	potassium: z.number().optional(),
	creatinine: z.number().optional(),
	bun: z.number().optional(),
	reviewedAt: z.string().optional(),
})

export type NutritionLabReview = z.infer<typeof NutritionLabReviewSchema>

// ============================================================================
// Meal Plan Schema
// ============================================================================

export const MealPlanSchema = z.object({
	dietType: DietTypeEnum,
	caloricTarget: z.number().positive().optional(),
	proteinTarget: z.number().positive().optional(),
	carbTarget: z.number().positive().optional(),
	fatTarget: z.number().positive().optional(),
	fluidTarget: z.number().positive().optional(),
	specialInstructions: z.string().optional(),
	feedingRoute: z.enum(["oral", "enteral", "parenteral", "mixed"]).optional(),
	enteralFormula: z.string().optional(),
	parenteralFormula: z.string().optional(),
	mealFrequency: z.string().optional(),
	supplements: z.array(z.string()).optional(),
	restrictions: z.array(z.string()).optional(),
})

export type MealPlan = z.infer<typeof MealPlanSchema>

// ============================================================================
// Nutrition Assessment Schema
// ============================================================================

export const NutritionAssessmentSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	patientName: z.string().nullable(),
	patientMrn: z.string().nullable(),

	// Screening
	screeningTool: ScreeningToolEnum,
	screeningScore: z.number().int().nonnegative(),
	malnutritionRisk: MalnutritionRiskEnum,

	// Assessment data (JSONB in DB)
	anthropometrics: AnthropometricDataSchema.nullable(),
	dietaryHistory: DietaryHistorySchema.nullable(),
	labReview: NutritionLabReviewSchema.nullable(),
	clinicalEvaluation: z.string().nullable(),

	// Meal plan
	mealPlan: MealPlanSchema.nullable(),

	// Reassessment
	nextReassessmentDate: z.string().nullable(),

	// Metadata
	assessedByStaffId: z.string().uuid(),
	assessedByStaffName: z.string().nullable(),
	status: NutritionStatusEnum,
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type NutritionAssessment = z.infer<typeof NutritionAssessmentSchema>

// ============================================================================
// List Nutrition Assessments
// ============================================================================

export const NutritionAssessmentListSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid().optional(),
	encounterId: z.string().uuid().optional(),
	patientId: z.string().uuid().optional(),
	malnutritionRisk: MalnutritionRiskEnum.optional(),
	status: NutritionStatusEnum.optional(),
})

export type NutritionAssessmentListInput = z.infer<typeof NutritionAssessmentListSchema>

export const NutritionAssessmentListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(NutritionAssessmentSchema),
})

export type NutritionAssessmentListResponse = z.infer<typeof NutritionAssessmentListResponseSchema>

// ============================================================================
// Create Nutrition Assessment (screening)
// ============================================================================

export const CreateNutritionAssessmentSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	screeningTool: ScreeningToolEnum,
	screeningScore: z.number().int().nonnegative(),
	malnutritionRisk: MalnutritionRiskEnum,
})

export type CreateNutritionAssessment = z.infer<typeof CreateNutritionAssessmentSchema>

// ============================================================================
// Update Nutrition Assessment (full assessment)
// ============================================================================

export const UpdateNutritionAssessmentSchema = z.object({
	id: z.string().uuid(),
	anthropometrics: AnthropometricDataSchema.optional(),
	dietaryHistory: DietaryHistorySchema.optional(),
	labReview: NutritionLabReviewSchema.optional(),
	clinicalEvaluation: z.string().optional(),
	status: NutritionStatusEnum.optional(),
	nextReassessmentDate: z.string().optional(),
})

export type UpdateNutritionAssessment = z.infer<typeof UpdateNutritionAssessmentSchema>

// ============================================================================
// Create/Update Meal Plan
// ============================================================================

export const SaveMealPlanSchema = z.object({
	assessmentId: z.string().uuid(),
	mealPlan: MealPlanSchema,
})

export type SaveMealPlan = z.infer<typeof SaveMealPlanSchema>

// ============================================================================
// Get Assessment by ID
// ============================================================================

export const NutritionAssessmentIdSchema = z.object({
	id: z.string().uuid(),
})

export type NutritionAssessmentId = z.infer<typeof NutritionAssessmentIdSchema>

// ============================================================================
// Get Assessment by Encounter
// ============================================================================

export const NutritionByEncounterSchema = z.object({
	encounterId: z.string().uuid(),
})

export type NutritionByEncounter = z.infer<typeof NutritionByEncounterSchema>

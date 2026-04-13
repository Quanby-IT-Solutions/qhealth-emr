import { z } from "zod"

// ============================================================================
// Helpers
// ============================================================================

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

const PaginationInputSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
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

export const ProblemStatusEnum = z.enum(["active", "resolved"])
export const AllergenTypeEnum = z.enum(["medication", "food", "environmental"])
export const AllergySeverityEnum = z.enum(["mild", "moderate", "severe"])

// ============================================================================
// Problem Schemas
// ============================================================================

export const ProblemSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	icd10Code: z.string().nullable(),
	icd10Display: z.string().nullable(),
	description: z.string(),
	onsetDate: z.string().nullable(),
	resolutionDate: z.string().nullable(),
	status: ProblemStatusEnum,
	documentingStaffId: z.string().uuid().nullable(),
	documentingStaffName: z.string().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type Problem = z.infer<typeof ProblemSchema>

export const CreateProblemSchema = z.object({
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	icd10Code: z.string().max(20).optional(),
	icd10Display: z.string().max(500).optional(),
	description: z.string().min(1).max(2000),
	onsetDate: z.string().optional(),
	notes: z.string().max(2000).optional(),
})

export type CreateProblemInput = z.infer<typeof CreateProblemSchema>

export const UpdateProblemSchema = z.object({
	id: z.string().uuid(),
	icd10Code: z.string().max(20).optional(),
	icd10Display: z.string().max(500).optional(),
	description: z.string().min(1).max(2000).optional(),
	onsetDate: z.string().optional(),
})

export type UpdateProblemInput = z.infer<typeof UpdateProblemSchema>

export const ResolveProblemSchema = z.object({
	id: z.string().uuid(),
	resolutionDate: z.string().optional(),
})

export type ResolveProblemInput = z.infer<typeof ResolveProblemSchema>

export const ProblemIdSchema = z.object({
	id: z.string().uuid(),
})

export const ProblemListSchema = PaginationInputSchema.extend({
	patientId: z.string().uuid(),
	status: ProblemStatusEnum.optional(),
})

export const ProblemListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(ProblemSchema),
})

// ============================================================================
// Allergy Schemas
// ============================================================================

export const AllergySchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	allergenName: z.string(),
	allergenType: AllergenTypeEnum,
	reactionType: z.string().nullable(),
	severity: AllergySeverityEnum,
	onsetDate: z.string().nullable(),
	isActive: z.boolean(),
	documentingStaffId: z.string().uuid().nullable(),
	documentingStaffName: z.string().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type Allergy = z.infer<typeof AllergySchema>

export const CreateAllergySchema = z.object({
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	allergenName: z.string().min(1).max(500),
	allergenType: AllergenTypeEnum,
	reactionType: z.string().max(500).optional(),
	severity: AllergySeverityEnum,
	onsetDate: z.string().optional(),
})

export type CreateAllergyInput = z.infer<typeof CreateAllergySchema>

export const UpdateAllergySchema = z.object({
	id: z.string().uuid(),
	allergenName: z.string().min(1).max(500).optional(),
	allergenType: AllergenTypeEnum.optional(),
	reactionType: z.string().max(500).optional(),
	severity: AllergySeverityEnum.optional(),
	onsetDate: z.string().optional(),
})

export type UpdateAllergyInput = z.infer<typeof UpdateAllergySchema>

export const DeactivateAllergySchema = z.object({
	id: z.string().uuid(),
})

export const AllergyIdSchema = z.object({
	id: z.string().uuid(),
})

export const AllergyListSchema = PaginationInputSchema.extend({
	patientId: z.string().uuid(),
	isActive: z
		.union([z.boolean(), z.string().transform(v => v === "true")])
		.optional(),
	allergenType: AllergenTypeEnum.optional(),
})

export const AllergyListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(AllergySchema),
})

// ============================================================================
// Active Allergies (for CDS)
// ============================================================================

export const ActiveAllergiesSchema = z.object({
	patientId: z.string().uuid(),
})

export const ActiveAllergiesResponseSchema = z.object({
	allergies: z.array(AllergySchema),
	hasSevereAllergies: z.boolean(),
})

// ============================================================================
// Patient Summary (combined problems + allergies)
// ============================================================================

export const PatientSummarySchema = z.object({
	patientId: z.string().uuid(),
})

export const PatientSummaryResponseSchema = z.object({
	activeProblems: z.array(ProblemSchema),
	activeProblemCount: z.number(),
	resolvedProblemCount: z.number(),
	activeAllergies: z.array(AllergySchema),
	activeAllergyCount: z.number(),
	hasSevereAllergies: z.boolean(),
})

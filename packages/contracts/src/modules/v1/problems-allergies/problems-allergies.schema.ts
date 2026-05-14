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

const hasClinicalCode = (value: { icd10Code?: string | null; snomedCode?: string | null }) =>
	Boolean(value.icd10Code?.trim() || value.snomedCode?.trim())

// ============================================================================
// Problem Schemas
// ============================================================================

export const ProblemSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	icd10Code: z.string().nullable(),
	icd10Display: z.string().nullable(),
	snomedCode: z.string().nullable(),
	snomedDisplay: z.string().nullable(),
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

export const CreateProblemSchema = z
	.object({
		facilityId: z.string().uuid(),
		patientId: z.string().uuid(),
		icd10Code: z.string().max(20).optional(),
		icd10Display: z.string().max(500).optional(),
		snomedCode: z.string().max(20).optional(),
		snomedDisplay: z.string().max(500).optional(),
		description: z.string().min(1).max(2000),
		onsetDate: z.string().optional(),
		resolutionDate: z.string().optional(),
		status: ProblemStatusEnum.default("active"),
		notes: z.string().max(2000).optional(),
	})
	.superRefine((value, ctx) => {
		if (!hasClinicalCode(value)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "At least one of ICD-10 or SNOMED CT code is required.",
				path: ["icd10Code"],
			})
		}
	})

export type CreateProblemInput = z.infer<typeof CreateProblemSchema>

export const UpdateProblemSchema = z.object({
	id: z.string().uuid(),
	icd10Code: z.string().max(20).optional(),
	icd10Display: z.string().max(500).optional(),
	snomedCode: z.string().max(20).optional(),
	snomedDisplay: z.string().max(500).optional(),
	description: z.string().min(1).max(2000).optional(),
	onsetDate: z.string().optional(),
	resolutionDate: z.string().nullable().optional(),
	status: ProblemStatusEnum.optional(),
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

export const DeleteProblemSchema = ProblemIdSchema

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
	// Flow D5: only verified active allergies block medication orders via CDS.
	// Unverified allergies remain visible in the chart but are not silently
	// enforced; a physician must explicitly verify before they hard-block.
	isVerified: z.boolean(),
	verifiedAt: dateOrString.nullable(),
	verifiedByStaffId: z.string().uuid().nullable(),
	verifiedByStaffName: z.string().nullable(),
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

export const VerifyAllergySchema = z.object({
	id: z.string().uuid(),
})

export type VerifyAllergyInput = z.infer<typeof VerifyAllergySchema>

export const AllergyIdSchema = z.object({
	id: z.string().uuid(),
})

export const AllergyListSchema = PaginationInputSchema.extend({
	patientId: z.string().uuid(),
	isActive: z.union([z.boolean(), z.string().transform(v => v === "true")]).optional(),
	isVerified: z.union([z.boolean(), z.string().transform(v => v === "true")]).optional(),
	allergenType: AllergenTypeEnum.optional(),
})

export const AllergyListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(AllergySchema),
})

// ============================================================================
// Terminology / Search
// ============================================================================

export const TerminologySearchSchema = PaginationInputSchema.extend({
	search: z.string().optional(),
})

export const Icd10SearchResultSchema = z.object({
	id: z.string().uuid(),
	code: z.string(),
	description: z.string(),
	category: z.string().nullable(),
	isActive: z.boolean(),
	createdAt: dateOrString,
})

export const Icd10SearchResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(Icd10SearchResultSchema),
})

export const SnomedCtSearchSchema = TerminologySearchSchema.extend({
	semanticTag: z.string().optional(),
})

export const SnomedCtSearchResultSchema = z.object({
	id: z.string().uuid(),
	conceptId: z.string(),
	fsn: z.string(),
	preferredTerm: z.string(),
	semanticTag: z.string().nullable(),
	isActive: z.boolean(),
	createdAt: dateOrString,
})

export const SnomedCtSearchResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(SnomedCtSearchResultSchema),
})

export const AllergenSearchSchema = PaginationInputSchema.extend({
	search: z.string().optional(),
	facilityId: z.string().uuid().optional(),
	allergenType: AllergenTypeEnum.optional(),
})

export const AllergenSearchResultSchema = z.object({
	allergenName: z.string(),
	allergenType: AllergenTypeEnum,
	source: z.enum(["allergy_history", "drug_generic"]),
})

export const AllergenSearchResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(AllergenSearchResultSchema),
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
	// Count of active allergies that are still awaiting physician verification.
	// Drives chart-level "needs review" badges without firing CDS hard-blocks.
	unverifiedAllergyCount: z.number(),
	hasSevereAllergies: z.boolean(),
})

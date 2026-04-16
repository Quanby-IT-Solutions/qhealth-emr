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

export const MswStatusEnum = z.enum(["pending", "in_progress", "completed", "cancelled"])
export type MswStatus = z.infer<typeof MswStatusEnum>

export const CoeProgramEnum = z.enum(["malasakit", "pcso", "dswd", "doh_map", "philhealth_zbenefit", "other"])
export type CoeProgram = z.infer<typeof CoeProgramEnum>

export const FinancialClassEnum = z.enum(["a", "b", "c1", "c2", "c3", "d"])
export type FinancialClass = z.infer<typeof FinancialClassEnum>

export const EmploymentStatusEnum = z.enum([
	"employed",
	"self_employed",
	"unemployed",
	"retired",
	"student",
	"housewife",
	"ofw",
	"other",
])
export type EmploymentStatus = z.infer<typeof EmploymentStatusEnum>

// ============================================================================
// Income Source Schema
// ============================================================================

export const IncomeSourceSchema = z.object({
	source: z.string(),
	amount: z.number().nonnegative(),
	frequency: z.enum(["daily", "weekly", "biweekly", "monthly", "annually"]),
})

export type IncomeSource = z.infer<typeof IncomeSourceSchema>

// ============================================================================
// Family Composition Schema
// ============================================================================

export const FamilyMemberSchema = z.object({
	relationship: z.string(),
	age: z.number().int().nonnegative().optional(),
	occupation: z.string().optional(),
	monthlyIncome: z.number().nonnegative().optional(),
	isDependent: z.boolean(),
})

export type FamilyMember = z.infer<typeof FamilyMemberSchema>

// ============================================================================
// Evaluation Findings Schema
// ============================================================================

export const EvaluationFindingsSchema = z.object({
	// Socioeconomic info
	employmentStatus: EmploymentStatusEnum,
	occupation: z.string().optional(),
	employer: z.string().optional(),
	monthlyFamilyIncome: z.number().nonnegative(),
	incomeSources: z.array(IncomeSourceSchema),
	numberOfDependents: z.number().int().nonnegative(),
	familyComposition: z.array(FamilyMemberSchema).optional(),

	// Assets
	homeOwnership: z.enum(["owned", "rented", "informal_settler", "with_relatives", "other"]).optional(),
	otherAssets: z.string().optional(),

	// Liabilities
	existingDebts: z.number().nonnegative().optional(),
	monthlyExpenses: z.number().nonnegative().optional(),

	// Classification
	financialClass: FinancialClassEnum,
	classificationNotes: z.string().optional(),

	// Psychosocial notes
	psychosocialAssessment: z.string().optional(),
	recommendedInterventions: z.string().optional(),
})

export type EvaluationFindings = z.infer<typeof EvaluationFindingsSchema>

// ============================================================================
// Malasakit Assistance Source Schema
// ============================================================================

export const MalasakitSourceSchema = z.object({
	program: z.string(),
	amount: z.number().nonnegative(),
	status: z.enum(["pending", "approved", "disbursed", "declined"]),
	referenceNumber: z.string().optional(),
	approvedAt: z.string().optional(),
})

export type MalasakitSource = z.infer<typeof MalasakitSourceSchema>

// ============================================================================
// CoE (Certificate of Eligibility) Schema
// ============================================================================

export const CoeSchema = z.object({
	coeNumber: z.string(),
	program: CoeProgramEnum,
	amountApproved: z.number().nonnegative(),
	issuedAt: z.string(),
	validUntil: z.string().optional(),
	signatureData: z.string().optional(), // Base64 signature
	witnessName: z.string().optional(),
})

export type Coe = z.infer<typeof CoeSchema>

// ============================================================================
// MSW Evaluation Schema
// ============================================================================

export const MswEvaluationSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	patientName: z.string().nullable(),
	patientMrn: z.string().nullable(),

	// Evaluation
	evaluationFindings: EvaluationFindingsSchema.nullable(),

	// CoE
	coeIssued: z.boolean(),
	coe: CoeSchema.nullable(),

	// Malasakit
	malasakitAmount: z.number().nonnegative().nullable(),
	malasakitSources: z.array(MalasakitSourceSchema).nullable(),

	// PhilHealth tagging
	konsultaTagged: z.boolean(),
	zBenefitsTagged: z.boolean(),

	// PhilHealth Annex A/B (captured signature data)
	annexASignature: z.string().nullable(),
	annexBSignature: z.string().nullable(),
	annexSignedAt: z.string().nullable(),

	// Metadata
	evaluatedByStaffId: z.string().uuid(),
	evaluatedByStaffName: z.string().nullable(),
	status: MswStatusEnum,
	completedAt: dateOrString.nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type MswEvaluation = z.infer<typeof MswEvaluationSchema>

// ============================================================================
// List MSW Evaluations
// ============================================================================

export const MswEvaluationListSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid().optional(),
	encounterId: z.string().uuid().optional(),
	patientId: z.string().uuid().optional(),
	status: MswStatusEnum.optional(),
	coeIssued: z.coerce.boolean().optional(),
	konsultaTagged: z.coerce.boolean().optional(),
})

export type MswEvaluationListInput = z.infer<typeof MswEvaluationListSchema>

export const MswEvaluationListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(MswEvaluationSchema),
})

export type MswEvaluationListResponse = z.infer<typeof MswEvaluationListResponseSchema>

// ============================================================================
// Create MSW Evaluation
// ============================================================================

export const CreateMswEvaluationSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
})

export type CreateMswEvaluation = z.infer<typeof CreateMswEvaluationSchema>

// ============================================================================
// Update MSW Evaluation (evaluation findings)
// ============================================================================

export const UpdateMswEvaluationSchema = z.object({
	id: z.string().uuid(),
	evaluationFindings: EvaluationFindingsSchema.optional(),
	status: MswStatusEnum.optional(),
})

export type UpdateMswEvaluation = z.infer<typeof UpdateMswEvaluationSchema>

// ============================================================================
// Issue CoE
// ============================================================================

export const IssueCoeSchema = z.object({
	evaluationId: z.string().uuid(),
	program: CoeProgramEnum,
	amountApproved: z.number().nonnegative(),
	validUntil: z.string().optional(),
	signatureData: z.string().optional(),
	witnessName: z.string().optional(),
})

export type IssueCoe = z.infer<typeof IssueCoeSchema>

// ============================================================================
// Add Malasakit Assistance
// ============================================================================

export const AddMalasakitSchema = z.object({
	evaluationId: z.string().uuid(),
	sources: z.array(MalasakitSourceSchema),
})

export type AddMalasakit = z.infer<typeof AddMalasakitSchema>

// ============================================================================
// Capture Annex Signature
// ============================================================================

export const CaptureAnnexSignatureSchema = z.object({
	evaluationId: z.string().uuid(),
	annexType: z.enum(["A", "B"]),
	signatureData: z.string(),
})

export type CaptureAnnexSignature = z.infer<typeof CaptureAnnexSignatureSchema>

// ============================================================================
// Tag Benefits
// ============================================================================

export const TagBenefitsSchema = z.object({
	evaluationId: z.string().uuid(),
	konsultaTagged: z.boolean().optional(),
	zBenefitsTagged: z.boolean().optional(),
})

export type TagBenefits = z.infer<typeof TagBenefitsSchema>

// ============================================================================
// Get Evaluation by ID
// ============================================================================

export const MswEvaluationIdSchema = z.object({
	id: z.string().uuid(),
})

export type MswEvaluationId = z.infer<typeof MswEvaluationIdSchema>

// ============================================================================
// Get Evaluation by Encounter
// ============================================================================

export const MswByEncounterSchema = z.object({
	encounterId: z.string().uuid(),
})

export type MswByEncounter = z.infer<typeof MswByEncounterSchema>

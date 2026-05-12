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

export const EligibilityStatusEnum = z.enum(["eligible", "ineligible", "pending", "error"])
export type EligibilityStatus = z.infer<typeof EligibilityStatusEnum>

export const MemberTypeEnum = z.enum([
	"employed",
	"self_employed",
	"voluntary",
	"indigent",
	"sponsored",
	"senior_citizen",
	"pwd",
	"ofw",
	"kasambahay",
])
export type MemberType = z.infer<typeof MemberTypeEnum>

export const PatientRelationEnum = z.enum(["member", "spouse", "child", "parent", "dependent"])
export type PatientRelation = z.infer<typeof PatientRelationEnum>

export const Cf5StatusEnum = z.enum(["draft", "validated", "submitted", "approved", "returned"])
export type Cf5Status = z.infer<typeof Cf5StatusEnum>

export const KonsultaServiceTypeEnum = z.enum([
	"initial_visit",
	"follow_up",
	"preventive",
	"prenatal",
	"laboratory",
	"medicines",
])
export type KonsultaServiceType = z.infer<typeof KonsultaServiceTypeEnum>

// ============================================================================
// CEWS Eligibility Check
// ============================================================================

export const CewsEligibilityQuerySchema = z.object({
	philhealthId: z.string().min(1),
	facilityId: z.string().uuid(),
	patientId: z.string().uuid().optional(),
})

export type CewsEligibilityQuery = z.infer<typeof CewsEligibilityQuerySchema>

export const CewsEligibilityResultSchema = z.object({
	philhealthId: z.string(),
	isEligible: z.boolean(),
	status: EligibilityStatusEnum,
	memberName: z.string().nullable(),
	memberType: MemberTypeEnum.nullable(),
	patientRelation: PatientRelationEnum.nullable(),
	effectivityDate: z.string().nullable(),
	expiryDate: z.string().nullable(),
	remainingDays: z.number().nullable(),
	remainingBenefit: z.number().nullable(),
	errorMessage: z.string().nullable(),
	checkedAt: z.string(),
})

export type CewsEligibilityResult = z.infer<typeof CewsEligibilityResultSchema>

// ============================================================================
// CF5 Schema (DRG Shadow Billing)
// ============================================================================

export const Cf5ClaimSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	cf4ClaimId: z.string().uuid().nullable(),

	// DRG info
	drgCode: z.string().nullable(),
	drgDescription: z.string().nullable(),
	drgWeight: z.number().nullable(),
	drgAmount: z.number().nullable(),

	// Submission data
	submissionData: z.record(z.string(), z.unknown()).nullable(),

	// Status
	status: Cf5StatusEnum,
	validatedByStaffId: z.string().uuid().nullable(),
	validatedByStaffName: z.string().nullable(),
	validatedAt: dateOrString.nullable(),
	submittedAt: dateOrString.nullable(),
	philhealthResponse: z.record(z.string(), z.unknown()).nullable(),

	// Metadata
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type Cf5Claim = z.infer<typeof Cf5ClaimSchema>

// ============================================================================
// List CF5 Claims
// ============================================================================

export const Cf5ListSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid().optional(),
	encounterId: z.string().uuid().optional(),
	status: Cf5StatusEnum.optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
})

export type Cf5ListInput = z.infer<typeof Cf5ListSchema>

export const Cf5ListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(Cf5ClaimSchema),
})

export type Cf5ListResponse = z.infer<typeof Cf5ListResponseSchema>

// ============================================================================
// Create CF5 Claim
// ============================================================================

export const CreateCf5Schema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	cf4ClaimId: z.string().uuid().optional(),
	drgCode: z.string().optional(),
	drgDescription: z.string().optional(),
	drgWeight: z.number().optional(),
	drgAmount: z.number().optional(),
})

export type CreateCf5 = z.infer<typeof CreateCf5Schema>

// ============================================================================
// Validate CF5
// ============================================================================

export const ValidateCf5Schema = z.object({
	id: z.string().uuid(),
	drgCode: z.string(),
	drgWeight: z.number(),
	drgAmount: z.number(),
})

export type ValidateCf5 = z.infer<typeof ValidateCf5Schema>

// ============================================================================
// Submit CF5
// ============================================================================

export const SubmitCf5Schema = z.object({
	id: z.string().uuid(),
})

export type SubmitCf5 = z.infer<typeof SubmitCf5Schema>

// ============================================================================
// Konsulta Service Record
// ============================================================================

export const KonsultaServiceSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	philhealthId: z.string(),

	// Service details
	serviceType: KonsultaServiceTypeEnum,
	serviceDate: z.string(),
	diagnosis: z.string().nullable(),
	procedures: z.array(z.string()).nullable(),
	medicines: z.array(z.string()).nullable(),
	labTests: z.array(z.string()).nullable(),

	// Amount
	amountClaimed: z.number().nonnegative(),

	// Status
	isSubmitted: z.boolean(),
	submittedAt: dateOrString.nullable(),
	transactionNumber: z.string().nullable(),

	// Metadata
	createdByStaffId: z.string().uuid(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type KonsultaService = z.infer<typeof KonsultaServiceSchema>

// ============================================================================
// List Konsulta Services
// ============================================================================

export const KonsultaListSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid().optional(),
	encounterId: z.string().uuid().optional(),
	patientId: z.string().uuid().optional(),
	serviceType: KonsultaServiceTypeEnum.optional(),
	isSubmitted: z.coerce.boolean().optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
})

export type KonsultaListInput = z.infer<typeof KonsultaListSchema>

export const KonsultaListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(KonsultaServiceSchema),
})

export type KonsultaListResponse = z.infer<typeof KonsultaListResponseSchema>

// ============================================================================
// Create Konsulta Service
// ============================================================================

export const CreateKonsultaSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	philhealthId: z.string(),
	serviceType: KonsultaServiceTypeEnum,
	serviceDate: z.string(),
	diagnosis: z.string().optional(),
	procedures: z.array(z.string()).optional(),
	medicines: z.array(z.string()).optional(),
	labTests: z.array(z.string()).optional(),
	amountClaimed: z.number().nonnegative(),
})

export type CreateKonsulta = z.infer<typeof CreateKonsultaSchema>

// ============================================================================
// Submit Konsulta
// ============================================================================

export const SubmitKonsultaSchema = z.object({
	id: z.string().uuid(),
})

export type SubmitKonsulta = z.infer<typeof SubmitKonsultaSchema>

// ============================================================================
// Get by ID
// ============================================================================

export const Cf5IdSchema = z.object({
	id: z.string().uuid(),
})

export type Cf5Id = z.infer<typeof Cf5IdSchema>

export const KonsultaIdSchema = z.object({
	id: z.string().uuid(),
})

export type KonsultaId = z.infer<typeof KonsultaIdSchema>

// ============================================================================
// Z-Benefit Tagging
// ============================================================================

export const ZBenefitTagSchema = z.object({
	encounterId: z.string().uuid(),
	packageCode: z.string(),
	packageDescription: z.string().optional(),
})

export type ZBenefitTag = z.infer<typeof ZBenefitTagSchema>

export const ZBenefitStatusSchema = z.object({
	encounterId: z.string().uuid(),
	isTagged: z.boolean(),
	packageCode: z.string().nullable(),
	packageDescription: z.string().nullable(),
	taggedAt: z.string().nullable(),
	taggedByStaffName: z.string().nullable(),
})

export type ZBenefitStatus = z.infer<typeof ZBenefitStatusSchema>

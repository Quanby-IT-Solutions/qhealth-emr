import { z } from "zod"

// ============================================================================
// Enums
// ============================================================================

export const BloodTypeEnum = z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])

export const BloodUnitStatusEnum = z.enum(["available", "reserved", "transfused", "discarded"])

export const CrossMatchStatusEnum = z.enum([
	"pending",
	"cross_matched",
	"approved",
	"issued",
	"transfused",
	"cancelled",
])

export const CrossMatchUrgencyEnum = z.enum(["routine", "urgent", "emergency"])

export const CompatibilityResultEnum = z.enum(["compatible", "incompatible", "pending"])

// ============================================================================
// Blood Unit Schema
// ============================================================================

export const BloodUnitSchema = z.object({
	id: z.string().uuid(),
	unitBarcode: z.string().min(1).max(50),
	bloodType: BloodTypeEnum,
	componentType: z.string().min(1).max(100),
	expiryDate: z
		.union([z.date(), z.string()])
		.transform(val => (typeof val === "string" ? val : val.toISOString())),
	status: BloodUnitStatusEnum,
	donorId: z.string().uuid().nullable(),
})

// ============================================================================
// Cross-Match Schemas
// ============================================================================

export const CrossMatchRequestSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	patientName: z.string().min(1).max(255),
	bloodType: BloodTypeEnum.nullable(),
	componentType: z.string().min(1).max(100),
	unitsRequested: z.number().int().positive(),
	urgency: CrossMatchUrgencyEnum,
	clinicalIndication: z.string().max(500).nullable(),
	compatibilityResult: CompatibilityResultEnum.nullable(),
	status: CrossMatchStatusEnum,
	requestedBy: z.string().min(1).max(255),
	requestedAt: z
		.union([z.date(), z.string()])
		.transform(val => (typeof val === "string" ? val : val.toISOString())),
	crossMatchedBy: z.string().max(255).nullable(),
	crossMatchedAt: z
		.union([z.date(), z.string()])
		.transform(val => (typeof val === "string" ? val : val.toISOString()))
		.nullable(),
	approvedBy: z.string().max(255).nullable(),
	approvedAt: z
		.union([z.date(), z.string()])
		.transform(val => (typeof val === "string" ? val : val.toISOString()))
		.nullable(),
	issuedBy: z.string().max(255).nullable(),
	issuedAt: z
		.union([z.date(), z.string()])
		.transform(val => (typeof val === "string" ? val : val.toISOString()))
		.nullable(),
	bloodUnits: z.array(BloodUnitSchema),
	createdAt: z
		.union([z.date(), z.string()])
		.transform(val => (typeof val === "string" ? val : val.toISOString())),
})

// ============================================================================
// Query/Input Schemas
// ============================================================================

export const CrossMatchListQuerySchema = z.object({
	facilityId: z.string().uuid(),
	status: CrossMatchStatusEnum.optional(),
	page: z.coerce.number().int().positive().optional().default(1),
	limit: z.coerce.number().int().positive().max(100).optional().default(50),
})

export const CrossMatchListResponseSchema = z.object({
	data: z.array(CrossMatchRequestSchema),
	total: z.number().int().nonnegative(),
	page: z.number().int().positive(),
	limit: z.number().int().positive(),
	totalPages: z.number().int().nonnegative(),
})

export const CrossMatchIdSchema = z.object({
	id: z.string().uuid(),
})

export const CreateCrossMatchSchema = z.object({
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	bloodType: BloodTypeEnum.optional(),
	componentType: z.string().min(1).max(100),
	unitsRequested: z.number().int().positive(),
	urgency: CrossMatchUrgencyEnum,
	clinicalIndication: z.string().max(500).optional(),
})

export const ApproveCrossMatchSchema = z.object({
	id: z.string().uuid(),
	compatibilityResult: z.enum(["compatible", "incompatible"]),
	bloodUnitIds: z.array(z.string().uuid()),
})

// ============================================================================
// Bedside Verification Schemas
// ============================================================================

export const BedsideVerifyInputSchema = z.object({
	crossMatchId: z.string().uuid(),
	unitBarcode: z.string().min(1).max(50),
	patientWristbandBarcode: z.string().min(1).max(50),
})

export const BedsideVerifyResultSchema = z.object({
	verified: z.boolean(),
	patientMatch: z.boolean(),
	unitMatch: z.boolean(),
	message: z.string(),
})

// ============================================================================
// Inferred Types
// ============================================================================

export type BloodType = z.infer<typeof BloodTypeEnum>
export type BloodUnitStatus = z.infer<typeof BloodUnitStatusEnum>
export type CrossMatchStatus = z.infer<typeof CrossMatchStatusEnum>
export type CrossMatchUrgency = z.infer<typeof CrossMatchUrgencyEnum>
export type CompatibilityResult = z.infer<typeof CompatibilityResultEnum>

export type BloodUnit = z.infer<typeof BloodUnitSchema>
export type CrossMatchRequest = z.infer<typeof CrossMatchRequestSchema>

export type CrossMatchListQuery = z.infer<typeof CrossMatchListQuerySchema>
export type CrossMatchListResponse = z.infer<typeof CrossMatchListResponseSchema>
export type CreateCrossMatch = z.infer<typeof CreateCrossMatchSchema>
export type ApproveCrossMatch = z.infer<typeof ApproveCrossMatchSchema>

export type BedsideVerifyInput = z.infer<typeof BedsideVerifyInputSchema>
export type BedsideVerifyResult = z.infer<typeof BedsideVerifyResultSchema>

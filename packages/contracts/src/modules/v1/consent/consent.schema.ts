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

export const ConsentTypeEnum = z.enum([
	"general_treatment",
	"procedure",
	"surgery",
	"anesthesia",
	"blood_transfusion",
	"research",
	"nbs",
	"dpa",
	"telemedicine",
	"hiv_testing",
	"photography",
	"ama",
	"other",
])
export type ConsentType = z.infer<typeof ConsentTypeEnum>

export const ConsentStatusEnum = z.enum(["pending", "signed", "revoked", "expired"])
export type ConsentStatus = z.infer<typeof ConsentStatusEnum>

export const SignerRelationshipEnum = z.enum([
	"self",
	"parent",
	"guardian",
	"spouse",
	"child",
	"sibling",
	"authorized_representative",
	"other",
])
export type SignerRelationship = z.infer<typeof SignerRelationshipEnum>

// ============================================================================
// Consent Signer Schema
// ============================================================================

export const ConsentSignerSchema = z.object({
	name: z.string(),
	relationship: SignerRelationshipEnum,
	contactNumber: z.string().optional(),
	idType: z.string().optional(),
	idNumber: z.string().optional(),
	signatureData: z.string(), // Base64 encoded signature image
	signedAt: z.string(),
})

export type ConsentSigner = z.infer<typeof ConsentSignerSchema>

// ============================================================================
// Witness Schema
// ============================================================================

export const WitnessSchema = z.object({
	name: z.string(),
	designation: z.string().optional(),
	signatureData: z.string().optional(),
	signedAt: z.string().optional(),
})

export type Witness = z.infer<typeof WitnessSchema>

// ============================================================================
// DPA-Specific Fields Schema
// ============================================================================

export const DpaConsentFieldsSchema = z.object({
	purposesConsented: z.array(z.string()),
	dataTypesConsented: z.array(z.string()),
	retentionPeriod: z.string().optional(),
	thirdPartyDisclosure: z.boolean(),
	thirdParties: z.array(z.string()).optional(),
	dataSubjectRightsExplained: z.boolean(),
	contactForDataRequests: z.string().optional(),
})

export type DpaConsentFields = z.infer<typeof DpaConsentFieldsSchema>

// ============================================================================
// Procedure-Specific Fields Schema
// ============================================================================

export const ProcedureConsentFieldsSchema = z.object({
	procedureName: z.string(),
	procedureDescription: z.string().optional(),
	risks: z.array(z.string()).optional(),
	alternatives: z.array(z.string()).optional(),
	expectedOutcome: z.string().optional(),
	performingPhysician: z.string().optional(),
	anesthesiaType: z.string().optional(),
})

export type ProcedureConsentFields = z.infer<typeof ProcedureConsentFieldsSchema>

// ============================================================================
// Consent Record Schema
// ============================================================================

export const ConsentRecordSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	patientId: z.string().uuid(),
	patientName: z.string().nullable(),
	patientMrn: z.string().nullable(),

	// Consent details
	consentType: ConsentTypeEnum,
	consentVersion: z.string(),
	consentText: z.string(),
	customFields: z.record(z.string(), z.unknown()).nullable(), // Type-specific fields

	// Signer info
	signer: ConsentSignerSchema.nullable(),
	witnesses: z.array(WitnessSchema).nullable(),

	// Status
	status: ConsentStatusEnum,
	isActive: z.boolean(),


	// Obtained by
	obtainedByStaffId: z.string().uuid().nullable(),
	obtainedByStaffName: z.string().nullable(),

	// Revocation info
	revokedAt: dateOrString.nullable(),
	revokedByStaffId: z.string().uuid().nullable(),
	revocationReason: z.string().nullable(),

	// Expiration
	expiresAt: dateOrString.nullable(),

	// Metadata
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type ConsentRecord = z.infer<typeof ConsentRecordSchema>

// ============================================================================
// List Consent Records
// ============================================================================

export const ConsentListSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid().optional(),
	encounterId: z.string().uuid().optional(),
	patientId: z.string().uuid().optional(),
	consentType: ConsentTypeEnum.optional(),
	status: ConsentStatusEnum.optional(),
	isActive: z.coerce.boolean().optional(),
})

export type ConsentListInput = z.infer<typeof ConsentListSchema>

export const ConsentListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(ConsentRecordSchema),
})

export type ConsentListResponse = z.infer<typeof ConsentListResponseSchema>

// ============================================================================
// Create Consent Record (pending, to be signed)
// ============================================================================

export const CreateConsentSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().optional(),
	patientId: z.string().uuid(),
	consentType: ConsentTypeEnum,
	consentVersion: z.string().optional(),
	customFields: z.record(z.string(), z.unknown()).optional(),
	expiresAt: z.string().optional(),
})

export type CreateConsent = z.infer<typeof CreateConsentSchema>

// ============================================================================
// Sign Consent
// ============================================================================

export const SignConsentSchema = z.object({
	id: z.string().uuid(),
	signer: ConsentSignerSchema,
	witnesses: z.array(WitnessSchema).optional(),
})

export type SignConsent = z.infer<typeof SignConsentSchema>

// ============================================================================
// Revoke Consent
// ============================================================================

export const RevokeConsentSchema = z.object({
	id: z.string().uuid(),
	revocationReason: z.string().min(1),
})

export type RevokeConsent = z.infer<typeof RevokeConsentSchema>

// ============================================================================
// Check Consent Status
// ============================================================================

export const CheckConsentSchema = z.object({
	patientId: z.string().uuid(),
	consentType: ConsentTypeEnum,
	encounterId: z.string().uuid().optional(),
})

export type CheckConsent = z.infer<typeof CheckConsentSchema>

export const ConsentCheckResultSchema = z.object({
	hasValidConsent: z.boolean(),
	consentRecord: ConsentRecordSchema.nullable(),
	expiresAt: z.string().nullable(),
	requiresRenewal: z.boolean(),
})

export type ConsentCheckResult = z.infer<typeof ConsentCheckResultSchema>

// ============================================================================
// Get Consent by ID
// ============================================================================

export const ConsentIdSchema = z.object({
	id: z.string().uuid(),
})

export type ConsentId = z.infer<typeof ConsentIdSchema>

// ============================================================================
// Get Active Consents for Patient
// ============================================================================

export const PatientConsentsSchema = z.object({
	patientId: z.string().uuid(),
})

export type PatientConsents = z.infer<typeof PatientConsentsSchema>

// ============================================================================
// Break-Glass Access Request Schema
// ============================================================================

export const BreakGlassRequestSchema = z.object({
	patientId: z.string().uuid(),
	encounterId: z.string().uuid().optional(),
	reason: z.string().min(10),
	accessDurationMinutes: z.number().int().positive().max(480).default(60), // Max 8 hours
})

export type BreakGlassRequest = z.infer<typeof BreakGlassRequestSchema>

export const BreakGlassResponseSchema = z.object({
	accessGranted: z.boolean(),
	accessToken: z.string().nullable(),
	expiresAt: z.string().nullable(),
	auditLogId: z.string().uuid(),
})

export type BreakGlassResponse = z.infer<typeof BreakGlassResponseSchema>

// ============================================================================
// Verify Break-Glass Token
// ============================================================================

export const VerifyBreakGlassSchema = z.object({
	accessToken: z.string(),
	patientId: z.string().uuid(),
})

export type VerifyBreakGlass = z.infer<typeof VerifyBreakGlassSchema>

export const BreakGlassVerifyResultSchema = z.object({
	isValid: z.boolean(),
	expiresAt: z.string().nullable(),
	remainingMinutes: z.number().nullable(),
})

export type BreakGlassVerifyResult = z.infer<typeof BreakGlassVerifyResultSchema>

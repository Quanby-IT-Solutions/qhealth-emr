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

// Helper to handle empty string as undefined for optional UUID fields
const optionalUuid = z
	.string()
	.optional()
	.transform(v => (v === "" ? undefined : v))
	.pipe(z.string().uuid().optional())

// ============================================================================
// Enums
// ============================================================================

export const NbsStatusEnum = z.enum([
	"pending",
	"collected",
	"sent",
	"resulted",
	"positive",
	"negative",
])

export const NbsSpecimenTypeEnum = z.enum(["dried_blood_spot", "cord_blood", "heel_prick"])

export const NbsConsentTypeEnum = z.enum(["consent", "waiver"])

export const NbsReferralStatusEnum = z.enum(["pending", "accepted", "completed", "declined"])

export const NbsResultEnum = z.enum(["positive", "negative", "borderline"])

export const NbsOverallResultEnum = z.enum(["normal", "abnormal", "borderline"])

export type NbsStatus = z.infer<typeof NbsStatusEnum>
export type NbsSpecimenType = z.infer<typeof NbsSpecimenTypeEnum>
export type NbsConsentType = z.infer<typeof NbsConsentTypeEnum>
export type NbsReferralStatus = z.infer<typeof NbsReferralStatusEnum>

// ============================================================================
// NBS Screening Schema
// ============================================================================

export const NbsScreeningSchema = z.object({
	id: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	facilityId: z.string().uuid(),

	// Timing
	birthDatetime: dateOrString,
	specimenCollectedAt: dateOrString.nullable(),
	specimenSentAt: dateOrString.nullable(),
	resultReceivedAt: dateOrString.nullable(),

	// Specimen
	specimenType: NbsSpecimenTypeEnum.nullable(),
	specimenBarcode: z.string().nullable(),
	specimenCollectedBy: z.string().uuid().nullable(),
	specimenCollectedByName: z.string().nullable(),

	// Status
	status: NbsStatusEnum,

	// Results — NBS panel conditions (DOH mandated)
	result_ch: NbsResultEnum.nullable(), // Congenital Hypothyroidism
	result_cah: NbsResultEnum.nullable(), // Congenital Adrenal Hyperplasia
	result_g6pd: NbsResultEnum.nullable(), // G6PD Deficiency
	result_gal: NbsResultEnum.nullable(), // Galactosemia
	result_pku: NbsResultEnum.nullable(), // Phenylketonuria
	result_msud: NbsResultEnum.nullable(), // Maple Syrup Urine Disease
	result_overall: NbsOverallResultEnum.nullable(),

	// Notes
	notes: z.string().nullable(),
	performedBy: z.string().uuid(),
	performedByName: z.string(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type NbsScreening = z.infer<typeof NbsScreeningSchema>

// ============================================================================
// NBS Consent Schema
// ============================================================================

export const NbsConsentSchema = z.object({
	id: z.string().uuid(),
	nbsId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	consentType: NbsConsentTypeEnum,
	parentName: z.string(),
	relationship: z.string(),
	waiverReason: z.string().nullable(),
	signatureDataUrl: z.string().nullable(),
	signedAt: dateOrString,
	witnessName: z.string().nullable(),
	performedBy: z.string().uuid(),
	performedByName: z.string(),
	createdAt: dateOrString,
})

export type NbsConsent = z.infer<typeof NbsConsentSchema>

// ============================================================================
// NBS Referral Schema
// ============================================================================

export const NbsReferralSchema = z.object({
	id: z.string().uuid(),
	nbsId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	referredCondition: z.string(),
	referralFacility: z.string(),
	referralDatetime: dateOrString,
	referralStatus: NbsReferralStatusEnum,
	acceptedAt: dateOrString.nullable(),
	completedAt: dateOrString.nullable(),
	referralNotes: z.string().nullable(),
	performedBy: z.string().uuid(),
	performedByName: z.string(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type NbsReferral = z.infer<typeof NbsReferralSchema>

// ============================================================================
// NBS Logbook Entry Schema
// ============================================================================

export const NbsLogbookEntrySchema = z.object({
	id: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	patientName: z.string(),
	patientMrn: z.string(),
	birthDatetime: dateOrString,
	specimenCollectedAt: dateOrString.nullable(),
	status: NbsStatusEnum,
	result_overall: NbsOverallResultEnum.nullable(),
	facilityId: z.string().uuid(),
	createdAt: dateOrString,
})

export type NbsLogbookEntry = z.infer<typeof NbsLogbookEntrySchema>

// ============================================================================
// Query Schemas
// ============================================================================

export const NbsScreeningByEncounterParamsSchema = z.object({
	encounterId: z.string().uuid(),
})

export const NbsScreeningByIdParamsSchema = z.object({
	id: z.string().uuid(),
})

export const NbsConsentByNbsIdParamsSchema = z.object({
	nbsId: z.string().uuid(),
})

export const NbsReferralsByNbsIdParamsSchema = z.object({
	nbsId: z.string().uuid(),
})

export const NbsReferralByIdParamsSchema = z.object({
	id: z.string().uuid(),
})

export const NbsLogbookQuerySchema = PaginationInputSchema.extend({
	facilityId: optionalUuid,
})

export type NbsLogbookQuery = z.infer<typeof NbsLogbookQuerySchema>

export const NbsLogbookResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(NbsLogbookEntrySchema),
})

export type NbsLogbookResponse = z.infer<typeof NbsLogbookResponseSchema>

// ============================================================================
// Create/Update Schemas
// ============================================================================

export const CreateNbsScreeningSchema = z.object({
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	facilityId: z.string().uuid(),
	birthDatetime: z.string(), // ISO string
	specimenType: NbsSpecimenTypeEnum.optional(),
	specimenBarcode: z.string().optional(),
	specimenCollectedAt: z.string().optional(),
	specimenCollectedBy: z.string().uuid().optional(),
	notes: z.string().optional(),
})

export type CreateNbsScreening = z.infer<typeof CreateNbsScreeningSchema>

export const UpdateNbsScreeningSchema = z.object({
	id: z.string().uuid(),
	encounterId: z.string().uuid().optional(),
	specimenType: NbsSpecimenTypeEnum.optional(),
	specimenBarcode: z.string().optional(),
	specimenCollectedAt: z.string().optional(),
	specimenCollectedBy: z.string().uuid().optional(),
	specimenSentAt: z.string().optional(),
	resultReceivedAt: z.string().optional(),
	status: NbsStatusEnum.optional(),
	result_ch: NbsResultEnum.optional(),
	result_cah: NbsResultEnum.optional(),
	result_g6pd: NbsResultEnum.optional(),
	result_gal: NbsResultEnum.optional(),
	result_pku: NbsResultEnum.optional(),
	result_msud: NbsResultEnum.optional(),
	result_overall: NbsOverallResultEnum.optional(),
	notes: z.string().optional(),
})

export type UpdateNbsScreening = z.infer<typeof UpdateNbsScreeningSchema>

export const CreateNbsConsentSchema = z.object({
	nbsId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	consentType: NbsConsentTypeEnum,
	parentName: z.string().min(1),
	relationship: z.string().min(1),
	waiverReason: z.string().optional(),
	signatureDataUrl: z.string().optional(),
	witnessName: z.string().optional(),
})

export type CreateNbsConsent = z.infer<typeof CreateNbsConsentSchema>

export const CreateNbsReferralSchema = z.object({
	nbsId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	referredCondition: z.string().min(1),
	referralFacility: z.string().min(1),
	referralDatetime: z.string(), // ISO string
	referralNotes: z.string().optional(),
})

export type CreateNbsReferral = z.infer<typeof CreateNbsReferralSchema>

export const UpdateNbsReferralSchema = z.object({
	id: z.string().uuid(),
	referralStatus: NbsReferralStatusEnum.optional(),
	acceptedAt: z.string().optional(),
	completedAt: z.string().optional(),
	referralNotes: z.string().optional(),
})

export type UpdateNbsReferral = z.infer<typeof UpdateNbsReferralSchema>

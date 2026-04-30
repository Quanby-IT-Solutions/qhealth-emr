import { z } from "zod"

// ============================================================================
// Helpers
// ============================================================================

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

const PaginationInputSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(500).default(50),
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

export const MarStatusEnum = z.enum(["due", "given", "missed", "held", "refused"])

export const TarStatusEnum = z.enum(["due", "given", "missed", "held", "refused"])

export const IoTypeEnum = z.enum(["intake", "output"])

export const NewsRiskLevelEnum = z.enum(["low", "medium", "high"])

export const HandoffStatusEnum = z.enum(["draft", "signed"])

export const HaiTypeEnum = z.enum(["clabsi", "cauti", "vap", "ssi", "cdiff"])

export const HaiStatusEnum = z.enum(["suspected", "confirmed", "resolved"])

// ============================================================================
// Vital Signs
// ============================================================================

export const VitalSignSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	preEncounterId: z.string().uuid().nullable(),
	temperature: z.string().nullable(),
	bpSystolic: z.number().int().nullable(),
	bpDiastolic: z.number().int().nullable(),
	heartRate: z.number().int().nullable(),
	respiratoryRate: z.number().int().nullable(),
	spo2: z.string().nullable(),
	painScore: z.number().int().nullable(),
	weight: z.string().nullable(),
	height: z.string().nullable(),
	newsScore: z.number().int().nullable(),
	newsRiskLevel: NewsRiskLevelEnum.nullable(),
	recordedByStaffId: z.string().uuid(),
	recordedAt: dateOrString,
	createdAt: dateOrString,
})

export const CreateVitalSignSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().optional(),
	preEncounterId: z.string().uuid().optional(),
	temperature: z.coerce.number().optional(),
	bpSystolic: z.coerce.number().int().optional(),
	bpDiastolic: z.coerce.number().int().optional(),
	heartRate: z.coerce.number().int().optional(),
	respiratoryRate: z.coerce.number().int().optional(),
	spo2: z.coerce.number().optional(),
	painScore: z.coerce.number().int().min(0).max(10).optional(),
	weight: z.coerce.number().optional(),
	height: z.coerce.number().optional(),
})

export const VitalSignListSchema = PaginationInputSchema.extend({
	encounterId: z.string().uuid().optional(),
	preEncounterId: z.string().uuid().optional(),
	facilityId: z.string().uuid().optional(),
})

export const VitalSignListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(VitalSignSchema),
})

export const VitalSignIdSchema = z.object({ id: z.string().uuid() })

// ============================================================================
// MAR Entries
// ============================================================================

export const MarEntrySchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	preEncounterId: z.string().uuid().nullable(),
	medicationOrderId: z.string().uuid(),
	scheduledTime: dateOrString,
	status: MarStatusEnum,
	administeredDose: z.string().nullable(),
	administeredRoute: z.string().nullable(),
	prnReason: z.string().nullable(),
	administeredByStaffId: z.string().uuid().nullable(),
	administeredAt: dateOrString.nullable(),
	notes: z.string().nullable(),
	createdAt: dateOrString,
})

export const MarEntryListSchema = PaginationInputSchema.extend({
	encounterId: z.string().uuid().optional(),
	preEncounterId: z.string().uuid().optional(),
	facilityId: z.string().uuid().optional(),
	status: MarStatusEnum.optional(),
	scheduledFrom: z.string().optional(),
	scheduledTo: z.string().optional(),
})

export const MarEntryListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(MarEntrySchema),
})

export const MarEntryIdSchema = z.object({ id: z.string().uuid() })

export const AdministerMarSchema = z.object({
	id: z.string().uuid(),
	status: MarStatusEnum,
	administeredDose: z.string().optional(),
	administeredRoute: z.string().optional(),
	prnReason: z.string().optional(),
	notes: z.string().optional(),
})

// ============================================================================
// TAR Entries
// ============================================================================

export const TarEntrySchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	preEncounterId: z.string().uuid().nullable(),
	treatmentDescription: z.string(),
	scheduledTime: dateOrString,
	status: TarStatusEnum,
	administeredByStaffId: z.string().uuid().nullable(),
	administeredAt: dateOrString.nullable(),
	notes: z.string().nullable(),
	createdAt: dateOrString,
})

export const TarEntryListSchema = PaginationInputSchema.extend({
	encounterId: z.string().uuid().optional(),
	preEncounterId: z.string().uuid().optional(),
	facilityId: z.string().uuid().optional(),
	status: TarStatusEnum.optional(),
})

export const TarEntryListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(TarEntrySchema),
})

export const TarEntryIdSchema = z.object({ id: z.string().uuid() })

export const CreateTarEntrySchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().optional(),
	preEncounterId: z.string().uuid().optional(),
	treatmentDescription: z.string().min(1),
	scheduledTime: z.string(),
})

export const AdministerTarSchema = z.object({
	id: z.string().uuid(),
	status: TarStatusEnum,
	notes: z.string().optional(),
})

// ============================================================================
// I/O Entries
// ============================================================================

export const IoEntrySchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	preEncounterId: z.string().uuid().nullable(),
	ioType: IoTypeEnum,
	route: z.string(),
	description: z.string().nullable(),
	amountMl: z.string(),
	recordedByStaffId: z.string().uuid(),
	recordedAt: dateOrString,
	createdAt: dateOrString,
})

export const CreateIoEntrySchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().optional(),
	preEncounterId: z.string().uuid().optional(),
	ioType: IoTypeEnum,
	route: z.string().min(1),
	description: z.string().optional(),
	amountMl: z.coerce.number().positive(),
})

export const IoEntryListSchema = PaginationInputSchema.extend({
	encounterId: z.string().uuid().optional(),
	preEncounterId: z.string().uuid().optional(),
	facilityId: z.string().uuid().optional(),
	ioType: IoTypeEnum.optional(),
})

export const IoEntryListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(IoEntrySchema),
})

export const IoBalanceSchema = z.object({
	encounterId: z.string().uuid(),
	facilityId: z.string().uuid().optional(),
})

export const IoBalanceResponseSchema = z.object({
	totalIntake: z.number(),
	totalOutput: z.number(),
	netBalance: z.number(),
	periodStart: dateOrString,
	periodEnd: dateOrString,
})

// ============================================================================
// Flowsheet Entries
// ============================================================================

export const FlowsheetEntrySchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	parameterName: z.string(),
	parameterValue: z.string(),
	unit: z.string().nullable(),
	recordedByStaffId: z.string().uuid(),
	recordedAt: dateOrString,
	createdAt: dateOrString,
})

export const FlowsheetListSchema = PaginationInputSchema.extend({
	encounterId: z.string().uuid(),
	facilityId: z.string().uuid().optional(),
	parameterName: z.string().optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
})

export const FlowsheetListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(FlowsheetEntrySchema),
})

// ============================================================================
// Shift Handoffs
// ============================================================================

export const ShiftHandoffSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	outgoingStaffId: z.string().uuid(),
	incomingStaffId: z.string().uuid().nullable(),
	handoffNotes: z.string(),
	status: HandoffStatusEnum,
	signedAt: dateOrString.nullable(),
	createdAt: dateOrString,
})

export const ShiftHandoffIdSchema = z.object({ id: z.string().uuid() })

export const CreateShiftHandoffSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	incomingStaffId: z.string().uuid().optional(),
	handoffNotes: z.string().optional(),
})

export const FinalizeHandoffSchema = z.object({
	id: z.string().uuid(),
})

export const GenerateHandoffSchema = z.object({
	encounterId: z.string().uuid(),
	facilityId: z.string().uuid().optional(),
})

export const GeneratedHandoffResponseSchema = z.object({
	activeProblems: z.array(z.object({ description: z.string(), icd10Code: z.string().nullable() })),
	currentMedications: z.array(z.object({ genericName: z.string(), dose: z.string(), frequency: z.string() })),
	recentVitals: VitalSignSchema.nullable(),
	newsScore: z.number().int().nullable(),
	newsRiskLevel: NewsRiskLevelEnum.nullable(),
	ioBalance: IoBalanceResponseSchema.nullable(),
	pendingOrders: z.number().int(),
})

export const ShiftHandoffListSchema = PaginationInputSchema.extend({
	encounterId: z.string().uuid().optional(),
	facilityId: z.string().uuid().optional(),
	outgoingStaffId: z.string().uuid().optional(),
})

export const ShiftHandoffListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(ShiftHandoffSchema),
})

// ============================================================================
// HAI Tags
// ============================================================================

export const HaiTagSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	haiType: HaiTypeEnum,
	onsetDate: z.string(),
	confirmedAt: dateOrString.nullable(),
	resolvedAt: dateOrString.nullable(),
	status: HaiStatusEnum,
	notes: z.string().nullable(),
	documentedByStaffId: z.string().uuid(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export const HaiTagIdSchema = z.object({ id: z.string().uuid() })

export const CreateHaiTagSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	haiType: HaiTypeEnum,
	onsetDate: z.string(),
	notes: z.string().optional(),
})

export const UpdateHaiTagSchema = z.object({
	id: z.string().uuid(),
	status: HaiStatusEnum.optional(),
	notes: z.string().optional(),
})

export const HaiTagListSchema = PaginationInputSchema.extend({
	encounterId: z.string().uuid().optional(),
	facilityId: z.string().uuid().optional(),
	haiType: HaiTypeEnum.optional(),
	status: HaiStatusEnum.optional(),
})

export const HaiTagListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(HaiTagSchema),
})

// ============================================================================
// Consent Records
// ============================================================================

export const ConsentTypeEnum = z.enum([
	"general",
	"dpa",
	"nbs",
	"transfusion",
	"surgery",
	"anesthesia",
	"philhealth",
	"do_not_resuscitate",
	"hiv_testing",
	"organ_donation",
	"research",
	"telemedicine",
])

export const ConsentRecordSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	patientId: z.string().uuid(),
	preEncounterId: z.string().uuid().nullable(),
	consentType: z.string(),
	signedByName: z.string(),
	relationship: z.string(),
	content: z.string().nullable(),
	signatureData: z.unknown().nullable(),
	signedAt: dateOrString.nullable(),
	witnessStaffId: z.string().uuid().nullable(),
	isActive: z.boolean(),
	revokedAt: dateOrString.nullable(),
	revocationReason: z.string().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
	consentText: z.string(),
	patientSignature: z.string().nullable(),
	guardianSignature: z.string().nullable(),
	witnessSignature: z.string().nullable(),
	capturedByStaffId: z.string().uuid().nullable(),
})

export const CreateConsentRecordSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	preEncounterId: z.string().uuid().optional(),
	consentType: z.string().min(1),
	signedByName: z.string().min(1),
	relationship: z.string().min(1),
	content: z.string().optional(),
	signatureData: z.unknown().optional(),
	signedAt: dateOrString.optional(),
	witnessStaffId: z.string().uuid().optional(),
	consentText: z.string().optional(),
	patientSignature: z.string().optional(),
	guardianSignature: z.string().optional(),
	witnessSignature: z.string().optional(),
})

export const ConsentRecordListSchema = PaginationInputSchema.extend({
	encounterId: z.string().uuid().optional(),
	preEncounterId: z.string().uuid().optional(),
	facilityId: z.string().uuid().optional(),
	consentType: z.string().optional(),
})

export const ConsentRecordListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(ConsentRecordSchema),
})

export const ConsentRecordIdSchema = z.object({ id: z.string().uuid() })

// ============================================================================
// Inferred Types
// ============================================================================

export type VitalSign = z.infer<typeof VitalSignSchema>
export type CreateVitalSign = z.infer<typeof CreateVitalSignSchema>
export type MarEntry = z.infer<typeof MarEntrySchema>
export type AdministerMar = z.infer<typeof AdministerMarSchema>
export type TarEntry = z.infer<typeof TarEntrySchema>
export type CreateTarEntry = z.infer<typeof CreateTarEntrySchema>
export type AdministerTar = z.infer<typeof AdministerTarSchema>
export type IoEntry = z.infer<typeof IoEntrySchema>
export type CreateIoEntry = z.infer<typeof CreateIoEntrySchema>
export type FlowsheetEntry = z.infer<typeof FlowsheetEntrySchema>
export type ShiftHandoff = z.infer<typeof ShiftHandoffSchema>
export type CreateShiftHandoff = z.infer<typeof CreateShiftHandoffSchema>
export type HaiTag = z.infer<typeof HaiTagSchema>
export type CreateHaiTag = z.infer<typeof CreateHaiTagSchema>
export type ConsentRecord = z.infer<typeof ConsentRecordSchema>
export type CreateConsentRecord = z.infer<typeof CreateConsentRecordSchema>

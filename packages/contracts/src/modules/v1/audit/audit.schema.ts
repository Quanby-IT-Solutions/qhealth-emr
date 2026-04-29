import { z } from "zod"

// ============================================================================
// Enums
// ============================================================================

export const AuditActionEnum = z.enum([
	"create",
	"read",
	"update",
	"delete",
	"sign",
	"verify",
	"override",
])

export const BreakGlassReasonCategoryEnum = z.enum([
	"life_threatening_emergency",
	"covering_for_absent_provider",
	"administrative_need",
	"other",
	"cardiac_arrest",
	"motor_vehicle_accident",
	"code_blue",
	"trauma",
	"sepsis",
	"stroke",
])

export const BreakGlassReviewStatusEnum = z.enum(["pending", "appropriate", "flagged"])

// ============================================================================
// Timestamp helper
// ============================================================================

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

// ============================================================================
// Audit Log
// ============================================================================

export const AuditLogSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	userId: z.string(),
	staffProfileId: z.string().uuid().nullable(),
	action: AuditActionEnum,
	entityType: z.string(),
	entityId: z.string().uuid(),
	beforeState: z.unknown().nullable(),
	afterState: z.unknown().nullable(),
	ipAddress: z.string().nullable(),
	userAgent: z.string().nullable(),
	metadata: z.unknown().nullable(),
	createdAt: dateOrString,
})

export type AuditLog = z.infer<typeof AuditLogSchema>

export const AuditLogFilterSchema = z.object({
	facilityId: z.string().uuid(),
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional(),
	userId: z.string().optional(),
	action: AuditActionEnum.optional(),
	entityType: z.string().optional(),
	patientMrn: z.string().optional(),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
})

export type AuditLogFilter = z.infer<typeof AuditLogFilterSchema>

export const AuditLogListResponseSchema = z.object({
	data: z.array(AuditLogSchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
})

// ============================================================================
// Break Glass
// ============================================================================

export const BreakGlassEventSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	clinicianStaffId: z.string().uuid(),
	patientId: z.string().uuid(),
	reasonCategory: z.string(),
	justification: z.string(),
	accessGrantedAt: dateOrString,
	accessExpiresAt: dateOrString,
	recordsAccessed: z.unknown().nullable(),
	reviewStatus: BreakGlassReviewStatusEnum,
	reviewedByStaffId: z.string().uuid().nullable(),
	reviewNotes: z.string().nullable(),
	reviewedAt: dateOrString.nullable(),
	createdAt: dateOrString,
})

export type BreakGlassEvent = z.infer<typeof BreakGlassEventSchema>

export const CreateBreakGlassSchema = z.object({
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	reasonCategory: BreakGlassReasonCategoryEnum,
	justification: z.string().min(10, "Justification must be at least 10 characters"),
	durationHours: z.number().int().positive().max(24).default(4),
})

export type CreateBreakGlassInput = z.infer<typeof CreateBreakGlassSchema>

export const BreakGlassIdSchema = z.object({ id: z.string().uuid() })

export const ReviewBreakGlassSchema = z.object({
	id: z.string().uuid(),
	reviewStatus: z.enum(["appropriate", "flagged"]),
	reviewNotes: z.string().optional(),
})

export type ReviewBreakGlassInput = z.infer<typeof ReviewBreakGlassSchema>

export const BreakGlassFilterSchema = z.object({
	facilityId: z.string().uuid(),
	reviewStatus: BreakGlassReviewStatusEnum.optional(),
	clinicianStaffId: z.string().uuid().optional(),
	patientId: z.string().uuid().optional(),
	dateFrom: z.string().datetime().optional(),
	dateTo: z.string().datetime().optional(),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
})

export const BreakGlassListResponseSchema = z.object({
	data: z.array(BreakGlassEventSchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
})

// ============================================================================
// Break Glass — Pattern Detection (AD-005)
// ============================================================================

export const BreakGlassPatternsFilterSchema = z.object({
	facilityId: z.string().uuid(),
	days: z.coerce.number().int().positive().max(90).default(30),
	topN: z.coerce.number().int().positive().max(20).default(10),
})

export const BreakGlassRepeatRequesterSchema = z.object({
	clinicianStaffId: z.string().uuid(),
	eventCount: z.number(),
	pendingReviewCount: z.number(),
	flaggedCount: z.number(),
	distinctPatients: z.number(),
})

export const BreakGlassRepeatPatientSchema = z.object({
	patientId: z.string().uuid(),
	eventCount: z.number(),
	distinctClinicians: z.number(),
	flaggedCount: z.number(),
})

export const BreakGlassPatternsSchema = z.object({
	totalEventsInWindow: z.number(),
	pendingReviewCount: z.number(),
	flaggedCount: z.number(),
	topRepeatRequesters: z.array(BreakGlassRepeatRequesterSchema),
	topRepeatPatients: z.array(BreakGlassRepeatPatientSchema),
	daysAnalyzed: z.number(),
})

export type BreakGlassPatterns = z.infer<typeof BreakGlassPatternsSchema>

// ============================================================================
// Config History (AD-006)
// ============================================================================

export const ConfigHistoryFilterSchema = z.object({
	facilityId: z.string().uuid(),
	entityType: z.string().optional(),
	dateFrom: z.string().datetime().optional(),
	dateTo: z.string().datetime().optional(),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
})

export const ConfigHistoryEntrySchema = z.object({
	id: z.string().uuid(),
	entityType: z.string(),
	action: z.string(),
	description: z.string(),
	actor: z.string(),
	beforeState: z.unknown().nullable(),
	afterState: z.unknown().nullable(),
	at: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v)),
})

export type ConfigHistoryEntry = z.infer<typeof ConfigHistoryEntrySchema>

export const ConfigHistoryListResponseSchema = z.object({
	data: z.array(ConfigHistoryEntrySchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
})

// ============================================================================
// CSV Export
// ============================================================================

export const AuditLogExportFilterSchema = AuditLogFilterSchema.omit({
	page: true,
	limit: true,
})

export const BreakGlassExportFilterSchema = BreakGlassFilterSchema.omit({
	page: true,
	limit: true,
})

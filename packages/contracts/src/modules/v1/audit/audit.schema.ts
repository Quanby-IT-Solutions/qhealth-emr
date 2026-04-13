import { z } from "zod"

// ============================================================================
// Enums
// ============================================================================

export const AuditActionEnum = z.enum([
	"create",
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
// CSV Export
// ============================================================================

export const AuditLogExportFilterSchema = AuditLogFilterSchema.omit({
	page: true,
	limit: true,
})

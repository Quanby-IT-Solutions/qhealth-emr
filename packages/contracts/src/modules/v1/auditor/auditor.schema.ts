import { z } from "zod"

import { AuditActionEnum, AuditLogSchema, BreakGlassEventSchema } from "../audit/audit.schema.js"

// ============================================================================
// Enums
// ============================================================================

export const AuditSeverityEnum = z.enum(["info", "warning", "critical"])
export const AuditOutcomeEnum = z.enum(["success", "failure"])
export const BreakGlassReviewActionEnum = z.enum(["approve", "flag", "note"])

// ============================================================================
// Enhanced Audit Log — for auditor read API
// ============================================================================

export const AuditorEventSchema = AuditLogSchema.extend({
	severity: AuditSeverityEnum.default("info"),
	sessionId: z.string().nullable().optional(),
	outcome: AuditOutcomeEnum.default("success"),
})

export type AuditorEvent = z.infer<typeof AuditorEventSchema>

export const AuditorEventListFilterSchema = z.object({
	facilityId: z.string().uuid(),
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional(),
	userId: z.string().optional(),
	action: AuditActionEnum.optional(),
	severity: AuditSeverityEnum.optional(),
	outcome: AuditOutcomeEnum.optional(),
	resourceType: z.string().optional(),
	sessionId: z.string().optional(),
	// cursor = base64(JSON{ts, id}) for (createdAt DESC, id DESC) keyset pagination
	cursor: z.string().optional(),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
})

export type AuditorEventListFilter = z.infer<typeof AuditorEventListFilterSchema>

export const AuditorEventListResponseSchema = z.object({
	data: z.array(AuditorEventSchema),
	total: z.number(),
	page: z.number(),
	totalPages: z.number(),
	nextCursor: z.string().nullable(),
})

export const AuditorEventSessionResponseSchema = z.object({
	sessionId: z.string(),
	events: z.array(AuditorEventSchema),
})

export const AuditorExportInputSchema = z.object({
	facilityId: z.string().uuid(),
	format: z.enum(["csv", "pdf"]).default("csv"),
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional(),
	userId: z.string().optional(),
	action: AuditActionEnum.optional(),
	severity: AuditSeverityEnum.optional(),
	outcome: AuditOutcomeEnum.optional(),
	resourceType: z.string().optional(),
})

export const AuditorExportResponseSchema = z.object({
	contentHash: z.string(),
	rowCount: z.number(),
})

// ============================================================================
// Break-Glass Review — auditor review actions
// ============================================================================

export const AuditorBreakGlassInboxFilterSchema = z.object({
	facilityId: z.string().uuid(),
	status: z.enum(["pending", "appropriate", "flagged"]).optional(),
	clinicianId: z.string().uuid().optional(),
	dateFrom: z.string().datetime().optional(),
	dateTo: z.string().datetime().optional(),
	slaBreached: z.coerce.boolean().optional(),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
})

export const AuditorBreakGlassInboxResponseSchema = z.object({
	data: z.array(BreakGlassEventSchema),
	total: z.number(),
	page: z.number(),
	totalPages: z.number(),
})

export const AuditorReviewInputSchema = z.object({
	eventId: z.string().uuid(),
	reason: z.string().min(10, "Reason must be at least 10 characters"),
})

export type AuditorReviewInput = z.infer<typeof AuditorReviewInputSchema>

export const BreakGlassReviewSchema = z.object({
	id: z.string().uuid(),
	breakGlassEventId: z.string().uuid(),
	reviewerStaffId: z.string().uuid(),
	action: BreakGlassReviewActionEnum,
	reason: z.string(),
	decidedAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v)),
	createdAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v)),
})

export type BreakGlassReview = z.infer<typeof BreakGlassReviewSchema>

export const BreakGlassHistoryByClinicinaInputSchema = z.object({
	facilityId: z.string().uuid(),
	clinicianId: z.string().uuid(),
})

export const BreakGlassHistoryByClinicianResponseSchema = z.object({
	clinicianId: z.string().uuid(),
	total: z.number(),
	recent: z.array(BreakGlassEventSchema),
})

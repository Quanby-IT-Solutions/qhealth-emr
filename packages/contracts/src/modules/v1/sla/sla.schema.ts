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

export const SlaStatusEnum = z.enum(["on_time", "approaching", "exceeded"])

export const SlaWorkflowTypeEnum = z.enum([
	"opd_consultation",
	"admission",
	"lab_result",
	"radiology_result",
	"medication_dispensing",
	"discharge",
	"medical_records",
	"emergency_triage",
	"surgical_scheduling",
	"billing_processing",
])

export type SlaStatus = z.infer<typeof SlaStatusEnum>
export type SlaWorkflowType = z.infer<typeof SlaWorkflowTypeEnum>

// ============================================================================
// SLA Config Schema
// ============================================================================

export const SlaConfigSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	workflowType: SlaWorkflowTypeEnum,
	targetMinutes: z.number().int().positive(),
	warningThresholdPct: z.number().int().min(1).max(99), // e.g. 80 = warn at 80% of target
	isActive: z.boolean(),
	description: z.string(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type SlaConfig = z.infer<typeof SlaConfigSchema>

// ============================================================================
// SLA Event Schema
// ============================================================================

export const SlaEventSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	patientId: z.string().uuid(),
	patientName: z.string(),
	workflowType: SlaWorkflowTypeEnum,
	startedAt: dateOrString,
	completedAt: dateOrString.nullable(),
	targetMinutes: z.number().int().positive(),
	elapsedMinutes: z.number().int().nonnegative(),
	status: SlaStatusEnum,
	escalatedAt: dateOrString.nullable(),
	escalatedToStaffId: z.string().uuid().nullable(),
	notes: z.string().nullable(),
	createdAt: dateOrString,
})

export type SlaEvent = z.infer<typeof SlaEventSchema>

// ============================================================================
// SLA Events Query & Response
// ============================================================================

// Helper to handle empty string as undefined for optional UUID fields
const optionalUuid = z
	.string()
	.optional()
	.transform(v => (v === "" ? undefined : v))
	.pipe(z.string().uuid().optional())

export const SlaEventsQuerySchema = PaginationInputSchema.extend({
	facilityId: optionalUuid,
	status: z.union([SlaStatusEnum, z.literal("all")]).optional(),
	workflowType: SlaWorkflowTypeEnum.optional(),
})

export type SlaEventsQuery = z.infer<typeof SlaEventsQuerySchema>

export const SlaEventsResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(SlaEventSchema),
})

export type SlaEventsResponse = z.infer<typeof SlaEventsResponseSchema>

// ============================================================================
// SLA Events By Encounter
// ============================================================================

export const SlaEventsByEncounterParamsSchema = z.object({
	encounterId: z.string().uuid(),
})

// ============================================================================
// SLA Configs Query & Response
// ============================================================================

export const SlaConfigsQuerySchema = z.object({
	facilityId: optionalUuid,
})

export type SlaConfigsQuery = z.infer<typeof SlaConfigsQuerySchema>

export const SlaConfigsResponseSchema = z.object({
	data: z.array(SlaConfigSchema),
})

export type SlaConfigsResponse = z.infer<typeof SlaConfigsResponseSchema>

// ============================================================================
// Create/Update SLA Config
// ============================================================================

export const CreateSlaConfigSchema = z.object({
	facilityId: z.string().uuid(),
	workflowType: SlaWorkflowTypeEnum,
	targetMinutes: z.number().int().positive(),
	warningThresholdPct: z.number().int().min(1).max(99),
	description: z.string().max(500),
})

export type CreateSlaConfig = z.infer<typeof CreateSlaConfigSchema>

export const UpdateSlaConfigParamsSchema = z.object({
	id: z.string().uuid(),
})

export const UpdateSlaConfigSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid().optional(),
	workflowType: SlaWorkflowTypeEnum.optional(),
	targetMinutes: z.number().int().positive().optional(),
	warningThresholdPct: z.number().int().min(1).max(99).optional(),
	description: z.string().max(500).optional(),
	isActive: z.boolean().optional(),
})

export type UpdateSlaConfig = z.infer<typeof UpdateSlaConfigSchema>

export const DeleteSlaConfigParamsSchema = z.object({
	id: z.string().uuid(),
})

// ============================================================================
// SLA Compliance Metric Schema
// ============================================================================

export const SlaComplianceMetricSchema = z.object({
	workflowType: SlaWorkflowTypeEnum,
	totalCount: z.number().int().nonnegative(),
	onTimeCount: z.number().int().nonnegative(),
	approachingCount: z.number().int().nonnegative(),
	exceededCount: z.number().int().nonnegative(),
	compliancePct: z.number().min(0).max(100),
	avgElapsedMinutes: z.number().nonnegative(),
	avgTargetMinutes: z.number().nonnegative(),
})

export type SlaComplianceMetric = z.infer<typeof SlaComplianceMetricSchema>

// ============================================================================
// SLA Compliance Report
// ============================================================================

export const SlaComplianceQuerySchema = z.object({
	facilityId: z.string().uuid(),
	periodStart: z.string(), // ISO date string
	periodEnd: z.string(), // ISO date string
})

export type SlaComplianceQuery = z.infer<typeof SlaComplianceQuerySchema>

export const SlaComplianceReportSchema = z.object({
	facilityId: z.string().uuid(),
	periodStart: z.string(),
	periodEnd: z.string(),
	overallCompliancePct: z.number().min(0).max(100),
	metrics: z.array(SlaComplianceMetricSchema),
})

export type SlaComplianceReport = z.infer<typeof SlaComplianceReportSchema>

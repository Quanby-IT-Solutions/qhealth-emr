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
	"certificate_issuance",
])

export type SlaStatus = z.infer<typeof SlaStatusEnum>
export type SlaWorkflowType = z.infer<typeof SlaWorkflowTypeEnum>

// TOR-aligned step IDs for each Flow 1-7.
// A step corresponds to a status transition (toStatus) captured in the event stream.
// These are the canonical step labels for Citizen's Charter reporting.
export const SlaStepTypeEnum = z.enum([
	// Flow 1: OPD Consultation
	"opd_triage",
	"opd_registration",
	"opd_vitals",
	"opd_consultation",
	"opd_disposition",
	// Flow 2: Emergency Department
	"ed_rapid_triage",
	"ed_registration",
	"ed_disposition",
	// Flow 3: Ancillary (Lab / Radiology)
	"ancillary_order_receipt",
	"ancillary_payment_clearance",
	"ancillary_procedure",
	"ancillary_release",
	// Flow 4: Inpatient Admission
	"admission_order",
	"admission_bed_assignment",
	"admission_financial_orientation",
	"admission_physical_transfer",
	// Flow 5: Discharge & Billing
	"discharge_may_go_home",
	"discharge_chart_completion",
	"discharge_clearance",
	"discharge_bill_generation",
	"discharge_gate_pass",
	// Flow 6: Outpatient Pharmacy
	"pharmacy_rx_verification",
	"pharmacy_clearance",
	"pharmacy_dispensing",
	// Flow 7: Medical Records & Certificates
	"records_request",
	"records_payment",
	"records_processing_release",
])

export type SlaStepType = z.infer<typeof SlaStepTypeEnum>

// Human-readable labels for each TOR step (for display in compliance reports / config UI)
export const SLA_STEP_LABELS: Record<SlaStepType, string> = {
	opd_triage: "OPD Triage (Flow 1, Step 1)",
	opd_registration: "OPD Registration (Flow 1, Step 2)",
	opd_vitals: "OPD Vital Signs (Flow 1, Step 3)",
	opd_consultation: "OPD Consultation (Flow 1, Step 4)",
	opd_disposition: "OPD Disposition (Flow 1, Step 5)",
	ed_rapid_triage: "ED Rapid Triage (Flow 2, Step 1)",
	ed_registration: "ED Post-Stabilization Registration (Flow 2, Step 3)",
	ed_disposition: "ED Disposition (Flow 2, Step 4)",
	ancillary_order_receipt: "Ancillary Order Receipt (Flow 3, Step 1)",
	ancillary_payment_clearance: "Ancillary Payment Clearance (Flow 3, Step 2)",
	ancillary_procedure: "Ancillary Procedure (Flow 3, Step 3)",
	ancillary_release: "Ancillary Result Release (Flow 3, Step 4)",
	admission_order: "Admission Order (Flow 4, Step 1)",
	admission_bed_assignment: "Bed Assignment (Flow 4, Step 2)",
	admission_financial_orientation: "Financial Orientation (Flow 4, Step 3)",
	admission_physical_transfer: "Physical Transfer (Flow 4, Step 4)",
	discharge_may_go_home: "May Go Home Order (Flow 5, Step 1)",
	discharge_chart_completion: "Chart Completion (Flow 5, Step 2)",
	discharge_clearance: "Clearance & Returns (Flow 5, Step 3)",
	discharge_bill_generation: "Bill Generation (Flow 5, Step 4)",
	discharge_gate_pass: "Gate Pass Release (Flow 5, Step 5)",
	pharmacy_rx_verification: "Rx Verification (Flow 6, Step 1)",
	pharmacy_clearance: "Pharmacy Clearance (Flow 6, Step 2)",
	pharmacy_dispensing: "Dispensing (Flow 6, Step 3)",
	records_request: "Records Request (Flow 7, Step 1)",
	records_payment: "Records Payment (Flow 7, Step 2)",
	records_processing_release: "Processing & Release (Flow 7, Step 3)",
}

// TOR-prescribed default target minutes per step
export const SLA_STEP_DEFAULT_TARGETS: Record<SlaStepType, number> = {
	opd_triage: 5,
	opd_registration: 10,
	opd_vitals: 5,
	opd_consultation: 30,
	opd_disposition: 2,
	ed_rapid_triage: 3,
	ed_registration: 10,
	ed_disposition: 60,
	ancillary_order_receipt: 1,
	ancillary_payment_clearance: 15,
	ancillary_procedure: 120,
	ancillary_release: 1440, // 24 hours max
	admission_order: 5,
	admission_bed_assignment: 15,
	admission_financial_orientation: 10,
	admission_physical_transfer: 30,
	discharge_may_go_home: 5,
	discharge_chart_completion: 240,
	discharge_clearance: 60,
	discharge_bill_generation: 60,
	discharge_gate_pass: 5,
	pharmacy_rx_verification: 5,
	pharmacy_clearance: 15,
	pharmacy_dispensing: 10,
	records_request: 5,
	records_payment: 5,
	records_processing_release: 30,
}

// Mapping from TOR step IDs to the encounterStatusEvents.toStatus values that represent them.
// This lets the backend correlate live event data to TOR steps.
export const SLA_STEP_TO_EVENT_STATUS: Partial<Record<SlaStepType, string[]>> = {
	opd_triage: ["triaged"],
	opd_registration: ["registered"],
	opd_vitals: ["vitals_recorded"],
	opd_consultation: ["in_consultation", "in_progress"],
	opd_disposition: ["completed", "discharged"],
	ed_rapid_triage: ["triaged"],
	ed_registration: ["registered"],
	ed_disposition: ["discharged", "admitted"],
	ancillary_order_receipt: ["lab_ordered", "imaging_ordered"],
	ancillary_payment_clearance: ["cleared_for_procedure"],
	ancillary_procedure: ["in_progress"],
	ancillary_release: ["resulted", "released"],
	admission_order: ["admitted"],
	admission_bed_assignment: ["bed_reserved", "bed_assigned"],
	admission_financial_orientation: ["oriented"],
	admission_physical_transfer: ["transferred_to_ward"],
	discharge_may_go_home: ["may_go_home", "discharge_ordered"],
	discharge_chart_completion: ["chart_completed"],
	discharge_clearance: ["cleared"],
	discharge_bill_generation: ["billed"],
	discharge_gate_pass: ["gate_pass_issued", "discharged"],
	pharmacy_rx_verification: ["rx_verified"],
	pharmacy_clearance: ["cleared_for_dispensing"],
	pharmacy_dispensing: ["dispensed", "completed"],
	records_request: ["requested"],
	records_payment: ["paid"],
	records_processing_release: ["released", "completed"],
}

// ============================================================================
// SLA Config Schema
// ============================================================================

export const SlaConfigSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	workflowType: SlaWorkflowTypeEnum,
	targetMinutes: z.number().int().positive(),
	hardCapMinutes: z.number().int().positive().nullable().optional(),
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
	patientId: z.string().uuid().nullable(),
	patientName: z.string().nullable(),
	workflowType: SlaWorkflowTypeEnum,
	// TOR step currently being timed (maps to encounterStatusEvents.toStatus for encounter workflows)
	currentStep: z.string().nullable().optional(),
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
	hardCapMinutes: z.number().int().positive().optional(),
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
	hardCapMinutes: z.number().int().positive().nullable().optional(),
	warningThresholdPct: z.number().int().min(1).max(99).optional(),
	description: z.string().max(500).optional(),
	isActive: z.boolean().optional(),
})

export type UpdateSlaConfig = z.infer<typeof UpdateSlaConfigSchema>

export const DeleteSlaConfigParamsSchema = z.object({
	id: z.string().uuid(),
})

// ============================================================================
// SLA Step Metric Schema — per TOR step within a workflow
// ============================================================================

export const SlaStepMetricSchema = z.object({
	// The toStatus value from encounterStatusEvents that represents this step
	stepStatus: z.string(),
	// Human-readable label resolved from SLA_STEP_LABELS when stepStatus maps to a TOR step
	stepLabel: z.string().optional(),
	totalCount: z.number().int().nonnegative(),
	onTimeCount: z.number().int().nonnegative(),
	approachingCount: z.number().int().nonnegative(),
	exceededCount: z.number().int().nonnegative(),
	compliancePct: z.number().min(0).max(100),
	avgElapsedMinutes: z.number().nonnegative(),
	avgTargetMinutes: z.number().nonnegative(),
})

export type SlaStepMetric = z.infer<typeof SlaStepMetricSchema>

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
	// Per-step breakdown from the event stream (populated when event data is available)
	stepMetrics: z.array(SlaStepMetricSchema).optional(),
	// Indicates whether this workflow's timing is driven by real checkpoint events or proxy
	// timestamps (e.g. record-creation date). "partial" means some records have checkpoints
	// and some fall back to the proxy. Workflows tagged "proxy" should not be presented as
	// authoritative ARTA compliance evidence until checkpoint instrumentation is complete.
	timingAccuracy: z.enum(["checkpoint", "partial", "proxy"]).optional(),
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
	// Operational SLA Score: all workflows combined regardless of timing accuracy.
	// Includes proxy and partial-checkpoint workflows.
	overallCompliancePct: z.number().min(0).max(100),
	// ARTA-Authoritative Compliance: only workflows where timingAccuracy === "checkpoint".
	// This is the figure suitable for official Citizen's Charter evidence submission.
	authoritativeCompliancePct: z.number().min(0).max(100),
	// Number of records included in the authoritative aggregate (for context).
	authoritativeCount: z.number().int().nonnegative(),
	authoritativeOnTimeCount: z.number().int().nonnegative(),
	metrics: z.array(SlaComplianceMetricSchema),
})

export type SlaComplianceReport = z.infer<typeof SlaComplianceReportSchema>

// ============================================================================
// SLA Step Config Schema — per-facility overrides for TOR step targets
// ============================================================================

export const SlaStepConfigSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	stepType: SlaStepTypeEnum,
	targetMinutes: z.number().int().positive(),
	hardCapMinutes: z.number().int().positive().nullable().optional(),
	warningThresholdPct: z.number().int().min(1).max(99),
	isActive: z.boolean(),
	description: z.string(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type SlaStepConfig = z.infer<typeof SlaStepConfigSchema>

// Helper to handle empty string as undefined for optional UUID fields (reuse pattern)
const optionalUuidForStep = z
	.string()
	.optional()
	.transform(v => (v === "" ? undefined : v))
	.pipe(z.string().uuid().optional())

export const SlaStepConfigsQuerySchema = z.object({
	facilityId: optionalUuidForStep,
})

export type SlaStepConfigsQuery = z.infer<typeof SlaStepConfigsQuerySchema>

export const SlaStepConfigsResponseSchema = z.object({
	data: z.array(SlaStepConfigSchema),
})

export type SlaStepConfigsResponse = z.infer<typeof SlaStepConfigsResponseSchema>

export const CreateSlaStepConfigSchema = z.object({
	facilityId: z.string().uuid(),
	stepType: SlaStepTypeEnum,
	targetMinutes: z.number().int().positive(),
	hardCapMinutes: z.number().int().positive().optional(),
	warningThresholdPct: z.number().int().min(1).max(99),
	description: z.string().max(500),
})

export type CreateSlaStepConfig = z.infer<typeof CreateSlaStepConfigSchema>

export const UpdateSlaStepConfigParamsSchema = z.object({
	id: z.string().uuid(),
})

export const UpdateSlaStepConfigSchema = z.object({
	id: z.string().uuid(),
	targetMinutes: z.number().int().positive().optional(),
	hardCapMinutes: z.number().int().positive().nullable().optional(),
	warningThresholdPct: z.number().int().min(1).max(99).optional(),
	description: z.string().max(500).optional(),
	isActive: z.boolean().optional(),
})

export type UpdateSlaStepConfig = z.infer<typeof UpdateSlaStepConfigSchema>

export const DeleteSlaStepConfigParamsSchema = z.object({
	id: z.string().uuid(),
})

// ============================================================================
// Workflow Status Log (ADM-BE-09)
// ============================================================================

export const WorkflowStatusLogEntrySchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	workflow: z.string(),
	step: z.string(),
	startedAt: dateOrString,
	endedAt: dateOrString.nullable(),
	durationMinutes: z.number().int().nullable(),
	isBreached: z.boolean(),
	isHardCapBreached: z.boolean(),
	createdAt: dateOrString,
})

export const AppendWorkflowStatusSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	workflow: z.string(),
	step: z.string(),
	startedAt: z.string(),
	endedAt: z.string().optional(),
	durationMinutes: z.number().int().positive().optional(),
	isBreached: z.boolean().optional(),
	isHardCapBreached: z.boolean().optional(),
})

export type WorkflowStatusLogEntry = z.infer<typeof WorkflowStatusLogEntrySchema>
export type AppendWorkflowStatus = z.infer<typeof AppendWorkflowStatusSchema>

// ============================================================================
// SLA Analytics (ADM-BE-10)
// ============================================================================

export const SlaKpiTileSchema = z.object({
	workflowType: z.string(),
	workflowLabel: z.string(),
	totalCases: z.number(),
	withinSLAPct: z.number(),
	breachCount: z.number(),
	avgTatMinutes: z.number(),
	statusColor: z.enum(["green", "amber", "red"]),
})

export type SlaKpiTile = z.infer<typeof SlaKpiTileSchema>

export const SlaDashboardQuerySchema = z.object({ facilityId: z.string().uuid() })

export const SlaDashboardResponseSchema = z.object({
	tiles: z.array(SlaKpiTileSchema),
	overallCompliancePct: z.number(),
})

export type SlaDashboardResponse = z.infer<typeof SlaDashboardResponseSchema>

export const TurnaroundDaySchema = z.object({
	date: z.string(),
	cases: z.number(),
	medianTAT: z.number(),
	p95TAT: z.number(),
	withinSLAPct: z.number(),
	breachCount: z.number(),
})

export type TurnaroundDay = z.infer<typeof TurnaroundDaySchema>

export const TurnaroundQuerySchema = z.object({
	facilityId: z.string().uuid(),
	workflowType: z.string(),
	startDate: z.string(),
	endDate: z.string(),
	compareStartDate: z.string().optional(),
	compareEndDate: z.string().optional(),
})

export type TurnaroundQuery = z.infer<typeof TurnaroundQuerySchema>

export const TurnaroundResponseSchema = z.object({
	primary: z.array(TurnaroundDaySchema),
	comparison: z.array(TurnaroundDaySchema).nullable(),
})

export type TurnaroundResponse = z.infer<typeof TurnaroundResponseSchema>

export const BottleneckStepSchema = z.object({
	stepType: z.string(),
	stepLabel: z.string(),
	medianMinutes: z.number(),
	p95Minutes: z.number(),
	outlierEncounterIds: z.array(z.string().uuid()),
})

export type BottleneckStep = z.infer<typeof BottleneckStepSchema>

export const BottleneckQuerySchema = z.object({
	facilityId: z.string().uuid(),
	workflowType: z.string(),
	startDate: z.string(),
	endDate: z.string(),
})

export type BottleneckQuery = z.infer<typeof BottleneckQuerySchema>

export const BottleneckResponseSchema = z.object({
	steps: z.array(BottleneckStepSchema),
})

export type BottleneckResponse = z.infer<typeof BottleneckResponseSchema>

// ============================================================================
// SLA Export (ADM-BE-09 AC3)
// ============================================================================

export const SlaExportQuerySchema = z.object({
	workflowType: z.string(),
	dateFrom: z.string(),
	dateTo: z.string(),
	facilityId: z.string().uuid(),
})

export type SlaExportQuery = z.infer<typeof SlaExportQuerySchema>

export const SlaExportRowSchema = z.object({
	encounterId: z.string().uuid(),
	workflow: z.string(),
	step: z.string(),
	startedAt: z.string(),
	endedAt: z.string().nullable(),
	durationMinutes: z.number().nullable(),
	isBreached: z.boolean(),
	isHardCapBreached: z.boolean(),
})

export const SlaExportResponseSchema = z.object({
	facilityName: z.string(),
	reportPeriod: z.string(),
	generatedAt: z.string(),
	rows: z.array(SlaExportRowSchema),
})

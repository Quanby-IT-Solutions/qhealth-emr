import { index, uniqueIndex } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { facilities } from "./rbac.js"

export type SlaWorkflowType =
	| "opd_consultation"
	| "admission"
	| "lab_result"
	| "radiology_result"
	| "medication_dispensing"
	| "discharge"
	| "medical_records"
	| "emergency_triage"
	| "surgical_scheduling"
	| "billing_processing"
	| "certificate_issuance"

export const slaConfigs = createTable(
	"sla_configs",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		workflowType: t.text("workflow_type").notNull().$type<SlaWorkflowType>(),
		targetMinutes: t.integer("target_minutes").notNull(),
		warningThresholdPct: t.integer("warning_threshold_pct").notNull().default(80),
		isActive: t.boolean("is_active").notNull().default(true),
		description: t.text("description").notNull().default(""),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("sla_configs_facility_id_idx").on(t.facilityId),
		uniqueIndex("sla_configs_facility_workflow_uniq").on(t.facilityId, t.workflowType),
	]
)

export type SlaConfigRow = typeof slaConfigs.$inferSelect

// ============================================================================
// sla_step_configs — per-TOR-step target overrides configurable by the admin.
// When a row exists for a given (facilityId, stepType) pair it overrides the
// default target from SLA_STEP_DEFAULT_TARGETS in @repo/contracts.
// ============================================================================

export type SlaStepType =
	| "opd_triage"
	| "opd_registration"
	| "opd_vitals"
	| "opd_consultation"
	| "opd_disposition"
	| "ed_rapid_triage"
	| "ed_registration"
	| "ed_disposition"
	| "ancillary_order_receipt"
	| "ancillary_payment_clearance"
	| "ancillary_procedure"
	| "ancillary_release"
	| "admission_order"
	| "admission_bed_assignment"
	| "admission_financial_orientation"
	| "admission_physical_transfer"
	| "discharge_may_go_home"
	| "discharge_chart_completion"
	| "discharge_clearance"
	| "discharge_bill_generation"
	| "discharge_gate_pass"
	| "pharmacy_rx_verification"
	| "pharmacy_clearance"
	| "pharmacy_dispensing"
	| "records_request"
	| "records_payment"
	| "records_processing_release"

export const slaStepConfigs = createTable(
	"sla_step_configs",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		stepType: t.text("step_type").notNull().$type<SlaStepType>(),
		targetMinutes: t.integer("target_minutes").notNull(),
		warningThresholdPct: t.integer("warning_threshold_pct").notNull().default(80),
		isActive: t.boolean("is_active").notNull().default(true),
		description: t.text("description").notNull().default(""),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("sla_step_configs_facility_id_idx").on(t.facilityId),
		uniqueIndex("sla_step_configs_facility_step_uniq").on(t.facilityId, t.stepType),
	]
)

export type SlaStepConfigRow = typeof slaStepConfigs.$inferSelect

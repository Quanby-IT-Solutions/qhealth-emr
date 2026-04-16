import { index } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { clinicalNotes } from "./clinical.js"
import { encounters, patients } from "./core.js"
import { facilities, staffProfiles } from "./rbac.js"

// ============================================================================
// REPORTING — PIDSR Cases, Surveillance Flags, AHSR Snapshots
// ============================================================================

export const pidsrCases = createTable(
	"pidsr_cases",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		encounterId: t
			.uuid("encounter_id")
			.references(() => encounters.id, { onDelete: "set null" }),
		patientId: t
			.uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "restrict" }),
		diseaseCode: t.text("disease_code").notNull(),
		diseaseName: t.text("disease_name").notNull(),
		// PIDSR Category: Category 1 = immediate (within 24 hrs), Category 2 = weekly
		category: t
			.text("category")
			.$type<"category_1" | "category_2">(),
		caseClassification: t
			.text("case_classification")
			.notNull()
			.$type<"suspected" | "probable" | "confirmed">(),
		onsetDate: t.date("onset_date"),
		diagnosisDate: t.date("diagnosis_date").notNull(),
		reportingStaffId: t
			.uuid("reporting_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		reportStatus: t
			.text("report_status")
			.notNull()
			.default("draft")
			.$type<"draft" | "submitted">(),
		submissionData: t.jsonb("submission_data"),
		submittedAt: t.timestamp("submitted_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("pidsr_cases_facility_id_idx").on(t.facilityId),
		index("pidsr_cases_patient_id_idx").on(t.patientId),
		index("pidsr_cases_disease_code_idx").on(t.diseaseCode),
		index("pidsr_cases_report_status_idx").on(t.reportStatus),
	]
)

export const surveillanceFlags = createTable(
	"surveillance_flags",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		encounterId: t
			.uuid("encounter_id")
			.references(() => encounters.id, { onDelete: "cascade" }),
		noteId: t
			.uuid("note_id")
			.references(() => clinicalNotes.id, { onDelete: "set null" }),
		flagType: t.text("flag_type").notNull(),
		triggeredBy: t.text("triggered_by").notNull(),
		triggerValue: t.text("trigger_value").notNull(),
		isReviewed: t.boolean("is_reviewed").notNull().default(false),
		reviewedByStaffId: t
			.uuid("reviewed_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		reviewedAt: t.timestamp("reviewed_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("surveillance_flags_facility_id_idx").on(t.facilityId),
		index("surveillance_flags_encounter_id_idx").on(t.encounterId),
		index("surveillance_flags_is_reviewed_idx").on(t.isReviewed),
	]
)

export const ahsrSnapshots = createTable(
	"ahsr_snapshots",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		reportYear: t.integer("report_year").notNull(),
		reportMonth: t.integer("report_month").notNull(),
		snapshotData: t.jsonb("snapshot_data").notNull(),
		generatedByStaffId: t
			.uuid("generated_by_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		generatedAt: t.timestamp("generated_at").notNull().defaultNow(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("ahsr_snapshots_facility_id_idx").on(t.facilityId),
		index("ahsr_snapshots_year_month_idx").on(t.reportYear, t.reportMonth),
	]
)

// ============================================================================
// FHIR EXPORT — FHIR/NHDR Export Tracking
// ============================================================================

export const fhirExports = createTable(
	"fhir_exports",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		exportDateRange: t.jsonb("export_date_range").$type<{
			startDate: string
			endDate: string
		}>(),
		resourceTypes: t.jsonb("resource_types").$type<string[]>(), // e.g., ["Patient", "Encounter", "Observation"]
		totalResources: t.integer("total_resources").notNull().default(0),
		validResources: t.integer("valid_resources").notNull().default(0),
		errorCount: t.integer("error_count").notNull().default(0),
		validationReport: t.jsonb("validation_report").$type<{
			errors?: Array<{ resourceType: string; resourceId: string; error: string }>
			warnings?: Array<{ resourceType: string; resourceId: string; warning: string }>
			summary?: Record<string, { total: number; valid: number; invalid: number }>
		}>(),
		exportFormat: t.text("export_format").notNull().default("ndjson").$type<"ndjson" | "json_bundle">(),
		exportFileUrl: t.text("export_file_url"),
		submissionStatus: t
			.text("submission_status")
			.notNull()
			.default("pending")
			.$type<"pending" | "exporting" | "exported" | "submitted" | "accepted" | "rejected">(),
		nhdrAcknowledgment: t.jsonb("nhdr_acknowledgment").$type<{
			receiptNumber?: string
			submissionDate?: string
			responseCode?: string
			responseMessage?: string
		}>(),
		initiatedByStaffId: t
			.uuid("initiated_by_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		exportedAt: t.timestamp("exported_at"),
		submittedAt: t.timestamp("submitted_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("fhir_exports_facility_id_idx").on(t.facilityId),
		index("fhir_exports_submission_status_idx").on(t.submissionStatus),
		index("fhir_exports_created_at_idx").on(t.createdAt),
	]
)

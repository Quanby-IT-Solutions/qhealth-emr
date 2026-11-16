import { index, uniqueIndex } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { medicalRecordsRequests } from "./clinical.js"
import { encounters, patients } from "./core.js"
import { facilities, staffProfiles } from "./rbac.js"

// ============================================================================
// HIM — Chart Deficiencies (HIM-BE-02)
// ============================================================================

export const chartDeficiencies = createTable(
	"chart_deficiencies",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		encounterId: t
			.uuid("encounter_id")
			.notNull()
			.references(() => encounters.id, { onDelete: "cascade" }),
		deficiencyType: t
			.text("deficiency_type")
			.notNull()
			.$type<"missing_discharge_summary" | "missing_signature" | "undocumented_procedure">(),
		sourceKind: t.text("source_kind").$type<"encounter" | "clinical_note" | "operation_record">(),
		sourceId: t.uuid("source_id"),
		ownerStaffId: t
			.uuid("owner_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		status: t
			.text("status")
			.notNull()
			.default("open")
			.$type<"open" | "notified" | "resolved" | "dismissed">(),
		detectedAt: t.timestamp("detected_at").notNull().defaultNow(),
		resolvedAt: t.timestamp("resolved_at"),
		resolvedByStaffId: t
			.uuid("resolved_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		notes: t.text("notes"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("chart_deficiencies_facility_id_idx").on(t.facilityId),
		index("chart_deficiencies_encounter_id_idx").on(t.encounterId),
		index("chart_deficiencies_type_idx").on(t.deficiencyType),
		index("chart_deficiencies_owner_staff_id_idx").on(t.ownerStaffId),
		index("chart_deficiencies_status_idx").on(t.status),
		index("chart_deficiencies_detected_at_idx").on(t.detectedAt),
		uniqueIndex("chart_deficiencies_uniq").on(t.encounterId, t.deficiencyType),
	]
)

export const deficiencyNotifications = createTable(
	"deficiency_notifications",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		deficiencyId: t
			.uuid("deficiency_id")
			.notNull()
			.references(() => chartDeficiencies.id, { onDelete: "cascade" }),
		channel: t.text("channel").notNull().$type<"email" | "in_app" | "sms">(),
		recipientStaffId: t
			.uuid("recipient_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		sentAt: t.timestamp("sent_at").notNull().defaultNow(),
		sentByStaffId: t
			.uuid("sent_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		payload: t.jsonb("payload"),
	}),
	t => [index("deficiency_notifications_deficiency_id_idx").on(t.deficiencyId)]
)

// ============================================================================
// HIM — ICD-10 Coding (HIM-BE-03)
// ============================================================================

export const encounterCodes = createTable(
	"encounter_codes",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		encounterId: t
			.uuid("encounter_id")
			.notNull()
			.references(() => encounters.id, { onDelete: "cascade" }),
		codeSystem: t
			.text("code_system")
			.notNull()
			.$type<"ICD-10" | "RVS" | "SNOMED">()
			.default("ICD-10"),
		code: t.text("code").notNull(),
		display: t.text("display"),
		isPrimary: t.boolean("is_primary").notNull().default(false),
		linkedDiagnosisRef: t.text("linked_diagnosis_ref"),
		notes: t.text("notes"),
		version: t.integer("version").notNull().default(1),
		signedByStaffId: t
			.uuid("signed_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		signedAt: t.timestamp("signed_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("encounter_codes_encounter_id_idx").on(t.encounterId),
		index("encounter_codes_code_idx").on(t.code),
	]
)

export const codeVersions = createTable(
	"code_versions",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		encounterId: t
			.uuid("encounter_id")
			.notNull()
			.references(() => encounters.id, { onDelete: "cascade" }),
		version: t.integer("version").notNull(),
		snapshot: t.jsonb("snapshot").notNull(),
		amendmentReason: t.text("amendment_reason"),
		replacedAt: t.timestamp("replaced_at"),
		createdByStaffId: t
			.uuid("created_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("code_versions_encounter_id_idx").on(t.encounterId),
		uniqueIndex("code_versions_encounter_version_uniq").on(t.encounterId, t.version),
	]
)

// ============================================================================
// HIM — Records Issuance Audit (HIM-BE-04)
// ============================================================================

// NOTE: the former `recordsRequests` alias for `medicalRecordsRequests` was
// removed: nothing imported it, and re-exporting the same pgTable under two
// names makes drizzle-kit (>= 1.0.0-beta.20) see duplicate table definitions
// and abort `push`/`generate`. Import `medicalRecordsRequests` directly.

export const recordsRequestItems = createTable(
	"records_request_items",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		requestId: t.uuid("request_id").notNull(),
		documentType: t.text("document_type").notNull(),
		uri: t.text("uri"),
		contentHash: t.text("content_hash"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [index("records_request_items_request_id_idx").on(t.requestId)]
)

export const recordsReleaseAudit = createTable(
	"records_release_audit",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		requestId: t.uuid("request_id").notNull(),
		patientId: t
			.uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "restrict" }),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		actorStaffId: t
			.uuid("actor_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		action: t
			.text("action")
			.notNull()
			.$type<
				| "create"
				| "dpa_consent"
				| "identity_proof"
				| "physician_signature"
				| "payment_cleared"
				| "release"
			>(),
		recipient: t.text("recipient"),
		documentTypes: t.jsonb("document_types"),
		contentHashes: t.jsonb("content_hashes"),
		ipAddress: t.text("ip_address"),
		userAgent: t.text("user_agent"),
		occurredAt: t.timestamp("occurred_at").notNull().defaultNow(),
	}),
	t => [
		index("records_release_audit_request_id_idx").on(t.requestId),
		index("records_release_audit_patient_id_idx").on(t.patientId),
		index("records_release_audit_facility_id_idx").on(t.facilityId),
		index("records_release_audit_occurred_at_idx").on(t.occurredAt),
	]
)

// ============================================================================
// HIM — HAI Reconciliations (HIM-BE-05)
// ============================================================================

export const haiReconciliations = createTable(
	"hai_reconciliations",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		haiTagId: t.uuid("hai_tag_id").notNull(),
		decision: t.text("decision").notNull().$type<"confirm" | "reclassify" | "dismiss">(),
		previousType: t.text("previous_type"),
		newType: t.text("new_type"),
		reason: t.text("reason"),
		decidedByStaffId: t
			.uuid("decided_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		decidedAt: t.timestamp("decided_at").notNull().defaultNow(),
	}),
	t => [
		index("hai_reconciliations_facility_id_idx").on(t.facilityId),
		uniqueIndex("hai_reconciliations_hai_tag_uniq").on(t.haiTagId),
	]
)

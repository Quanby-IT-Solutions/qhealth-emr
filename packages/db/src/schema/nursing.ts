import { index } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { encounters, preEncounters } from "./core.js"
import { medicationOrders } from "./orders.js"
import { facilities, staffProfiles } from "./rbac.js"

// ============================================================================
// CONSENT RECORDS — Electronic consent captured by nursing staff
// ============================================================================

export const consentRecords = createTable(
	"consent_records",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		encounterId: t
			.uuid("encounter_id")
			.references(() => encounters.id, { onDelete: "cascade" }),
		preEncounterId: t
			.uuid("pre_encounter_id")
			.references(() => preEncounters.id, { onDelete: "set null" }),
		consentType: t.text("consent_type").notNull(),
		consentText: t.text("consent_text").notNull().default(""),
		patientSignature: t.text("patient_signature"),
		guardianSignature: t.text("guardian_signature"),
		witnessSignature: t.text("witness_signature"),
		capturedByStaffId: t
			.uuid("captured_by_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		signedAt: t.timestamp("signed_at").notNull().defaultNow(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("consent_records_facility_id_idx").on(t.facilityId),
		index("consent_records_encounter_id_idx").on(t.encounterId),
		index("consent_records_consent_type_idx").on(t.consentType),
	]
)

// ============================================================================
// NURSING — Vitals, Flowsheets, MAR/TAR, I/O, Handoffs, HAI
// ============================================================================

export const vitalSigns = createTable(
	"vital_signs",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		encounterId: t
			.uuid("encounter_id")
			.references(() => encounters.id, { onDelete: "cascade" }),
		preEncounterId: t
			.uuid("pre_encounter_id")
			.references(() => preEncounters.id, { onDelete: "set null" }),
		temperature: t.numeric("temperature", { precision: 4, scale: 1 }),
		bpSystolic: t.integer("bp_systolic"),
		bpDiastolic: t.integer("bp_diastolic"),
		heartRate: t.integer("heart_rate"),
		respiratoryRate: t.integer("respiratory_rate"),
		spo2: t.numeric("spo2", { precision: 4, scale: 1 }),
		painScore: t.integer("pain_score"),
		weight: t.numeric("weight", { precision: 5, scale: 2 }),
		height: t.numeric("height", { precision: 5, scale: 2 }),
		newsScore: t.integer("news_score"),
		newsRiskLevel: t.text("news_risk_level").$type<"low" | "medium" | "high">(),
		recordedByStaffId: t
			.uuid("recorded_by_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		recordedAt: t.timestamp("recorded_at").notNull().defaultNow(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("vital_signs_facility_id_idx").on(t.facilityId),
		index("vital_signs_encounter_id_idx").on(t.encounterId),
		index("vital_signs_pre_encounter_id_idx").on(t.preEncounterId),
		index("vital_signs_recorded_at_idx").on(t.recordedAt),
	]
)

export const flowsheetEntries = createTable(
	"flowsheet_entries",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		encounterId: t
			.uuid("encounter_id")
			.notNull()
			.references(() => encounters.id, { onDelete: "cascade" }),
		parameterName: t.text("parameter_name").notNull(),
		parameterValue: t.text("parameter_value").notNull(),
		unit: t.text("unit"),
		recordedByStaffId: t
			.uuid("recorded_by_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		recordedAt: t.timestamp("recorded_at").notNull().defaultNow(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("flowsheet_entries_encounter_id_idx").on(t.encounterId),
		index("flowsheet_entries_facility_id_idx").on(t.facilityId),
		index("flowsheet_entries_recorded_at_idx").on(t.recordedAt),
	]
)

export const marEntries = createTable(
	"mar_entries",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		encounterId: t
			.uuid("encounter_id")
			.references(() => encounters.id, { onDelete: "cascade" }),
		preEncounterId: t
			.uuid("pre_encounter_id")
			.references(() => preEncounters.id, { onDelete: "set null" }),
		medicationOrderId: t
			.uuid("medication_order_id")
			.notNull()
			.references(() => medicationOrders.id, { onDelete: "restrict" }),
		scheduledTime: t.timestamp("scheduled_time").notNull(),
		status: t
			.text("status")
			.notNull()
			.default("due")
			.$type<"due" | "given" | "missed" | "held" | "refused">(),
		administeredDose: t.text("administered_dose"),
		administeredRoute: t.text("administered_route"),
		prnReason: t.text("prn_reason"),
		administeredByStaffId: t
			.uuid("administered_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		administeredAt: t.timestamp("administered_at"),
		notes: t.text("notes"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("mar_entries_facility_id_idx").on(t.facilityId),
		index("mar_entries_encounter_id_idx").on(t.encounterId),
		index("mar_entries_medication_order_id_idx").on(t.medicationOrderId),
		index("mar_entries_scheduled_time_idx").on(t.scheduledTime),
	]
)

export const tarEntries = createTable(
	"tar_entries",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		encounterId: t
			.uuid("encounter_id")
			.references(() => encounters.id, { onDelete: "cascade" }),
		preEncounterId: t
			.uuid("pre_encounter_id")
			.references(() => preEncounters.id, { onDelete: "set null" }),
		treatmentDescription: t.text("treatment_description").notNull(),
		scheduledTime: t.timestamp("scheduled_time").notNull(),
		status: t
			.text("status")
			.notNull()
			.default("due")
			.$type<"due" | "given" | "missed" | "held" | "refused">(),
		administeredByStaffId: t
			.uuid("administered_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		administeredAt: t.timestamp("administered_at"),
		notes: t.text("notes"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("tar_entries_facility_id_idx").on(t.facilityId),
		index("tar_entries_encounter_id_idx").on(t.encounterId),
	]
)

export const ioEntries = createTable(
	"io_entries",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		encounterId: t
			.uuid("encounter_id")
			.references(() => encounters.id, { onDelete: "cascade" }),
		preEncounterId: t
			.uuid("pre_encounter_id")
			.references(() => preEncounters.id, { onDelete: "set null" }),
		ioType: t.text("io_type").notNull().$type<"intake" | "output">(),
		route: t.text("route").notNull(),
		description: t.text("description"),
		amountMl: t.numeric("amount_ml", { precision: 8, scale: 1 }).notNull(),
		recordedByStaffId: t
			.uuid("recorded_by_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		recordedAt: t.timestamp("recorded_at").notNull().defaultNow(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("io_entries_facility_id_idx").on(t.facilityId),
		index("io_entries_encounter_id_idx").on(t.encounterId),
		index("io_entries_recorded_at_idx").on(t.recordedAt),
	]
)

export const shiftHandoffs = createTable(
	"shift_handoffs",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		encounterId: t
			.uuid("encounter_id")
			.notNull()
			.references(() => encounters.id, { onDelete: "cascade" }),
		outgoingStaffId: t
			.uuid("outgoing_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		incomingStaffId: t
			.uuid("incoming_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		handoffNotes: t.text("handoff_notes").notNull().default(""),
		status: t.text("status").notNull().default("draft").$type<"draft" | "signed">(),
		signedAt: t.timestamp("signed_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("shift_handoffs_encounter_id_idx").on(t.encounterId),
		index("shift_handoffs_facility_id_idx").on(t.facilityId),
	]
)

export const haiTags = createTable(
	"hai_tags",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		encounterId: t
			.uuid("encounter_id")
			.notNull()
			.references(() => encounters.id, { onDelete: "cascade" }),
		haiType: t
			.text("hai_type")
			.notNull()
			.$type<"clabsi" | "cauti" | "vap" | "ssi" | "cdiff">(),
		onsetDate: t.date("onset_date").notNull(),
		confirmedAt: t.timestamp("confirmed_at"),
		resolvedAt: t.timestamp("resolved_at"),
		status: t
			.text("status")
			.notNull()
			.default("suspected")
			.$type<"suspected" | "confirmed" | "resolved">(),
		notes: t.text("notes"),
		documentedByStaffId: t
			.uuid("documented_by_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("hai_tags_encounter_id_idx").on(t.encounterId),
		index("hai_tags_facility_id_idx").on(t.facilityId),
		index("hai_tags_hai_type_idx").on(t.haiType),
	]
)

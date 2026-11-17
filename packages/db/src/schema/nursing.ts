import { index, uniqueIndex } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { users } from "./auth.js"
import { encounters, patients, preEncounters } from "./core.js"
import { medicationOrders } from "./orders.js"
import { facilities, staffProfiles } from "./rbac.js"

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
		encounterId: t.uuid("encounter_id").references(() => encounters.id, { onDelete: "cascade" }),
		preEncounterId: t
			.uuid("pre_encounter_id")
			.references(() => preEncounters.id, { onDelete: "set null" }),
		temperature: t.numeric("temperature", { precision: 4, scale: 1 }),
		bpSystolic: t.integer("bp_systolic"),
		bpDiastolic: t.integer("bp_diastolic"),
		heartRate: t.integer("heart_rate"),
		respiratoryRate: t.integer("respiratory_rate"),
		spo2: t.numeric("spo2", { precision: 4, scale: 1 }),
		spo2Scale: t.text("spo2_scale").notNull().default("scale1").$type<"scale1" | "scale2">(),
		oxygenTherapy: t.boolean("oxygen_therapy").notNull().default(false),
		oxygenDeliveryDevice: t.text("oxygen_delivery_device"),
		oxygenFlowRate: t.numeric("oxygen_flow_rate", { precision: 4, scale: 1 }),
		painScore: t.integer("pain_score"),
		weight: t.numeric("weight", { precision: 5, scale: 2 }),
		height: t.numeric("height", { precision: 5, scale: 2 }),
		consciousnessLevel: t
			.text("consciousness_level")
			.notNull()
			.default("A")
			.$type<"A" | "C" | "V" | "P" | "U">(),
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

export const faceScanPhoneSessions = createTable(
	"face_scan_phone_sessions",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		tokenHash: t.text("token_hash").notNull(),
		status: t
			.text("status")
			.notNull()
			.default("pending")
			.$type<"pending" | "complete" | "expired">(),
		facilityId: t.uuid("facility_id").references(() => facilities.id, { onDelete: "set null" }),
		encounterId: t.uuid("encounter_id").references(() => encounters.id, { onDelete: "set null" }),
		patientId: t.uuid("patient_id").references(() => patients.id, { onDelete: "set null" }),
		age: t.integer("age"),
		gender: t.text("gender").$type<"male" | "female">(),
		smoking: t.boolean("smoking"),
		vitals: t.jsonb("vitals").$type<{
			bpSystolic: number | null
			bpDiastolic: number | null
			heartRate: number | null
			respiratoryRate: number | null
			spo2: number | null
			heightCm?: number
			weightKg?: number
		}>(),
		createdByUserId: t
			.text("created_by_user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		expiresAt: t.timestamp("expires_at", { withTimezone: true }).notNull(),
		completedAt: t.timestamp("completed_at", { withTimezone: true }),
		createdAt: t.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	}),
	t => [
		uniqueIndex("face_scan_phone_sessions_token_hash_uniq").on(t.tokenHash),
		index("face_scan_phone_sessions_created_by_user_id_idx").on(t.createdByUserId),
		index("face_scan_phone_sessions_expires_at_idx").on(t.expiresAt),
		index("face_scan_phone_sessions_encounter_id_idx").on(t.encounterId),
		index("face_scan_phone_sessions_patient_id_idx").on(t.patientId),
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
		encounterId: t.uuid("encounter_id").references(() => encounters.id, { onDelete: "cascade" }),
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
		uniqueIndex("mar_entries_order_scheduled_time_uniq").on(t.medicationOrderId, t.scheduledTime),
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
		encounterId: t.uuid("encounter_id").references(() => encounters.id, { onDelete: "cascade" }),
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
		encounterId: t.uuid("encounter_id").references(() => encounters.id, { onDelete: "cascade" }),
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
		haiType: t.text("hai_type").notNull().$type<"clabsi" | "cauti" | "vap" | "ssi" | "cdiff">(),
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

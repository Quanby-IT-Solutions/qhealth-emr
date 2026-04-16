import { index } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { encounters, patients, preEncounters } from "./core.js"
import { facilities, staffProfiles } from "./rbac.js"

// ============================================================================
// CLINICAL — Notes, Templates, Consent, Problems, Allergies
// ============================================================================

export const noteTemplates = createTable(
	"note_templates",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		name: t.text("name").notNull(),
		category: t
			.text("category")
			.notNull()
			.$type<"admission" | "progress" | "consultation" | "discharge_summary" | "fpe" | "operative" | "anesthesia">(),
		sections: t.jsonb("sections").notNull().default([]),
		isActive: t.boolean("is_active").notNull().default(true),
		createdByStaffId: t
			.uuid("created_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("note_templates_facility_id_idx").on(t.facilityId),
		index("note_templates_category_idx").on(t.category),
	]
)

export const clinicalNotes = createTable(
	"clinical_notes",
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
		templateId: t
			.uuid("template_id")
			.references(() => noteTemplates.id, { onDelete: "set null" }),
		noteType: t
			.text("note_type")
			.notNull()
			.$type<"admission" | "progress" | "consultation" | "discharge_summary" | "fpe" | "operative" | "anesthesia">(),
		content: t.text("content").notNull().default(""),
		structuredData: t.jsonb("structured_data"),
		status: t.text("status").notNull().default("draft").$type<"draft" | "signed">(),
		authorStaffId: t
			.uuid("author_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		signedAt: t.timestamp("signed_at"),
		signedIp: t.text("signed_ip"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("clinical_notes_facility_id_idx").on(t.facilityId),
		index("clinical_notes_encounter_id_idx").on(t.encounterId),
		index("clinical_notes_pre_encounter_id_idx").on(t.preEncounterId),
		index("clinical_notes_status_idx").on(t.status),
	]
)

export const noteAddenda = createTable(
	"note_addenda",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		noteId: t
			.uuid("note_id")
			.notNull()
			.references(() => clinicalNotes.id, { onDelete: "cascade" }),
		content: t.text("content").notNull(),
		reason: t.text("reason"),
		status: t.text("status").notNull().default("draft").$type<"draft" | "signed">(),
		authorStaffId: t
			.uuid("author_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		signedAt: t.timestamp("signed_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [index("note_addenda_note_id_idx").on(t.noteId)]
)

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
			.notNull()
			.references(() => encounters.id, { onDelete: "cascade" }),
		patientId: t
			.uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "restrict" }),
		consentType: t
			.text("consent_type")
			.notNull()
			.$type<"general" | "procedure" | "research" | "blood_transfusion" | "surgery" | "dpa" | "nbs">(),
		signedByName: t.text("signed_by_name").notNull(),
		relationship: t
			.text("relationship")
			.notNull()
			.$type<"self" | "parent" | "guardian" | "spouse" | "other">(),
		content: t.text("content"),
		signatureData: t.jsonb("signature_data"),
		signedAt: t.timestamp("signed_at"),
		witnessStaffId: t
			.uuid("witness_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		isActive: t.boolean("is_active").notNull().default(true),
		revokedAt: t.timestamp("revoked_at"),
		revocationReason: t.text("revocation_reason"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("consent_records_encounter_id_idx").on(t.encounterId),
		index("consent_records_patient_id_idx").on(t.patientId),
	]
)

export const problems = createTable(
	"problems",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		patientId: t
			.uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		icd10Code: t.text("icd10_code"),
		icd10Display: t.text("icd10_display"),
		description: t.text("description").notNull(),
		onsetDate: t.date("onset_date"),
		resolutionDate: t.date("resolution_date"),
		status: t.text("status").notNull().default("active").$type<"active" | "resolved">(),
		documentingStaffId: t
			.uuid("documenting_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("problems_patient_id_idx").on(t.patientId),
		index("problems_facility_id_idx").on(t.facilityId),
		index("problems_status_idx").on(t.status),
	]
)

export const allergies = createTable(
	"allergies",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		patientId: t
			.uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		allergenName: t.text("allergen_name").notNull(),
		allergenType: t
			.text("allergen_type")
			.notNull()
			.$type<"medication" | "food" | "environmental">(),
		reactionType: t.text("reaction_type"),
		severity: t
			.text("severity")
			.notNull()
			.$type<"mild" | "moderate" | "severe">(),
		onsetDate: t.date("onset_date"),
		isActive: t.boolean("is_active").notNull().default(true),
		documentingStaffId: t
			.uuid("documenting_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("allergies_patient_id_idx").on(t.patientId),
		index("allergies_facility_id_idx").on(t.facilityId),
		index("allergies_allergen_type_idx").on(t.allergenType),
	]
)

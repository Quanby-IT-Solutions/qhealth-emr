import { type AnyPgColumn, index } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { encounters } from "./core.js"
import { rvsCodes } from "./formulary.js"
import { facilities, staffProfiles } from "./rbac.js"

// ============================================================================
// SURGICAL — Operation Records, Anesthesia Records, RVS Assignments, Checklists
// ============================================================================

export const operationRecords = createTable(
	"operation_records",
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
		procedureDescription: t.text("procedure_description").notNull(),
		operativeTechnique: t.text("operative_technique"),
		findings: t.text("findings"),
		specimens: t.text("specimens"),
		estimatedBloodLoss: t.integer("estimated_blood_loss"),
		incisionTime: t.timestamp("incision_time"),
		closureTime: t.timestamp("closure_time"),
		surgeonStaffId: t
			.uuid("surgeon_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		assistantStaffIds: t.jsonb("assistant_staff_ids").$type<string[]>(),
		anesthesiologistStaffId: t
			.uuid("anesthesiologist_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		complications: t.text("complications"),
		status: t
			.text("status")
			.notNull()
			.default("draft")
			.$type<"draft" | "signed">(),
		signedAt: t.timestamp("signed_at"),
		signedByStaffId: t
			.uuid("signed_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("operation_records_facility_id_idx").on(t.facilityId),
		index("operation_records_encounter_id_idx").on(t.encounterId),
		index("operation_records_surgeon_staff_id_idx").on(t.surgeonStaffId),
		index("operation_records_status_idx").on(t.status),
	]
)

export const anesthesiaRecords = createTable(
	"anesthesia_records",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		operationRecordId: t
			.uuid("operation_record_id")
			.notNull()
			.references(() => operationRecords.id, { onDelete: "cascade" }),
		encounterId: t
			.uuid("encounter_id")
			.notNull()
			.references(() => encounters.id, { onDelete: "cascade" }),
		asaClass: t.text("asa_class").$type<"I" | "II" | "III" | "IV" | "V" | "VI">(),
		anesthesiaType: t.text("anesthesia_type").$type<"general" | "regional" | "local" | "sedation">(),
		airwayManagement: t.text("airway_management"),
		inductionAgents: t.jsonb("induction_agents").$type<Array<{ agent: string; dose: string; time?: string }>>(),
		maintenanceAgents: t.jsonb("maintenance_agents").$type<Array<{ agent: string; dose: string; time?: string }>>(),
		muscleRelaxants: t.jsonb("muscle_relaxants").$type<Array<{ agent: string; dose: string; time?: string }>>(),
		intraopVitals: t.jsonb("intraop_vitals").$type<Array<{
			time: string
			bp?: string
			hr?: number
			spo2?: number
			etco2?: number
			temp?: number
		}>>(),
		fluidBalance: t.jsonb("fluid_balance").$type<{
			ivFluids?: Array<{ type: string; volumeMl: number }>
			estimatedBloodLoss?: number
			urineOutput?: number
			otherOutput?: number
		}>(),
		complications: t.text("complications"),
		anesthesiologistStaffId: t
			.uuid("anesthesiologist_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		status: t
			.text("status")
			.notNull()
			.default("draft")
			.$type<"draft" | "signed">(),
		signedAt: t.timestamp("signed_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("anesthesia_records_facility_id_idx").on(t.facilityId),
		index("anesthesia_records_operation_record_id_idx").on(t.operationRecordId),
		index("anesthesia_records_encounter_id_idx").on(t.encounterId),
		index("anesthesia_records_anesthesiologist_staff_id_idx").on(t.anesthesiologistStaffId),
	]
)

export const surgicalRvsAssignments = createTable(
	"surgical_rvs_assignments",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		operationRecordId: t
			.uuid("operation_record_id")
			.notNull()
			.references(() => operationRecords.id, { onDelete: "cascade" }),
		rvsCodeId: t
			.uuid("rvs_code_id")
			.references((): AnyPgColumn => rvsCodes.id, { onDelete: "set null" }),
		rvsCode: t.text("rvs_code"),
		rvsDescription: t.text("rvs_description"),
		suggestedByStaffId: t
			.uuid("suggested_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		validatedByStaffId: t
			.uuid("validated_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		status: t
			.text("status")
			.notNull()
			.default("suggested")
			.$type<"suggested" | "validated" | "finalized">(),
		validatedAt: t.timestamp("validated_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("surgical_rvs_assignments_facility_id_idx").on(t.facilityId),
		index("surgical_rvs_assignments_operation_record_id_idx").on(t.operationRecordId),
		index("surgical_rvs_assignments_status_idx").on(t.status),
	]
)

export const surgicalChecklists = createTable(
	"surgical_checklists",
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
		operationRecordId: t
			.uuid("operation_record_id")
			.references(() => operationRecords.id, { onDelete: "set null" }),
		npoStatus: t.boolean("npo_status"),
		medsHeld: t.jsonb("meds_held").$type<Array<{ medication: string; held: boolean; reason?: string }>>(),
		labsReviewed: t.boolean("labs_reviewed"),
		consentSigned: t.boolean("consent_signed"),
		siteMarked: t.boolean("site_marked"),
		allergiesVerified: t.boolean("allergies_verified"),
		bloodAvailable: t.boolean("blood_available"),
		equipmentChecked: t.boolean("equipment_checked"),
		checklistPhase: t.text("checklist_phase").$type<"pre_op" | "sign_in" | "time_out" | "sign_out">(),
		completedByStaffId: t
			.uuid("completed_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		completedAt: t.timestamp("completed_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("surgical_checklists_facility_id_idx").on(t.facilityId),
		index("surgical_checklists_encounter_id_idx").on(t.encounterId),
		index("surgical_checklists_operation_record_id_idx").on(t.operationRecordId),
	]
)

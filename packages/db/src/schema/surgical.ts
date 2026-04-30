import { type AnyPgColumn, index } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { encounters, patients } from "./core.js"
import { rvsCodes } from "./formulary.js"
import { facilities, staffProfiles } from "./rbac.js"

// ============================================================================
// SURGICAL CASES — Central scheduling and case management entity
// Must be defined before operationRecords since it is referenced by them.
// Run `pnpm db:generate` after modifying this file to create a migration.
// ============================================================================

export const surgicalCases = createTable(
	"surgical_cases",
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
		procedureName: t.text("procedure_name").notNull(),
		orSuite: t.text("or_suite"),
		surgicalType: t
			.text("surgical_type")
			.notNull()
			.$type<"elective" | "emergency" | "urgent">(),
		surgeonStaffId: t
			.uuid("surgeon_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		anesthesiologistStaffId: t
			.uuid("anesthesiologist_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		scheduledDatetime: t.timestamp("scheduled_datetime"),
		actualStartDatetime: t.timestamp("actual_start_datetime"),
		actualEndDatetime: t.timestamp("actual_end_datetime"),
		status: t
			.text("status")
			.notNull()
			.default("scheduled")
			.$type<"scheduled" | "in_progress" | "completed" | "cancelled" | "postponed">(),
		asaClass: t
			.text("asa_class")
			.$type<"ASA I" | "ASA II" | "ASA III" | "ASA IV" | "ASA V" | "ASA VI">(),
		notes: t.text("notes"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("surgical_cases_facility_id_idx").on(t.facilityId),
		index("surgical_cases_encounter_id_idx").on(t.encounterId),
		index("surgical_cases_patient_id_idx").on(t.patientId),
		index("surgical_cases_surgeon_staff_id_idx").on(t.surgeonStaffId),
		index("surgical_cases_status_idx").on(t.status),
		index("surgical_cases_scheduled_datetime_idx").on(t.scheduledDatetime),
	]
)

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
		surgicalCaseId: t
			.uuid("surgical_case_id")
			.references(() => surgicalCases.id, { onDelete: "cascade" }),
		encounterId: t
			.uuid("encounter_id")
			.references(() => encounters.id, { onDelete: "set null" }),
		preOpDiagnosis: t.text("pre_op_diagnosis"),
		postOpDiagnosis: t.text("post_op_diagnosis"),
		procedurePerformed: t.text("procedure_performed"),
		procedureDescription: t.text("procedure_description"),
		operativeTechnique: t.text("operative_technique"),
		findings: t.text("findings"),
		specimens: t.text("specimens"),
		estimatedBloodLoss: t.integer("estimated_blood_loss"),
		fluidIn: t.integer("fluid_in"),
		fluidOut: t.integer("fluid_out"),
		incisionTime: t.timestamp("incision_time"),
		closureTime: t.timestamp("closure_time"),
		surgeonStaffId: t
			.uuid("surgeon_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		firstAssistantStaffId: t
			.uuid("first_assistant_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		secondAssistantStaffId: t
			.uuid("second_assistant_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		scrubNurseStaffId: t
			.uuid("scrub_nurse_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		circulatingNurseStaffId: t
			.uuid("circulating_nurse_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		assistantStaffIds: t.jsonb("assistant_staff_ids").$type<string[]>(),
		anesthesiologistStaffId: t
			.uuid("anesthesiologist_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		instrumentCountCorrect: t.boolean("instrument_count_correct").notNull().default(false),
		swabCountCorrect: t.boolean("swab_count_correct").notNull().default(false),
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
		schedulingRequestedAt: t.timestamp("scheduling_requested_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("operation_records_facility_id_idx").on(t.facilityId),
		index("operation_records_surgical_case_id_idx").on(t.surgicalCaseId),
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
		surgicalCaseId: t
			.uuid("surgical_case_id")
			.references(() => surgicalCases.id, { onDelete: "cascade" }),
		operationRecordId: t
			.uuid("operation_record_id")
			.references(() => operationRecords.id, { onDelete: "cascade" }),
		encounterId: t
			.uuid("encounter_id")
			.references(() => encounters.id, { onDelete: "set null" }),
		asaClass: t
			.text("asa_class")
			.$type<"ASA I" | "ASA II" | "ASA III" | "ASA IV" | "ASA V" | "ASA VI">(),
		anesthesiaType: t
			.text("anesthesia_type")
			.$type<"general" | "regional" | "local" | "sedation">(),
		airwayType: t
			.text("airway_type")
			.$type<"oral_ett" | "nasal_ett" | "lma" | "awake_fiber_optic" | "tracheostomy">(),
		airwayManagement: t.text("airway_management"),
		intubationAttempts: t.integer("intubation_attempts"),
		agents: t
			.jsonb("agents")
			.$type<Array<{ name: string; dose: string; route: string; time: string }>>(),
		inductionAgents: t
			.jsonb("induction_agents")
			.$type<Array<{ agent: string; dose: string; time?: string }>>(),
		maintenanceAgents: t
			.jsonb("maintenance_agents")
			.$type<Array<{ agent: string; dose: string; time?: string }>>(),
		muscleRelaxants: t
			.jsonb("muscle_relaxants")
			.$type<Array<{ agent: string; dose: string; time?: string }>>(),
		intraopVitals: t
			.jsonb("intraop_vitals")
			.$type<
				Array<{
					time: string
					bp?: string
					hr?: number
					spo2?: number
					etco2?: number
					temp?: number
				}>
			>(),
		fluidBalance: t
			.jsonb("fluid_balance")
			.$type<{
				ivFluids?: Array<{ type: string; volumeMl: number }>
				estimatedBloodLoss?: number
				urineOutput?: number
				otherOutput?: number
			}>(),
		reversalAgent: t.text("reversal_agent"),
		totalAnesthesiaMinutes: t.integer("total_anesthesia_minutes"),
		emergenceSmooth: t.boolean("emergence_smooth"),
		complications: t.text("complications"),
		postAnesthesiaCareNotes: t.text("post_anesthesia_care_notes"),
		anesthesiologistStaffId: t
			.uuid("anesthesiologist_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
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
		index("anesthesia_records_surgical_case_id_idx").on(t.surgicalCaseId),
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
		surgicalCaseId: t
			.uuid("surgical_case_id")
			.references(() => surgicalCases.id, { onDelete: "cascade" }),
		operationRecordId: t
			.uuid("operation_record_id")
			.references(() => operationRecords.id, { onDelete: "cascade" }),
		rvsCodeId: t
			.uuid("rvs_code_id")
			.references((): AnyPgColumn => rvsCodes.id, { onDelete: "set null" }),
		rvsCode: t.text("rvs_code"),
		rvsDescription: t.text("rvs_description"),
		modifier: t.text("modifier"),
		units: t.integer("units").notNull().default(1),
		suggestedByStaffId: t
			.uuid("suggested_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		validatedByStaffId: t
			.uuid("validated_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		finalizedByStaffId: t
			.uuid("finalized_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		status: t
			.text("status")
			.notNull()
			.default("suggested")
			.$type<"suggested" | "validated" | "finalized">(),
		suggestedAt: t.timestamp("suggested_at").notNull().defaultNow(),
		validatedAt: t.timestamp("validated_at"),
		finalizedAt: t.timestamp("finalized_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("surgical_rvs_assignments_facility_id_idx").on(t.facilityId),
		index("surgical_rvs_assignments_surgical_case_id_idx").on(t.surgicalCaseId),
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
		surgicalCaseId: t
			.uuid("surgical_case_id")
			.references(() => surgicalCases.id, { onDelete: "cascade" }),
		encounterId: t
			.uuid("encounter_id")
			.references(() => encounters.id, { onDelete: "set null" }),
		operationRecordId: t
			.uuid("operation_record_id")
			.references(() => operationRecords.id, { onDelete: "set null" }),
		items: t
			.jsonb("items")
			.$type<
				Array<{
					key: string
					label: string
					checked: boolean
					checkedAt: string | null
					checkedByName: string | null
				}>
			>(),
		allClear: t.boolean("all_clear").notNull().default(false),
		npoStatus: t.boolean("npo_status"),
		medsHeld: t
			.jsonb("meds_held")
			.$type<Array<{ medication: string; held: boolean; reason?: string }>>(),
		labsReviewed: t.boolean("labs_reviewed"),
		consentSigned: t.boolean("consent_signed"),
		siteMarked: t.boolean("site_marked"),
		allergiesVerified: t.boolean("allergies_verified"),
		bloodAvailable: t.boolean("blood_available"),
		equipmentChecked: t.boolean("equipment_checked"),
		checklistPhase: t
			.text("checklist_phase")
			.$type<"pre_op" | "sign_in" | "time_out" | "sign_out">(),
		completedByStaffId: t
			.uuid("completed_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		completedAt: t.timestamp("completed_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("surgical_checklists_facility_id_idx").on(t.facilityId),
		index("surgical_checklists_surgical_case_id_idx").on(t.surgicalCaseId),
		index("surgical_checklists_encounter_id_idx").on(t.encounterId),
		index("surgical_checklists_operation_record_id_idx").on(t.operationRecordId),
	]
)

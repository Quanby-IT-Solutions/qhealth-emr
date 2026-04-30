import { type AnyPgColumn, index, uniqueIndex } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { facilities, staffProfiles } from "./rbac.js"

// ============================================================================
// CORE — Patients, Encounters, Wards, Beds
// ============================================================================

export const patients = createTable(
	"patients",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		mrn: t.text("mrn").notNull(),
		firstName: t.text("first_name").notNull(),
		lastName: t.text("last_name").notNull(),
		middleName: t.text("middle_name"),
		dateOfBirth: t.date("date_of_birth").notNull(),
		sex: t.text("sex").notNull().$type<"male" | "female" | "other">(),
		addressLine1: t.text("address_line1"),
		addressLine2: t.text("address_line2"),
		city: t.text("city"),
		province: t.text("province"),
		zipCode: t.text("zip_code"),
		phone: t.text("phone"),
		email: t.text("email"),
		philhealthMemberId: t.text("philhealth_member_id"),
		emergencyContactName: t.text("emergency_contact_name"),
		emergencyContactPhone: t.text("emergency_contact_phone"),
		nextOfKinName: t.text("next_of_kin_name"),
		nextOfKinRelationship: t.text("next_of_kin_relationship"),
		isActive: t.boolean("is_active").notNull().default(true),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("patients_facility_id_idx").on(t.facilityId),
		uniqueIndex("patients_mrn_facility_uniq").on(t.mrn, t.facilityId),
		index("patients_name_idx").on(t.lastName, t.firstName),
	]
)

export const wards = createTable(
	"wards",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		name: t.text("name").notNull(),
		wardType: t
			.text("ward_type")
			.notNull()
			.$type<"general" | "icu" | "er" | "or" | "nursery">(),
		totalBeds: t.integer("total_beds").notNull().default(0),
		isActive: t.boolean("is_active").notNull().default(true),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [index("wards_facility_id_idx").on(t.facilityId)]
)

export const beds = createTable(
	"beds",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		wardId: t
			.uuid("ward_id")
			.notNull()
			.references(() => wards.id, { onDelete: "cascade" }),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		bedNumber: t.text("bed_number").notNull(),
		status: t
			.text("status")
			.notNull()
			.default("available")
			.$type<"available" | "occupied" | "reserved" | "cleaning" | "out_of_service">(),
		currentEncounterId: t
			.uuid("current_encounter_id")
			.references((): AnyPgColumn => encounters.id, { onDelete: "set null" }),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("beds_ward_id_idx").on(t.wardId),
		index("beds_facility_id_idx").on(t.facilityId),
		index("beds_status_idx").on(t.status),
	]
)

export const preEncounters = createTable(
	"pre_encounters",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		traumaAlias: t.text("trauma_alias").notNull(),
		chiefComplaint: t.text("chief_complaint"),
		triageAcuityScale: t
			.text("triage_acuity_scale")
			.$type<"esi" | "ats" | "ctas">(),
		triageAcuityLevel: t.integer("triage_acuity_level"),
		triageDatetime: t.timestamp("triage_datetime"),
		triageStaffId: t
			.uuid("triage_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		status: t
			.text("status")
			.notNull()
			.default("active")
			.$type<"active" | "merged" | "cancelled">(),
		mergedToEncounterId: t
			.uuid("merged_to_encounter_id")
			.references((): AnyPgColumn => encounters.id, { onDelete: "set null" }),
		mergedAt: t.timestamp("merged_at"),
		mergeSnapshot: t.jsonb("merge_snapshot"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("pre_encounters_facility_id_idx").on(t.facilityId),
		index("pre_encounters_status_idx").on(t.status),
		uniqueIndex("pre_encounters_facility_trauma_alias_uniq").on(t.facilityId, t.traumaAlias),
	]
)

export const encounters = createTable(
	"encounters",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		patientId: t
			.uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "restrict" }),
		encounterType: t
			.text("encounter_type")
			.notNull()
			.$type<"inpatient" | "outpatient" | "emergency" | "telemedicine">(),
		status: t
			.text("status")
			.notNull()
			.default("active")
			.$type<"active" | "discharged" | "closed" | "cancelled">(),
		chiefComplaint: t.text("chief_complaint"),
		admittingStaffId: t
			.uuid("admitting_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		attendingStaffId: t
			.uuid("attending_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		bedId: t.uuid("bed_id").references(() => beds.id, { onDelete: "set null" }),
		admissionDatetime: t.timestamp("admission_datetime").notNull().defaultNow(),
		dischargeDatetime: t.timestamp("discharge_datetime"),
		disposition: t
			.text("disposition")
			.$type<"home" | "transfer" | "deceased" | "ama">(),
		oecbEligible: t.boolean("oecb_eligible").notNull().default(false),
		mergedFromPreEncounterId: t
			.uuid("merged_from_pre_encounter_id")
			.references(() => preEncounters.id, { onDelete: "set null" }),
		// Telemedicine support: link to parent encounter for follow-ups
		linkedEncounterId: t
			.uuid("linked_encounter_id")
			.references((): AnyPgColumn => encounters.id, { onDelete: "set null" }),
		// PhilHealth Konsulta and Z-Benefits tagging
		konsultaTagged: t.boolean("konsulta_tagged").notNull().default(false),
		// Scheduling: link to appointment that triggered this encounter
		appointmentId: t.uuid("appointment_id"), // FK added in relations; avoid circular import
		// OPD queue number — auto-generated per clinic per day for outpatient encounters (PS-002)
		queueNumber: t.integer("queue_number"),
		// PS-002: Clinic that the OPD encounter belongs to (for per-clinic queue numbering)
		clinicianStaffId: t
			.uuid("clinician_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		// PS-003: Walk-in OPD queue status on the clinic queue board
		queueStatus: t
			.text("queue_status")
			.$type<"waiting" | "in_progress" | "completed">(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("encounters_facility_id_idx").on(t.facilityId),
		index("encounters_patient_id_idx").on(t.patientId),
		index("encounters_status_idx").on(t.status),
		index("encounters_admission_datetime_idx").on(t.admissionDatetime),
	]
)

// PS-002: OPD Triage Intake — patientId is nullable to support triage-before-registration workflow
export const opdTriageIntakes = createTable(
	"opd_triage_intakes",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		// Nullable: pre-registration triage starts without an existing patient record
		patientId: t
			.uuid("patient_id")
			.references(() => patients.id, { onDelete: "restrict" }),
		arrivalTime: t.timestamp("arrival_time").notNull().defaultNow(),
		chiefComplaint: t.text("chief_complaint").notNull(),
		systolicBp: t.integer("systolic_bp"),
		diastolicBp: t.integer("diastolic_bp"),
		temperatureCelsius: t.real("temperature_celsius"),
		heartRateBpm: t.integer("heart_rate_bpm"),
		respiratoryRate: t.integer("respiratory_rate"),
		oxygenSatPct: t.real("oxygen_sat_pct"),
		heightCm: t.real("height_cm"),
		weightKg: t.real("weight_kg"),
		triageNurseStaffId: t
			.uuid("triage_nurse_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		clinicianStaffId: t
			.uuid("clinician_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		status: t
			.text("status")
			.notNull()
			.default("pending_registration")
			.$type<"pending_registration" | "registered">(),
		// Set when registrar converts triage intake into a full encounter
		encounterId: t.uuid("encounter_id"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("opd_triage_intakes_facility_id_idx").on(t.facilityId),
		index("opd_triage_intakes_patient_id_idx").on(t.patientId),
		index("opd_triage_intakes_status_idx").on(t.status),
	]
)

export const encounterTransfers = createTable(
	"encounter_transfers",
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
		fromWardId: t
			.uuid("from_ward_id")
			.references(() => wards.id, { onDelete: "set null" }),
		fromBedId: t
			.uuid("from_bed_id")
			.references(() => beds.id, { onDelete: "set null" }),
		toWardId: t
			.uuid("to_ward_id")
			.references(() => wards.id, { onDelete: "set null" }),
		toBedId: t
			.uuid("to_bed_id")
			.references(() => beds.id, { onDelete: "set null" }),
		transferReason: t.text("transfer_reason"),
		orderingStaffId: t
			.uuid("ordering_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		transferredAt: t.timestamp("transferred_at").notNull().defaultNow(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("encounter_transfers_encounter_id_idx").on(t.encounterId),
		index("encounter_transfers_facility_id_idx").on(t.facilityId),
	]
)

export const bedCensusSnapshots = createTable(
	"bed_census_snapshots",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		wardId: t
			.uuid("ward_id")
			.references(() => wards.id, { onDelete: "set null" }),
		snapshotDate: t.date("snapshot_date").notNull(),
		totalBeds: t.integer("total_beds").notNull().default(0),
		occupiedBeds: t.integer("occupied_beds").notNull().default(0),
		borPercentage: t.numeric("bor_percentage", { precision: 5, scale: 2 }),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("bed_census_snapshots_facility_date_idx").on(t.facilityId, t.snapshotDate),
	]
)

// ============================================================================
// SLA TRACKING — Event-sourced encounter status transitions
// ============================================================================

export const encounterStatusEvents = createTable(
	"encounter_status_events",
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
		fromStatus: t.text("from_status"),
		toStatus: t.text("to_status").notNull(),
		workflowType: t
			.text("workflow_type")
			.notNull()
			.$type<"opd" | "ed" | "admission" | "discharge" | "ancillary" | "pharmacy" | "billing">(),
		slaTargetMinutes: t.integer("sla_target_minutes"),
		actualMinutes: t.integer("actual_minutes"), // Computed on next transition
		staffId: t
			.uuid("staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		isEscalated: t.boolean("is_escalated").notNull().default(false),
		escalatedAt: t.timestamp("escalated_at"),
		notes: t.text("notes"),
		occurredAt: t.timestamp("occurred_at").notNull().defaultNow(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("encounter_status_events_facility_id_idx").on(t.facilityId),
		index("encounter_status_events_encounter_id_idx").on(t.encounterId),
		index("encounter_status_events_workflow_type_idx").on(t.workflowType),
		index("encounter_status_events_occurred_at_idx").on(t.occurredAt),
		index("encounter_status_events_is_escalated_idx").on(t.isEscalated),
	]
)

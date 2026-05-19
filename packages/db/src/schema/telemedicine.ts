import { index, uniqueIndex } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { encounters, patients } from "./core.js"
import { facilities, staffProfiles } from "./rbac.js"

// ============================================================================
// TELEMEDICINE - Appointments, Encounters, Prescriptions
// ============================================================================

export const telemedicineAppointments = createTable(
	"telemedicine_appointments",
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
		clinicianStaffId: t
			.uuid("clinician_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		scheduledDate: t.date("scheduled_date").notNull(),
		scheduledTime: t.time("scheduled_time").notNull(),
		durationMinutes: t.integer("duration_minutes").notNull().default(30),
		platform: t.text("platform").notNull().default("livekit").$type<"zoom" | "teams" | "livekit">(),
		status: t
			.text("status")
			.notNull()
			.default("scheduled")
			.$type<"scheduled" | "confirmed" | "in-progress" | "completed" | "cancelled" | "no-show">(),
		videoLink: t.text("video_link"),
		meetingId: t.text("meeting_id"),
		meetingPassword: t.text("meeting_password"),
		livekitRoomName: t.text("livekit_room_name"),
		livekitSessionStartedAt: t.timestamp("livekit_session_started_at", { withTimezone: true }),
		livekitSessionEndedAt: t.timestamp("livekit_session_ended_at", { withTimezone: true }),
		patientInviteTokenHash: t.text("patient_invite_token_hash"),
		patientInviteExpiresAt: t.timestamp("patient_invite_expires_at", { withTimezone: true }),
		patientInviteRevokedAt: t.timestamp("patient_invite_revoked_at", { withTimezone: true }),
		patientInviteLastUsedAt: t.timestamp("patient_invite_last_used_at", { withTimezone: true }),
		patientJoinedAt: t.timestamp("patient_joined_at", { withTimezone: true }),
		notes: t.text("notes"),
		linkedCoreEncounterId: t
			.uuid("linked_core_encounter_id")
			.references(() => encounters.id, { onDelete: "set null" }),
		createdByStaffId: t
			.uuid("created_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		cancelledAt: t.timestamp("cancelled_at", { withTimezone: true }),
		cancellationReason: t.text("cancellation_reason"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("telemedicine_appts_facility_id_idx").on(t.facilityId),
		index("telemedicine_appts_patient_id_idx").on(t.patientId),
		index("telemedicine_appts_clinician_staff_id_idx").on(t.clinicianStaffId),
		index("telemedicine_appts_scheduled_date_idx").on(t.scheduledDate),
		index("telemedicine_appts_status_idx").on(t.status),
		uniqueIndex("telemedicine_appts_patient_invite_hash_uniq").on(t.patientInviteTokenHash),
	]
)

export const telemedicineEncounters = createTable(
	"telemedicine_encounters",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		appointmentId: t
			.uuid("appointment_id")
			.notNull()
			.references(() => telemedicineAppointments.id, { onDelete: "restrict" }),
		encounterType: t
			.text("encounter_type")
			.notNull()
			.default("standalone")
			.$type<"standalone" | "linked">(),
		linkedEncounterId: t
			.uuid("linked_encounter_id")
			.references(() => encounters.id, { onDelete: "set null" }),
		patientId: t
			.uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "restrict" }),
		clinicianStaffId: t
			.uuid("clinician_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		chiefComplaint: t.text("chief_complaint").notNull().default(""),
		subjectiveNotes: t.text("subjective_notes").notNull().default(""),
		objectiveNotes: t.text("objective_notes").notNull().default(""),
		assessmentNotes: t.text("assessment_notes").notNull().default(""),
		planNotes: t.text("plan_notes").notNull().default(""),
		diagnosis: t.text("diagnosis").notNull().default(""),
		icdCode: t.text("icd_code"),
		vitalSigns: t.jsonb("vital_signs").$type<{
			bloodPressure?: string
			heartRate?: string
			temperature?: string
			oxygenSaturation?: string
			weight?: string
		}>(),
		status: t.text("status").notNull().default("open").$type<"open" | "signed" | "finalized">(),
		signedAt: t.timestamp("signed_at"),
		signedByStaffId: t
			.uuid("signed_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("telemedicine_encounters_appointment_id_idx").on(t.appointmentId),
		index("telemedicine_encounters_patient_id_idx").on(t.patientId),
		index("telemedicine_encounters_clinician_staff_id_idx").on(t.clinicianStaffId),
		index("telemedicine_encounters_status_idx").on(t.status),
	]
)

export const telemedicinePrescriptions = createTable(
	"telemedicine_prescriptions",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		encounterId: t
			.uuid("encounter_id")
			.notNull()
			.references(() => telemedicineEncounters.id, { onDelete: "restrict" }),
		appointmentId: t
			.uuid("appointment_id")
			.notNull()
			.references(() => telemedicineAppointments.id, { onDelete: "restrict" }),
		prescriptionDate: t.date("prescription_date").notNull(),
		validUntil: t.date("valid_until").notNull(),
		status: t
			.text("status")
			.notNull()
			.default("draft")
			.$type<"draft" | "active" | "signed" | "sent" | "dispensed" | "cancelled">(),
		prcLicenseNumber: t.text("prc_license_number"),
		ptrNumber: t.text("ptr_number"),
		dispensingInstructions: t.text("dispensing_instructions"),
		createdByStaffId: t
			.uuid("created_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		signedAt: t.timestamp("signed_at"),
		signedByStaffId: t
			.uuid("signed_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		sentAt: t.timestamp("sent_at"),
		sentToEmail: t.text("sent_to_email"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("telemedicine_prescriptions_encounter_id_idx").on(t.encounterId),
		index("telemedicine_prescriptions_appointment_id_idx").on(t.appointmentId),
		index("telemedicine_prescriptions_status_idx").on(t.status),
	]
)

export const telemedicinePrescriptionItems = createTable(
	"telemedicine_prescription_items",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		prescriptionId: t
			.uuid("prescription_id")
			.notNull()
			.references(() => telemedicinePrescriptions.id, { onDelete: "cascade" }),
		genericName: t.text("generic_name").notNull(),
		brandName: t.text("brand_name"),
		dosage: t.text("dosage").notNull(),
		form: t.text("form").notNull(),
		quantity: t.integer("quantity").notNull(),
		unit: t.text("unit").notNull(),
		frequency: t.text("frequency").notNull(),
		duration: t.text("duration").notNull(),
		route: t.text("route").notNull(),
		instructions: t.text("instructions"),
		sortOrder: t.integer("sort_order").notNull().default(0),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [index("telemedicine_prescription_items_prescription_id_idx").on(t.prescriptionId)]
)

export const telemedicineAbstracts = createTable(
	"telemedicine_abstracts",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		encounterId: t
			.uuid("encounter_id")
			.notNull()
			.unique()
			.references(() => telemedicineEncounters.id, { onDelete: "restrict" }),
		appointmentId: t
			.uuid("appointment_id")
			.notNull()
			.references(() => telemedicineAppointments.id, { onDelete: "restrict" }),
		patientId: t
			.uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "restrict" }),
		chiefComplaint: t.text("chief_complaint").notNull().default(""),
		subjectiveNotes: t.text("subjective_notes").notNull().default(""),
		objectiveNotes: t.text("objective_notes").notNull().default(""),
		assessmentNotes: t.text("assessment_notes").notNull().default(""),
		planNotes: t.text("plan_notes").notNull().default(""),
		diagnosis: t.text("diagnosis").notNull().default(""),
		icdCode: t.text("icd_code"),
		additionalNotes: t.text("additional_notes"),
		status: t.text("status").notNull().default("draft").$type<"draft" | "signed" | "sent">(),
		signedAt: t.timestamp("signed_at"),
		signedByStaffId: t
			.uuid("signed_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		sentAt: t.timestamp("sent_at"),
		sentToEmail: t.text("sent_to_email"),
		createdByStaffId: t
			.uuid("created_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("telemedicine_abstracts_encounter_id_idx").on(t.encounterId),
		index("telemedicine_abstracts_patient_id_idx").on(t.patientId),
		index("telemedicine_abstracts_status_idx").on(t.status),
	]
)

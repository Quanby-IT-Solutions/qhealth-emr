import { index, uniqueIndex } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { patients } from "./core.js"
import { facilities, staffProfiles } from "./rbac.js"

// ============================================================================
// SCHEDULING — Clinic Templates, Appointments
// ============================================================================

export const clinicTemplates = createTable(
	"clinic_templates",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		clinicianStaffId: t
			.uuid("clinician_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "cascade" }),
		clinicName: t.text("clinic_name").notNull(),
		dayOfWeek: t.integer("day_of_week").notNull(), // 0 = Sunday, 6 = Saturday
		startTime: t.time("start_time").notNull(),
		endTime: t.time("end_time").notNull(),
		maxPatients: t.integer("max_patients").notNull().default(20),
		slotDurationMinutes: t.integer("slot_duration_minutes").notNull().default(15),
		isActive: t.boolean("is_active").notNull().default(true),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("clinic_templates_facility_id_idx").on(t.facilityId),
		index("clinic_templates_clinician_staff_id_idx").on(t.clinicianStaffId),
		index("clinic_templates_day_of_week_idx").on(t.dayOfWeek),
		uniqueIndex("clinic_templates_clinician_day_uniq").on(
			t.clinicianStaffId,
			t.dayOfWeek,
			t.clinicName
		),
	]
)

export const appointments = createTable(
	"appointments",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		clinicTemplateId: t
			.uuid("clinic_template_id")
			.references(() => clinicTemplates.id, { onDelete: "set null" }),
		patientId: t
			.uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		clinicianStaffId: t
			.uuid("clinician_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		appointmentDate: t.date("appointment_date").notNull(),
		appointmentTime: t.time("appointment_time").notNull(),
		queueNumber: t.integer("queue_number"),
		status: t
			.text("status")
			.notNull()
			.default("booked")
			.$type<"booked" | "checked_in" | "in_progress" | "completed" | "cancelled" | "no_show">(),
		checkedInAt: t.timestamp("checked_in_at"),
		encounterType: t
			.text("encounter_type")
			.notNull()
			.default("outpatient")
			.$type<"outpatient" | "telemedicine">(),
		chiefComplaint: t.text("chief_complaint"),
		notes: t.text("notes"),
		bookedByStaffId: t
			.uuid("booked_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		cancelledAt: t.timestamp("cancelled_at"),
		cancellationReason: t.text("cancellation_reason"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("appointments_facility_id_idx").on(t.facilityId),
		index("appointments_patient_id_idx").on(t.patientId),
		index("appointments_clinician_staff_id_idx").on(t.clinicianStaffId),
		index("appointments_date_idx").on(t.appointmentDate),
		index("appointments_status_idx").on(t.status),
		uniqueIndex("appointments_clinician_date_time_uniq").on(
			t.clinicianStaffId,
			t.appointmentDate,
			t.appointmentTime
		),
	]
)

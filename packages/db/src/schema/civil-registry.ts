import { index } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { encounters, patients } from "./core.js"
import { facilities, staffProfiles } from "./rbac.js"

// ============================================================================
// CIVIL REGISTRY — Birth Registration Tracking
// ============================================================================

export const birthRegistrations = createTable(
	"birth_registrations",
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
		encounterId: t.uuid("encounter_id").references(() => encounters.id, { onDelete: "set null" }),
		birthDatetime: t.timestamp("birth_datetime").notNull(),
		registeredByStaffId: t
			.uuid("registered_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		// PSA/LCR reference once the certificate is submitted
		certificateNumber: t.text("certificate_number"),
		attendantAtBirth: t.text("attendant_at_birth"),
		placeOfBirthBarangay: t.text("place_of_birth_barangay"),
		placeOfBirthMunicipality: t.text("place_of_birth_municipality"),
		placeOfBirthProvince: t.text("place_of_birth_province"),
		placeOfBirthRegion: t.text("place_of_birth_region"),
		fatherName: t.text("father_name"),
		motherName: t.text("mother_name"),
		physicianName: t.text("physician_name"),
		physicianLicenseNo: t.text("physician_license_no"),
		physicianSignature: t.text("physician_signature"),
		attendingStaffId: t
			.uuid("attending_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		status: t
			.text("status")
			.notNull()
			.default("draft")
			.$type<"draft" | "completed" | "submitted">(),
		// SLA-005: authoritative checkpoint — set when the family submits the registration request
		requestedAt: t.timestamp("requested_at"),
		// SLA-015: authoritative checkpoint — set when payment is received for the birth certificate
		paidAt: t.timestamp("paid_at"),
		// SLA-021: Flow 7 Step 3 release audit — staff member who physically issued the birth certificate
		releasedByStaffId: t
			.uuid("released_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		// SLA-021: Flow 7 Step 3 release audit — when the certificate was released to the family
		releasedAt: t.timestamp("released_at"),
		completedAt: t.timestamp("completed_at"),
		submittedAt: t.timestamp("submitted_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("birth_registrations_facility_id_idx").on(t.facilityId),
		index("birth_registrations_patient_id_idx").on(t.patientId),
		index("birth_registrations_status_idx").on(t.status),
		index("birth_registrations_birth_datetime_idx").on(t.birthDatetime),
	]
)

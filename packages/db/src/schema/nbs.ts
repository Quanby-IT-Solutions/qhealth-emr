import { index } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { consentRecords } from "./clinical.js"
import { encounters, patients } from "./core.js"
import { facilities, staffProfiles } from "./rbac.js"

// ============================================================================
// NBS — Newborn Screening Log Entries
// ============================================================================

export const nbsLogEntries = createTable(
	"nbs_log_entries",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		encounterId: t.uuid("encounter_id").references(() => encounters.id, { onDelete: "cascade" }),
		patientId: t
			.uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "restrict" }),
		motherPatientId: t
			.uuid("mother_patient_id")
			.references(() => patients.id, { onDelete: "set null" }),
		birthDatetime: t.timestamp("birth_datetime").notNull(),
		screeningDatetime: t.timestamp("screening_datetime"),
		hoursElapsed: t.integer("hours_elapsed"), // Computed: screeningDatetime - birthDatetime
		screeningResult: t.jsonb("screening_result").$type<{
			sampleId?: string
			testType?: "heel_prick" | "cord_blood"
			conditions?: Array<{
				condition: string
				result: "normal" | "abnormal" | "inconclusive"
				value?: string
			}>
			labName?: string
			labReportDate?: string
		}>(),
		consentRecordId: t
			.uuid("consent_record_id")
			.references(() => consentRecords.id, { onDelete: "set null" }),
		consentStatus: t
			.text("consent_status")
			.notNull()
			.default("pending")
			.$type<"pending" | "consented" | "waived" | "refused">(),
		waiverReason: t.text("waiver_reason"),
		referralStatus: t
			.text("referral_status")
			.notNull()
			.default("none")
			.$type<"none" | "referred" | "completed">(),
		referralFacility: t.text("referral_facility"),
		referralDate: t.date("referral_date"),
		referralNotes: t.text("referral_notes"),
		screenedByStaffId: t
			.uuid("screened_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		status: t
			.text("status")
			.notNull()
			.default("pending")
			.$type<"pending" | "screened" | "referred" | "completed">(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("nbs_log_entries_facility_id_idx").on(t.facilityId),
		index("nbs_log_entries_encounter_id_idx").on(t.encounterId),
		index("nbs_log_entries_patient_id_idx").on(t.patientId),
		index("nbs_log_entries_mother_patient_id_idx").on(t.motherPatientId),
		index("nbs_log_entries_status_idx").on(t.status),
		index("nbs_log_entries_screening_datetime_idx").on(t.screeningDatetime),
	]
)

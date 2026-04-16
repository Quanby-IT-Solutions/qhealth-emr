import { index } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { encounters, patients } from "./core.js"
import { facilities, staffProfiles } from "./rbac.js"

// ============================================================================
// DEATH REPORTING — FMDRF/FNDRF Forms
// ============================================================================

export const deathReports = createTable(
	"death_reports",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		encounterId: t
			.uuid("encounter_id")
			.references(() => encounters.id, { onDelete: "cascade" }),
		patientId: t
			.uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "restrict" }),
		reportType: t
			.text("report_type")
			.notNull()
			.$type<"fmdrf" | "fndrf">(),
		deathDatetime: t.timestamp("death_datetime").notNull(),
		causeOfDeath: t.text("cause_of_death").notNull(),
		contributingFactors: t.jsonb("contributing_factors").$type<Array<{
			factor: string
			icd10Code?: string
			duration?: string
		}>>(),
		maternalHistory: t.jsonb("maternal_history").$type<{
			// For FMDRF - Facility Maternal Death Review Form
			gravida?: number
			para?: number
			gestationalAge?: number
			antenatalCareVisits?: number
			complications?: string[]
			deliveryMode?: "vaginal" | "cesarean"
			deliveryDate?: string
			causeCategory?: "direct" | "indirect" | "unknown"
			preventableFactors?: string[]
		}>(),
		neonatalDetails: t.jsonb("neonatal_details").$type<{
			// For FNDRF - Facility Neonatal Death Review Form
			birthWeight?: number
			gestationalAgeWeeks?: number
			apgarScore1Min?: number
			apgarScore5Min?: number
			resuscitationRequired?: boolean
			causeCategory?: "perinatal" | "congenital" | "infection" | "other"
			ageAtDeathHours?: number
			preventableFactors?: string[]
		}>(),
		physicianCertification: t.jsonb("physician_certification").$type<{
			certifyingPhysicianName?: string
			prcLicenseNumber?: string
			certificationDate?: string
			signatureData?: string // Base64 or reference
		}>(),
		certifyingStaffId: t
			.uuid("certifying_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		pdfSnapshotUrl: t.text("pdf_snapshot_url"),
		status: t
			.text("status")
			.notNull()
			.default("draft")
			.$type<"draft" | "completed" | "submitted">(),
		completedAt: t.timestamp("completed_at"),
		submittedAt: t.timestamp("submitted_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("death_reports_facility_id_idx").on(t.facilityId),
		index("death_reports_encounter_id_idx").on(t.encounterId),
		index("death_reports_patient_id_idx").on(t.patientId),
		index("death_reports_report_type_idx").on(t.reportType),
		index("death_reports_status_idx").on(t.status),
		index("death_reports_death_datetime_idx").on(t.deathDatetime),
	]
)

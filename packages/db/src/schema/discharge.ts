import { index, uniqueIndex } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { encounters } from "./core.js"
import { facilities, staffProfiles } from "./rbac.js"

// ============================================================================
// DISCHARGE — Clearances + Gate Passes (Flow B6 / Story 2.6)
// ============================================================================

export const dischargeClearances = createTable(
	"discharge_clearances",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		encounterId: t
			.uuid("encounter_id")
			.notNull()
			.references(() => encounters.id, { onDelete: "cascade" }),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		pharmacyClearedAt: t.timestamp("pharmacy_cleared_at"),
		pharmacyClearedByStaffId: t
			.uuid("pharmacy_cleared_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		nursingClearedAt: t.timestamp("nursing_cleared_at"),
		nursingClearedByStaffId: t
			.uuid("nursing_cleared_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		billingSignedOffAt: t.timestamp("billing_signed_off_at"),
		billingSignedOffByStaffId: t
			.uuid("billing_signed_off_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		uniqueIndex("discharge_clearances_encounter_id_uniq").on(t.encounterId),
		index("discharge_clearances_facility_id_idx").on(t.facilityId),
	]
)

export type DischargeClearancesRow = typeof dischargeClearances.$inferSelect

export const gatePasses = createTable(
	"gate_passes",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		encounterId: t
			.uuid("encounter_id")
			.notNull()
			.references(() => encounters.id, { onDelete: "cascade" }),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		issuedAt: t.timestamp("issued_at").notNull().defaultNow(),
		issuedByStaffId: t
			.uuid("issued_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		patientName: t.text("patient_name").notNull(),
		wardName: t.text("ward_name").notNull(),
		bedNumber: t.text("bed_number").notNull(),
		admissionDatetime: t.timestamp("admission_datetime").notNull(),
		dischargeDatetime: t.timestamp("discharge_datetime").notNull(),
		lengthOfStayDays: t.integer("length_of_stay_days").notNull(),
		disposition: t
			.text("disposition")
			.notNull()
			.$type<"home" | "transfer" | "deceased" | "ama">(),
		deathClassification: t
			.text("death_classification")
			.$type<"gross" | "net">(),
		qrCodePayload: t.text("qr_code_payload").notNull(),
		pdfUri: t.text("pdf_uri"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		uniqueIndex("gate_passes_encounter_id_uniq").on(t.encounterId),
		index("gate_passes_facility_id_idx").on(t.facilityId),
		index("gate_passes_issued_at_idx").on(t.issuedAt),
	]
)

export type GatePassRow = typeof gatePasses.$inferSelect

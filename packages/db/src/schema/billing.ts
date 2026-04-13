import { index, uniqueIndex } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { encounters, patients } from "./core.js"
import { facilities, staffProfiles } from "./rbac.js"

// ============================================================================
// BILLING — Charges, Invoices, Payments, CF4 Claims, Eligibility
// ============================================================================

export const chargeMasterItems = createTable(
	"charge_master_items",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		itemCode: t.text("item_code").notNull(),
		description: t.text("description").notNull(),
		category: t
			.text("category")
			.notNull()
			.$type<"laboratory" | "imaging" | "medication" | "procedure" | "room" | "other">(),
		unitPrice: t.numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
		rvsCode: t.text("rvs_code"),
		isActive: t.boolean("is_active").notNull().default(true),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("charge_master_items_facility_id_idx").on(t.facilityId),
		index("charge_master_items_item_code_idx").on(t.itemCode),
	]
)

export const charges = createTable(
	"charges",
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
		chargeMasterItemId: t
			.uuid("charge_master_item_id")
			.references(() => chargeMasterItems.id, { onDelete: "set null" }),
		description: t.text("description").notNull(),
		quantity: t.numeric("quantity", { precision: 8, scale: 2 }).notNull().default("1"),
		unitPrice: t.numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
		totalAmount: t.numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
		sourceType: t
			.text("source_type")
			.notNull()
			.$type<"auto_medication" | "auto_lab" | "auto_imaging" | "manual">(),
		sourceOrderId: t.uuid("source_order_id"),
		createdByStaffId: t
			.uuid("created_by_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("charges_facility_id_idx").on(t.facilityId),
		index("charges_encounter_id_idx").on(t.encounterId),
	]
)

export const invoices = createTable(
	"invoices",
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
		invoiceNumber: t.text("invoice_number").notNull(),
		subtotal: t.numeric("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
		philhealthCoverage: t
			.numeric("philhealth_coverage", { precision: 14, scale: 2 })
			.notNull()
			.default("0"),
		patientResponsibility: t
			.numeric("patient_responsibility", { precision: 14, scale: 2 })
			.notNull()
			.default("0"),
		status: t
			.text("status")
			.notNull()
			.default("draft")
			.$type<"draft" | "finalized" | "paid" | "partially_paid">(),
		finalizedAt: t.timestamp("finalized_at"),
		createdByStaffId: t
			.uuid("created_by_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("invoices_facility_id_idx").on(t.facilityId),
		index("invoices_encounter_id_idx").on(t.encounterId),
		index("invoices_patient_id_idx").on(t.patientId),
		uniqueIndex("invoices_facility_invoice_number_uniq").on(t.facilityId, t.invoiceNumber),
	]
)

export const invoiceLineItems = createTable(
	"invoice_line_items",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		invoiceId: t
			.uuid("invoice_id")
			.notNull()
			.references(() => invoices.id, { onDelete: "cascade" }),
		chargeId: t
			.uuid("charge_id")
			.references(() => charges.id, { onDelete: "set null" }),
		description: t.text("description").notNull(),
		quantity: t.numeric("quantity", { precision: 8, scale: 2 }).notNull().default("1"),
		unitPrice: t.numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
		totalAmount: t.numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [index("invoice_line_items_invoice_id_idx").on(t.invoiceId)]
)

export const payments = createTable(
	"payments",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		invoiceId: t
			.uuid("invoice_id")
			.notNull()
			.references(() => invoices.id, { onDelete: "cascade" }),
		amount: t.numeric("amount", { precision: 14, scale: 2 }).notNull(),
		paymentMethod: t
			.text("payment_method")
			.notNull()
			.$type<"cash" | "philhealth" | "hmo" | "credit_card" | "bank_transfer" | "other">(),
		referenceNumber: t.text("reference_number"),
		receivedByStaffId: t
			.uuid("received_by_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		paymentDate: t.date("payment_date").notNull(),
		notes: t.text("notes"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("payments_facility_id_idx").on(t.facilityId),
		index("payments_invoice_id_idx").on(t.invoiceId),
	]
)

export const cf4Claims = createTable(
	"cf4_claims",
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
		invoiceId: t
			.uuid("invoice_id")
			.references(() => invoices.id, { onDelete: "set null" }),
		claimNumber: t.text("claim_number"),
		status: t
			.text("status")
			.notNull()
			.default("draft")
			.$type<"draft" | "submitted" | "approved" | "rejected" | "resubmitted">(),
		submissionData: t.jsonb("submission_data"),
		responseData: t.jsonb("response_data"),
		submittedAt: t.timestamp("submitted_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("cf4_claims_facility_id_idx").on(t.facilityId),
		index("cf4_claims_encounter_id_idx").on(t.encounterId),
		index("cf4_claims_status_idx").on(t.status),
	]
)

export const eligibilityChecks = createTable(
	"eligibility_checks",
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
		philhealthMemberId: t.text("philhealth_member_id").notNull(),
		checkStatus: t
			.text("check_status")
			.notNull()
			.default("pending")
			.$type<"pending" | "eligible" | "ineligible" | "error">(),
		checkResponse: t.jsonb("check_response"),
		checkedAt: t.timestamp("checked_at").notNull().defaultNow(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("eligibility_checks_patient_id_idx").on(t.patientId),
		index("eligibility_checks_facility_id_idx").on(t.facilityId),
	]
)

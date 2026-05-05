import { sql } from "drizzle-orm"
import { index, uniqueIndex } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { encounters, patients } from "./core.js"
import { facilities, staffProfiles } from "./rbac.js"

// ============================================================================
// BILLING — Charges, Invoices, Payments, CF4 Claims, Eligibility
// ============================================================================

// `chargeMasterItems` serves as the `service_catalog` referenced by BIL-BE-01 / BIL-BE-02.
// Same row shape: code (itemCode), name (description), category, default_price (unitPrice).
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
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("charges_facility_id_idx").on(t.facilityId),
		index("charges_encounter_id_idx").on(t.encounterId),
		uniqueIndex("charges_source_idempotency_uniq")
			.on(t.sourceType, t.sourceOrderId, t.encounterId)
			.where(sql`source_order_id IS NOT NULL`),
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
		discount: t.numeric("discount", { precision: 14, scale: 2 }).notNull().default("0"),
		discountType: t
			.text("discount_type")
			.$type<"NONE" | "SENIOR" | "PWD" | "SOLO_PARENT" | "MANUAL">()
			.default("NONE"),
		discountReason: t.text("discount_reason"),
		vatAmount: t.numeric("vat_amount", { precision: 14, scale: 2 }).notNull().default("0"),
		totalAmount: t.numeric("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
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
		chargeId: t.uuid("charge_id").references(() => charges.id, { onDelete: "set null" }),
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
			.$type<"cash" | "card" | "gcash" | "hmo" | "malasakit" | "philhealth" | "coe">(),
		referenceNumber: t.text("reference_number"),
		hmoProvider: t.text("hmo_provider"),
		hmoClaimNumber: t.text("hmo_claim_number"),
		hmoPercentageCovered: t.numeric("hmo_percentage_covered", { precision: 5, scale: 2 }),
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
		invoiceId: t.uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
		claimNumber: t.text("claim_number"),
		status: t
			.text("status")
			.notNull()
			.default("draft")
			.$type<"draft" | "submitted" | "approved" | "rejected" | "resubmitted">(),
		submissionData: t.jsonb("submission_data"),
		responseData: t.jsonb("response_data"),
		// Auto-extracted clinical data for CF4 auto-population
		extractedData: t.jsonb("extracted_data").$type<{
			chiefComplaint?: string
			historyOfPresentIllness?: string
			pertinentPastMedicalHistory?: string
			physicalExamFindings?: string
			courseInTheWard?: string
			diagnosisOnAdmission?: string
			finalDiagnosis?: string
			operativeProcedures?: string[]
			vitalSigns?: Array<{ date: string; bp?: string; hr?: number; rr?: number; temp?: number }>
			labResults?: Array<{ test: string; result: string; date: string }>
		}>(),
		resubmitCount: t.integer("resubmit_count").notNull().default(0),
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

// DRG Shadow Billing (CF5)
export const cf5Claims = createTable(
	"cf5_claims",
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
		cf4ClaimId: t.uuid("cf4_claim_id").references(() => cf4Claims.id, { onDelete: "set null" }),
		drgCode: t.text("drg_code"),
		drgDescription: t.text("drg_description"),
		drgWeight: t.numeric("drg_weight", { precision: 8, scale: 4 }),
		drgGrouper: t.text("drg_grouper"), // e.g., "PhilHealth DRG v1.0"
		validatedByStaffId: t
			.uuid("validated_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		status: t
			.text("status")
			.notNull()
			.default("draft")
			.$type<"draft" | "validated" | "submitted" | "approved" | "rejected">(),
		submissionData: t.jsonb("submission_data"),
		responseData: t.jsonb("response_data"),
		resubmitCount: t.integer("resubmit_count").notNull().default(0),
		validatedAt: t.timestamp("validated_at"),
		submittedAt: t.timestamp("submitted_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("cf5_claims_facility_id_idx").on(t.facilityId),
		index("cf5_claims_encounter_id_idx").on(t.encounterId),
		index("cf5_claims_cf4_claim_id_idx").on(t.cf4ClaimId),
		index("cf5_claims_status_idx").on(t.status),
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

// ============================================================================
// BIL-BE-01: Missing tables required by ticket acceptance criteria
// ============================================================================

export const receipts = createTable(
	"receipts",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		paymentId: t
			.uuid("payment_id")
			.notNull()
			.references(() => payments.id, { onDelete: "cascade" }),
		receiptNumber: t.text("receipt_number").notNull(),
		fiscalYear: t.integer("fiscal_year").notNull(),
		pdfUri: t.text("pdf_uri"),
		issuedAt: t.timestamp("issued_at").notNull().defaultNow(),
		issuedByStaffId: t
			.uuid("issued_by_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
	}),
	t => [
		index("receipts_facility_id_idx").on(t.facilityId),
		index("receipts_payment_id_idx").on(t.paymentId),
		uniqueIndex("receipts_facility_fiscal_year_number_uniq").on(
			t.facilityId,
			t.fiscalYear,
			t.receiptNumber
		),
	]
)

export const cf4StatusLog = createTable(
	"cf4_status_log",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		claimId: t
			.uuid("claim_id")
			.notNull()
			.references(() => cf4Claims.id, { onDelete: "cascade" }),
		status: t
			.text("status")
			.notNull()
			.$type<"draft" | "submitted" | "approved" | "rejected" | "resubmitted">(),
		philhealthRef: t.text("philhealth_ref"),
		payload: t.jsonb("payload"),
		changedByStaffId: t
			.uuid("changed_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		changedAt: t.timestamp("changed_at").notNull().defaultNow(),
	}),
	t => [
		index("cf4_status_log_claim_id_idx").on(t.claimId),
		index("cf4_status_log_changed_at_idx").on(t.changedAt),
	]
)

export const cf5StatusLog = createTable(
	"cf5_status_log",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		claimId: t
			.uuid("claim_id")
			.notNull()
			.references(() => cf5Claims.id, { onDelete: "cascade" }),
		status: t
			.text("status")
			.notNull()
			.$type<"draft" | "validated" | "submitted" | "approved" | "rejected" | "resubmitted">(),
		philhealthRef: t.text("philhealth_ref"),
		payload: t.jsonb("payload"),
		changedByStaffId: t
			.uuid("changed_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		changedAt: t.timestamp("changed_at").notNull().defaultNow(),
	}),
	t => [
		index("cf5_status_log_claim_id_idx").on(t.claimId),
		index("cf5_status_log_changed_at_idx").on(t.changedAt),
	]
)

export const drgMappings = createTable(
	"drg_mappings",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		encounterId: t
			.uuid("encounter_id")
			.notNull()
			.references(() => encounters.id, { onDelete: "cascade" }),
		drgCode: t.text("drg_code").notNull(),
		drgDescription: t.text("drg_description"),
		confidence: t.numeric("confidence", { precision: 5, scale: 4 }).notNull(),
		manualOverrideReason: t.text("manual_override_reason"),
		isManualOverride: t.boolean("is_manual_override").notNull().default(false),
		confirmedByStaffId: t
			.uuid("confirmed_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		confirmedAt: t.timestamp("confirmed_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("drg_mappings_encounter_id_idx").on(t.encounterId),
		uniqueIndex("drg_mappings_encounter_id_uniq").on(t.encounterId),
	]
)

export const esoaStatements = createTable(
	"esoa_statements",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		invoiceId: t
			.uuid("invoice_id")
			.notNull()
			.references(() => invoices.id, { onDelete: "cascade" }),
		version: t.integer("version").notNull().default(1),
		xmlUri: t.text("xml_uri"),
		pdfUri: t.text("pdf_uri"),
		sentVia: t.text("sent_via").$type<"patient_portal" | "email" | "print" | null>(),
		sentAt: t.timestamp("sent_at"),
		sentToRecipient: t.text("sent_to_recipient"),
		deliveryStatus: t.text("delivery_status").$type<"pending" | "delivered" | "failed" | null>(),
		generatedByStaffId: t
			.uuid("generated_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		generatedAt: t.timestamp("generated_at").notNull().defaultNow(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("esoa_statements_invoice_id_idx").on(t.invoiceId),
		uniqueIndex("esoa_statements_invoice_version_uniq").on(t.invoiceId, t.version),
	]
)

export const cewsSnapshots = createTable(
	"cews_snapshots",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		encounterId: t
			.uuid("encounter_id")
			.notNull()
			.references(() => encounters.id, { onDelete: "cascade" }),
		memberPin: t.text("member_pin").notNull(),
		memberName: t.text("member_name"),
		status: t
			.text("status")
			.notNull()
			.$type<"active" | "lapsed" | "suspended" | "service_unavailable">(),
		benefitBalance: t.numeric("benefit_balance", { precision: 14, scale: 2 }),
		dependentsJson: t.jsonb("dependents_json"),
		rawResponse: t.jsonb("raw_response"),
		capturedByStaffId: t
			.uuid("captured_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		capturedAt: t.timestamp("captured_at").notNull().defaultNow(),
	}),
	t => [
		index("cews_snapshots_encounter_id_idx").on(t.encounterId),
		index("cews_snapshots_member_pin_idx").on(t.memberPin),
	]
)

export const konsultaActivities = createTable(
	"konsulta_activities",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		patientId: t
			.uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		activityType: t.text("activity_type").notNull().$type<"FPE" | "Follow-up" | "Lab">(),
		activityDate: t.date("activity_date").notNull(),
		sourceRef: t.text("source_ref"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("konsulta_activities_patient_id_idx").on(t.patientId),
		index("konsulta_activities_facility_id_idx").on(t.facilityId),
		uniqueIndex("konsulta_activities_patient_type_date_uniq").on(
			t.patientId,
			t.activityType,
			t.activityDate
		),
	]
)

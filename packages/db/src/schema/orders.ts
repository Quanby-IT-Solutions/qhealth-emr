import { index, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { encounters, patients, preEncounters } from "./core.js"
import { formularyItems } from "./formulary.js"
import { facilities, staffProfiles } from "./rbac.js"

// ============================================================================
// DISPENSE LOGS — Inpatient medication dispense records
// ============================================================================

export const dispenseLogs = createTable(
	"dispense_logs",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		medicationOrderId: t
			.uuid("medication_order_id")
			.notNull()
			.references((): AnyPgColumn => medicationOrders.id, { onDelete: "restrict" }),
		patientId: t.uuid("patient_id").references(() => patients.id, { onDelete: "set null" }),
		dispensedQuantity: t.numeric("dispensed_quantity", { precision: 8, scale: 2 }).notNull(),
		quantityUnit: t.text("quantity_unit").notNull(),
		lotNumber: t.text("lot_number"),
		expiryDate: t.date("expiry_date"),
		counselingNotes: t.text("counseling_notes"),
		patientEducation: t.jsonb("patient_education"),
		pharmacistStaffId: t
			.uuid("pharmacist_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		dispensedAt: t.timestamp("dispensed_at").notNull().defaultNow(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("dispense_logs_medication_order_id_idx").on(t.medicationOrderId),
		index("dispense_logs_facility_id_idx").on(t.facilityId),
		index("dispense_logs_patient_id_idx").on(t.patientId),
		index("dispense_logs_dispensed_at_idx").on(t.dispensedAt),
	]
)

// ============================================================================
// COUNSELING LOGS — Patient counseling records by pharmacist
// ============================================================================

export const counselingLogs = createTable(
	"counseling_logs",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		encounterId: t.uuid("encounter_id").references(() => encounters.id, { onDelete: "set null" }),
		patientId: t.uuid("patient_id").references(() => patients.id, { onDelete: "set null" }),
		medicationOrderId: t
			.uuid("medication_order_id")
			.references((): AnyPgColumn => medicationOrders.id, { onDelete: "set null" }),
		checklistItems: t.jsonb("checklist_items").notNull().default([]),
		patientSignature: t.text("patient_signature"),
		pharmacistStaffId: t
			.uuid("pharmacist_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		counseledAt: t.timestamp("counseled_at").notNull().defaultNow(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("counseling_logs_facility_id_idx").on(t.facilityId),
		index("counseling_logs_encounter_id_idx").on(t.encounterId),
		index("counseling_logs_medication_order_id_idx").on(t.medicationOrderId),
		index("counseling_logs_counseled_at_idx").on(t.counseledAt),
	]
)

// ============================================================================
// ORDERS — Medication, Lab, Imaging, Verification, Prescriptions
// ============================================================================

export const medicationOrders = createTable(
	"medication_orders",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		encounterId: t.uuid("encounter_id").references(() => encounters.id, { onDelete: "cascade" }),
		preEncounterId: t
			.uuid("pre_encounter_id")
			.references(() => preEncounters.id, { onDelete: "set null" }),
		formularyItemId: t
			.uuid("formulary_item_id")
			.references(() => formularyItems.id, { onDelete: "set null" }),
		genericName: t.text("generic_name").notNull(),
		brandName: t.text("brand_name"),
		rxnormCode: t.text("rxnorm_code"),
		dose: t.text("dose").notNull(),
		doseUnit: t.text("dose_unit").notNull(),
		doseForm: t.text("dose_form").notNull(),
		route: t.text("route").notNull(),
		frequency: t.text("frequency").notNull(),
		firstDoseAt: t.timestamp("first_dose_at"),
		durationDays: t.integer("duration_days"),
		specialInstructions: t.text("special_instructions"),
		isPrn: t.boolean("is_prn").notNull().default(false),
		prnReason: t.text("prn_reason"),
		isControlledSubstance: t.boolean("is_controlled_substance").notNull().default(false),
		pdeaSchedule: t.text("pdea_schedule"),
		pdeaTrancheNumber: t.integer("pdea_tranche_number"),
		pdeaTrancheTotal: t.integer("pdea_tranche_total"),
		noRefillInscribed: t.boolean("no_refill_inscribed").notNull().default(false),
		// Self-referencing FK for PDEA tranching: parent-child relationship
		parentOrderId: t
			.uuid("parent_order_id")
			.references((): AnyPgColumn => medicationOrders.id, { onDelete: "set null" }),
		status: t
			.text("status")
			.notNull()
			.default("pending_verification")
			.$type<
				| "pending_verification"
				| "verified"
				| "rejected"
				| "modified"
				| "active"
				| "completed"
				| "discontinued"
				| "cancelled"
			>(),
		orderingStaffId: t
			.uuid("ordering_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		cdsAlerts: t.jsonb("cds_alerts"),
		cdsOverrides: t.jsonb("cds_overrides"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("medication_orders_facility_id_idx").on(t.facilityId),
		index("medication_orders_encounter_id_idx").on(t.encounterId),
		index("medication_orders_pre_encounter_id_idx").on(t.preEncounterId),
		index("medication_orders_status_idx").on(t.status),
	]
)

export const labOrders = createTable(
	"lab_orders",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		encounterId: t.uuid("encounter_id").references(() => encounters.id, { onDelete: "cascade" }),
		preEncounterId: t
			.uuid("pre_encounter_id")
			.references(() => preEncounters.id, { onDelete: "set null" }),
		loincCode: t.text("loinc_code"),
		panelCode: t.text("panel_code"),
		testName: t.text("test_name").notNull(),
		panelName: t.text("panel_name"),
		clinicalIndication: t.text("clinical_indication"),
		indicationIcd10Code: t.text("indication_icd10_code"),
		indicationIcd10Display: t.text("indication_icd10_display"),
		priority: t
			.text("priority")
			.notNull()
			.default("routine")
			.$type<"routine" | "urgent" | "stat">(),
		status: t
			.text("status")
			.notNull()
			.default("ordered")
			.$type<
				"pending" | "ordered" | "collected" | "in_progress" | "resulted" | "completed" | "cancelled"
			>(),
		specimenType: t.text("specimen_type"),
		orderingStaffId: t
			.uuid("ordering_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		collectionDatetime: t.timestamp("collection_datetime"),
		// SLA-005: authoritative checkpoint — set when the lab acknowledges specimen receipt
		specimenReceivedAt: t.timestamp("specimen_received_at"),
		// SLA-014: authoritative checkpoint — set when billing clears the payment for the lab order
		billingClearedAt: t.timestamp("billing_cleared_at"),
		resultedDatetime: t.timestamp("resulted_datetime"),
		results: t.jsonb("results"),
		cdsAlerts: t.jsonb("cds_alerts"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("lab_orders_facility_id_idx").on(t.facilityId),
		index("lab_orders_encounter_id_idx").on(t.encounterId),
		index("lab_orders_status_idx").on(t.status),
	]
)

export const imagingOrders = createTable(
	"imaging_orders",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		encounterId: t.uuid("encounter_id").references(() => encounters.id, { onDelete: "cascade" }),
		preEncounterId: t
			.uuid("pre_encounter_id")
			.references(() => preEncounters.id, { onDelete: "set null" }),
		modality: t
			.text("modality")
			.notNull()
			.$type<
				| "xray"
				| "ct"
				| "mri"
				| "ultrasound"
				| "mammography"
				| "fluoroscopy"
				| "nuclear_medicine"
				| "pet_ct"
				| "dexa"
				| "interventional_radiology"
				| "other"
			>(),
		bodyPart: t.text("body_part").notNull(),
		clinicalIndication: t.text("clinical_indication"),
		indicationIcd10Code: t.text("indication_icd10_code"),
		indicationIcd10Display: t.text("indication_icd10_display"),
		priority: t
			.text("priority")
			.notNull()
			.default("routine")
			.$type<"routine" | "urgent" | "stat">(),
		status: t
			.text("status")
			.notNull()
			.default("ordered")
			.$type<"ordered" | "scheduled" | "in_progress" | "completed" | "cancelled">(),
		orderingStaffId: t
			.uuid("ordering_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		scheduledDatetime: t.timestamp("scheduled_datetime"),
		// SLA-005: authoritative checkpoint — set when the radiology dept starts the study
		studyStartedAt: t.timestamp("study_started_at"),
		// SLA-019: authoritative checkpoint — set when radiology acknowledges receipt of the imaging order (Flow 3 Step 1)
		imagingOrderReceivedAt: t.timestamp("imaging_order_received_at"),
		// SLA-014: authoritative checkpoint — set when billing clears the payment for the imaging order
		billingClearedAt: t.timestamp("billing_cleared_at"),
		completedDatetime: t.timestamp("completed_datetime"),
		report: t.text("report"),
		structuredResults: t.jsonb("structured_results"),
		cdsAlerts: t.jsonb("cds_alerts"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("imaging_orders_facility_id_idx").on(t.facilityId),
		index("imaging_orders_encounter_id_idx").on(t.encounterId),
		index("imaging_orders_status_idx").on(t.status),
	]
)

// ============================================================================
// BLOOD BANK — Blood product inventory, cross-match approvals, verification
// ============================================================================

export const bloodUnits = createTable(
	"blood_units",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		unitBarcode: t.text("unit_barcode").notNull(),
		bloodType: t
			.text("blood_type")
			.notNull()
			.$type<"A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-">(),
		componentType: t.text("component_type").notNull(),
		donorId: t.uuid("donor_id"),
		collectionDate: t.date("collection_date"),
		expiryDate: t.date("expiry_date").notNull(),
		status: t
			.text("status")
			.notNull()
			.default("available")
			.$type<"available" | "reserved" | "transfused" | "discarded">(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("blood_units_facility_id_idx").on(t.facilityId),
		uniqueIndex("blood_units_facility_barcode_uniq").on(t.facilityId, t.unitBarcode),
		index("blood_units_status_idx").on(t.status),
		index("blood_units_blood_type_component_idx").on(t.bloodType, t.componentType),
	]
)

export const crossMatchRequests = createTable(
	"cross_match_requests",
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
		sourceLabOrderId: t
			.uuid("source_lab_order_id")
			.references((): AnyPgColumn => labOrders.id, { onDelete: "set null" }),
		bloodType: t
			.text("blood_type")
			.$type<"A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-">(),
		componentType: t.text("component_type").notNull(),
		unitsRequested: t.integer("units_requested").notNull(),
		urgency: t
			.text("urgency")
			.notNull()
			.default("routine")
			.$type<"routine" | "urgent" | "emergency">(),
		clinicalIndication: t.text("clinical_indication"),
		compatibilityResult: t
			.text("compatibility_result")
			.default("pending")
			.$type<"compatible" | "incompatible" | "pending">(),
		status: t
			.text("status")
			.notNull()
			.default("pending")
			.$type<"pending" | "cross_matched" | "approved" | "issued" | "transfused" | "cancelled">(),
		requestedByStaffId: t
			.uuid("requested_by_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		requestedAt: t.timestamp("requested_at").notNull().defaultNow(),
		crossMatchedByStaffId: t
			.uuid("cross_matched_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		crossMatchedAt: t.timestamp("cross_matched_at"),
		approvedByStaffId: t
			.uuid("approved_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		approvedAt: t.timestamp("approved_at"),
		issuedByStaffId: t
			.uuid("issued_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		issuedAt: t.timestamp("issued_at"),
		cancelledByStaffId: t
			.uuid("cancelled_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		cancelledAt: t.timestamp("cancelled_at"),
		rejectionReason: t.text("rejection_reason"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("cross_match_requests_facility_id_idx").on(t.facilityId),
		index("cross_match_requests_patient_id_idx").on(t.patientId),
		index("cross_match_requests_encounter_id_idx").on(t.encounterId),
		index("cross_match_requests_source_lab_order_id_idx").on(t.sourceLabOrderId),
		index("cross_match_requests_status_idx").on(t.status),
		index("cross_match_requests_urgency_idx").on(t.urgency),
		index("cross_match_requests_requested_at_idx").on(t.requestedAt),
		index("cross_match_requests_approved_at_idx").on(t.approvedAt),
	]
)

export const crossMatchUnitAssignments = createTable(
	"cross_match_unit_assignments",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		crossMatchRequestId: t
			.uuid("cross_match_request_id")
			.notNull()
			.references(() => crossMatchRequests.id, { onDelete: "cascade" }),
		bloodUnitId: t
			.uuid("blood_unit_id")
			.notNull()
			.references(() => bloodUnits.id, { onDelete: "restrict" }),
		status: t
			.text("status")
			.notNull()
			.default("reserved")
			.$type<"reserved" | "issued" | "transfused" | "released" | "discarded">(),
		assignedAt: t.timestamp("assigned_at").notNull().defaultNow(),
		issuedAt: t.timestamp("issued_at"),
		transfusedAt: t.timestamp("transfused_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("cross_match_assignments_request_id_idx").on(t.crossMatchRequestId),
		index("cross_match_assignments_blood_unit_id_idx").on(t.bloodUnitId),
		uniqueIndex("cross_match_assignments_request_unit_uniq").on(
			t.crossMatchRequestId,
			t.bloodUnitId
		),
	]
)

export const transfusionVerifications = createTable(
	"transfusion_verifications",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		crossMatchRequestId: t
			.uuid("cross_match_request_id")
			.notNull()
			.references(() => crossMatchRequests.id, { onDelete: "cascade" }),
		bloodUnitId: t.uuid("blood_unit_id").references(() => bloodUnits.id, { onDelete: "set null" }),
		patientId: t.uuid("patient_id").references(() => patients.id, { onDelete: "set null" }),
		verifiedByStaffId: t
			.uuid("verified_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		unitBarcode: t.text("unit_barcode").notNull(),
		patientWristbandBarcode: t.text("patient_wristband_barcode").notNull(),
		verified: t.boolean("verified").notNull().default(false),
		patientMatch: t.boolean("patient_match").notNull().default(false),
		unitMatch: t.boolean("unit_match").notNull().default(false),
		message: t.text("message").notNull(),
		verifiedAt: t.timestamp("verified_at").notNull().defaultNow(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("transfusion_verifications_request_id_idx").on(t.crossMatchRequestId),
		index("transfusion_verifications_blood_unit_id_idx").on(t.bloodUnitId),
		index("transfusion_verifications_verified_at_idx").on(t.verifiedAt),
	]
)

export const orderVerifications = createTable(
	"order_verifications",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		medicationOrderId: t
			.uuid("medication_order_id")
			.notNull()
			.references(() => medicationOrders.id, { onDelete: "cascade" }),
		action: t.text("action").notNull().$type<"approved" | "rejected" | "modified">(),
		pharmacistStaffId: t
			.uuid("pharmacist_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		rejectionReason: t.text("rejection_reason"),
		modificationNotes: t.text("modification_notes"),
		verifiedAt: t.timestamp("verified_at").notNull().defaultNow(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("order_verifications_medication_order_id_idx").on(t.medicationOrderId),
		index("order_verifications_pharmacist_staff_id_idx").on(t.pharmacistStaffId),
	]
)

export const highAlertVerifications = createTable(
	"high_alert_verifications",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		medicationOrderId: t
			.uuid("medication_order_id")
			.notNull()
			.references(() => medicationOrders.id, { onDelete: "cascade" }),
		requestingStaffId: t
			.uuid("requesting_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		verifyingStaffId: t
			.uuid("verifying_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		verifiedAt: t.timestamp("verified_at").notNull().defaultNow(),
		notes: t.text("notes"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("high_alert_verifications_medication_order_id_idx").on(t.medicationOrderId),
		index("high_alert_verifications_verifying_staff_id_idx").on(t.verifyingStaffId),
	]
)

export const prescriptions = createTable(
	"prescriptions",
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
		medicationOrderId: t
			.uuid("medication_order_id")
			.notNull()
			.references(() => medicationOrders.id, { onDelete: "cascade" }),
		patientId: t
			.uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "restrict" }),
		prescriberStaffId: t
			.uuid("prescriber_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		prcLicenseNumber: t.text("prc_license_number").notNull(),
		ptrNumber: t.text("ptr_number").notNull(),
		pdeaS2License: t.text("pdea_s2_license"),
		prescriptionContent: t.jsonb("prescription_content").notNull(),
		status: t.text("status").notNull().default("draft").$type<"draft" | "signed" | "issued">(),
		signedAt: t.timestamp("signed_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("prescriptions_facility_id_idx").on(t.facilityId),
		index("prescriptions_encounter_id_idx").on(t.encounterId),
		index("prescriptions_patient_id_idx").on(t.patientId),
	]
)

export const orderAccessTokens = createTable(
	"order_access_tokens",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		documentType: t
			.text("document_type")
			.notNull()
			.$type<"prescription" | "lab_order" | "imaging_order">(),
		documentId: t.uuid("document_id").notNull(),
		patientId: t
			.uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "restrict" }),
		tokenHash: t.text("token_hash").notNull(),
		expiresAt: t.timestamp("expires_at").notNull(),
		revokedAt: t.timestamp("revoked_at"),
		createdByStaffId: t.uuid("created_by_staff_id").references(() => staffProfiles.id, {
			onDelete: "set null",
		}),
		lastViewedAt: t.timestamp("last_viewed_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		uniqueIndex("order_access_tokens_hash_uniq").on(t.tokenHash),
		index("order_access_tokens_document_idx").on(t.documentType, t.documentId),
		index("order_access_tokens_patient_id_idx").on(t.patientId),
		index("order_access_tokens_expires_at_idx").on(t.expiresAt),
	]
)

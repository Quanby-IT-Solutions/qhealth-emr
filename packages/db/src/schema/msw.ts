import { index } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { encounters, patients } from "./core.js"
import { facilities, staffProfiles } from "./rbac.js"

// ============================================================================
// MSW — Medical Social Work Evaluations
// ============================================================================

export const mswEvaluations = createTable(
	"msw_evaluations",
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
		evaluationFindings: t.jsonb("evaluation_findings").$type<{
			// Financial Assessment
			monthlyIncome?: number
			incomeSource?: string
			householdSize?: number
			employmentStatus?: "employed" | "unemployed" | "retired" | "student" | "dependent"
			// Social Assessment
			livingArrangement?: "alone" | "family" | "institution" | "homeless"
			supportSystem?: string
			socialConcerns?: string[]
			// Classification
			povertyClassification?: "indigent" | "poor" | "near_poor" | "non_poor"
			// Documents
			documentsVerified?: Array<{ type: string; verified: boolean; notes?: string }>
			annexASignature?: string // Base64 or reference
			annexBSignature?: string // Base64 or reference
		}>(),
		coeIssued: t.boolean("coe_issued").notNull().default(false),
		coeNumber: t.text("coe_number"),
		coeProgram: t
			.text("coe_program")
			.$type<"malasakit" | "pcso" | "dswd" | "doh_map" | "philhealth_zbenefit" | "other">(),
		malasakitAmount: t.numeric("malasakit_amount", { precision: 14, scale: 2 }),
		malasakitSource: t.jsonb("malasakit_source").$type<
			Array<{
				source: string
				amount: number
				referenceNumber?: string
			}>
		>(),
		konsultaTagged: t.boolean("konsulta_tagged").notNull().default(false),
		zBenefitsTagged: t.boolean("z_benefits_tagged").notNull().default(false),
		fourPsBeneficiary: t.boolean("4ps_beneficiary").notNull().default(false),
		evaluatedByStaffId: t
			.uuid("evaluated_by_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		status: t
			.text("status")
			.notNull()
			.default("pending")
			.$type<"pending" | "completed" | "approved">(),
		approvedByStaffId: t
			.uuid("approved_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		approvedAt: t.timestamp("approved_at"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("msw_evaluations_facility_id_idx").on(t.facilityId),
		index("msw_evaluations_encounter_id_idx").on(t.encounterId),
		index("msw_evaluations_patient_id_idx").on(t.patientId),
		index("msw_evaluations_status_idx").on(t.status),
		index("msw_evaluations_coe_program_idx").on(t.coeProgram),
	]
)

// ============================================================================
// MSW — Documents
// ============================================================================

export const mswDocuments = createTable(
	"msw_documents",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		evaluationId: t
			.uuid("evaluation_id")
			.notNull()
			.references(() => mswEvaluations.id, { onDelete: "cascade" }),
		category: t
			.text("category")
			.notNull()
			.$type<"brgy_indigency" | "id" | "income_proof" | "other">(),
		uri: t.text("uri").notNull(),
		contentHash: t.text("content_hash"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [index("msw_documents_evaluation_id_idx").on(t.evaluationId)]
)

// ============================================================================
// MSW — COE Certificates
// ============================================================================

export const coeCertificates = createTable(
	"coe_certificates",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		evaluationId: t
			.uuid("evaluation_id")
			.notNull()
			.references(() => mswEvaluations.id, { onDelete: "cascade" }),
		type: t.text("type").notNull().$type<"malasakit" | "z_benefits" | "indigent">(),
		amountApproved: t.numeric("amount_approved", { precision: 14, scale: 2 }),
		issuedByStaffId: t
			.uuid("issued_by_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		pdfUri: t.text("pdf_uri"),
		signedAt: t.timestamp("signed_at"),
		voidedAt: t.timestamp("voided_at"),
		voidReason: t.text("void_reason"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("coe_certificates_evaluation_id_idx").on(t.evaluationId),
		index("coe_certificates_issued_by_idx").on(t.issuedByStaffId),
	]
)

// ============================================================================
// MSW — Annex Signatures
// ============================================================================

export const annexSignatures = createTable(
	"annex_signatures",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		encounterId: t
			.uuid("encounter_id")
			.notNull()
			.references(() => encounters.id, { onDelete: "cascade" }),
		annexType: t.text("annex_type").notNull().$type<"A" | "B">(),
		patientSignatureUri: t.text("patient_signature_uri").notNull(),
		witnessSignatureUri: t.text("witness_signature_uri"),
		pdfUri: t.text("pdf_uri"),
		contentHash: t.text("content_hash"),
		replacedById: t.uuid("replaced_by_id"),
		replaceReason: t.text("replace_reason"),
		signedAt: t.timestamp("signed_at").notNull().defaultNow(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("annex_signatures_encounter_id_idx").on(t.encounterId),
		index("annex_signatures_annex_type_idx").on(t.annexType),
	]
)

// ============================================================================
// MSW — Malasakit Cases
// ============================================================================

export const malasakitCases = createTable(
	"malasakit_cases",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		encounterId: t.uuid("encounter_id").references(() => encounters.id, { onDelete: "set null" }),
		patientId: t
			.uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "restrict" }),
		source: t.text("source").notNull().$type<"DSWD" | "PCSO" | "DOH-MAIFIP">(),
		status: t
			.text("status")
			.notNull()
			.default("pending")
			.$type<"pending" | "approved" | "released" | "denied">(),
		amountGranted: t.numeric("amount_granted", { precision: 14, scale: 2 }),
		referenceNo: t.text("reference_no"),
		deniedReason: t.text("denied_reason"),
		mswOwnerStaffId: t
			.uuid("msw_owner_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("malasakit_cases_patient_id_idx").on(t.patientId),
		index("malasakit_cases_encounter_id_idx").on(t.encounterId),
		index("malasakit_cases_status_idx").on(t.status),
		index("malasakit_cases_source_idx").on(t.source),
	]
)

// ============================================================================
// MSW — Malasakit Status Log
// ============================================================================

export const malasakitStatusLog = createTable(
	"malasakit_status_log",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		caseId: t
			.uuid("case_id")
			.notNull()
			.references(() => malasakitCases.id, { onDelete: "cascade" }),
		fromStatus: t.text("from_status").$type<"pending" | "approved" | "released" | "denied">(),
		toStatus: t.text("to_status").notNull().$type<"pending" | "approved" | "released" | "denied">(),
		actorStaffId: t
			.uuid("actor_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		note: t.text("note"),
		changedAt: t.timestamp("changed_at").notNull().defaultNow(),
	}),
	t => [index("malasakit_status_log_case_id_idx").on(t.caseId)]
)

// ============================================================================
// MSW — Ancillary Clearance
// ============================================================================

export const ancillaryClearance = createTable(
	"ancillary_clearance",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		orderId: t.uuid("order_id").notNull(),
		encounterId: t.uuid("encounter_id").references(() => encounters.id, { onDelete: "set null" }),
		appliedCoverages: t.jsonb("applied_coverages_json").$type<
			Array<{
				type: "malasakit" | "philhealth" | "coe"
				referenceId: string
				amount: number
			}>
		>(),
		status: t
			.text("status")
			.notNull()
			.default("pending")
			.$type<"pending" | "cleared" | "overridden">(),
		clearedByStaffId: t
			.uuid("cleared_by_staff_id")
			.references(() => staffProfiles.id, { onDelete: "set null" }),
		clearedAt: t.timestamp("cleared_at"),
		overrideReason: t.text("override_reason"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("ancillary_clearance_order_id_idx").on(t.orderId),
		index("ancillary_clearance_encounter_id_idx").on(t.encounterId),
		index("ancillary_clearance_status_idx").on(t.status),
	]
)

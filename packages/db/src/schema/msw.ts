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
		encounterId: t
			.uuid("encounter_id")
			.references(() => encounters.id, { onDelete: "cascade" }),
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
			.$type<"malasakit" | "pcso" | "dswd" | "philhealth_point_of_service" | "other">(),
		malasakitAmount: t.numeric("malasakit_amount", { precision: 14, scale: 2 }),
		malasakitSource: t.jsonb("malasakit_source").$type<Array<{
			source: string
			amount: number
			referenceNumber?: string
		}>>(),
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

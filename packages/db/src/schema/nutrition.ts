import { index } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { encounters, patients } from "./core.js"
import { facilities, staffProfiles } from "./rbac.js"

// ============================================================================
// NUTRITION — Nutrition Assessments
// ============================================================================

export const nutritionAssessments = createTable(
	"nutrition_assessments",
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
		screeningTool: t.text("screening_tool").notNull().$type<"nrs_2002" | "sga" | "must" | "mna">(),
		screeningScore: t.integer("screening_score"),
		malnutritionRisk: t.text("malnutrition_risk").$type<"low" | "moderate" | "high">(),
		fullAssessmentData: t.jsonb("full_assessment_data").$type<{
			dietaryHistory?: {
				usualIntake?: string
				recentChanges?: string
				foodAllergies?: string[]
				dietaryRestrictions?: string[]
			}
			labReview?: {
				albumin?: number
				prealbumin?: number
				hemoglobin?: number
				totalProtein?: number
				reviewDate?: string
			}
			clinicalEval?: {
				weightLossPercent?: number
				weightLossPeriod?: string
				muscleWasting?: boolean
				edema?: boolean
				skinCondition?: string
				functionalStatus?: "ambulatory" | "limited" | "bedridden"
			}
			anthropometrics?: {
				height?: number
				weight?: number
				bmi?: number
				midArmCircumference?: number
				tricepsSkinFold?: number
			}
		}>(),
		mealPlan: t.jsonb("meal_plan").$type<{
			caloricTarget?: number
			proteinTarget?: number
			carbTarget?: number
			fatTarget?: number
			fluidTarget?: number
			restrictions?: string[]
			texture?: "regular" | "soft" | "pureed" | "liquid"
			feedingRoute?: "oral" | "enteral" | "parenteral"
			supplements?: Array<{ name: string; dose: string; frequency: string }>
			specialInstructions?: string
		}>(),
		assessedByStaffId: t
			.uuid("assessed_by_staff_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "restrict" }),
		nextReassessmentDate: t.date("next_reassessment_date"),
		status: t
			.text("status")
			.notNull()
			.default("screening")
			.$type<"screening" | "assessed" | "plan_created">(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("nutrition_assessments_facility_id_idx").on(t.facilityId),
		index("nutrition_assessments_encounter_id_idx").on(t.encounterId),
		index("nutrition_assessments_patient_id_idx").on(t.patientId),
		index("nutrition_assessments_status_idx").on(t.status),
		index("nutrition_assessments_malnutrition_risk_idx").on(t.malnutritionRisk),
	]
)

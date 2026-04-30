import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq, sql } from "drizzle-orm"

import {
	nutritionAssessments,
	patients,
	staffProfiles,
	users,
} from "@repo/db/schema"
import type { NutritionAssessment, ScreeningScoreInput, ScreeningScoreResult } from "@repo/contracts"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"

type ListNutritionInput = V1Inputs["nutrition"]["list"]
type CreateNutritionInput = V1Inputs["nutrition"]["create"]
type UpdateNutritionInput = V1Inputs["nutrition"]["update"]
type SaveMealPlanInput = V1Inputs["nutrition"]["saveMealPlan"]
type NutritionListResponse = {
	data: NutritionAssessment[]
	total: number
	page: number
	limit: number
	totalPages: number
}

type NutritionContractStatus = "screening" | "assessed" | "plan_created" | "monitoring"

@Injectable()
export class NutritionService {
	private readonly logger = new Logger(NutritionService.name)

	private async resolveStaffProfileId(userId: string) {
		const [profile] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(eq(staffProfiles.userId, userId))
			.limit(1)

		if (!profile) {
			throw new NotFoundException("Staff profile not found")
		}

		return profile.id
	}

	private getStoredWorkflowStatus(fullAssessmentData: unknown) {
		const workflowStatus = (fullAssessmentData as Record<string, unknown> | null)?.workflowStatus
		return typeof workflowStatus === "string" ? workflowStatus : null
	}

	private normalizeStatusForStorage(status: NutritionContractStatus | undefined) {
		if (!status) {
			return undefined
		}

		return status === "monitoring" ? "plan_created" : status
	}

	private normalizeStatusForOutput(row: {
		status: (typeof nutritionAssessments.$inferSelect)["status"]
		nextReassessmentDate: string | Date | null
		fullAssessmentData: unknown
	}): NutritionContractStatus {
		const workflowStatus = this.getStoredWorkflowStatus(row.fullAssessmentData)
		if (
			workflowStatus === "screening" ||
			workflowStatus === "assessed" ||
			workflowStatus === "plan_created" ||
			workflowStatus === "monitoring"
		) {
			return workflowStatus
		}

		if (row.status === "plan_created" && row.nextReassessmentDate) {
			return "monitoring"
		}

		return row.status
	}

	private mapAnthropometrics(
		anthropometrics: Record<string, unknown> | undefined
	): NutritionAssessment["anthropometrics"] {
		if (!anthropometrics) {
			return null
		}

		return {
			weight: typeof anthropometrics.weight === "number" ? anthropometrics.weight : undefined,
			height: typeof anthropometrics.height === "number" ? anthropometrics.height : undefined,
			bmi: typeof anthropometrics.bmi === "number" ? anthropometrics.bmi : undefined,
			idealBodyWeight:
				typeof anthropometrics.idealBodyWeight === "number"
					? anthropometrics.idealBodyWeight
					: undefined,
			adjustedBodyWeight:
				typeof anthropometrics.adjustedBodyWeight === "number"
					? anthropometrics.adjustedBodyWeight
					: undefined,
			armCircumference:
				typeof anthropometrics.armCircumference === "number"
					? anthropometrics.armCircumference
					: typeof anthropometrics.midArmCircumference === "number"
						? anthropometrics.midArmCircumference
						: undefined,
			tricepsSkinFold:
				typeof anthropometrics.tricepsSkinFold === "number"
					? anthropometrics.tricepsSkinFold
					: undefined,
			waistCircumference:
				typeof anthropometrics.waistCircumference === "number"
					? anthropometrics.waistCircumference
					: undefined,
			measuredAt:
				typeof anthropometrics.measuredAt === "string" ? anthropometrics.measuredAt : undefined,
		}
	}

	private mapDietaryHistory(
		dietaryHistory: Record<string, unknown> | undefined
	): NutritionAssessment["dietaryHistory"] {
		if (!dietaryHistory) {
			return null
		}

		return {
			usualIntake: typeof dietaryHistory.usualIntake === "string" ? dietaryHistory.usualIntake : undefined,
			foodAllergies: Array.isArray(dietaryHistory.foodAllergies)
				? dietaryHistory.foodAllergies.filter((item): item is string => typeof item === "string")
				: [],
			intolerances: Array.isArray(dietaryHistory.intolerances)
				? dietaryHistory.intolerances.filter((item): item is string => typeof item === "string")
				: [],
			dietaryRestrictions: Array.isArray(dietaryHistory.dietaryRestrictions)
				? dietaryHistory.dietaryRestrictions.filter((item): item is string => typeof item === "string")
				: [],
			fluidIntake: typeof dietaryHistory.fluidIntake === "string" ? dietaryHistory.fluidIntake : undefined,
			appetiteStatus:
				dietaryHistory.appetiteStatus === "good" ||
				dietaryHistory.appetiteStatus === "fair" ||
				dietaryHistory.appetiteStatus === "poor"
					? dietaryHistory.appetiteStatus
					: undefined,
			recentWeightChange:
				typeof dietaryHistory.recentWeightChange === "string"
					? dietaryHistory.recentWeightChange
					: typeof dietaryHistory.recentChanges === "string"
						? dietaryHistory.recentChanges
						: undefined,
			chewingDifficulty:
				typeof dietaryHistory.chewingDifficulty === "boolean"
					? dietaryHistory.chewingDifficulty
					: undefined,
			swallowingDifficulty:
				typeof dietaryHistory.swallowingDifficulty === "boolean"
					? dietaryHistory.swallowingDifficulty
					: undefined,
		}
	}

	private mapLabReview(labReview: Record<string, unknown> | undefined): NutritionAssessment["labReview"] {
		if (!labReview) {
			return null
		}

		return {
			albumin: typeof labReview.albumin === "number" ? labReview.albumin : undefined,
			prealbumin: typeof labReview.prealbumin === "number" ? labReview.prealbumin : undefined,
			totalProtein: typeof labReview.totalProtein === "number" ? labReview.totalProtein : undefined,
			hemoglobin: typeof labReview.hemoglobin === "number" ? labReview.hemoglobin : undefined,
			hematocrit: typeof labReview.hematocrit === "number" ? labReview.hematocrit : undefined,
			glucose: typeof labReview.glucose === "number" ? labReview.glucose : undefined,
			hba1c: typeof labReview.hba1c === "number" ? labReview.hba1c : undefined,
			sodium: typeof labReview.sodium === "number" ? labReview.sodium : undefined,
			potassium: typeof labReview.potassium === "number" ? labReview.potassium : undefined,
			creatinine: typeof labReview.creatinine === "number" ? labReview.creatinine : undefined,
			bun: typeof labReview.bun === "number" ? labReview.bun : undefined,
			reviewedAt:
				typeof labReview.reviewedAt === "string"
					? labReview.reviewedAt
					: typeof labReview.reviewDate === "string"
						? labReview.reviewDate
						: undefined,
		}
	}

	private mapMealPlan(mealPlan: Record<string, unknown> | null): NutritionAssessment["mealPlan"] {
		if (!mealPlan) {
			return null
		}

		const dietType =
			mealPlan.dietType === "regular" ||
			mealPlan.dietType === "diabetic" ||
			mealPlan.dietType === "renal" ||
			mealPlan.dietType === "cardiac" ||
			mealPlan.dietType === "low_sodium" ||
			mealPlan.dietType === "high_protein" ||
			mealPlan.dietType === "soft" ||
			mealPlan.dietType === "liquid" ||
			mealPlan.dietType === "npo" ||
			mealPlan.dietType === "enteral" ||
			mealPlan.dietType === "parenteral" ||
			mealPlan.dietType === "other"
				? mealPlan.dietType
				: mealPlan.feedingRoute === "enteral"
					? "enteral"
					: mealPlan.feedingRoute === "parenteral"
						? "parenteral"
						: mealPlan.texture === "liquid"
							? "liquid"
							: "regular"

		return {
			dietType,
			caloricTarget: typeof mealPlan.caloricTarget === "number" ? mealPlan.caloricTarget : undefined,
			proteinTarget: typeof mealPlan.proteinTarget === "number" ? mealPlan.proteinTarget : undefined,
			carbTarget: typeof mealPlan.carbTarget === "number" ? mealPlan.carbTarget : undefined,
			fatTarget: typeof mealPlan.fatTarget === "number" ? mealPlan.fatTarget : undefined,
			fluidTarget: typeof mealPlan.fluidTarget === "number" ? mealPlan.fluidTarget : undefined,
			specialInstructions:
				typeof mealPlan.specialInstructions === "string" ? mealPlan.specialInstructions : undefined,
			feedingRoute:
				mealPlan.feedingRoute === "oral" ||
				mealPlan.feedingRoute === "enteral" ||
				mealPlan.feedingRoute === "parenteral" ||
				mealPlan.feedingRoute === "mixed"
					? mealPlan.feedingRoute
					: undefined,
			enteralFormula:
				typeof mealPlan.enteralFormula === "string" ? mealPlan.enteralFormula : undefined,
			parenteralFormula:
				typeof mealPlan.parenteralFormula === "string" ? mealPlan.parenteralFormula : undefined,
			mealFrequency: typeof mealPlan.mealFrequency === "string" ? mealPlan.mealFrequency : undefined,
			supplements: Array.isArray(mealPlan.supplements)
				? mealPlan.supplements.map(item => {
					if (typeof item === "string") return item
					if (typeof item === "object" && item !== null && "name" in item) {
						return String(item.name)
					}
					return String(item)
				})
				: undefined,
			restrictions: Array.isArray(mealPlan.restrictions)
				? mealPlan.restrictions.filter((item): item is string => typeof item === "string")
				: undefined,
		}
	}

	private mapAssessment(row: {
		id: string
		facilityId: string
		encounterId: string | null
		patientId: string
		patientName: string | null
		patientMrn: string | null
		screeningTool: (typeof nutritionAssessments.$inferSelect)["screeningTool"]
		screeningScore: number | null
		malnutritionRisk: (typeof nutritionAssessments.$inferSelect)["malnutritionRisk"]
		fullAssessmentData: unknown
		mealPlan: unknown
		nextReassessmentDate: string | Date | null
		assessedByStaffId: string
		assessedByStaffName: string | null
		status: (typeof nutritionAssessments.$inferSelect)["status"]
		createdAt: Date
		updatedAt: Date
	}): NutritionAssessment {
		const fullAssessmentData = (row.fullAssessmentData as Record<string, unknown> | null) ?? null
		const anthropometrics = (fullAssessmentData?.anthropometrics as Record<string, unknown> | undefined) ?? null
		const dietaryHistory = (fullAssessmentData?.dietaryHistory as Record<string, unknown> | undefined) ?? null
		const labReview = (fullAssessmentData?.labReview as Record<string, unknown> | undefined) ?? null
		const clinicalEval = (fullAssessmentData?.clinicalEval as Record<string, unknown> | undefined) ?? null
		const mealPlan = (row.mealPlan as Record<string, unknown> | null) ?? null

		return {
			id: row.id,
			facilityId: row.facilityId,
			encounterId: row.encounterId ?? "",
			patientId: row.patientId,
			patientName: row.patientName,
			patientMrn: row.patientMrn,
			screeningTool: row.screeningTool === "mna" ? "must" : row.screeningTool,
			screeningScore: row.screeningScore ?? 0,
			malnutritionRisk: row.malnutritionRisk ?? "low",
			anthropometrics: this.mapAnthropometrics(anthropometrics ?? undefined),
			dietaryHistory: this.mapDietaryHistory(dietaryHistory ?? undefined),
			labReview: this.mapLabReview(labReview ?? undefined),
			clinicalEvaluation:
				typeof fullAssessmentData?.clinicalEvaluation === "string"
					? fullAssessmentData.clinicalEvaluation
					: typeof clinicalEval?.notes === "string"
						? clinicalEval.notes
						: null,
			mealPlan: this.mapMealPlan(mealPlan),
			nextReassessmentDate: row.nextReassessmentDate
				? new Date(row.nextReassessmentDate).toISOString().split("T")[0]!
				: null,
			assessedByStaffId: row.assessedByStaffId,
			assessedByStaffName: row.assessedByStaffName,
			status: this.normalizeStatusForOutput(row),
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		}
	}

	private async getRowById(id: string) {
		const [row] = await db
			.select({
				id: nutritionAssessments.id,
				facilityId: nutritionAssessments.facilityId,
				encounterId: nutritionAssessments.encounterId,
				patientId: nutritionAssessments.patientId,
				patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
				patientMrn: patients.mrn,
				screeningTool: nutritionAssessments.screeningTool,
				screeningScore: nutritionAssessments.screeningScore,
				malnutritionRisk: nutritionAssessments.malnutritionRisk,
				fullAssessmentData: nutritionAssessments.fullAssessmentData,
				mealPlan: nutritionAssessments.mealPlan,
				nextReassessmentDate: nutritionAssessments.nextReassessmentDate,
				assessedByStaffId: nutritionAssessments.assessedByStaffId,
				assessedByStaffName: users.name,
				status: nutritionAssessments.status,
				createdAt: nutritionAssessments.createdAt,
				updatedAt: nutritionAssessments.updatedAt,
			})
			.from(nutritionAssessments)
			.innerJoin(patients, eq(nutritionAssessments.patientId, patients.id))
			.leftJoin(staffProfiles, eq(nutritionAssessments.assessedByStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(eq(nutritionAssessments.id, id))

		if (!row) {
			throw new NotFoundException(`Nutrition assessment ${id} not found`)
		}

		return row
	}

	async list(input: ListNutritionInput): Promise<NutritionListResponse> {
		const page = Number(input.page) || 1
		const limit = Number(input.limit) || 25
		const offset = (page - 1) * limit

		const conditions = []
		if (input.facilityId) conditions.push(eq(nutritionAssessments.facilityId, input.facilityId))
		if (input.encounterId) conditions.push(eq(nutritionAssessments.encounterId, input.encounterId))
		if (input.patientId) conditions.push(eq(nutritionAssessments.patientId, input.patientId))
		if (input.malnutritionRisk) conditions.push(eq(nutritionAssessments.malnutritionRisk, input.malnutritionRisk))

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined

		const [rows, totalRows] = await Promise.all([
			db
				.select({
					id: nutritionAssessments.id,
					facilityId: nutritionAssessments.facilityId,
					encounterId: nutritionAssessments.encounterId,
					patientId: nutritionAssessments.patientId,
					patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
					patientMrn: patients.mrn,
					screeningTool: nutritionAssessments.screeningTool,
					screeningScore: nutritionAssessments.screeningScore,
					malnutritionRisk: nutritionAssessments.malnutritionRisk,
					fullAssessmentData: nutritionAssessments.fullAssessmentData,
					mealPlan: nutritionAssessments.mealPlan,
					nextReassessmentDate: nutritionAssessments.nextReassessmentDate,
					assessedByStaffId: nutritionAssessments.assessedByStaffId,
					assessedByStaffName: users.name,
					status: nutritionAssessments.status,
					createdAt: nutritionAssessments.createdAt,
					updatedAt: nutritionAssessments.updatedAt,
				})
				.from(nutritionAssessments)
				.innerJoin(patients, eq(nutritionAssessments.patientId, patients.id))
				.leftJoin(staffProfiles, eq(nutritionAssessments.assessedByStaffId, staffProfiles.id))
				.leftJoin(users, eq(staffProfiles.userId, users.id))
				.where(whereClause)
				.orderBy(desc(nutritionAssessments.createdAt))
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(nutritionAssessments).where(whereClause),
		])

		const mappedRows = rows.map(row => this.mapAssessment(row))
		const filteredRows = input.status
			? mappedRows.filter(row => row.status === input.status)
			: mappedRows

		const total = input.status ? filteredRows.length : totalRows[0]?.count ?? 0

		return {
			data: filteredRows,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	async get(id: string) {
		return this.mapAssessment(await this.getRowById(id))
	}

	async getByEncounter(encounterId: string) {
		const [row] = await db
			.select({ id: nutritionAssessments.id })
			.from(nutritionAssessments)
			.where(eq(nutritionAssessments.encounterId, encounterId))
			.orderBy(desc(nutritionAssessments.createdAt))
			.limit(1)

		if (!row) {
			return null
		}

		return this.get(row.id)
	}

	async create(input: CreateNutritionInput, userId: string) {
		const assessedByStaffId = await this.resolveStaffProfileId(userId)

		const [created] = await db
			.insert(nutritionAssessments)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				patientId: input.patientId,
				screeningTool: input.screeningTool,
				screeningScore: input.screeningScore,
				malnutritionRisk: input.malnutritionRisk,
				assessedByStaffId,
				status: "screening",
			})
			.returning({ id: nutritionAssessments.id })

		this.logger.log(`Created nutrition assessment ${created?.id}`)

		return this.get(created!.id)
	}

	async update(input: UpdateNutritionInput) {
		const existing = await this.getRowById(input.id)
		const existingAssessment = (existing.fullAssessmentData as Record<string, unknown> | null) ?? {}
		const nextWorkflowStatus = input.status ?? this.normalizeStatusForOutput(existing)

		await db
			.update(nutritionAssessments)
			.set({
				fullAssessmentData: {
					...existingAssessment,
					workflowStatus: nextWorkflowStatus,
					anthropometrics: input.anthropometrics ?? existingAssessment.anthropometrics,
					dietaryHistory: input.dietaryHistory ?? existingAssessment.dietaryHistory,
					labReview: input.labReview ?? existingAssessment.labReview,
					clinicalEvaluation: input.clinicalEvaluation ?? existingAssessment.clinicalEvaluation,
				} as typeof nutritionAssessments.$inferInsert.fullAssessmentData,
				status: this.normalizeStatusForStorage(input.status) ?? existing.status,
				nextReassessmentDate: input.nextReassessmentDate ?? existing.nextReassessmentDate,
				updatedAt: new Date(),
			})
			.where(eq(nutritionAssessments.id, input.id))

		this.logger.log(`Updated nutrition assessment ${input.id}`)

		return this.get(input.id)
	}

	async saveMealPlan(input: SaveMealPlanInput) {
		const existing = await this.getRowById(input.assessmentId)
		const existingAssessment = (existing.fullAssessmentData as Record<string, unknown> | null) ?? {}

		await db
			.update(nutritionAssessments)
			.set({
				mealPlan: {
					...input.mealPlan,
				} as typeof nutritionAssessments.$inferInsert.mealPlan,
				fullAssessmentData: {
					...existingAssessment,
					workflowStatus: "plan_created",
				} as typeof nutritionAssessments.$inferInsert.fullAssessmentData,
				status: "plan_created",
				updatedAt: new Date(),
			})
			.where(eq(nutritionAssessments.id, input.assessmentId))

		this.logger.log(`Saved meal plan for nutrition assessment ${input.assessmentId}`)

		return this.get(input.assessmentId)
	}

	// =========================================================================
	// Screening Tool Scoring
	// =========================================================================

	scoreScreening(input: ScreeningScoreInput): ScreeningScoreResult {
		if (input.tool === "nrs_2002") {
			const ageAdj = input.age >= 70 ? 1 : 0
			const score = input.nutritionalImpairmentScore + input.severityOfDiseaseScore + ageAdj

			let risk: ScreeningScoreResult["risk"]
			let interpretation: string
			let recommendation: string

			if (score < 3) {
				risk = "low"
				interpretation = `NRS-2002 score ${score} — Not at nutritional risk`
				recommendation = "Re-screen weekly. No nutritional intervention required at this time."
			} else if (score <= 4) {
				risk = "moderate"
				interpretation = `NRS-2002 score ${score} — At nutritional risk`
				recommendation = "Initiate nutritional care plan. Reassess after intervention."
			} else {
				risk = "high"
				interpretation = `NRS-2002 score ${score} — High nutritional risk`
				recommendation = "Immediate dietitian referral. Begin nutritional support without delay."
			}

			return { tool: "nrs_2002", score, risk, interpretation, recommendation }
		}

		if (input.tool === "must") {
			const score = input.bmiScore + input.weightLossScore + input.acuteDiseaseEffect

			let risk: ScreeningScoreResult["risk"]
			let interpretation: string
			let recommendation: string

			if (score === 0) {
				risk = "low"
				interpretation = `MUST score ${score} — Low malnutrition risk`
				recommendation = "Routine clinical care. Re-screen at intervals per ward policy."
			} else if (score === 1) {
				risk = "moderate"
				interpretation = `MUST score ${score} — Medium malnutrition risk`
				recommendation = "Observe dietary intake for 3 days. If no improvement, refer to dietitian."
			} else {
				risk = "high"
				interpretation = `MUST score ${score} — High malnutrition risk`
				recommendation = "Refer to dietitian. Set nutrition goals and monitor weekly."
			}

			return { tool: "must", score, risk, interpretation, recommendation }
		}

		// SGA: A = well-nourished (0), B = mild/moderate (1), C = severe (2)
		const scoreMap = { A: 0, B: 1, C: 2 } as const
		const riskMap: Record<"A" | "B" | "C", ScreeningScoreResult["risk"]> = {
			A: "low",
			B: "moderate",
			C: "high",
		}
		const interpretationMap = {
			A: "SGA-A — Well-nourished",
			B: "SGA-B — Mildly to moderately malnourished",
			C: "SGA-C — Severely malnourished",
		}
		const recommendationMap = {
			A: "Continue routine dietary care. Reassess if clinical condition changes.",
			B: "Dietitian follow-up. Review dietary intake and initiate targeted intervention.",
			C: "Urgent dietitian consult. Initiate aggressive nutritional support. Monitor closely.",
		}

		const score = scoreMap[input.rating]
		return {
			tool: "sga",
			score,
			risk: riskMap[input.rating],
			interpretation: interpretationMap[input.rating],
			recommendation: recommendationMap[input.rating],
		}
	}
}
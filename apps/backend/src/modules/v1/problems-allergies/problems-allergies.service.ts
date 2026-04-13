import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq } from "drizzle-orm"

import { allergies, problems, staffProfiles, users } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"

type ListProblemsInput = V1Inputs["problemsAllergies"]["listProblems"]
type CreateProblemInput = V1Inputs["problemsAllergies"]["createProblem"]
type UpdateProblemInput = V1Inputs["problemsAllergies"]["updateProblem"]
type ResolveProblemInput = V1Inputs["problemsAllergies"]["resolveProblem"]
type ListAllergiesInput = V1Inputs["problemsAllergies"]["listAllergies"]
type CreateAllergyInput = V1Inputs["problemsAllergies"]["createAllergy"]
type UpdateAllergyInput = V1Inputs["problemsAllergies"]["updateAllergy"]
type DeactivateAllergyInput = V1Inputs["problemsAllergies"]["deactivateAllergy"]
type ActiveAllergiesInput = V1Inputs["problemsAllergies"]["getActiveAllergies"]
type PatientSummaryInput = V1Inputs["problemsAllergies"]["getPatientSummary"]

@Injectable()
export class ProblemsAllergiesService {
	private readonly logger = new Logger(ProblemsAllergiesService.name)

	// ========================================================================
	// Problems
	// ========================================================================

	async listProblems(input: ListProblemsInput) {
		const page = Number(input.page ?? 1)
		const limit = Number(input.limit ?? 50)
		const offset = (page - 1) * limit

		const conditions = [eq(problems.patientId, input.patientId)]
		if (input.status) {
			conditions.push(eq(problems.status, input.status))
		}

		const whereClause = and(...conditions)

		const [totalResult] = await db
			.select({ count: count() })
			.from(problems)
			.where(whereClause)

		const rows = await db
			.select({
				id: problems.id,
				facilityId: problems.facilityId,
				patientId: problems.patientId,
				icd10Code: problems.icd10Code,
				icd10Display: problems.icd10Display,
				description: problems.description,
				onsetDate: problems.onsetDate,
				resolutionDate: problems.resolutionDate,
				status: problems.status,
				documentingStaffId: problems.documentingStaffId,
				documentingStaffName: users.name,
				createdAt: problems.createdAt,
				updatedAt: problems.updatedAt,
			})
			.from(problems)
			.leftJoin(staffProfiles, eq(problems.documentingStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(whereClause)
			.orderBy(desc(problems.createdAt))
			.limit(limit)
			.offset(offset)

		const total = totalResult?.count ?? 0

		return {
			data: rows,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	async getProblem(id: string) {
		const [row] = await db
			.select({
				id: problems.id,
				facilityId: problems.facilityId,
				patientId: problems.patientId,
				icd10Code: problems.icd10Code,
				icd10Display: problems.icd10Display,
				description: problems.description,
				onsetDate: problems.onsetDate,
				resolutionDate: problems.resolutionDate,
				status: problems.status,
				documentingStaffId: problems.documentingStaffId,
				documentingStaffName: users.name,
				createdAt: problems.createdAt,
				updatedAt: problems.updatedAt,
			})
			.from(problems)
			.leftJoin(staffProfiles, eq(problems.documentingStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(eq(problems.id, id))

		if (!row) throw new NotFoundException(`Problem ${id} not found`)
		return row
	}

	async createProblem(input: CreateProblemInput, staffProfileId: string) {
		const [created] = await db
			.insert(problems)
			.values({
				facilityId: input.facilityId,
				patientId: input.patientId,
				icd10Code: input.icd10Code ?? null,
				icd10Display: input.icd10Display ?? null,
				description: input.description,
				onsetDate: input.onsetDate ?? null,
				status: "active",
				documentingStaffId: staffProfileId,
			})
			.returning()

		this.logger.log(`Created problem ${created!.id} for patient ${input.patientId}`)

		return this.getProblem(created!.id)
	}

	async updateProblem(input: UpdateProblemInput) {
		const existing = await this.getProblem(input.id)

		const updateValues: Record<string, unknown> = { updatedAt: new Date() }
		if (input.description !== undefined) updateValues.description = input.description
		if (input.icd10Code !== undefined) updateValues.icd10Code = input.icd10Code
		if (input.icd10Display !== undefined) updateValues.icd10Display = input.icd10Display
		if (input.onsetDate !== undefined) updateValues.onsetDate = input.onsetDate

		await db.update(problems).set(updateValues).where(eq(problems.id, existing.id))

		return this.getProblem(input.id)
	}

	async resolveProblem(input: ResolveProblemInput) {
		const existing = await this.getProblem(input.id)

		if (existing.status === "resolved") {
			return existing
		}

		await db
			.update(problems)
			.set({
				status: "resolved",
				resolutionDate: input.resolutionDate ?? new Date().toISOString().split("T")[0]!,
				updatedAt: new Date(),
			})
			.where(eq(problems.id, input.id))

		this.logger.log(`Resolved problem ${input.id}`)

		return this.getProblem(input.id)
	}

	// ========================================================================
	// Allergies
	// ========================================================================

	async listAllergies(input: ListAllergiesInput) {
		const page = Number(input.page ?? 1)
		const limit = Number(input.limit ?? 50)
		const offset = (page - 1) * limit

		const conditions = [eq(allergies.patientId, input.patientId)]
		if (input.isActive !== undefined) {
			const isActive = input.isActive === true || input.isActive === "true"
			conditions.push(eq(allergies.isActive, isActive))
		}
		if (input.allergenType) {
			conditions.push(eq(allergies.allergenType, input.allergenType))
		}

		const whereClause = and(...conditions)

		const [totalResult] = await db
			.select({ count: count() })
			.from(allergies)
			.where(whereClause)

		const rows = await db
			.select({
				id: allergies.id,
				facilityId: allergies.facilityId,
				patientId: allergies.patientId,
				allergenName: allergies.allergenName,
				allergenType: allergies.allergenType,
				reactionType: allergies.reactionType,
				severity: allergies.severity,
				onsetDate: allergies.onsetDate,
				isActive: allergies.isActive,
				documentingStaffId: allergies.documentingStaffId,
				documentingStaffName: users.name,
				createdAt: allergies.createdAt,
				updatedAt: allergies.updatedAt,
			})
			.from(allergies)
			.leftJoin(staffProfiles, eq(allergies.documentingStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(whereClause)
			.orderBy(desc(allergies.createdAt))
			.limit(limit)
			.offset(offset)

		const total = totalResult?.count ?? 0

		return {
			data: rows,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	async getAllergy(id: string) {
		const [row] = await db
			.select({
				id: allergies.id,
				facilityId: allergies.facilityId,
				patientId: allergies.patientId,
				allergenName: allergies.allergenName,
				allergenType: allergies.allergenType,
				reactionType: allergies.reactionType,
				severity: allergies.severity,
				onsetDate: allergies.onsetDate,
				isActive: allergies.isActive,
				documentingStaffId: allergies.documentingStaffId,
				documentingStaffName: users.name,
				createdAt: allergies.createdAt,
				updatedAt: allergies.updatedAt,
			})
			.from(allergies)
			.leftJoin(staffProfiles, eq(allergies.documentingStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(eq(allergies.id, id))

		if (!row) throw new NotFoundException(`Allergy ${id} not found`)
		return row
	}

	async createAllergy(input: CreateAllergyInput, staffProfileId: string) {
		const [created] = await db
			.insert(allergies)
			.values({
				facilityId: input.facilityId,
				patientId: input.patientId,
				allergenName: input.allergenName,
				allergenType: input.allergenType,
				reactionType: input.reactionType ?? null,
				severity: input.severity,
				onsetDate: input.onsetDate ?? null,
				isActive: true,
				documentingStaffId: staffProfileId,
			})
			.returning()

		this.logger.log(
			`Created allergy ${created!.id} (${input.allergenName}) for patient ${input.patientId}`,
		)

		return this.getAllergy(created!.id)
	}

	async updateAllergy(input: UpdateAllergyInput) {
		const existing = await this.getAllergy(input.id)

		const updateValues: Record<string, unknown> = { updatedAt: new Date() }
		if (input.allergenName !== undefined) updateValues.allergenName = input.allergenName
		if (input.allergenType !== undefined) updateValues.allergenType = input.allergenType
		if (input.reactionType !== undefined) updateValues.reactionType = input.reactionType
		if (input.severity !== undefined) updateValues.severity = input.severity
		if (input.onsetDate !== undefined) updateValues.onsetDate = input.onsetDate

		await db.update(allergies).set(updateValues).where(eq(allergies.id, existing.id))

		return this.getAllergy(input.id)
	}

	async deactivateAllergy(id: string) {
		const existing = await this.getAllergy(id)

		if (!existing.isActive) {
			return existing
		}

		await db
			.update(allergies)
			.set({ isActive: false, updatedAt: new Date() })
			.where(eq(allergies.id, id))

		this.logger.log(`Deactivated allergy ${id}`)

		return this.getAllergy(id)
	}

	// ========================================================================
	// CDS / Cross-module
	// ========================================================================

	async getActiveAllergies(input: ActiveAllergiesInput) {
		const rows = await db
			.select({
				id: allergies.id,
				facilityId: allergies.facilityId,
				patientId: allergies.patientId,
				allergenName: allergies.allergenName,
				allergenType: allergies.allergenType,
				reactionType: allergies.reactionType,
				severity: allergies.severity,
				onsetDate: allergies.onsetDate,
				isActive: allergies.isActive,
				documentingStaffId: allergies.documentingStaffId,
				documentingStaffName: users.name,
				createdAt: allergies.createdAt,
				updatedAt: allergies.updatedAt,
			})
			.from(allergies)
			.leftJoin(staffProfiles, eq(allergies.documentingStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(
				and(
					eq(allergies.patientId, input.patientId),
					eq(allergies.isActive, true),
				),
			)
			.orderBy(desc(allergies.createdAt))

		const hasSevereAllergies = rows.some(a => a.severity === "severe")

		return { allergies: rows, hasSevereAllergies }
	}

	async getPatientSummary(input: PatientSummaryInput) {
		// Active problems
		const activeProblems = await db
			.select({
				id: problems.id,
				facilityId: problems.facilityId,
				patientId: problems.patientId,
				icd10Code: problems.icd10Code,
				icd10Display: problems.icd10Display,
				description: problems.description,
				onsetDate: problems.onsetDate,
				resolutionDate: problems.resolutionDate,
				status: problems.status,
				documentingStaffId: problems.documentingStaffId,
				documentingStaffName: users.name,
				createdAt: problems.createdAt,
				updatedAt: problems.updatedAt,
			})
			.from(problems)
			.leftJoin(staffProfiles, eq(problems.documentingStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(
				and(
					eq(problems.patientId, input.patientId),
					eq(problems.status, "active"),
				),
			)
			.orderBy(desc(problems.createdAt))

		// Resolved problem count
		const [resolvedResult] = await db
			.select({ count: count() })
			.from(problems)
			.where(
				and(
					eq(problems.patientId, input.patientId),
					eq(problems.status, "resolved"),
				),
			)

		// Active allergies
		const activeAllergies = await db
			.select({
				id: allergies.id,
				facilityId: allergies.facilityId,
				patientId: allergies.patientId,
				allergenName: allergies.allergenName,
				allergenType: allergies.allergenType,
				reactionType: allergies.reactionType,
				severity: allergies.severity,
				onsetDate: allergies.onsetDate,
				isActive: allergies.isActive,
				documentingStaffId: allergies.documentingStaffId,
				documentingStaffName: users.name,
				createdAt: allergies.createdAt,
				updatedAt: allergies.updatedAt,
			})
			.from(allergies)
			.leftJoin(staffProfiles, eq(allergies.documentingStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(
				and(
					eq(allergies.patientId, input.patientId),
					eq(allergies.isActive, true),
				),
			)
			.orderBy(desc(allergies.createdAt))

		const hasSevereAllergies = activeAllergies.some(a => a.severity === "severe")

		return {
			activeProblems,
			activeProblemCount: activeProblems.length,
			resolvedProblemCount: resolvedResult?.count ?? 0,
			activeAllergies,
			activeAllergyCount: activeAllergies.length,
			hasSevereAllergies,
		}
	}
}

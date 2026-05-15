import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq, ilike, or } from "drizzle-orm"

import {
	allergies,
	drugGenerics,
	icd10Codes,
	problems,
	snomedCtCodes,
	staffProfiles,
	users,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"
import { AuditService } from "@/modules/v1/audit/audit.service"
import { ChartAccessService, type ChartAccessActor } from "@/modules/v1/audit/chart-access.service"

type ListProblemsInput = V1Inputs["problemsAllergies"]["listProblems"]
type CreateProblemInput = V1Inputs["problemsAllergies"]["createProblem"]
type UpdateProblemInput = V1Inputs["problemsAllergies"]["updateProblem"]
type ResolveProblemInput = V1Inputs["problemsAllergies"]["resolveProblem"]
type SearchIcd10Input = V1Inputs["problemsAllergies"]["searchIcd10"]
type SearchSnomedCtInput = V1Inputs["problemsAllergies"]["searchSnomedCt"]
type SearchAllergensInput = V1Inputs["problemsAllergies"]["searchAllergens"]
type ListAllergiesInput = V1Inputs["problemsAllergies"]["listAllergies"]
type CreateAllergyInput = V1Inputs["problemsAllergies"]["createAllergy"]
type UpdateAllergyInput = V1Inputs["problemsAllergies"]["updateAllergy"]
type DeactivateAllergyInput = V1Inputs["problemsAllergies"]["deactivateAllergy"]
type VerifyAllergyInput = V1Inputs["problemsAllergies"]["verifyAllergy"]
type ActiveAllergiesInput = V1Inputs["problemsAllergies"]["getActiveAllergies"]
type PatientSummaryInput = V1Inputs["problemsAllergies"]["getPatientSummary"]

@Injectable()
export class ProblemsAllergiesService {
	private readonly logger = new Logger(ProblemsAllergiesService.name)

	constructor(
		private readonly auditService: AuditService,
		private readonly chartAccessService: ChartAccessService
	) {}

	private escapeLikePattern(input: string): string {
		return input.replace(/[\\%_]/g, "\\$&")
	}

	private normalizeOptionalText(value: string | null | undefined) {
		const trimmed = value?.trim()
		return trimmed ? trimmed : null
	}

	private todayDateString() {
		return new Date().toISOString().split("T")[0]!
	}

	private assertProblemHasClinicalCode(input: {
		icd10Code?: string | null
		snomedCode?: string | null
	}) {
		if (
			!this.normalizeOptionalText(input.icd10Code) &&
			!this.normalizeOptionalText(input.snomedCode)
		) {
			throw new BadRequestException("At least one of ICD-10 or SNOMED CT code is required.")
		}
	}

	private async writeAudit(input: {
		facilityId: string
		userId: string
		staffProfileId: string | null
		action: "create" | "update" | "delete"
		entityType: "problem" | "allergy"
		entityId: string
		beforeState: Record<string, unknown> | null
		afterState: Record<string, unknown> | null
		metadata?: Record<string, unknown>
	}) {
		await this.auditService.log({
			facilityId: input.facilityId,
			userId: input.userId,
			staffProfileId: input.staffProfileId,
			action: input.action,
			entityType: input.entityType,
			entityId: input.entityId,
			beforeState: input.beforeState,
			afterState: input.afterState,
			ipAddress: null,
			userAgent: null,
			metadata: input.metadata ?? null,
		})
	}

	private async getStaffProfileId(userId: string, facilityId: string): Promise<string> {
		const [profile] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(
				and(
					eq(staffProfiles.userId, userId),
					eq(staffProfiles.facilityId, facilityId),
					eq(staffProfiles.isActive, true)
				)
			)
			.limit(1)

		if (!profile) {
			throw new NotFoundException("Staff profile not found")
		}

		return profile.id
	}

	// ========================================================================
	// Problems
	// ========================================================================

	async listProblems(input: ListProblemsInput, actor?: ChartAccessActor) {
		await this.chartAccessService.ensurePatientChartReadAccess(actor, input.patientId, {
			entityType: "problem_list",
			entityId: input.patientId,
		})

		const page = Number(input.page ?? 1)
		const limit = Number(input.limit ?? 50)
		const offset = (page - 1) * limit

		const conditions = [eq(problems.patientId, input.patientId)]
		if (input.status) {
			conditions.push(eq(problems.status, input.status))
		}

		const whereClause = and(...conditions)

		const [totalResult] = await db.select({ count: count() }).from(problems).where(whereClause)

		const rows = await db
			.select({
				id: problems.id,
				facilityId: problems.facilityId,
				patientId: problems.patientId,
				icd10Code: problems.icd10Code,
				icd10Display: problems.icd10Display,
				snomedCode: problems.snomedCode,
				snomedDisplay: problems.snomedDisplay,
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

	async getProblem(id: string, actor?: ChartAccessActor) {
		const [row] = await db
			.select({
				id: problems.id,
				facilityId: problems.facilityId,
				patientId: problems.patientId,
				icd10Code: problems.icd10Code,
				icd10Display: problems.icd10Display,
				snomedCode: problems.snomedCode,
				snomedDisplay: problems.snomedDisplay,
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
		await this.chartAccessService.ensurePatientChartReadAccess(actor, row.patientId, {
			entityType: "problem",
			entityId: row.id,
		})
		return row
	}

	async createProblem(input: CreateProblemInput, userId: string) {
		const staffProfileId = await this.getStaffProfileId(userId, input.facilityId)
		this.assertProblemHasClinicalCode(input)

		const [created] = await db
			.insert(problems)
			.values({
				facilityId: input.facilityId,
				patientId: input.patientId,
				icd10Code: this.normalizeOptionalText(input.icd10Code),
				icd10Display: this.normalizeOptionalText(input.icd10Display),
				snomedCode: this.normalizeOptionalText(input.snomedCode),
				snomedDisplay: this.normalizeOptionalText(input.snomedDisplay),
				description: input.description,
				onsetDate: input.onsetDate ?? null,
				resolutionDate:
					input.status === "resolved" ? (input.resolutionDate ?? this.todayDateString()) : null,
				status: input.status ?? "active",
				documentingStaffId: staffProfileId,
			})
			.returning()

		this.logger.log(`Created problem ${created!.id} for patient ${input.patientId}`)

		const problem = await this.getProblem(created!.id)
		await this.writeAudit({
			facilityId: input.facilityId,
			userId,
			staffProfileId,
			action: "create",
			entityType: "problem",
			entityId: problem.id,
			beforeState: null,
			afterState: problem as unknown as Record<string, unknown>,
			metadata: { patientId: input.patientId },
		})

		return problem
	}

	async updateProblem(input: UpdateProblemInput, userId: string) {
		const existing = await this.getProblem(input.id)
		const staffProfileId = await this.getStaffProfileId(userId, existing.facilityId)

		const updateValues: Record<string, unknown> = { updatedAt: new Date() }
		const nextIcd10Code =
			input.icd10Code !== undefined
				? this.normalizeOptionalText(input.icd10Code)
				: existing.icd10Code
		const nextSnomedCode =
			input.snomedCode !== undefined
				? this.normalizeOptionalText(input.snomedCode)
				: existing.snomedCode
		this.assertProblemHasClinicalCode({ icd10Code: nextIcd10Code, snomedCode: nextSnomedCode })

		if (input.description !== undefined) updateValues.description = input.description
		if (input.icd10Code !== undefined) updateValues.icd10Code = nextIcd10Code
		if (input.icd10Display !== undefined)
			updateValues.icd10Display = this.normalizeOptionalText(input.icd10Display)
		if (input.snomedCode !== undefined) updateValues.snomedCode = nextSnomedCode
		if (input.snomedDisplay !== undefined)
			updateValues.snomedDisplay = this.normalizeOptionalText(input.snomedDisplay)
		if (input.onsetDate !== undefined) updateValues.onsetDate = input.onsetDate || null
		if (input.status !== undefined) {
			updateValues.status = input.status
			updateValues.resolutionDate =
				input.status === "resolved"
					? (input.resolutionDate ?? existing.resolutionDate ?? this.todayDateString())
					: null
		} else if (input.resolutionDate !== undefined) {
			updateValues.resolutionDate = input.resolutionDate || null
		}

		await db.update(problems).set(updateValues).where(eq(problems.id, existing.id))

		const updated = await this.getProblem(input.id)
		await this.writeAudit({
			facilityId: updated.facilityId,
			userId,
			staffProfileId,
			action: "update",
			entityType: "problem",
			entityId: updated.id,
			beforeState: existing as unknown as Record<string, unknown>,
			afterState: updated as unknown as Record<string, unknown>,
			metadata: { patientId: updated.patientId },
		})

		return updated
	}

	async resolveProblem(input: ResolveProblemInput, userId: string) {
		const existing = await this.getProblem(input.id)

		if (existing.status === "resolved") {
			return existing
		}
		const staffProfileId = await this.getStaffProfileId(userId, existing.facilityId)

		await db
			.update(problems)
			.set({
				status: "resolved",
				resolutionDate: input.resolutionDate ?? new Date().toISOString().split("T")[0]!,
				updatedAt: new Date(),
			})
			.where(eq(problems.id, input.id))

		this.logger.log(`Resolved problem ${input.id}`)

		const updated = await this.getProblem(input.id)
		await this.writeAudit({
			facilityId: updated.facilityId,
			userId,
			staffProfileId,
			action: "update",
			entityType: "problem",
			entityId: updated.id,
			beforeState: existing as unknown as Record<string, unknown>,
			afterState: updated as unknown as Record<string, unknown>,
			metadata: { patientId: updated.patientId, status: "resolved" },
		})

		return updated
	}

	async deleteProblem(id: string, userId: string) {
		const existing = await this.getProblem(id)
		const staffProfileId = await this.getStaffProfileId(userId, existing.facilityId)

		await db.delete(problems).where(eq(problems.id, id))
		this.logger.log(`Deleted problem ${id}`)

		await this.writeAudit({
			facilityId: existing.facilityId,
			userId,
			staffProfileId,
			action: "delete",
			entityType: "problem",
			entityId: existing.id,
			beforeState: existing as unknown as Record<string, unknown>,
			afterState: null,
			metadata: { patientId: existing.patientId },
		})

		return existing
	}

	// ========================================================================
	// Terminology / Search
	// ========================================================================

	async searchIcd10(input: SearchIcd10Input) {
		const page = Number(input.page ?? 1)
		const limit = Number(input.limit ?? 50)
		const offset = (page - 1) * limit
		const conditions = [eq(icd10Codes.isActive, true)]

		if (input.search?.trim()) {
			const escaped = this.escapeLikePattern(input.search.trim())
			conditions.push(
				or(ilike(icd10Codes.code, `%${escaped}%`), ilike(icd10Codes.description, `%${escaped}%`))!
			)
		}

		const whereClause = and(...conditions)
		const [data, totalResult] = await Promise.all([
			db
				.select()
				.from(icd10Codes)
				.where(whereClause)
				.orderBy(icd10Codes.code)
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(icd10Codes).where(whereClause),
		])
		const total = totalResult[0]?.count ?? 0

		return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
	}

	async searchSnomedCt(input: SearchSnomedCtInput) {
		const page = Number(input.page ?? 1)
		const limit = Number(input.limit ?? 50)
		const offset = (page - 1) * limit
		const conditions = [eq(snomedCtCodes.isActive, true)]

		if (input.search?.trim()) {
			const escaped = this.escapeLikePattern(input.search.trim())
			conditions.push(
				or(
					ilike(snomedCtCodes.conceptId, `%${escaped}%`),
					ilike(snomedCtCodes.preferredTerm, `%${escaped}%`),
					ilike(snomedCtCodes.fsn, `%${escaped}%`)
				)!
			)
		}
		if (input.semanticTag?.trim()) {
			conditions.push(eq(snomedCtCodes.semanticTag, input.semanticTag.trim()))
		}

		const whereClause = and(...conditions)
		const [data, totalResult] = await Promise.all([
			db
				.select()
				.from(snomedCtCodes)
				.where(whereClause)
				.orderBy(snomedCtCodes.preferredTerm)
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(snomedCtCodes).where(whereClause),
		])
		const total = totalResult[0]?.count ?? 0

		return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
	}

	async searchAllergens(input: SearchAllergensInput) {
		const page = Number(input.page ?? 1)
		const limit = Number(input.limit ?? 50)
		const search = input.search?.trim()

		if (!search || search.length < 2) {
			return { data: [], total: 0, page, limit, totalPages: 0 }
		}

		const escaped = this.escapeLikePattern(search)
		const suggestions = new Map<
			string,
			{
				allergenName: string
				allergenType: "medication" | "food" | "environmental"
				source: "allergy_history" | "drug_generic"
			}
		>()

		if (!input.allergenType || input.allergenType === "medication") {
			const genericRows = await db
				.select({ genericName: drugGenerics.genericName })
				.from(drugGenerics)
				.where(
					and(eq(drugGenerics.isActive, true), ilike(drugGenerics.genericName, `%${escaped}%`))
				)
				.orderBy(drugGenerics.genericName)
				.limit(limit)

			for (const row of genericRows) {
				const key = `medication:${row.genericName.toLowerCase()}`
				suggestions.set(key, {
					allergenName: row.genericName,
					allergenType: "medication",
					source: "drug_generic",
				})
			}
		}

		const allergyConditions = [ilike(allergies.allergenName, `%${escaped}%`)]
		if (input.facilityId) {
			allergyConditions.push(eq(allergies.facilityId, input.facilityId))
		}
		if (input.allergenType) {
			allergyConditions.push(eq(allergies.allergenType, input.allergenType))
		}

		const allergyRows = await db
			.select({
				allergenName: allergies.allergenName,
				allergenType: allergies.allergenType,
			})
			.from(allergies)
			.where(and(...allergyConditions))
			.orderBy(allergies.allergenName)
			.limit(limit)

		for (const row of allergyRows) {
			const key = `${row.allergenType}:${row.allergenName.toLowerCase()}`
			if (!suggestions.has(key)) {
				suggestions.set(key, {
					allergenName: row.allergenName,
					allergenType: row.allergenType,
					source: "allergy_history",
				})
			}
		}

		const offset = (page - 1) * limit
		const data = Array.from(suggestions.values()).slice(offset, offset + limit)
		const total = suggestions.size

		return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
	}

	// ========================================================================
	// Allergies
	// ========================================================================

	async listAllergies(input: ListAllergiesInput, actor?: ChartAccessActor) {
		await this.chartAccessService.ensurePatientChartReadAccess(actor, input.patientId, {
			entityType: "allergy_list",
			entityId: input.patientId,
		})

		const page = Number(input.page ?? 1)
		const limit = Number(input.limit ?? 50)
		const offset = (page - 1) * limit

		const conditions = [eq(allergies.patientId, input.patientId)]
		if (input.isActive !== undefined) {
			const isActive = input.isActive === true || input.isActive === "true"
			conditions.push(eq(allergies.isActive, isActive))
		}
		if (input.isVerified !== undefined) {
			const isVerified = input.isVerified === true || input.isVerified === "true"
			conditions.push(eq(allergies.isVerified, isVerified))
		}
		if (input.allergenType) {
			conditions.push(eq(allergies.allergenType, input.allergenType))
		}

		const whereClause = and(...conditions)

		const [totalResult] = await db.select({ count: count() }).from(allergies).where(whereClause)

		const documentingStaffSq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("documenting_staff")
		const verifyingStaffSq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("verifying_staff")

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
				isVerified: allergies.isVerified,
				verifiedAt: allergies.verifiedAt,
				verifiedByStaffId: allergies.verifiedByStaffId,
				verifiedByStaffName: verifyingStaffSq.name,
				documentingStaffId: allergies.documentingStaffId,
				documentingStaffName: documentingStaffSq.name,
				createdAt: allergies.createdAt,
				updatedAt: allergies.updatedAt,
			})
			.from(allergies)
			.leftJoin(documentingStaffSq, eq(allergies.documentingStaffId, documentingStaffSq.id))
			.leftJoin(verifyingStaffSq, eq(allergies.verifiedByStaffId, verifyingStaffSq.id))
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

	async getAllergy(id: string, actor?: ChartAccessActor) {
		const documentingStaffSq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("documenting_staff")
		const verifyingStaffSq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("verifying_staff")

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
				isVerified: allergies.isVerified,
				verifiedAt: allergies.verifiedAt,
				verifiedByStaffId: allergies.verifiedByStaffId,
				verifiedByStaffName: verifyingStaffSq.name,
				documentingStaffId: allergies.documentingStaffId,
				documentingStaffName: documentingStaffSq.name,
				createdAt: allergies.createdAt,
				updatedAt: allergies.updatedAt,
			})
			.from(allergies)
			.leftJoin(documentingStaffSq, eq(allergies.documentingStaffId, documentingStaffSq.id))
			.leftJoin(verifyingStaffSq, eq(allergies.verifiedByStaffId, verifyingStaffSq.id))
			.where(eq(allergies.id, id))

		if (!row) throw new NotFoundException(`Allergy ${id} not found`)
		await this.chartAccessService.ensurePatientChartReadAccess(actor, row.patientId, {
			entityType: "allergy",
			entityId: row.id,
		})
		return row
	}

	async createAllergy(input: CreateAllergyInput, userId: string) {
		const staffProfileId = await this.getStaffProfileId(userId, input.facilityId)

		const [created] = await db
			.insert(allergies)
			.values({
				facilityId: input.facilityId,
				patientId: input.patientId,
				allergenName: input.allergenName.trim(),
				allergenType: input.allergenType,
				reactionType: this.normalizeOptionalText(input.reactionType),
				severity: input.severity,
				onsetDate: input.onsetDate ?? null,
				isActive: true,
				// Flow D5: new allergies enter the chart unverified. A physician must
				// explicitly verify before this row drives a CDS hard-block.
				isVerified: false,
				verifiedAt: null,
				verifiedByStaffId: null,
				documentingStaffId: staffProfileId,
			})
			.returning()

		this.logger.log(
			`Created allergy ${created!.id} (${input.allergenName}) for patient ${input.patientId}`
		)

		const allergy = await this.getAllergy(created!.id)
		await this.writeAudit({
			facilityId: input.facilityId,
			userId,
			staffProfileId,
			action: "create",
			entityType: "allergy",
			entityId: allergy.id,
			beforeState: null,
			afterState: allergy as unknown as Record<string, unknown>,
			metadata: { patientId: input.patientId },
		})

		return allergy
	}

	async updateAllergy(input: UpdateAllergyInput, userId: string) {
		const existing = await this.getAllergy(input.id)
		const staffProfileId = await this.getStaffProfileId(userId, existing.facilityId)

		const updateValues: Record<string, unknown> = { updatedAt: new Date() }
		const materiallyChanged =
			(input.allergenName !== undefined &&
				input.allergenName.trim() !== existing.allergenName) ||
			(input.allergenType !== undefined && input.allergenType !== existing.allergenType) ||
			(input.reactionType !== undefined &&
				this.normalizeOptionalText(input.reactionType) !== existing.reactionType) ||
			(input.severity !== undefined && input.severity !== existing.severity) ||
			(input.onsetDate !== undefined && (input.onsetDate || null) !== existing.onsetDate)

		if (input.allergenName !== undefined) updateValues.allergenName = input.allergenName.trim()
		if (input.allergenType !== undefined) updateValues.allergenType = input.allergenType
		if (input.reactionType !== undefined)
			updateValues.reactionType = this.normalizeOptionalText(input.reactionType)
		if (input.severity !== undefined) updateValues.severity = input.severity
		if (input.onsetDate !== undefined) updateValues.onsetDate = input.onsetDate || null
		if (materiallyChanged && existing.isVerified) {
			updateValues.isVerified = false
			updateValues.verifiedAt = null
			updateValues.verifiedByStaffId = null
		}

		await db.update(allergies).set(updateValues).where(eq(allergies.id, existing.id))

		const updated = await this.getAllergy(input.id)
		await this.writeAudit({
			facilityId: updated.facilityId,
			userId,
			staffProfileId,
			action: "update",
			entityType: "allergy",
			entityId: updated.id,
			beforeState: existing as unknown as Record<string, unknown>,
			afterState: updated as unknown as Record<string, unknown>,
			metadata: {
				patientId: updated.patientId,
				verificationReset: materiallyChanged && existing.isVerified,
			},
		})

		return updated
	}

	async verifyAllergy(input: VerifyAllergyInput, userId: string) {
		const existing = await this.getAllergy(input.id)
		const staffProfileId = await this.getStaffProfileId(userId, existing.facilityId)

		if (existing.isVerified) {
			return existing
		}

		const verifiedAt = new Date()
		await db
			.update(allergies)
			.set({
				isVerified: true,
				verifiedAt,
				verifiedByStaffId: staffProfileId,
				updatedAt: verifiedAt,
			})
			.where(eq(allergies.id, input.id))

		this.logger.log(`Verified allergy ${input.id} by staff ${staffProfileId}`)

		const updated = await this.getAllergy(input.id)
		await this.writeAudit({
			facilityId: updated.facilityId,
			userId,
			staffProfileId,
			action: "update",
			entityType: "allergy",
			entityId: updated.id,
			beforeState: existing as unknown as Record<string, unknown>,
			afterState: updated as unknown as Record<string, unknown>,
			metadata: { patientId: updated.patientId, verification: "verified" },
		})

		return updated
	}

	async deactivateAllergy(id: string, userId: string) {
		const existing = await this.getAllergy(id)

		if (!existing.isActive) {
			return existing
		}
		const staffProfileId = await this.getStaffProfileId(userId, existing.facilityId)

		await db
			.update(allergies)
			.set({ isActive: false, updatedAt: new Date() })
			.where(eq(allergies.id, id))

		this.logger.log(`Deactivated allergy ${id}`)

		const updated = await this.getAllergy(id)
		await this.writeAudit({
			facilityId: updated.facilityId,
			userId,
			staffProfileId,
			action: "update",
			entityType: "allergy",
			entityId: updated.id,
			beforeState: existing as unknown as Record<string, unknown>,
			afterState: updated as unknown as Record<string, unknown>,
			metadata: { patientId: updated.patientId, isActive: false },
		})

		return updated
	}

	// ========================================================================
	// CDS / Cross-module
	// ========================================================================

	async getActiveAllergies(input: ActiveAllergiesInput, actor?: ChartAccessActor) {
		await this.chartAccessService.ensurePatientChartReadAccess(actor, input.patientId, {
			entityType: "active_allergies",
			entityId: input.patientId,
		})

		const documentingStaffSq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("documenting_staff")
		const verifyingStaffSq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("verifying_staff")

		// Flow D5: CDS / CPOE blocking only considers active AND physician-verified
		// allergies. Unverified allergies remain in the chart (via listAllergies /
		// getPatientSummary) but must not silently block medication ordering.
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
				isVerified: allergies.isVerified,
				verifiedAt: allergies.verifiedAt,
				verifiedByStaffId: allergies.verifiedByStaffId,
				verifiedByStaffName: verifyingStaffSq.name,
				documentingStaffId: allergies.documentingStaffId,
				documentingStaffName: documentingStaffSq.name,
				createdAt: allergies.createdAt,
				updatedAt: allergies.updatedAt,
			})
			.from(allergies)
			.leftJoin(documentingStaffSq, eq(allergies.documentingStaffId, documentingStaffSq.id))
			.leftJoin(verifyingStaffSq, eq(allergies.verifiedByStaffId, verifyingStaffSq.id))
			.where(
				and(
					eq(allergies.patientId, input.patientId),
					eq(allergies.isActive, true),
					eq(allergies.isVerified, true)
				)
			)
			.orderBy(desc(allergies.createdAt))

		const hasSevereAllergies = rows.some(a => a.severity === "severe")

		return { allergies: rows, hasSevereAllergies }
	}

	async getPatientSummary(input: PatientSummaryInput, actor?: ChartAccessActor) {
		await this.chartAccessService.ensurePatientChartReadAccess(actor, input.patientId, {
			entityType: "patient_summary",
			entityId: input.patientId,
		})

		// Active problems
		const activeProblems = await db
			.select({
				id: problems.id,
				facilityId: problems.facilityId,
				patientId: problems.patientId,
				icd10Code: problems.icd10Code,
				icd10Display: problems.icd10Display,
				snomedCode: problems.snomedCode,
				snomedDisplay: problems.snomedDisplay,
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
			.where(and(eq(problems.patientId, input.patientId), eq(problems.status, "active")))
			.orderBy(desc(problems.createdAt))

		// Resolved problem count
		const [resolvedResult] = await db
			.select({ count: count() })
			.from(problems)
			.where(and(eq(problems.patientId, input.patientId), eq(problems.status, "resolved")))

		const allergyDocumentingStaffSq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("allergy_documenting_staff")
		const allergyVerifyingStaffSq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("allergy_verifying_staff")

		// Patient summary surfaces ALL active allergies (verified + unverified) so
		// the chart can render the full list and an "awaiting verification" badge.
		// hasSevereAllergies, however, only fires on verified severe allergies —
		// that flag drives clinical decision banners and must not be triggered by
		// unverified data per Flow D5.
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
				isVerified: allergies.isVerified,
				verifiedAt: allergies.verifiedAt,
				verifiedByStaffId: allergies.verifiedByStaffId,
				verifiedByStaffName: allergyVerifyingStaffSq.name,
				documentingStaffId: allergies.documentingStaffId,
				documentingStaffName: allergyDocumentingStaffSq.name,
				createdAt: allergies.createdAt,
				updatedAt: allergies.updatedAt,
			})
			.from(allergies)
			.leftJoin(
				allergyDocumentingStaffSq,
				eq(allergies.documentingStaffId, allergyDocumentingStaffSq.id)
			)
			.leftJoin(
				allergyVerifyingStaffSq,
				eq(allergies.verifiedByStaffId, allergyVerifyingStaffSq.id)
			)
			.where(and(eq(allergies.patientId, input.patientId), eq(allergies.isActive, true)))
			.orderBy(desc(allergies.createdAt))

		const hasSevereAllergies = activeAllergies.some(a => a.severity === "severe" && a.isVerified)
		const unverifiedAllergyCount = activeAllergies.filter(a => !a.isVerified).length

		return {
			activeProblems,
			activeProblemCount: activeProblems.length,
			resolvedProblemCount: resolvedResult?.count ?? 0,
			activeAllergies,
			activeAllergyCount: activeAllergies.length,
			unverifiedAllergyCount,
			hasSevereAllergies,
		}
	}
}

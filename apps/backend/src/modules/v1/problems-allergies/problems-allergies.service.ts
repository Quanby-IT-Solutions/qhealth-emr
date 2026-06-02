import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm"

import {
	allergies,
	drugGenerics,
	icd10Codes,
	patients,
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

	private async assertSubmittedProblemCodesAreActive(input: {
		icd10Code?: string | null
		snomedCode?: string | null
	}) {
		const icd10Code = this.normalizeOptionalText(input.icd10Code)
		const snomedCode = this.normalizeOptionalText(input.snomedCode)

		if (icd10Code) {
			const [match] = await db
				.select({ code: icd10Codes.code })
				.from(icd10Codes)
				.where(and(eq(icd10Codes.code, icd10Code), eq(icd10Codes.isActive, true)))
				.limit(1)
			if (!match) {
				throw new BadRequestException("Select a valid active ICD-10 code from the suggestions.")
			}
		}

		if (snomedCode) {
			const [match] = await db
				.select({ conceptId: snomedCtCodes.conceptId })
				.from(snomedCtCodes)
				.where(and(eq(snomedCtCodes.conceptId, snomedCode), eq(snomedCtCodes.isActive, true)))
				.limit(1)
			if (!match) {
				throw new BadRequestException("Select a valid active SNOMED CT code from the suggestions.")
			}
		}
	}

	private async assertNoDuplicateActiveProblem(input: {
		patientId: string
		icd10Code?: string | null
		snomedCode?: string | null
		status?: "active" | "resolved" | "entered_in_error" | null
		excludeProblemId?: string
	}) {
		if ((input.status ?? "active") !== "active") return

		const icd10Code = this.normalizeOptionalText(input.icd10Code)
		const snomedCode = this.normalizeOptionalText(input.snomedCode)
		const codeConditions: SQL[] = []
		if (icd10Code) codeConditions.push(eq(problems.icd10Code, icd10Code))
		if (snomedCode) codeConditions.push(eq(problems.snomedCode, snomedCode))

		if (codeConditions.length === 0) return

		const conditions = [
			eq(problems.patientId, input.patientId),
			eq(problems.status, "active"),
			or(...codeConditions)!,
		]

		if (input.excludeProblemId) {
			conditions.push(ne(problems.id, input.excludeProblemId))
		}

		const [duplicate] = await db
			.select({ id: problems.id })
			.from(problems)
			.where(and(...conditions))
			.limit(1)

		if (duplicate) {
			throw new BadRequestException(
				"This problem is already active for this patient. Edit the existing problem or mark the duplicate as Entered in Error."
			)
		}
	}

	private async assertNoDuplicateActiveAllergy(input: {
		patientId: string
		allergenName: string
		allergenType: "medication" | "food" | "environmental"
		excludeAllergyId?: string
	}) {
		const conditions = [
			eq(allergies.patientId, input.patientId),
			eq(allergies.isActive, true),
			eq(allergies.allergenType, input.allergenType),
			sql`lower(${allergies.allergenName}) = ${input.allergenName.trim().toLowerCase()}`,
		]

		if (input.excludeAllergyId) {
			conditions.push(ne(allergies.id, input.excludeAllergyId))
		}

		const [duplicate] = await db
			.select({ id: allergies.id })
			.from(allergies)
			.where(and(...conditions))
			.limit(1)

		if (duplicate) {
			throw new BadRequestException(
				"This allergy is already active for this patient. Edit the existing allergy or deactivate the duplicate."
			)
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

	private async assertPatientBelongsToFacility(patientId: string, facilityId: string) {
		const [patient] = await db
			.select({ id: patients.id, facilityId: patients.facilityId })
			.from(patients)
			.where(eq(patients.id, patientId))
			.limit(1)

		if (!patient) {
			throw new NotFoundException("Patient not found")
		}

		if (patient.facilityId !== facilityId) {
			throw new BadRequestException("Patient does not belong to the selected facility.")
		}
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

		const [totalResult] = await db
			.select({ count: count() })
			.from(problems)
			.innerJoin(
				patients,
				and(eq(problems.patientId, patients.id), eq(problems.facilityId, patients.facilityId))
			)
			.where(whereClause)

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
			.innerJoin(
				patients,
				and(eq(problems.patientId, patients.id), eq(problems.facilityId, patients.facilityId))
			)
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
			.innerJoin(
				patients,
				and(eq(problems.patientId, patients.id), eq(problems.facilityId, patients.facilityId))
			)
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

	async createProblem(input: CreateProblemInput, userId: string, actor?: ChartAccessActor) {
		const staffProfileId = await this.getStaffProfileId(userId, input.facilityId)
		await this.assertPatientBelongsToFacility(input.patientId, input.facilityId)
		await this.chartAccessService.ensurePatientChartReadAccess(actor, input.patientId, {
			entityType: "problem",
			entityId: input.patientId,
		})
		this.assertProblemHasClinicalCode(input)
		await this.assertSubmittedProblemCodesAreActive(input)
		await this.assertNoDuplicateActiveProblem({
			patientId: input.patientId,
			icd10Code: input.icd10Code,
			snomedCode: input.snomedCode,
			status: input.status ?? "active",
		})

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

		const problem = await this.getProblem(created!.id, actor)
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

	async updateProblem(input: UpdateProblemInput, userId: string, actor?: ChartAccessActor) {
		const existing = await this.getProblem(input.id, actor)
		if (existing.status === "entered_in_error") {
			throw new BadRequestException(
				"Entered-in-error problems are audit records and cannot be edited."
			)
		}
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
		await this.assertSubmittedProblemCodesAreActive({
			icd10Code: input.icd10Code,
			snomedCode: input.snomedCode,
		})
		await this.assertNoDuplicateActiveProblem({
			patientId: existing.patientId,
			icd10Code: nextIcd10Code,
			snomedCode: nextSnomedCode,
			status: input.status ?? existing.status,
			excludeProblemId: existing.id,
		})

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

		const updated = await this.getProblem(input.id, actor)
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

	async resolveProblem(input: ResolveProblemInput, userId: string, actor?: ChartAccessActor) {
		const existing = await this.getProblem(input.id, actor)

		if (existing.status === "entered_in_error") {
			throw new BadRequestException(
				"Entered-in-error problems are audit records and cannot be resolved."
			)
		}

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

		const updated = await this.getProblem(input.id, actor)
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

	async deleteProblem(id: string, userId: string, actor?: ChartAccessActor) {
		const existing = await this.getProblem(id, actor)

		if (existing.status === "entered_in_error") {
			return existing
		}

		const staffProfileId = await this.getStaffProfileId(userId, existing.facilityId)

		await db
			.update(problems)
			.set({
				status: "entered_in_error",
				resolutionDate: existing.resolutionDate ?? this.todayDateString(),
				updatedAt: new Date(),
			})
			.where(eq(problems.id, id))
		this.logger.log(`Marked problem ${id} as entered in error`)

		const updated = await this.getProblem(id, actor)

		await this.writeAudit({
			facilityId: existing.facilityId,
			userId,
			staffProfileId,
			action: "update",
			entityType: "problem",
			entityId: existing.id,
			beforeState: existing as unknown as Record<string, unknown>,
			afterState: updated as unknown as Record<string, unknown>,
			metadata: {
				patientId: existing.patientId,
				previousStatus: existing.status,
				status: "entered_in_error",
			},
		})

		return updated
	}

	// ========================================================================
	// Terminology / Search
	// ========================================================================

	async searchIcd10(input: SearchIcd10Input) {
		const page = Number(input.page ?? 1)
		const limit = Number(input.limit ?? 50)
		const offset = (page - 1) * limit
		const conditions = [eq(icd10Codes.isActive, true)]
		const search = input.search?.trim() ?? ""
		const escapedSearch = this.escapeLikePattern(search)
		const terms = search
			.split(/\s+/)
			.map(term => term.trim())
			.filter(Boolean)
			.slice(0, 6)

		if (terms.length > 0) {
			for (const term of terms) {
				const escaped = this.escapeLikePattern(term)
				conditions.push(
					or(
						ilike(icd10Codes.code, `%${escaped}%`),
						ilike(icd10Codes.description, `%${escaped}%`),
						ilike(icd10Codes.category, `%${escaped}%`)
					)!
				)
			}
		}

		const whereClause = and(...conditions)
		const relevanceOrder = search
			? sql`CASE
					WHEN lower(${icd10Codes.code}) = lower(${search}) THEN 0
					WHEN lower(${icd10Codes.code}) LIKE lower(${`${escapedSearch}%`}) THEN 1
					WHEN lower(${icd10Codes.description}) LIKE lower(${`${escapedSearch}%`}) THEN 2
					WHEN lower(${icd10Codes.category}) LIKE lower(${`${escapedSearch}%`}) THEN 3
					ELSE 4
				END`
			: icd10Codes.code
		const [data, totalResult] = await Promise.all([
			db
				.select()
				.from(icd10Codes)
				.where(whereClause)
				.orderBy(relevanceOrder, icd10Codes.code)
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

		const allergyConditions = [
			ilike(allergies.allergenName, `%${escaped}%`),
			eq(allergies.facilityId, input.facilityId),
		]
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

		const [totalResult] = await db
			.select({ count: count() })
			.from(allergies)
			.innerJoin(
				patients,
				and(eq(allergies.patientId, patients.id), eq(allergies.facilityId, patients.facilityId))
			)
			.where(whereClause)

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
			.innerJoin(
				patients,
				and(eq(allergies.patientId, patients.id), eq(allergies.facilityId, patients.facilityId))
			)
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
			.innerJoin(
				patients,
				and(eq(allergies.patientId, patients.id), eq(allergies.facilityId, patients.facilityId))
			)
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

	async createAllergy(input: CreateAllergyInput, userId: string, actor?: ChartAccessActor) {
		const staffProfileId = await this.getStaffProfileId(userId, input.facilityId)
		await this.assertPatientBelongsToFacility(input.patientId, input.facilityId)
		await this.chartAccessService.ensurePatientChartReadAccess(actor, input.patientId, {
			entityType: "allergy",
			entityId: input.patientId,
		})
		await this.assertNoDuplicateActiveAllergy({
			patientId: input.patientId,
			allergenName: input.allergenName,
			allergenType: input.allergenType,
		})

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

		const allergy = await this.getAllergy(created!.id, actor)
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

	async updateAllergy(input: UpdateAllergyInput, userId: string, actor?: ChartAccessActor) {
		const existing = await this.getAllergy(input.id, actor)
		const staffProfileId = await this.getStaffProfileId(userId, existing.facilityId)
		await this.assertNoDuplicateActiveAllergy({
			patientId: existing.patientId,
			allergenName: input.allergenName ?? existing.allergenName,
			allergenType: input.allergenType ?? existing.allergenType,
			excludeAllergyId: existing.id,
		})

		const updateValues: Record<string, unknown> = { updatedAt: new Date() }
		const materiallyChanged =
			(input.allergenName !== undefined && input.allergenName.trim() !== existing.allergenName) ||
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

		const updated = await this.getAllergy(input.id, actor)
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

	async verifyAllergy(input: VerifyAllergyInput, userId: string, actor?: ChartAccessActor) {
		const existing = await this.getAllergy(input.id, actor)

		if (!existing.isActive) {
			throw new BadRequestException("Cannot verify an inactive allergy.")
		}

		if (existing.isVerified) {
			return existing
		}

		const staffProfileId = await this.getStaffProfileId(userId, existing.facilityId)

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

		const updated = await this.getAllergy(input.id, actor)
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

	async deactivateAllergy(id: string, userId: string, actor?: ChartAccessActor) {
		const existing = await this.getAllergy(id, actor)

		if (!existing.isActive) {
			return existing
		}
		const staffProfileId = await this.getStaffProfileId(userId, existing.facilityId)

		await db
			.update(allergies)
			.set({ isActive: false, updatedAt: new Date() })
			.where(eq(allergies.id, id))

		this.logger.log(`Deactivated allergy ${id}`)

		const updated = await this.getAllergy(id, actor)
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
			.innerJoin(
				patients,
				and(eq(allergies.patientId, patients.id), eq(allergies.facilityId, patients.facilityId))
			)
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
			.innerJoin(
				patients,
				and(eq(problems.patientId, patients.id), eq(problems.facilityId, patients.facilityId))
			)
			.leftJoin(staffProfiles, eq(problems.documentingStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(and(eq(problems.patientId, input.patientId), eq(problems.status, "active")))
			.orderBy(desc(problems.createdAt))

		// Resolved problem count
		const [resolvedResult] = await db
			.select({ count: count() })
			.from(problems)
			.innerJoin(
				patients,
				and(eq(problems.patientId, patients.id), eq(problems.facilityId, patients.facilityId))
			)
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
			.innerJoin(
				patients,
				and(eq(allergies.patientId, patients.id), eq(allergies.facilityId, patients.facilityId))
			)
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

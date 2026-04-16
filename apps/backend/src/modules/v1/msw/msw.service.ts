import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq, sql } from "drizzle-orm"

import {
	mswEvaluations,
	patients,
	staffProfiles,
	users,
} from "@repo/db/schema"
import type { MswEvaluation } from "@repo/contracts"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"

type ListMswInput = V1Inputs["msw"]["list"]
type CreateMswInput = V1Inputs["msw"]["create"]
type UpdateMswInput = V1Inputs["msw"]["update"]
type IssueCoeInput = V1Inputs["msw"]["issueCoe"]
type AddMalasakitInput = V1Inputs["msw"]["addMalasakit"]
type CaptureAnnexSignatureInput = V1Inputs["msw"]["captureAnnexSignature"]
type TagBenefitsInput = V1Inputs["msw"]["tagBenefits"]
type MswListResponse = {
	data: MswEvaluation[]
	total: number
	page: number
	limit: number
	totalPages: number
}

type MswContractStatus = "pending" | "in_progress" | "completed" | "cancelled"

@Injectable()
export class MswService {
	private readonly logger = new Logger(MswService.name)

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

	private normalizeStatusForStorage(status: MswContractStatus | undefined) {
		if (!status) return undefined
		return status === "completed" ? "completed" : "pending"
	}

	private normalizeStatusForOutput(row: {
		status: (typeof mswEvaluations.$inferSelect)["status"]
		evaluationFindings: unknown
	}): MswContractStatus {
		const workflowStatus = (row.evaluationFindings as Record<string, unknown> | null)?.workflowStatus
		if (
			workflowStatus === "pending" ||
			workflowStatus === "in_progress" ||
			workflowStatus === "completed" ||
			workflowStatus === "cancelled"
		) {
			return workflowStatus
		}

		if (row.status === "approved") {
			return "completed"
		}

		return row.status === "completed" ? "completed" : "pending"
	}

	private normalizeProgramForStorage(program: string | undefined) {
		if (!program) return null
		if (
			program === "malasakit" ||
			program === "pcso" ||
			program === "dswd" ||
			program === "other"
		) {
			return program
		}

		return "other"
	}

	private mapEvaluationFindings(value: unknown): MswEvaluation["evaluationFindings"] {
		const evaluationFindings = (value as Record<string, unknown> | null) ?? null
		const rawFindings =
			evaluationFindings && typeof evaluationFindings.findings === "object" && evaluationFindings.findings !== null
				? (evaluationFindings.findings as Record<string, unknown>)
				: evaluationFindings

		if (!rawFindings || Object.keys(rawFindings).length === 0 || !("employmentStatus" in rawFindings)) {
			return null
		}

		const employmentStatus =
			rawFindings.employmentStatus === "employed" ||
			rawFindings.employmentStatus === "self_employed" ||
			rawFindings.employmentStatus === "unemployed" ||
			rawFindings.employmentStatus === "retired" ||
			rawFindings.employmentStatus === "student" ||
			rawFindings.employmentStatus === "housewife" ||
			rawFindings.employmentStatus === "ofw" ||
			rawFindings.employmentStatus === "other"
				? rawFindings.employmentStatus
				: "other"

		const financialClass =
			rawFindings.financialClass === "a" ||
			rawFindings.financialClass === "b" ||
			rawFindings.financialClass === "c1" ||
			rawFindings.financialClass === "c2" ||
			rawFindings.financialClass === "c3" ||
			rawFindings.financialClass === "d"
				? rawFindings.financialClass
				: "d"

		return {
			employmentStatus,
			occupation: typeof rawFindings.occupation === "string" ? rawFindings.occupation : undefined,
			employer: typeof rawFindings.employer === "string" ? rawFindings.employer : undefined,
			monthlyFamilyIncome:
				typeof rawFindings.monthlyFamilyIncome === "number" ? rawFindings.monthlyFamilyIncome : 0,
			incomeSources: Array.isArray(rawFindings.incomeSources)
				? rawFindings.incomeSources.flatMap(item => {
					if (typeof item !== "object" || item === null) {
						return []
					}

					const source = item as Record<string, unknown>
					const frequency =
						source.frequency === "daily" ||
						source.frequency === "weekly" ||
						source.frequency === "biweekly" ||
						source.frequency === "monthly" ||
						source.frequency === "annually"
							? source.frequency
							: "monthly"

					return [{
						source: typeof source.source === "string" ? source.source : "Unknown",
						amount: typeof source.amount === "number" ? source.amount : 0,
						frequency,
					}]
				})
				: [],
			numberOfDependents:
				typeof rawFindings.numberOfDependents === "number" ? rawFindings.numberOfDependents : 0,
			familyComposition: Array.isArray(rawFindings.familyComposition)
				? rawFindings.familyComposition.flatMap(item => {
					if (typeof item !== "object" || item === null) {
						return []
					}

					const member = item as Record<string, unknown>
					return [{
						relationship: typeof member.relationship === "string" ? member.relationship : "Unknown",
						age: typeof member.age === "number" ? member.age : undefined,
						occupation: typeof member.occupation === "string" ? member.occupation : undefined,
						monthlyIncome: typeof member.monthlyIncome === "number" ? member.monthlyIncome : undefined,
						isDependent: typeof member.isDependent === "boolean" ? member.isDependent : false,
					}]
				})
				: undefined,
			homeOwnership:
				rawFindings.homeOwnership === "owned" ||
				rawFindings.homeOwnership === "rented" ||
				rawFindings.homeOwnership === "informal_settler" ||
				rawFindings.homeOwnership === "with_relatives" ||
				rawFindings.homeOwnership === "other"
					? rawFindings.homeOwnership
					: undefined,
			otherAssets: typeof rawFindings.otherAssets === "string" ? rawFindings.otherAssets : undefined,
			existingDebts: typeof rawFindings.existingDebts === "number" ? rawFindings.existingDebts : undefined,
			monthlyExpenses:
				typeof rawFindings.monthlyExpenses === "number" ? rawFindings.monthlyExpenses : undefined,
			financialClass,
			classificationNotes:
				typeof rawFindings.classificationNotes === "string" ? rawFindings.classificationNotes : undefined,
			psychosocialAssessment:
				typeof rawFindings.psychosocialAssessment === "string"
					? rawFindings.psychosocialAssessment
					: undefined,
			recommendedInterventions:
				typeof rawFindings.recommendedInterventions === "string"
					? rawFindings.recommendedInterventions
					: undefined,
		}
	}

	private mapMalasakitSources(value: unknown): MswEvaluation["malasakitSources"] {
		if (!Array.isArray(value)) {
			return null
		}

		return value.map(item => {
			const source = item as Record<string, unknown>
			return {
				program:
					typeof source.program === "string"
						? source.program
						: typeof source.source === "string"
							? source.source
							: "other",
				amount: Number(source.amount ?? 0),
				status:
					source.status === "pending" ||
					source.status === "approved" ||
					source.status === "disbursed" ||
					source.status === "declined"
						? source.status
						: "approved",
				referenceNumber:
					typeof source.referenceNumber === "string" ? source.referenceNumber : undefined,
				approvedAt: typeof source.approvedAt === "string" ? source.approvedAt : undefined,
			}
		})
	}

	private mapCoeProgram(value: unknown): NonNullable<MswEvaluation["coe"]>["program"] {
		return value === "malasakit" ||
			value === "pcso" ||
			value === "dswd" ||
			value === "doh_map" ||
			value === "philhealth_zbenefit" ||
			value === "other"
			? value
			: "other"
	}

	private mapEvaluation(row: {
		id: string
		facilityId: string
		encounterId: string | null
		patientId: string
		patientName: string | null
		patientMrn: string | null
		evaluationFindings: unknown
		coeIssued: boolean
		coeNumber: string | null
		coeProgram: (typeof mswEvaluations.$inferSelect)["coeProgram"]
		malasakitAmount: string | number | null
		malasakitSource: unknown
		konsultaTagged: boolean
		zBenefitsTagged: boolean
		evaluatedByStaffId: string
		evaluatedByStaffName: string | null
		status: (typeof mswEvaluations.$inferSelect)["status"]
		approvedAt: Date | null
		createdAt: Date
		updatedAt: Date
	}): MswEvaluation {
		const evaluationFindings = (row.evaluationFindings as Record<string, unknown> | null) ?? {}
		const coeMeta = (evaluationFindings.coe as Record<string, unknown> | undefined) ?? null

		return {
			id: row.id,
			facilityId: row.facilityId,
			encounterId: row.encounterId ?? "",
			patientId: row.patientId,
			patientName: row.patientName,
			patientMrn: row.patientMrn,
			evaluationFindings: this.mapEvaluationFindings(evaluationFindings),
			coeIssued: row.coeIssued,
			coe: row.coeIssued
				? {
					coeNumber: row.coeNumber ?? `COE-${row.id.slice(0, 8).toUpperCase()}`,
					program: this.mapCoeProgram(coeMeta?.program ?? row.coeProgram),
					amountApproved: Number(coeMeta?.amountApproved ?? row.malasakitAmount ?? 0),
					issuedAt:
						typeof coeMeta?.issuedAt === "string"
							? coeMeta.issuedAt
							: row.approvedAt?.toISOString() ?? row.updatedAt.toISOString(),
					validUntil: typeof coeMeta?.validUntil === "string" ? coeMeta.validUntil : undefined,
					signatureData: typeof coeMeta?.signatureData === "string" ? coeMeta.signatureData : undefined,
					witnessName: typeof coeMeta?.witnessName === "string" ? coeMeta.witnessName : undefined,
				}
				: null,
			malasakitAmount: row.malasakitAmount !== null ? Number(row.malasakitAmount) : null,
			malasakitSources: this.mapMalasakitSources(row.malasakitSource),
			konsultaTagged: row.konsultaTagged,
			zBenefitsTagged: row.zBenefitsTagged,
			annexASignature:
				typeof evaluationFindings.annexASignature === "string" ? evaluationFindings.annexASignature : null,
			annexBSignature:
				typeof evaluationFindings.annexBSignature === "string" ? evaluationFindings.annexBSignature : null,
			annexSignedAt:
				typeof evaluationFindings.annexSignedAt === "string" ? evaluationFindings.annexSignedAt : null,
			evaluatedByStaffId: row.evaluatedByStaffId,
			evaluatedByStaffName: row.evaluatedByStaffName,
			status: this.normalizeStatusForOutput(row),
			completedAt: row.approvedAt,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		}
	}

	private async getRowById(id: string) {
		const [row] = await db
			.select({
				id: mswEvaluations.id,
				facilityId: mswEvaluations.facilityId,
				encounterId: mswEvaluations.encounterId,
				patientId: mswEvaluations.patientId,
				patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
				patientMrn: patients.mrn,
				evaluationFindings: mswEvaluations.evaluationFindings,
				coeIssued: mswEvaluations.coeIssued,
				coeNumber: mswEvaluations.coeNumber,
				coeProgram: mswEvaluations.coeProgram,
				malasakitAmount: mswEvaluations.malasakitAmount,
				malasakitSource: mswEvaluations.malasakitSource,
				konsultaTagged: mswEvaluations.konsultaTagged,
				zBenefitsTagged: mswEvaluations.zBenefitsTagged,
				evaluatedByStaffId: mswEvaluations.evaluatedByStaffId,
				evaluatedByStaffName: users.name,
				status: mswEvaluations.status,
				approvedAt: mswEvaluations.approvedAt,
				createdAt: mswEvaluations.createdAt,
				updatedAt: mswEvaluations.updatedAt,
			})
			.from(mswEvaluations)
			.innerJoin(patients, eq(mswEvaluations.patientId, patients.id))
			.leftJoin(staffProfiles, eq(mswEvaluations.evaluatedByStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(eq(mswEvaluations.id, id))

		if (!row) {
			throw new NotFoundException(`MSW evaluation ${id} not found`)
		}

		return row
	}

	async list(input: ListMswInput): Promise<MswListResponse> {
		const page = Number(input.page) || 1
		const limit = Number(input.limit) || 25
		const offset = (page - 1) * limit

		const conditions = []
		if (input.facilityId) conditions.push(eq(mswEvaluations.facilityId, input.facilityId))
		if (input.encounterId) conditions.push(eq(mswEvaluations.encounterId, input.encounterId))
		if (input.patientId) conditions.push(eq(mswEvaluations.patientId, input.patientId))
		if (typeof input.coeIssued === "boolean") conditions.push(eq(mswEvaluations.coeIssued, input.coeIssued))
		if (typeof input.konsultaTagged === "boolean") {
			conditions.push(eq(mswEvaluations.konsultaTagged, input.konsultaTagged))
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined

		const [rows, totalRows] = await Promise.all([
			db
				.select({
					id: mswEvaluations.id,
					facilityId: mswEvaluations.facilityId,
					encounterId: mswEvaluations.encounterId,
					patientId: mswEvaluations.patientId,
					patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
					patientMrn: patients.mrn,
					evaluationFindings: mswEvaluations.evaluationFindings,
					coeIssued: mswEvaluations.coeIssued,
					coeNumber: mswEvaluations.coeNumber,
					coeProgram: mswEvaluations.coeProgram,
					malasakitAmount: mswEvaluations.malasakitAmount,
					malasakitSource: mswEvaluations.malasakitSource,
					konsultaTagged: mswEvaluations.konsultaTagged,
					zBenefitsTagged: mswEvaluations.zBenefitsTagged,
					evaluatedByStaffId: mswEvaluations.evaluatedByStaffId,
					evaluatedByStaffName: users.name,
					status: mswEvaluations.status,
					approvedAt: mswEvaluations.approvedAt,
					createdAt: mswEvaluations.createdAt,
					updatedAt: mswEvaluations.updatedAt,
				})
				.from(mswEvaluations)
				.innerJoin(patients, eq(mswEvaluations.patientId, patients.id))
				.leftJoin(staffProfiles, eq(mswEvaluations.evaluatedByStaffId, staffProfiles.id))
				.leftJoin(users, eq(staffProfiles.userId, users.id))
				.where(whereClause)
				.orderBy(desc(mswEvaluations.createdAt))
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(mswEvaluations).where(whereClause),
		])

		const mappedRows = rows.map(row => this.mapEvaluation(row))
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
		return this.mapEvaluation(await this.getRowById(id))
	}

	async getByEncounter(encounterId: string) {
		const [row] = await db
			.select({ id: mswEvaluations.id })
			.from(mswEvaluations)
			.where(eq(mswEvaluations.encounterId, encounterId))
			.orderBy(desc(mswEvaluations.createdAt))
			.limit(1)

		if (!row) {
			return null
		}

		return this.get(row.id)
	}

	async create(input: CreateMswInput, userId: string) {
		const evaluatedByStaffId = await this.resolveStaffProfileId(userId)

		const [created] = await db
			.insert(mswEvaluations)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				patientId: input.patientId,
				evaluatedByStaffId,
				status: "pending",
				evaluationFindings: {
					workflowStatus: "pending",
				} as typeof mswEvaluations.$inferInsert.evaluationFindings,
			})
			.returning({ id: mswEvaluations.id })

		this.logger.log(`Created MSW evaluation ${created?.id}`)

		return this.get(created!.id)
	}

	async update(input: UpdateMswInput) {
		const existing = await this.getRowById(input.id)
		const existingFindings = (existing.evaluationFindings as Record<string, unknown> | null) ?? {}

		await db
			.update(mswEvaluations)
			.set({
				evaluationFindings: {
					...existingFindings,
					workflowStatus: input.status ?? this.normalizeStatusForOutput(existing),
					findings: input.evaluationFindings ?? existingFindings.findings ?? null,
				} as typeof mswEvaluations.$inferInsert.evaluationFindings,
				status: this.normalizeStatusForStorage(input.status) ?? existing.status,
				updatedAt: new Date(),
			})
			.where(eq(mswEvaluations.id, input.id))

		this.logger.log(`Updated MSW evaluation ${input.id}`)

		return this.get(input.id)
	}

	async issueCoe(input: IssueCoeInput, userId: string) {
		const approvedByStaffId = await this.resolveStaffProfileId(userId)
		const existing = await this.getRowById(input.evaluationId)
		const existingFindings = (existing.evaluationFindings as Record<string, unknown> | null) ?? {}

		await db
			.update(mswEvaluations)
			.set({
				coeIssued: true,
				coeNumber: existing.coeNumber ?? `COE-${input.evaluationId.slice(0, 8).toUpperCase()}`,
				coeProgram: this.normalizeProgramForStorage(input.program),
				status: "approved",
				approvedByStaffId,
				approvedAt: new Date(),
				evaluationFindings: {
					...existingFindings,
					workflowStatus: "completed",
					coe: {
						coeNumber: existing.coeNumber ?? `COE-${input.evaluationId.slice(0, 8).toUpperCase()}`,
						program: input.program,
						amountApproved: input.amountApproved,
						issuedAt: new Date().toISOString(),
						validUntil: input.validUntil,
						signatureData: input.signatureData,
						witnessName: input.witnessName,
					},
				} as typeof mswEvaluations.$inferInsert.evaluationFindings,
				updatedAt: new Date(),
			})
			.where(eq(mswEvaluations.id, input.evaluationId))

		this.logger.log(`Issued CoE for MSW evaluation ${input.evaluationId}`)

		return this.get(input.evaluationId)
	}

	async addMalasakit(input: AddMalasakitInput) {
		const totalAmount = input.sources.reduce((sum, source) => sum + source.amount, 0)

		await db
			.update(mswEvaluations)
			.set({
				malasakitAmount: totalAmount.toString(),
				malasakitSource: input.sources.map(source => ({
					source: source.program,
					amount: source.amount,
					referenceNumber: source.referenceNumber,
				})) as typeof mswEvaluations.$inferInsert.malasakitSource,
				updatedAt: new Date(),
			})
			.where(eq(mswEvaluations.id, input.evaluationId))

		this.logger.log(`Updated Malasakit sources for MSW evaluation ${input.evaluationId}`)

		return this.get(input.evaluationId)
	}

	async captureAnnexSignature(input: CaptureAnnexSignatureInput) {
		const existing = await this.getRowById(input.evaluationId)
		const existingFindings = (existing.evaluationFindings as Record<string, unknown> | null) ?? {}

		await db
			.update(mswEvaluations)
			.set({
				evaluationFindings: {
					...existingFindings,
					annexASignature:
						input.annexType === "A"
							? input.signatureData
							: existingFindings.annexASignature,
					annexBSignature:
						input.annexType === "B"
							? input.signatureData
							: existingFindings.annexBSignature,
					annexSignedAt: new Date().toISOString(),
				} as typeof mswEvaluations.$inferInsert.evaluationFindings,
				updatedAt: new Date(),
			})
			.where(eq(mswEvaluations.id, input.evaluationId))

		this.logger.log(`Captured Annex ${input.annexType} signature for MSW evaluation ${input.evaluationId}`)

		return this.get(input.evaluationId)
	}

	async tagBenefits(input: TagBenefitsInput) {
		await db
			.update(mswEvaluations)
			.set({
				konsultaTagged: input.konsultaTagged ?? false,
				zBenefitsTagged: input.zBenefitsTagged ?? false,
				updatedAt: new Date(),
			})
			.where(eq(mswEvaluations.id, input.evaluationId))

		this.logger.log(`Updated benefit tags for MSW evaluation ${input.evaluationId}`)

		return this.get(input.evaluationId)
	}
}
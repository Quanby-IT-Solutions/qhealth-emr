import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq } from "drizzle-orm"

import { mswDocuments, mswEvaluations, staffProfiles } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

type EvaluationRow = typeof mswEvaluations.$inferSelect

@Injectable()
export class AssessmentsService {
	async upsert(input: {
		encounterId: string
		patientId: string
		facilityId: string
		evaluationFindings?: Record<string, unknown>
		eligibilityDecision?: string
		recommendationNotes?: string
		staffId: string
	}) {
		if (input.evaluationFindings) {
			const income = Number(input.evaluationFindings.monthlyFamilyIncome)
			if (!isNaN(income) && income <= 0) {
				throw new BadRequestException("Monthly family income must be greater than 0")
			}
			const dependents = Number(input.evaluationFindings.numberOfDependents)
			if (!isNaN(dependents) && dependents < 1) {
				throw new BadRequestException("Household size (numberOfDependents) must be at least 1")
			}
		}

		const staffResult = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(eq(staffProfiles.userId, input.staffId))
			.limit(1)

		const staffProfileId = staffResult[0]?.id
		if (!staffProfileId) throw new NotFoundException("Staff profile not found")

		// Merge eligibility decision into findings JSON
		const mergedFindings = input.evaluationFindings
			? ({
					...input.evaluationFindings,
					...(input.eligibilityDecision && { eligibilityDecision: input.eligibilityDecision }),
					...(input.recommendationNotes && { recommendationNotes: input.recommendationNotes }),
				} as EvaluationRow["evaluationFindings"])
			: null

		const existing = await db
			.select({ id: mswEvaluations.id })
			.from(mswEvaluations)
			.where(eq(mswEvaluations.encounterId, input.encounterId))
			.limit(1)

		if (existing[0]) {
			const result = await db
				.update(mswEvaluations)
				.set({
					evaluationFindings: mergedFindings ?? undefined,
					updatedAt: new Date(),
				})
				.where(eq(mswEvaluations.id, existing[0].id))
				.returning()
			const updated = result[0]
			if (!updated) throw new NotFoundException("Assessment not found after update")
			return this.formatRow(updated)
		}

		const result = await db
			.insert(mswEvaluations)
			.values({
				encounterId: input.encounterId,
				patientId: input.patientId,
				facilityId: input.facilityId,
				evaluatedByStaffId: staffProfileId,
				evaluationFindings: mergedFindings,
				status: "pending",
			})
			.returning()
		const created = result[0]
		if (!created) throw new NotFoundException("Assessment creation failed")
		return this.formatRow(created)
	}

	async attachDocument(input: { evaluationId: string; category: string; uri: string }) {
		const result = await db
			.insert(mswDocuments)
			.values({
				evaluationId: input.evaluationId,
				category: input.category as "brgy_indigency" | "id" | "income_proof" | "other",
				uri: input.uri,
			})
			.returning()
		const doc = result[0]
		if (!doc) throw new NotFoundException("Document creation failed")
		return {
			id: doc.id,
			evaluationId: doc.evaluationId,
			category: doc.category,
			uri: doc.uri,
			contentHash: doc.contentHash,
			createdAt: doc.createdAt,
		}
	}

	async get(id: string) {
		const [row] = await db.select().from(mswEvaluations).where(eq(mswEvaluations.id, id)).limit(1)
		if (!row) throw new NotFoundException("Assessment not found")
		return this.formatRow(row)
	}

	async list(input: {
		page?: number
		limit?: number
		facilityId?: string
		encounterId?: string
		patientId?: string
		status?: string
	}) {
		const page = input.page ?? 1
		const limit = input.limit ?? 25
		const offset = (page - 1) * limit

		const conditions = []
		if (input.facilityId) conditions.push(eq(mswEvaluations.facilityId, input.facilityId))
		if (input.encounterId) conditions.push(eq(mswEvaluations.encounterId, input.encounterId))
		if (input.patientId) conditions.push(eq(mswEvaluations.patientId, input.patientId))

		const whereClause = conditions.length ? and(...conditions) : undefined

		const rows = await db
			.select()
			.from(mswEvaluations)
			.where(whereClause)
			.orderBy(desc(mswEvaluations.createdAt))
			.limit(limit)
			.offset(offset)

		const [countResult] = await db
			.select({ count: count() })
			.from(mswEvaluations)
			.where(whereClause)

		const total = Number(countResult?.count ?? 0)

		return {
			data: rows.map((r: EvaluationRow) => this.formatRow(r)),
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	private formatRow(row: EvaluationRow) {
		return {
			id: row.id,
			facilityId: row.facilityId,
			encounterId: row.encounterId ?? "",
			patientId: row.patientId,
			patientName: null,
			patientMrn: null,

			evaluationFindings: (row.evaluationFindings ?? null) as any,
			coeIssued: row.coeIssued,
			coe: null,
			malasakitAmount: row.malasakitAmount ? Number(row.malasakitAmount) : null,
			malasakitSources: null,
			konsultaTagged: row.konsultaTagged,
			zBenefitsTagged: row.zBenefitsTagged,
			annexASignature: null,
			annexBSignature: null,
			annexSignedAt: null,
			evaluatedByStaffId: row.evaluatedByStaffId,
			evaluatedByStaffName: null,
			status: (row.status === "approved" ? "completed" : row.status) as
				"pending" | "in_progress" | "completed" | "cancelled",
			completedAt: row.approvedAt ?? null,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		}
	}
}

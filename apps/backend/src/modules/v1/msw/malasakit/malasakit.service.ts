import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq, gte, lte } from "drizzle-orm"

import { malasakitCases, malasakitStatusLog } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

type MalasakitStatus = "pending" | "approved" | "released" | "denied"

const VALID_TRANSITIONS: Record<MalasakitStatus, MalasakitStatus[]> = {
	pending: ["approved", "denied"],
	approved: ["released", "denied"],
	released: [],
	denied: [],
}

@Injectable()
export class MalasakitService {
	private readonly db = db

	async list(input: {
		page?: number
		limit?: number
		source?: string
		status?: string
		patientId?: string
		encounterId?: string
		dateFrom?: string
		dateTo?: string
	}) {
		const page = input.page ?? 1
		const limit = input.limit ?? 25
		const offset = (page - 1) * limit

		const conditions = []
		if (input.source)
			conditions.push(eq(malasakitCases.source, input.source as "DSWD" | "PCSO" | "DOH-MAIFIP"))
		if (input.status) conditions.push(eq(malasakitCases.status, input.status as MalasakitStatus))
		if (input.patientId) conditions.push(eq(malasakitCases.patientId, input.patientId))
		if (input.encounterId) conditions.push(eq(malasakitCases.encounterId, input.encounterId))
		if (input.dateFrom) conditions.push(gte(malasakitCases.updatedAt, new Date(input.dateFrom)))
		if (input.dateTo) {
			const to = new Date(input.dateTo)
			to.setHours(23, 59, 59, 999)
			conditions.push(lte(malasakitCases.updatedAt, to))
		}

		const whereClause = conditions.length ? and(...conditions) : undefined

		const rows = await this.db
			.select()
			.from(malasakitCases)
			.where(whereClause)
			.orderBy(desc(malasakitCases.updatedAt))
			.limit(limit)
			.offset(offset)

		const [countResult] = await this.db
			.select({ count: count() })
			.from(malasakitCases)
			.where(whereClause)

		const total = Number(countResult?.count ?? 0)
		return {
			data: rows.map(r => this.formatCase(r)),
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	async get(id: string) {
		const [row] = await this.db
			.select()
			.from(malasakitCases)
			.where(eq(malasakitCases.id, id))
			.limit(1)
		if (!row) throw new NotFoundException("Malasakit case not found")
		return this.formatCase(row)
	}

	async create(input: {
		encounterId?: string
		patientId: string
		source: "DSWD" | "PCSO" | "DOH-MAIFIP"
		amountGranted?: number
		referenceNo?: string
		staffId?: string
	}) {
		const [row] = await this.db
			.insert(malasakitCases)
			.values({
				patientId: input.patientId,
				encounterId: input.encounterId ?? null,
				source: input.source,
				status: "pending",
				amountGranted: input.amountGranted ? String(input.amountGranted) : null,
				referenceNo: input.referenceNo ?? null,
			})
			.returning()

		if (!row) throw new BadRequestException("Failed to create case")

		await this.db.insert(malasakitStatusLog).values({
			caseId: row.id,
			fromStatus: null,
			toStatus: "pending",
			note: "Case created",
		})

		return this.formatCase(row)
	}

	async update(input: {
		id: string
		status?: MalasakitStatus
		amountGranted?: number
		referenceNo?: string
		deniedReason?: string
		note?: string
		actorStaffId?: string
	}) {
		const [existing] = await this.db
			.select()
			.from(malasakitCases)
			.where(eq(malasakitCases.id, input.id))
			.limit(1)
		if (!existing) throw new NotFoundException("Malasakit case not found")

		if (input.status && input.status !== existing.status) {
			const allowed = VALID_TRANSITIONS[existing.status]
			if (!allowed.includes(input.status)) {
				throw new BadRequestException(
					`Cannot transition from ${existing.status} to ${input.status}. Allowed: ${allowed.join(", ") || "none"}`
				)
			}
			if (input.status === "denied" && !input.deniedReason?.trim()) {
				throw new BadRequestException("deniedReason is required when setting status to denied")
			}
		}

		const [updated] = await this.db
			.update(malasakitCases)
			.set({
				status: input.status ?? existing.status,
				amountGranted: input.amountGranted ? String(input.amountGranted) : existing.amountGranted,
				referenceNo: input.referenceNo ?? existing.referenceNo,
				deniedReason: input.deniedReason ?? existing.deniedReason,
				updatedAt: new Date(),
			})
			.where(eq(malasakitCases.id, input.id))
			.returning()

		if (!updated) throw new BadRequestException("Update failed")

		if (input.status && input.status !== existing.status) {
			await this.db.insert(malasakitStatusLog).values({
				caseId: input.id,
				fromStatus: existing.status,
				toStatus: input.status,
				note: input.note ?? null,
			})
		}

		return this.formatCase(updated)
	}

	async statusLog(caseId: string) {
		const rows = await this.db
			.select()
			.from(malasakitStatusLog)
			.where(eq(malasakitStatusLog.caseId, caseId))
			.orderBy(desc(malasakitStatusLog.changedAt))

		return rows.map(r => ({
			id: r.id,
			caseId: r.caseId,
			fromStatus: r.fromStatus,
			toStatus: r.toStatus,
			actorStaffId: r.actorStaffId,
			note: r.note,
			changedAt: r.changedAt,
		}))
	}

	async reconcile(input: {
		caseId: string
		billingPaymentId: string
		amount: number
		reference: string
	}) {
		const [existing] = await this.db
			.select()
			.from(malasakitCases)
			.where(eq(malasakitCases.id, input.caseId))
			.limit(1)
		if (!existing) throw new NotFoundException("Malasakit case not found")
		if (existing.status !== "released") {
			throw new BadRequestException("Only released cases can be reconciled")
		}

		const [updated] = await this.db
			.update(malasakitCases)
			.set({
				referenceNo: input.reference,
				updatedAt: new Date(),
			})
			.where(eq(malasakitCases.id, input.caseId))
			.returning()

		if (!updated) throw new BadRequestException("Reconcile failed")

		await this.db.insert(malasakitStatusLog).values({
			caseId: input.caseId,
			fromStatus: existing.status,
			toStatus: existing.status,
			note: `Reconciled with billing payment ${input.billingPaymentId}, amount ₱${input.amount}, ref: ${input.reference}`,
		})

		return this.formatCase(updated)
	}

	private formatCase(row: typeof malasakitCases.$inferSelect) {
		return {
			id: row.id,
			encounterId: row.encounterId,
			patientId: row.patientId,
			patientName: null,
			source: row.source,
			status: row.status,
			amountGranted: row.amountGranted ? Number(row.amountGranted) : null,
			referenceNo: row.referenceNo,
			deniedReason: row.deniedReason,
			mswOwnerStaffId: row.mswOwnerStaffId,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		}
	}
}

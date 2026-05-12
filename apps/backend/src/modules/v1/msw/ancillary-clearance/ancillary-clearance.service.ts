import { BadRequestException, Injectable } from "@nestjs/common"
import { and, eq } from "drizzle-orm"

import { ancillaryClearance, coeCertificates, malasakitCases, mswEvaluations } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

type CoverageSource = {
	type: "malasakit" | "philhealth" | "coe"
	referenceId: string
	amount: number
}

@Injectable()
export class AncillaryClearanceService {
	private readonly db = db

	async queue(input: { ancillaryType?: string; encounterId?: string }) {
		const conditions = []
		conditions.push(eq(ancillaryClearance.status, "pending"))
		if (input.encounterId) conditions.push(eq(ancillaryClearance.encounterId, input.encounterId))

		const rows = await this.db
			.select()
			.from(ancillaryClearance)
			.where(and(...conditions))

		const now = Date.now()
		return rows.map(r => ({
			orderId: r.orderId,
			encounterId: r.encounterId,
			patientName: null,
			ancillaryType: (input.ancillaryType ?? "Lab") as "Lab" | "Imaging" | "Pharmacy",
			status: r.status,
			waitTimeMinutes: Math.floor((now - new Date(r.createdAt).getTime()) / 60000),
			clearanceRecord: this.formatRecord(r),
		}))
	}

	async applyCoverage(input: {
		orderId: string
		encounterId: string
		coverageSources: CoverageSource[]
		reason?: string
		staffId?: string
	}) {
		if (input.coverageSources.length === 0) {
			throw new BadRequestException("At least one coverage source is required")
		}

		for (const src of input.coverageSources) {
			if (src.type === "malasakit") {
				const [mc] = await this.db
					.select({ encounterId: malasakitCases.encounterId })
					.from(malasakitCases)
					.where(eq(malasakitCases.id, src.referenceId))
					.limit(1)
				if (!mc) throw new BadRequestException(`Malasakit case ${src.referenceId} not found`)
				if (mc.encounterId !== input.encounterId) {
					throw new BadRequestException(
						`Malasakit case ${src.referenceId} belongs to a different encounter`
					)
				}
			} else if (src.type === "coe") {
				const [cert] = await this.db
					.select({ evaluationId: coeCertificates.evaluationId })
					.from(coeCertificates)
					.where(eq(coeCertificates.id, src.referenceId))
					.limit(1)
				if (!cert) throw new BadRequestException(`CoE certificate ${src.referenceId} not found`)
				const [eva] = await this.db
					.select({ encounterId: mswEvaluations.encounterId })
					.from(mswEvaluations)
					.where(eq(mswEvaluations.id, cert.evaluationId))
					.limit(1)
				if (!eva || eva.encounterId !== input.encounterId) {
					throw new BadRequestException(
						`CoE certificate ${src.referenceId} belongs to a different encounter`
					)
				}
			}
		}

		const existing = await this.db
			.select()
			.from(ancillaryClearance)
			.where(
				and(eq(ancillaryClearance.orderId, input.orderId), eq(ancillaryClearance.status, "pending"))
			)
			.limit(1)

		if (existing[0]) {
			const [updated] = await this.db
				.update(ancillaryClearance)
				.set({
					appliedCoverages: input.coverageSources,
					status: "cleared",
					clearedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(ancillaryClearance.id, existing[0].id))
				.returning()
			if (!updated) throw new BadRequestException("Update failed")
			return this.formatRecord(updated)
		}

		const [created] = await this.db
			.insert(ancillaryClearance)
			.values({
				orderId: input.orderId,
				encounterId: input.encounterId,
				appliedCoverages: input.coverageSources,
				status: "cleared",
				clearedAt: new Date(),
			})
			.returning()
		if (!created) throw new BadRequestException("Insert failed")
		return this.formatRecord(created)
	}

	async override(input: {
		orderId: string
		encounterId: string
		reason: string
		staffId?: string
	}) {
		if (!input.reason.trim()) {
			throw new BadRequestException("Override reason is required")
		}

		const [created] = await this.db
			.insert(ancillaryClearance)
			.values({
				orderId: input.orderId,
				encounterId: input.encounterId,
				status: "overridden",
				overrideReason: input.reason,
				clearedAt: new Date(),
			})
			.returning()
		if (!created) throw new BadRequestException("Override failed")
		return this.formatRecord(created)
	}

	async history(orderId: string) {
		const rows = await this.db
			.select()
			.from(ancillaryClearance)
			.where(eq(ancillaryClearance.orderId, orderId))

		return rows.map(r => this.formatRecord(r))
	}

	private formatRecord(r: typeof ancillaryClearance.$inferSelect) {
		return {
			id: r.id,
			orderId: r.orderId,
			encounterId: r.encounterId,
			appliedCoverages: r.appliedCoverages as CoverageSource[] | null,
			status: r.status,
			clearedByStaffId: r.clearedByStaffId,
			clearedAt: r.clearedAt,
			overrideReason: r.overrideReason,
			createdAt: r.createdAt,
			updatedAt: r.updatedAt,
		}
	}
}

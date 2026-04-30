import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq } from "drizzle-orm"

import { medicalRecordsRequests } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

interface ListMedicalRecordsRequestsInput {
	facilityId: string
	patientId?: string
	encounterId?: string
	requestType?: "chart_release" | "medical_certificate" | "discharge_summary_copy" | "laboratory_results"
	status?: "pending" | "processing" | "completed" | "rejected"
	page: number
	limit: number
}

interface CreateMedicalRecordsRequestInput {
	facilityId: string
	patientId: string
	encounterId?: string
	requestType: "chart_release" | "medical_certificate" | "discharge_summary_copy" | "laboratory_results"
	requestedByName: string
	requestedByRelationship?: "self" | "parent" | "guardian" | "legal_representative" | "other"
	purpose?: string
	/** SLA-020: Flow 7 Step 1 evidence */
	identityVerified?: boolean
	dpaConsentObtained?: boolean
}

interface UpdateMedicalRecordsRequestInput {
	id: string
	status?: "pending" | "processing" | "completed" | "rejected"
	processedByStaffId?: string
	rejectionReason?: string
}

@Injectable()
export class MedicalRecordsService {
	private readonly logger = new Logger(MedicalRecordsService.name)

	async listMedicalRecordsRequests(input: ListMedicalRecordsRequestsInput) {
		const page = Number(input.page) || 1
		const limit = Number(input.limit) || 50
		const offset = (page - 1) * limit

		const conditions = [eq(medicalRecordsRequests.facilityId, input.facilityId)]
		if (input.patientId) conditions.push(eq(medicalRecordsRequests.patientId, input.patientId))
		if (input.encounterId) conditions.push(eq(medicalRecordsRequests.encounterId, input.encounterId))
		if (input.requestType) conditions.push(eq(medicalRecordsRequests.requestType, input.requestType))
		if (input.status) conditions.push(eq(medicalRecordsRequests.status, input.status))

		const whereClause = and(...conditions)

		const [[totalResult], rows] = await Promise.all([
			db.select({ count: count() }).from(medicalRecordsRequests).where(whereClause),
			db
				.select()
				.from(medicalRecordsRequests)
				.where(whereClause)
				.orderBy(desc(medicalRecordsRequests.createdAt))
				.limit(limit)
				.offset(offset),
		])

		const total = totalResult?.count ?? 0

		return {
			data: rows,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	async getMedicalRecordsRequest(id: string) {
		const [row] = await db
			.select()
			.from(medicalRecordsRequests)
			.where(eq(medicalRecordsRequests.id, id))
			.limit(1)

		if (!row) throw new NotFoundException(`Medical records request ${id} not found`)
		return row
	}

	async createMedicalRecordsRequest(input: CreateMedicalRecordsRequestInput) {
		const [created] = await db
			.insert(medicalRecordsRequests)
			.values({
				facilityId: input.facilityId,
				patientId: input.patientId,
				encounterId: input.encounterId ?? null,
				requestType: input.requestType,
				requestedByName: input.requestedByName,
				requestedByRelationship: (input.requestedByRelationship as "self" | "parent" | "guardian" | "legal_representative" | "other" | undefined) ?? null,
				purpose: input.purpose ?? null,
				status: "pending",
				// SLA-020: persist identity/DPA evidence at point of receipt
				identityVerified: input.identityVerified ?? false,
				dpaConsentObtained: input.dpaConsentObtained ?? false,
			})
			.returning()

		if (!created) {
			throw new Error("Failed to create medical records request")
		}

		this.logger.log(`Created medical records request ${created.id}`)
		return created
	}

	async updateMedicalRecordsRequest(input: UpdateMedicalRecordsRequestInput) {
		await this.getMedicalRecordsRequest(input.id)

		const updateData: Record<string, unknown> = { updatedAt: new Date() }
		if (input.status !== undefined) {
			updateData.status = input.status
			if (input.status === "completed") updateData.completedAt = new Date()
		}
		if (input.processedByStaffId !== undefined) updateData.processedByStaffId = input.processedByStaffId
		if (input.rejectionReason !== undefined) updateData.rejectionReason = input.rejectionReason

		await db.update(medicalRecordsRequests).set(updateData).where(eq(medicalRecordsRequests.id, input.id))

		return this.getMedicalRecordsRequest(input.id)
	}

	/**
	 * SLA-017 (SLA-012): Mark a medical records request as paid.
	 * Sets paidAt to record the moment payment was received (Flow 7 Step 2).
	 */
	async markMedicalRecordsPaid(input: { id: string; paidAt?: Date }) {
		const paidAt = input.paidAt ?? new Date()

		const [updated] = await db
			.update(medicalRecordsRequests)
			.set({ paidAt, updatedAt: new Date() })
			.where(eq(medicalRecordsRequests.id, input.id))
			.returning()

		if (!updated) {
			throw new NotFoundException(`Medical records request ${input.id} not found`)
		}

		return { id: updated.id, paidAt: updated.paidAt?.toISOString() ?? null }
	}

	/**
	 * SLA-020: Mark medical records as released to the requestor.
	 * Sets releasedByStaffId and releasedAt to provide authoritative Flow 7 Step 3 evidence.
	 */
	async markMedicalRecordsReleased(input: { id: string; releasedByStaffId: string; releasedAt?: Date }) {
		const releasedAt = input.releasedAt ?? new Date()

		const [updated] = await db
			.update(medicalRecordsRequests)
			.set({
				releasedByStaffId: input.releasedByStaffId,
				releasedAt,
				updatedAt: new Date(),
			})
			.where(eq(medicalRecordsRequests.id, input.id))
			.returning()

		if (!updated) {
			throw new NotFoundException(`Medical records request ${input.id} not found`)
		}

		return {
			id: updated.id,
			releasedByStaffId: updated.releasedByStaffId ?? null,
			releasedAt: updated.releasedAt?.toISOString() ?? null,
		}
	}
}

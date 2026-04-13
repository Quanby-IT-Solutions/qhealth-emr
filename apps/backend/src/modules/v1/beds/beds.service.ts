import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, count, eq, sql } from "drizzle-orm"

import { beds, encounters, patients, wards } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"

type WardListInput = V1Inputs["bed"]["listWards"]
type CreateWardInput = V1Inputs["bed"]["createWard"]
type BedListInput = V1Inputs["bed"]["listBeds"]
type CreateBedInput = V1Inputs["bed"]["createBed"]
type UpdateBedStatusInput = V1Inputs["bed"]["updateBedStatus"]
type BedCensusInput = V1Inputs["bed"]["census"]

@Injectable()
export class BedsService {
	private readonly logger = new Logger(BedsService.name)

	// ========================================================================
	// List Wards
	// ========================================================================

	async listWards(input: WardListInput) {
		return db
			.select()
			.from(wards)
			.where(and(eq(wards.facilityId, input.facilityId), eq(wards.isActive, true)))
			.orderBy(wards.name)
	}

	// ========================================================================
	// Create Ward
	// ========================================================================

	async createWard(input: CreateWardInput) {
		const [created] = await db
			.insert(wards)
			.values({
				facilityId: input.facilityId,
				name: input.name,
				wardType: input.wardType,
				totalBeds: input.totalBeds ?? 0,
			})
			.returning()

		this.logger.log(`Created ward: ${input.name} (${input.wardType})`)
		return created!
	}

	// ========================================================================
	// List Beds grouped by ward
	// ========================================================================

	async listBeds(input: BedListInput) {
		const wardConditions = [
			eq(wards.facilityId, input.facilityId),
			eq(wards.isActive, true),
		]

		if (input.wardId) {
			wardConditions.push(eq(wards.id, input.wardId))
		}

		const wardRows = await db
			.select()
			.from(wards)
			.where(and(...wardConditions))
			.orderBy(wards.name)

		const result = await Promise.all(
			wardRows.map(async ward => {
				const bedConditions = [eq(beds.wardId, ward.id)]
				if (input.status) {
					bedConditions.push(eq(beds.status, input.status))
				}

				const bedRows = await db
					.select({
						id: beds.id,
						wardId: beds.wardId,
						facilityId: beds.facilityId,
						bedNumber: beds.bedNumber,
						status: beds.status,
						currentEncounterId: beds.currentEncounterId,
						createdAt: beds.createdAt,
						updatedAt: beds.updatedAt,
						patientFirstName: patients.firstName,
						patientLastName: patients.lastName,
						patientMrn: patients.mrn,
					})
					.from(beds)
					.leftJoin(
						encounters,
						eq(beds.currentEncounterId, encounters.id)
					)
					.leftJoin(patients, eq(encounters.patientId, patients.id))
					.where(and(...bedConditions))
					.orderBy(beds.bedNumber)

				const enrichedBeds = bedRows.map(b => ({
					id: b.id,
					wardId: b.wardId,
					facilityId: b.facilityId,
					bedNumber: b.bedNumber,
					status: b.status,
					currentEncounterId: b.currentEncounterId,
					createdAt: b.createdAt,
					updatedAt: b.updatedAt,
					wardName: ward.name,
					wardType: ward.wardType,
					patientName: b.patientFirstName
						? `${b.patientLastName}, ${b.patientFirstName}`
						: null,
					patientMrn: b.patientMrn ?? null,
				}))

				return {
					...ward,
					beds: enrichedBeds,
					occupiedCount: enrichedBeds.filter(b => b.status === "occupied").length,
					availableCount: enrichedBeds.filter(b => b.status === "available").length,
					outOfServiceCount: enrichedBeds.filter(b => b.status === "out_of_service").length,
				}
			})
		)

		return { wards: result }
	}

	// ========================================================================
	// Create Bed
	// ========================================================================

	async createBed(input: CreateBedInput) {
		const [ward] = await db.select().from(wards).where(eq(wards.id, input.wardId))
		if (!ward) {
			throw new NotFoundException(`Ward ${input.wardId} not found`)
		}

		const [created] = await db
			.insert(beds)
			.values({
				wardId: input.wardId,
				facilityId: input.facilityId,
				bedNumber: input.bedNumber,
			})
			.returning()

		// Update ward bed count
		await db
			.update(wards)
			.set({
				totalBeds: sql`${wards.totalBeds} + 1`,
			})
			.where(eq(wards.id, input.wardId))

		this.logger.log(`Created bed: ${input.bedNumber} in ward ${ward.name}`)
		return created!
	}

	// ========================================================================
	// Update Bed Status
	// ========================================================================

	async updateBedStatus(input: UpdateBedStatusInput) {
		const [updated] = await db
			.update(beds)
			.set({
				status: input.status,
				currentEncounterId:
					input.status === "available" || input.status === "out_of_service"
						? null
						: undefined,
				updatedAt: new Date(),
			})
			.where(eq(beds.id, input.id))
			.returning()

		if (!updated) {
			throw new NotFoundException(`Bed ${input.id} not found`)
		}

		this.logger.log(`Updated bed ${input.id} status to ${input.status}`)
		return updated
	}

	// ========================================================================
	// Bed Census / BOR (Bed Occupancy Rate)
	// DOH midnight census formula: (occupied beds at midnight / total beds) * 100
	// ========================================================================

	async getCensus(input: BedCensusInput) {
		const date = input.date || new Date().toISOString().split("T")[0]!

		// Get current bed counts by ward
		const wardRows = await db
			.select()
			.from(wards)
			.where(and(eq(wards.facilityId, input.facilityId), eq(wards.isActive, true)))
			.orderBy(wards.name)

		let overallTotal = 0
		let overallOccupied = 0

		const byWard = await Promise.all(
			wardRows.map(async ward => {
				const [totalResult] = await db
					.select({ count: count() })
					.from(beds)
					.where(eq(beds.wardId, ward.id))

				const [occupiedResult] = await db
					.select({ count: count() })
					.from(beds)
					.where(and(eq(beds.wardId, ward.id), eq(beds.status, "occupied")))

				const totalBeds = totalResult?.count ?? 0
				const occupiedBeds = occupiedResult?.count ?? 0
				const bor = totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(2) : "0.00"

				overallTotal += totalBeds
				overallOccupied += occupiedBeds

				return {
					wardId: ward.id,
					wardName: ward.name,
					snapshotDate: date,
					totalBeds,
					occupiedBeds,
					borPercentage: bor,
				}
			})
		)

		const overallBor =
			overallTotal > 0 ? ((overallOccupied / overallTotal) * 100).toFixed(2) : "0.00"

		return {
			facilityId: input.facilityId,
			date,
			overall: {
				totalBeds: overallTotal,
				occupiedBeds: overallOccupied,
				borPercentage: overallBor,
			},
			byWard,
		}
	}
}

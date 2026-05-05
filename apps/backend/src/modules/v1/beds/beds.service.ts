import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
	OnApplicationBootstrap,
} from "@nestjs/common"
import { and, between, count, eq, sql } from "drizzle-orm"

import { bedCensusDaily, beds, encounters, patients, wards } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"

type WardListInput = V1Inputs["bed"]["listWards"]
type CreateWardInput = V1Inputs["bed"]["createWard"]
type BedListInput = V1Inputs["bed"]["listBeds"]
type CreateBedInput = V1Inputs["bed"]["createBed"]
type UpdateBedStatusInput = V1Inputs["bed"]["updateBedStatus"]
type SuggestBedsInput = V1Inputs["bed"]["suggestBeds"]
type BedCensusInput = V1Inputs["bed"]["census"]
type DashboardInput = V1Inputs["bed"]["dashboard"]
type BorTrendInput = V1Inputs["bed"]["borTrend"]
type AhsrExportInput = V1Inputs["bed"]["exportAhsr"]
type DeleteWardInput = V1Inputs["bed"]["deleteWard"]
type WardType = (typeof wards.$inferSelect)["wardType"]

@Injectable()
export class BedsService implements OnApplicationBootstrap {
	private readonly logger = new Logger(BedsService.name)

	onApplicationBootstrap() {
		const scheduleMidnightCron = () => {
			const now = new Date()
			const next = new Date(now)
			next.setHours(0, 5, 0, 0)
			if (next <= now) next.setDate(next.getDate() + 1)
			setTimeout(() => {
				void this.runMidnightCensusSnapshot()
				setInterval(() => void this.runMidnightCensusSnapshot(), 24 * 60 * 60 * 1000)
			}, next.getTime() - now.getTime())
		}
		scheduleMidnightCron()
	}

	async runMidnightCensusSnapshot() {
		this.logger.log("Running midnight bed census snapshot")
		try {
			const today = new Date().toISOString().split("T")[0]!
			const allWards = await db.select().from(wards).where(eq(wards.isActive, true))
			for (const ward of allWards) {
				const [totalResult] = await db
					.select({ count: count() })
					.from(beds)
					.where(eq(beds.wardId, ward.id))
				const [occupiedResult] = await db
					.select({ count: count() })
					.from(beds)
					.where(and(eq(beds.wardId, ward.id), eq(beds.status, "occupied")))
				const [availableResult] = await db
					.select({ count: count() })
					.from(beds)
					.where(and(eq(beds.wardId, ward.id), eq(beds.status, "available")))

				await db
					.insert(bedCensusDaily)
					.values({
						facilityId: ward.facilityId,
						wardId: ward.id,
						censusDate: today,
						midnightCensus: occupiedResult?.count ?? 0,
						availableBeds: availableResult?.count ?? 0,
					})
					.onConflictDoUpdate({
						target: [bedCensusDaily.facilityId, bedCensusDaily.wardId, bedCensusDaily.censusDate],
						set: {
							midnightCensus: occupiedResult?.count ?? 0,
							availableBeds: availableResult?.count ?? 0,
						},
					})

				void totalResult
			}
		} catch (err) {
			this.logger.error("Midnight census snapshot failed", err)
		}
	}

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
		const wardConditions = [eq(wards.facilityId, input.facilityId), eq(wards.isActive, true)]

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
					.leftJoin(encounters, eq(beds.currentEncounterId, encounters.id))
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
					patientName: b.patientFirstName ? `${b.patientLastName}, ${b.patientFirstName}` : null,
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
					input.status === "available" || input.status === "out_of_service" ? null : undefined,
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
	// Suggest Beds
	// ========================================================================

	async suggestBeds(input: SuggestBedsInput) {
		void input.patientId

		const availableBeds = await db
			.select({
				bedId: beds.id,
				wardId: beds.wardId,
				wardName: wards.name,
				wardType: wards.wardType,
				bedNumber: beds.bedNumber,
				status: beds.status,
			})
			.from(beds)
			.innerJoin(wards, eq(beds.wardId, wards.id))
			.where(
				and(
					eq(beds.facilityId, input.facilityId),
					eq(wards.isActive, true),
					eq(beds.status, "available")
				)
			)
			.orderBy(wards.name, beds.bedNumber)

		const suggestedBeds = availableBeds
			.map(row => {
				let matchScore = 50
				const matchReasons: string[] = []
				const warnings: string[] = []

				if (input.preferredWardType && row.wardType === input.preferredWardType) {
					matchScore += 35
					matchReasons.push(`Matches preferred ward type: ${input.preferredWardType}`)
				}

				if (!input.preferredWardType) {
					matchReasons.push("Bed is currently available")
				}

				if (input.isolationRequired && input.isolationRequired !== "none") {
					warnings.push(`Isolation requirement ${input.isolationRequired} requires manual review`)
					matchScore -= 10
				}

				if (input.genderPreference && input.genderPreference !== "any") {
					warnings.push(
						`Gender preference ${input.genderPreference} requires ward-level validation`
					)
					matchScore -= 5
				}

				if (input.specialRequirements?.length) {
					warnings.push("Special requirements need manual confirmation")
				}

				return {
					bedId: row.bedId,
					wardId: row.wardId,
					wardName: row.wardName,
					wardType: row.wardType,
					bedNumber: row.bedNumber,
					matchScore,
					matchReasons,
					warnings,
				}
			})
			.sort((left, right) => right.matchScore - left.matchScore)

		return {
			suggestedBeds,
			totalAvailable: availableBeds.length,
		}
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

	// ========================================================================
	// Death Rate Computation Helpers (static, pure)
	// ========================================================================

	static grossDeathRate(deathsWithin48h: number, totalDischarges: number): number {
		if (totalDischarges === 0) return 0
		return Math.round((deathsWithin48h / totalDischarges) * 100 * 100) / 100
	}

	static netDeathRate(deathsAfter48h: number, totalDischarges: number): number {
		if (totalDischarges === 0) return 0
		return Math.round((deathsAfter48h / totalDischarges) * 100 * 100) / 100
	}

	// ========================================================================
	// Real-time Census Dashboard
	// ========================================================================

	async getDashboard(input: DashboardInput) {
		const wardRows = await db
			.select({
				wardId: wards.id,
				wardName: wards.name,
				wardType: wards.wardType,
				bedStatus: beds.status,
			})
			.from(wards)
			.leftJoin(beds, eq(beds.wardId, wards.id))
			.where(and(eq(wards.facilityId, input.facilityId), eq(wards.isActive, true)))

		const byWardMap = new Map<
			string,
			{
				wardId: string
				wardName: string
				wardType: WardType
				totalBeds: number
				occupiedBeds: number
				availableBeds: number
			}
		>()

		let totalBeds = 0
		let occupiedBeds = 0
		let availableBeds = 0
		let reservedBeds = 0
		let cleaningBeds = 0
		let outOfServiceBeds = 0

		for (const row of wardRows) {
			const existing = byWardMap.get(row.wardId) ?? {
				wardId: row.wardId,
				wardName: row.wardName,
				wardType: row.wardType,
				totalBeds: 0,
				occupiedBeds: 0,
				availableBeds: 0,
			}

			if (row.bedStatus) {
				existing.totalBeds += 1
				totalBeds += 1

				switch (row.bedStatus) {
					case "occupied":
						existing.occupiedBeds += 1
						occupiedBeds += 1
						break
					case "available":
						existing.availableBeds += 1
						availableBeds += 1
						break
					case "reserved":
						reservedBeds += 1
						break
					case "cleaning":
						cleaningBeds += 1
						break
					case "out_of_service":
						outOfServiceBeds += 1
						break
				}
			}

			byWardMap.set(row.wardId, existing)
		}

		const byWard = Array.from(byWardMap.values()).map(ward => ({
			...ward,
			borPercentage:
				ward.totalBeds > 0 ? Number(((ward.occupiedBeds / ward.totalBeds) * 100).toFixed(2)) : 0,
		}))

		const byWardTypeMap = new Map<
			WardType,
			{
				wardType: WardType
				totalBeds: number
				occupiedBeds: number
				availableBeds: number
			}
		>()
		for (const ward of byWard) {
			const existing = byWardTypeMap.get(ward.wardType) ?? {
				wardType: ward.wardType,
				totalBeds: 0,
				occupiedBeds: 0,
				availableBeds: 0,
			}
			existing.totalBeds += ward.totalBeds
			existing.occupiedBeds += ward.occupiedBeds
			existing.availableBeds += ward.availableBeds
			byWardTypeMap.set(ward.wardType, existing)
		}

		const byWardType = Array.from(byWardTypeMap.values()).map(item => ({
			...item,
			borPercentage:
				item.totalBeds > 0 ? Number(((item.occupiedBeds / item.totalBeds) * 100).toFixed(2)) : 0,
		}))

		const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
		const [recentAdmissions, recentDischarges] = await Promise.all([
			db
				.select({ count: count() })
				.from(encounters)
				.where(
					and(
						eq(encounters.facilityId, input.facilityId),
						sql`${encounters.admissionDatetime} >= ${since}`
					)
				),
			db
				.select({ count: count() })
				.from(encounters)
				.where(
					and(
						eq(encounters.facilityId, input.facilityId),
						sql`${encounters.dischargeDatetime} >= ${since}`
					)
				),
		])

		return {
			facilityId: input.facilityId,
			timestamp: new Date(),
			overall: {
				totalBeds,
				occupiedBeds,
				availableBeds,
				reservedBeds,
				cleaningBeds,
				outOfServiceBeds,
				borPercentage: totalBeds > 0 ? Number(((occupiedBeds / totalBeds) * 100).toFixed(2)) : 0,
			},
			byWardType,
			byWard,
			recentActivity: {
				admissionsLast24h: recentAdmissions[0]?.count ?? 0,
				dischargesLast24h: recentDischarges[0]?.count ?? 0,
				transfersLast24h: 0,
			},
		}
	}

	// ========================================================================
	// BOR Trend
	// ========================================================================

	async getBorTrend(input: BorTrendInput) {
		const period = input.period ?? "30d"
		const periodDays: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 }
		const days = periodDays[period] ?? 30
		const endDate = new Date()
		const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
		const startStr = startDate.toISOString().split("T")[0]!
		const endStr = endDate.toISOString().split("T")[0]!

		const conditions = [
			eq(bedCensusDaily.facilityId, input.facilityId),
			between(bedCensusDaily.censusDate, startStr, endStr),
		]
		if (input.wardId) {
			conditions.push(eq(bedCensusDaily.wardId, input.wardId))
		}

		const rows = await db
			.select({
				censusDate: bedCensusDaily.censusDate,
				midnightCensus: sql<number>`sum(${bedCensusDaily.midnightCensus})`,
				availableBeds: sql<number>`sum(${bedCensusDaily.availableBeds})`,
			})
			.from(bedCensusDaily)
			.where(and(...conditions))
			.groupBy(bedCensusDaily.censusDate)
			.orderBy(bedCensusDaily.censusDate)

		const points = rows.map(row => {
			const midnight = Number(row.midnightCensus)
			const available = Number(row.availableBeds)
			const total = available + midnight
			const borPercentage = total > 0 ? Math.round((midnight / total) * 100 * 100) / 100 : 0
			return {
				date: row.censusDate,
				borPercentage,
				midnightCensus: midnight,
				availableBeds: available,
			}
		})

		return { facilityId: input.facilityId, period, points }
	}

	// ========================================================================
	// AHSR Export
	// ========================================================================

	async exportAhsr(input: AhsrExportInput) {
		const conditions = [
			eq(bedCensusDaily.facilityId, input.facilityId),
			between(bedCensusDaily.censusDate, input.startDate, input.endDate),
		]
		if (input.wardId) {
			conditions.push(eq(bedCensusDaily.wardId, input.wardId))
		}

		const rows = await db
			.select({
				censusDate: bedCensusDaily.censusDate,
				midnightCensus: sql<number>`sum(${bedCensusDaily.midnightCensus})`,
				admissions: sql<number>`sum(${bedCensusDaily.admissions})`,
				discharges: sql<number>`sum(${bedCensusDaily.discharges})`,
				availableBeds: sql<number>`sum(${bedCensusDaily.availableBeds})`,
				deathsWithin48h: sql<number>`sum(${bedCensusDaily.deathsWithin48h})`,
				deathsAfter48h: sql<number>`sum(${bedCensusDaily.deathsAfter48h})`,
			})
			.from(bedCensusDaily)
			.where(and(...conditions))
			.groupBy(bedCensusDaily.censusDate)
			.orderBy(bedCensusDaily.censusDate)

		const ahsrRows = rows.map(row => {
			const midnight = Number(row.midnightCensus)
			const available = Number(row.availableBeds)
			const discharges = Number(row.discharges)
			const within48h = Number(row.deathsWithin48h)
			const after48h = Number(row.deathsAfter48h)
			const total = available + midnight
			const borPercentage = total > 0 ? Math.round((midnight / total) * 100 * 100) / 100 : 0
			return {
				censusDate: row.censusDate,
				midnightCensus: midnight,
				admissions: Number(row.admissions),
				discharges,
				availableBeds: available,
				deathsWithin48h: within48h,
				deathsAfter48h: after48h,
				grossDeathRate: BedsService.grossDeathRate(within48h, discharges),
				netDeathRate: BedsService.netDeathRate(after48h, discharges),
				borPercentage,
			}
		})

		const response: {
			facilityId: string
			startDate: string
			endDate: string
			rows: typeof ahsrRows
			csvContent?: string
		} = {
			facilityId: input.facilityId,
			startDate: input.startDate,
			endDate: input.endDate,
			rows: ahsrRows,
		}

		if (input.format === "csv") {
			const header =
				"Census Date,Midnight Census,Admissions,Discharges,Available Beds,Deaths <48h,Deaths >48h,Gross Death Rate,Net Death Rate,BOR %"
			const csvLines = ahsrRows.map(r =>
				[
					r.censusDate,
					r.midnightCensus,
					r.admissions,
					r.discharges,
					r.availableBeds,
					r.deathsWithin48h,
					r.deathsAfter48h,
					r.grossDeathRate,
					r.netDeathRate,
					r.borPercentage,
				].join(",")
			)
			response.csvContent = [header, ...csvLines].join("\n")
		}

		return response
	}

	// ========================================================================
	// Delete Ward
	// ========================================================================

	async deleteWard(input: DeleteWardInput) {
		const occupiedCount = await db
			.select({ count: count() })
			.from(beds)
			.where(and(eq(beds.wardId, input.wardId), eq(beds.status, "occupied")))

		if ((occupiedCount[0]?.count ?? 0) > 0) {
			throw new BadRequestException("Cannot delete ward: occupied beds exist")
		}

		await db.delete(beds).where(eq(beds.wardId, input.wardId))
		await db.delete(wards).where(eq(wards.id, input.wardId))

		this.logger.log(`Deleted ward ${input.wardId}`)
		return { success: true }
	}
}

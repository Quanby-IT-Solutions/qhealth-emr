import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm"

import { encounters, patients } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"

type PatientSearchInput = V1Inputs["patient"]["search"]
type CreatePatientInput = V1Inputs["patient"]["create"]
type UpdatePatientInput = V1Inputs["patient"]["update"]

@Injectable()
export class PatientsService {
	private readonly logger = new Logger(PatientsService.name)

	// ========================================================================
	// Search
	// ========================================================================

	async search(filter: PatientSearchInput) {
		const page = Number(filter.page) || 1
		const limit = Number(filter.limit) || 50
		const offset = (page - 1) * limit

		const conditions = [eq(patients.facilityId, filter.facilityId)]

		conditions.push(eq(patients.isActive, filter.isActive ?? true))

		if (filter.search) {
			const s = this.escapeLike(filter.search)
			conditions.push(
				or(
					ilike(patients.firstName, `%${s}%`),
					ilike(patients.lastName, `%${s}%`),
					ilike(patients.mrn, `%${s}%`)
				)!
			)
		}

		if (filter.mrn) {
			const m = this.escapeLike(filter.mrn)
			conditions.push(ilike(patients.mrn, `%${m}%`))
		}

		if (filter.dateOfBirth) {
			conditions.push(eq(patients.dateOfBirth, filter.dateOfBirth))
		}

		const whereClause = and(...conditions)

		// Subquery for last encounter date
		const lastEncounterSq = db
			.select({
				patientId: encounters.patientId,
				lastEncounterDate: sql<string>`max(${encounters.admissionDatetime})`.as(
					"last_encounter_date"
				),
			})
			.from(encounters)
			.groupBy(encounters.patientId)
			.as("last_enc")

		const [data, totalResult] = await Promise.all([
			db
				.select({
					id: patients.id,
					mrn: patients.mrn,
					firstName: patients.firstName,
					lastName: patients.lastName,
					middleName: patients.middleName,
					dateOfBirth: patients.dateOfBirth,
					sex: patients.sex,
					isActive: patients.isActive,
					lastEncounterDate: lastEncounterSq.lastEncounterDate,
				})
				.from(patients)
				.leftJoin(lastEncounterSq, eq(patients.id, lastEncounterSq.patientId))
				.where(whereClause)
				.orderBy(patients.lastName, patients.firstName)
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(patients).where(whereClause),
		])

		const total = totalResult[0]?.count ?? 0

		return {
			data: data.map(row => ({
				...row,
				lastEncounterDate: row.lastEncounterDate ?? null,
			})),
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	// ========================================================================
	// Get by ID (with encounter history)
	// ========================================================================

	async findById(id: string) {
		const [patient] = await db.select().from(patients).where(eq(patients.id, id))

		if (!patient) {
			throw new NotFoundException(`Patient ${id} not found`)
		}

		const patientEncounters = await db
			.select({
				id: encounters.id,
				encounterType: encounters.encounterType,
				status: encounters.status,
				chiefComplaint: encounters.chiefComplaint,
				admissionDatetime: encounters.admissionDatetime,
				dischargeDatetime: encounters.dischargeDatetime,
			})
			.from(encounters)
			.where(eq(encounters.patientId, id))
			.orderBy(desc(encounters.admissionDatetime))

		return {
			...patient,
			encounters: patientEncounters,
		}
	}

	// ========================================================================
	// Create (with auto-generated MRN)
	// ========================================================================

	async create(input: CreatePatientInput) {
		const MAX_RETRIES = 5
		const values = {
			facilityId: input.facilityId,
			firstName: input.firstName,
			lastName: input.lastName,
			middleName: input.middleName ?? null,
			dateOfBirth: input.dateOfBirth,
			sex: input.sex,
			addressLine1: input.addressLine1 ?? null,
			addressLine2: input.addressLine2 ?? null,
			city: input.city ?? null,
			province: input.province ?? null,
			zipCode: input.zipCode ?? null,
			phone: input.phone ?? null,
			email: input.email ?? null,
			philhealthMemberId: input.philhealthMemberId ?? null,
			emergencyContactName: input.emergencyContactName ?? null,
			emergencyContactPhone: input.emergencyContactPhone ?? null,
			nextOfKinName: input.nextOfKinName ?? null,
			nextOfKinRelationship: input.nextOfKinRelationship ?? null,
		}

		for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
			const mrn = await this.generateMrn(input.facilityId)
			try {
				const [created] = await db
					.insert(patients)
					.values({ ...values, mrn })
					.returning()
				this.logger.log(
					`Registered patient: ${created!.lastName}, ${created!.firstName} (MRN: ${mrn})`
				)
				return created!
			} catch (err) {
				if (this.isUniqueMrnViolation(err) && attempt < MAX_RETRIES - 1) {
					this.logger.warn(`MRN collision on ${mrn}, retrying (attempt ${attempt + 1})`)
					continue
				}
				throw err
			}
		}

		throw new Error(`Failed to generate a unique MRN after ${MAX_RETRIES} attempts`)
	}

	// ========================================================================
	// Update
	// ========================================================================

	async update(input: UpdatePatientInput) {
		const { id, ...updates } = input

		const [updated] = await db
			.update(patients)
			.set({ ...updates, updatedAt: new Date() })
			.where(eq(patients.id, id))
			.returning()

		if (!updated) {
			throw new NotFoundException(`Patient ${id} not found`)
		}

		this.logger.log(`Updated patient: ${id}`)
		return updated
	}

	// ========================================================================
	// MRN Generation — unique per facility, format: MRN-YYYYMMDD-NNNN
	// ========================================================================

	/** Escape special ILIKE pattern characters: %, _, \ */
	private escapeLike(str: string): string {
		return str.replace(/[%_\\]/g, "\\$&")
	}

	/** Detect a PostgreSQL unique-constraint violation (SQLSTATE 23505). */
	private isUniqueMrnViolation(err: unknown): boolean {
		return (
			typeof err === "object" &&
			err !== null &&
			"code" in err &&
			(err as { code: unknown }).code === "23505"
		)
	}

	private async generateMrn(facilityId: string): Promise<string> {
		const today = new Date()
		const dateStr =
			today.getFullYear().toString() +
			(today.getMonth() + 1).toString().padStart(2, "0") +
			today.getDate().toString().padStart(2, "0")

		const prefix = `MRN-${dateStr}-`

		// Count existing MRNs with this prefix for the facility
		const [result] = await db
			.select({ count: count() })
			.from(patients)
			.where(
				and(
					eq(patients.facilityId, facilityId),
					ilike(patients.mrn, `${prefix}%`)
				)
			)

		const sequence = (result?.count ?? 0) + 1
		return `${prefix}${sequence.toString().padStart(4, "0")}`
	}
}

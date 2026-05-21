import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common"
import { and, count, desc, eq } from "drizzle-orm"

import { birthRegistrations, staffProfiles } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

interface ListBirthRegistrationsInput {
	facilityId: string
	patientId?: string
	encounterId?: string
	status?: "draft" | "completed" | "submitted"
	page: number
	limit: number
}

interface CreateBirthRegistrationInput {
	facilityId: string
	patientId: string
	encounterId?: string
	birthDatetime: string | Date
	registeredByStaffId?: string
	certificateNumber?: string
	attendantAtBirth?: string
	placeOfBirthBarangay?: string
	placeOfBirthMunicipality?: string
	placeOfBirthProvince?: string
	placeOfBirthRegion?: string
	fatherName?: string
	motherName?: string
	physicianName?: string
	physicianLicenseNo?: string
	physicianSignature?: string
	attendingStaffId?: string
}

interface UpdateBirthRegistrationInput {
	id: string
	status?: "draft" | "completed" | "submitted"
	certificateNumber?: string
	attendantAtBirth?: string
	placeOfBirthBarangay?: string
	placeOfBirthMunicipality?: string
	placeOfBirthProvince?: string
	placeOfBirthRegion?: string
	fatherName?: string
	motherName?: string
	physicianName?: string
	physicianLicenseNo?: string
	physicianSignature?: string
	attendingStaffId?: string
	completedAt?: string | Date
	submittedAt?: string | Date
}

type BirthRegistrationRow = typeof birthRegistrations.$inferSelect

const requiredLcrBirthRegistrationFields: Array<{
	key: keyof BirthRegistrationRow
	label: string
}> = [
	{ key: "certificateNumber", label: "certificate number" },
	{ key: "attendantAtBirth", label: "attendant at birth" },
	{ key: "placeOfBirthBarangay", label: "place of birth barangay" },
	{ key: "placeOfBirthMunicipality", label: "place of birth municipality" },
	{ key: "placeOfBirthProvince", label: "place of birth province" },
	{ key: "placeOfBirthRegion", label: "place of birth region" },
	{ key: "fatherName", label: "father's full name" },
	{ key: "motherName", label: "mother's full name" },
	{ key: "physicianName", label: "attending physician name" },
	{ key: "physicianLicenseNo", label: "PRC license number" },
	{ key: "physicianSignature", label: "physician signature" },
]

function hasRequiredValue(value: unknown) {
	return typeof value === "string" ? value.trim().length > 0 : value !== null && value !== undefined
}

function getMissingLcrBirthRegistrationFields(row: BirthRegistrationRow) {
	return requiredLcrBirthRegistrationFields
		.filter(field => !hasRequiredValue(row[field.key]))
		.map(field => field.label)
}

@Injectable()
export class CivilRegistryService {
	private readonly logger = new Logger(CivilRegistryService.name)

	async listBirthRegistrations(input: ListBirthRegistrationsInput) {
		const page = Number(input.page) || 1
		const limit = Number(input.limit) || 50
		const offset = (page - 1) * limit

		const conditions = [eq(birthRegistrations.facilityId, input.facilityId)]
		if (input.patientId) conditions.push(eq(birthRegistrations.patientId, input.patientId))
		if (input.encounterId) conditions.push(eq(birthRegistrations.encounterId, input.encounterId))
		if (input.status) conditions.push(eq(birthRegistrations.status, input.status))

		const whereClause = and(...conditions)

		const [[totalResult], rows] = await Promise.all([
			db.select({ count: count() }).from(birthRegistrations).where(whereClause),
			db
				.select()
				.from(birthRegistrations)
				.where(whereClause)
				.orderBy(desc(birthRegistrations.createdAt))
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

	async getBirthRegistration(id: string) {
		const [row] = await db
			.select()
			.from(birthRegistrations)
			.where(eq(birthRegistrations.id, id))
			.limit(1)

		if (!row) throw new NotFoundException(`Birth registration ${id} not found`)
		return row
	}

	/**
	 * SLA-017: Creating a birth registration IS the formal request event.
	 * Sets requestedAt to now.
	 */
	async createBirthRegistration(input: CreateBirthRegistrationInput, userId?: string) {
		let resolvedStaffId = input.registeredByStaffId ?? null

		const placeOfBirthComponents = [
			input.placeOfBirthBarangay,
			input.placeOfBirthMunicipality,
			input.placeOfBirthProvince,
			input.placeOfBirthRegion,
		]
		const hasLocationInput = placeOfBirthComponents.some(component => component !== undefined)
		const hasLocationValue = placeOfBirthComponents.some(component => component?.trim())

		if (hasLocationInput && !hasLocationValue) {
			throw new BadRequestException("At least one place of birth location component is required")
		}

		if (!resolvedStaffId && userId) {
			const [staff] = await db
				.select({ id: staffProfiles.id })
				.from(staffProfiles)
				.where(eq(staffProfiles.userId, userId))
				.limit(1)
			resolvedStaffId = staff?.id ?? null
		}

		const [created] = await db
			.insert(birthRegistrations)
			.values({
				facilityId: input.facilityId,
				patientId: input.patientId,
				encounterId: input.encounterId ?? null,
				birthDatetime: new Date(input.birthDatetime),
				registeredByStaffId: resolvedStaffId,
				certificateNumber: input.certificateNumber ?? null,
				attendantAtBirth: input.attendantAtBirth ?? null,
				placeOfBirthBarangay: input.placeOfBirthBarangay ?? null,
				placeOfBirthMunicipality: input.placeOfBirthMunicipality ?? null,
				placeOfBirthProvince: input.placeOfBirthProvince ?? null,
				placeOfBirthRegion: input.placeOfBirthRegion ?? null,
				fatherName: input.fatherName ?? null,
				motherName: input.motherName ?? null,
				physicianName: input.physicianName ?? null,
				physicianLicenseNo: input.physicianLicenseNo ?? null,
				physicianSignature: input.physicianSignature ?? null,
				attendingStaffId: input.attendingStaffId ?? null,
				status: "draft",
				// SLA-017: record the moment the birth certificate request was formally submitted
				requestedAt: new Date(),
			})
			.returning()

		if (!created) {
			throw new Error("Failed to create birth registration")
		}

		this.logger.log(`Created birth registration ${created.id}`)
		return created
	}

	async updateBirthRegistration(input: UpdateBirthRegistrationInput) {
		const existing = await this.getBirthRegistration(input.id)

		const updateData: Record<string, unknown> = { updatedAt: new Date() }
		if (input.status !== undefined) updateData.status = input.status
		if (input.certificateNumber !== undefined)
			updateData.certificateNumber = input.certificateNumber
		if (input.attendantAtBirth !== undefined) updateData.attendantAtBirth = input.attendantAtBirth
		if (input.placeOfBirthBarangay !== undefined)
			updateData.placeOfBirthBarangay = input.placeOfBirthBarangay
		if (input.placeOfBirthMunicipality !== undefined)
			updateData.placeOfBirthMunicipality = input.placeOfBirthMunicipality
		if (input.placeOfBirthProvince !== undefined)
			updateData.placeOfBirthProvince = input.placeOfBirthProvince
		if (input.placeOfBirthRegion !== undefined)
			updateData.placeOfBirthRegion = input.placeOfBirthRegion
		if (input.fatherName !== undefined) updateData.fatherName = input.fatherName
		if (input.motherName !== undefined) updateData.motherName = input.motherName
		if (input.physicianName !== undefined) updateData.physicianName = input.physicianName
		if (input.physicianLicenseNo !== undefined)
			updateData.physicianLicenseNo = input.physicianLicenseNo
		if (input.physicianSignature !== undefined)
			updateData.physicianSignature = input.physicianSignature
		if (input.attendingStaffId !== undefined) updateData.attendingStaffId = input.attendingStaffId
		if (input.completedAt !== undefined) updateData.completedAt = new Date(input.completedAt)
		if (input.submittedAt !== undefined) updateData.submittedAt = new Date(input.submittedAt)

		if (input.status === "submitted" || input.submittedAt !== undefined) {
			this.assertLcrBirthRegistrationComplete({ ...existing, ...updateData })
		}

		await db.update(birthRegistrations).set(updateData).where(eq(birthRegistrations.id, input.id))

		return this.getBirthRegistration(input.id)
	}

	/**
	 * SLA-017: Mark a birth registration as paid.
	 * Sets paidAt to record the moment payment was received for the birth certificate (Flow 7 Step 2).
	 */
	async markBirthRegistrationPaid(input: { id: string; paidAt?: Date }) {
		const paidAt = input.paidAt ?? new Date()

		const [updated] = await db
			.update(birthRegistrations)
			.set({ paidAt, updatedAt: new Date() })
			.where(eq(birthRegistrations.id, input.id))
			.returning()

		if (!updated) {
			throw new NotFoundException(`Birth registration ${input.id} not found`)
		}

		return { id: updated.id, paidAt: updated.paidAt?.toISOString() ?? null }
	}

	/**
	 * SLA-021: Mark a birth registration as released to the family.
	 * Sets releasedByStaffId, releasedAt, completedAt, and status="completed" to provide
	 * an authoritative Flow 7 Step 3 evidence trail and close the SLA window.
	 */
	async markBirthRegistrationReleased(input: {
		id: string
		releasedByStaffId: string
		releasedAt?: Date
	}) {
		const releasedAt = input.releasedAt ?? new Date()
		await this.assertActiveReleaseStaffProfile(input.id, input.releasedByStaffId)
		await this.assertBirthRegistrationReadyForRelease(input.id)

		const [updated] = await db
			.update(birthRegistrations)
			.set({
				releasedByStaffId: input.releasedByStaffId,
				releasedAt,
				completedAt: releasedAt,
				status: "completed" as const,
				updatedAt: new Date(),
			})
			.where(eq(birthRegistrations.id, input.id))
			.returning()

		if (!updated) {
			throw new NotFoundException(`Birth registration ${input.id} not found`)
		}

		return {
			id: updated.id,
			releasedByStaffId: updated.releasedByStaffId ?? null,
			releasedAt: updated.releasedAt?.toISOString() ?? null,
			status: updated.status,
			completedAt: updated.completedAt?.toISOString() ?? null,
		}
	}

	private async assertActiveReleaseStaffProfile(id: string, releasedByStaffId: string) {
		const [registration] = await db
			.select({ facilityId: birthRegistrations.facilityId })
			.from(birthRegistrations)
			.where(eq(birthRegistrations.id, id))
			.limit(1)

		if (!registration) {
			throw new NotFoundException(`Birth registration ${id} not found`)
		}

		const [profile] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(
				and(
					eq(staffProfiles.id, releasedByStaffId),
					eq(staffProfiles.facilityId, registration.facilityId),
					eq(staffProfiles.isActive, true)
				)
			)
			.limit(1)

		if (!profile) {
			throw new ForbiddenException(
				"An active staff profile in this facility is required to release a birth certificate"
			)
		}
	}

	private async assertBirthRegistrationReadyForRelease(id: string) {
		this.assertLcrBirthRegistrationComplete(await this.getBirthRegistration(id))
	}

	private assertLcrBirthRegistrationComplete(row: BirthRegistrationRow) {
		const missingFields = getMissingLcrBirthRegistrationFields(row)

		if (missingFields.length > 0) {
			throw new BadRequestException(`Required LCR fields are missing: ${missingFields.join(", ")}`)
		}
	}
}

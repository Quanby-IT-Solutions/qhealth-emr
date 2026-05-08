import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq, inArray } from "drizzle-orm"

import type {
	ApproveCrossMatch,
	BedsideVerifyInput,
	BedsideVerifyResult,
	BloodUnit,
	CreateCrossMatch,
	CrossMatchListQuery,
	CrossMatchListResponse,
	CrossMatchRequest,
} from "@repo/contracts"
import {
	bloodUnits,
	crossMatchRequests,
	crossMatchUnitAssignments,
	encounters,
	labOrders,
	patients,
	staffProfiles,
	transfusionVerifications,
	users,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"

type CrossMatchRow = typeof crossMatchRequests.$inferSelect
type BloodUnitRow = typeof bloodUnits.$inferSelect

@Injectable()
export class LabService {
	// ========================================================================
	// Blood Bank — Cross-Match Requests
	// ========================================================================

	async listCrossMatches(query: CrossMatchListQuery): Promise<CrossMatchListResponse> {
		const page = Number(query.page ?? 1)
		const limit = Number(query.limit ?? 50)
		const offset = (page - 1) * limit
		const conditions = [eq(crossMatchRequests.facilityId, query.facilityId)]

		if (query.status) conditions.push(eq(crossMatchRequests.status, query.status))

		const whereClause = and(...conditions)
		const [[totalRow], rows] = await Promise.all([
			db.select({ total: count() }).from(crossMatchRequests).where(whereClause),
			db
				.select({
					request: crossMatchRequests,
					patientFirstName: patients.firstName,
					patientLastName: patients.lastName,
					patientMiddleName: patients.middleName,
					patientMrn: patients.mrn,
				})
				.from(crossMatchRequests)
				.innerJoin(patients, eq(crossMatchRequests.patientId, patients.id))
				.where(whereClause)
				.orderBy(desc(crossMatchRequests.requestedAt), desc(crossMatchRequests.createdAt))
				.limit(limit)
				.offset(offset),
		])

		const data = await this.mapRows(rows)
		const total = totalRow?.total ?? 0

		return {
			data,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	async getCrossMatch(id: string): Promise<CrossMatchRequest> {
		return this.getCrossMatchOrThrow(id)
	}

	async createCrossMatch(
		input: CreateCrossMatch,
		requestedById: string
	): Promise<CrossMatchRequest> {
		const staff = await this.getStaffProfileForUser(requestedById)

		const [patient] = await db
			.select({ id: patients.id, facilityId: patients.facilityId })
			.from(patients)
			.where(eq(patients.id, input.patientId))

		if (!patient) throw new NotFoundException(`Patient ${input.patientId} not found`)
		if (patient.facilityId !== input.facilityId) {
			throw new BadRequestException("Patient does not belong to the selected facility")
		}

		const encounterId = await this.resolveEncounterId(input)

		const [created] = await db
			.insert(crossMatchRequests)
			.values({
				facilityId: input.facilityId,
				patientId: input.patientId,
				encounterId,
				sourceLabOrderId: input.sourceLabOrderId ?? null,
				bloodType: input.bloodType ?? null,
				componentType: input.componentType,
				unitsRequested: input.unitsRequested,
				urgency: input.urgency,
				clinicalIndication: input.clinicalIndication ?? null,
				compatibilityResult: "pending",
				status: "pending",
				requestedByStaffId: staff.id,
			})
			.returning({ id: crossMatchRequests.id })

		return this.getCrossMatchOrThrow(created!.id)
	}

	async approveCrossMatch(
		input: ApproveCrossMatch,
		approvedById: string
	): Promise<CrossMatchRequest> {
		const staff = await this.getStaffProfileForUser(approvedById)
		const [request] = await db
			.select()
			.from(crossMatchRequests)
			.where(eq(crossMatchRequests.id, input.id))

		if (!request) throw new NotFoundException(`Cross-match request with id ${input.id} not found`)
		if (!["pending", "cross_matched"].includes(request.status)) {
			throw new BadRequestException(`Cross-match request is already ${request.status}`)
		}

		if (input.compatibilityResult === "incompatible") {
			await db
				.update(crossMatchRequests)
				.set({
					status: "cancelled",
					compatibilityResult: "incompatible",
					crossMatchedByStaffId: staff.id,
					crossMatchedAt: new Date(),
					approvedByStaffId: staff.id,
					approvedAt: new Date(),
					cancelledByStaffId: staff.id,
					cancelledAt: new Date(),
					rejectionReason: input.rejectionReason ?? "Cross-match incompatible",
					updatedAt: new Date(),
				})
				.where(eq(crossMatchRequests.id, input.id))

			return this.getCrossMatchOrThrow(input.id)
		}

		const bloodUnitIds = input.bloodUnitIds ?? []

		if (bloodUnitIds.length === 0) {
			throw new BadRequestException("At least one blood unit is required for compatible approval")
		}
		if (bloodUnitIds.length < request.unitsRequested) {
			throw new BadRequestException("Assigned blood units are fewer than the requested units")
		}
		if (!request.bloodType) {
			throw new BadRequestException("Patient blood type is required before compatible approval")
		}

		await db.transaction(async tx => {
			const units = await tx.select().from(bloodUnits).where(inArray(bloodUnits.id, bloodUnitIds))

			this.validateBloodUnitsForApproval(request, units, bloodUnitIds)

			await tx
				.update(bloodUnits)
				.set({ status: "reserved", updatedAt: new Date() })
				.where(inArray(bloodUnits.id, bloodUnitIds))

			await tx.insert(crossMatchUnitAssignments).values(
				bloodUnitIds.map(bloodUnitId => ({
					crossMatchRequestId: input.id,
					bloodUnitId,
					status: "reserved" as const,
				}))
			)

			await tx
				.update(crossMatchRequests)
				.set({
					status: "approved",
					compatibilityResult: "compatible",
					crossMatchedByStaffId: staff.id,
					crossMatchedAt: request.crossMatchedAt ?? new Date(),
					approvedByStaffId: staff.id,
					approvedAt: new Date(),
					rejectionReason: null,
					updatedAt: new Date(),
				})
				.where(eq(crossMatchRequests.id, input.id))
		})

		return this.getCrossMatchOrThrow(input.id)
	}

	// ========================================================================
	// Blood Bank — Bedside Verification
	// ========================================================================

	async bedsideVerify(
		input: BedsideVerifyInput,
		verifiedById?: string
	): Promise<BedsideVerifyResult> {
		const [row] = await db
			.select({
				request: crossMatchRequests,
				patientId: patients.id,
				patientMrn: patients.mrn,
			})
			.from(crossMatchRequests)
			.innerJoin(patients, eq(crossMatchRequests.patientId, patients.id))
			.where(eq(crossMatchRequests.id, input.crossMatchId))

		if (!row) throw new NotFoundException(`Cross-match request ${input.crossMatchId} not found`)

		const [assignedUnit] = await db
			.select({ assignment: crossMatchUnitAssignments, unit: bloodUnits })
			.from(crossMatchUnitAssignments)
			.innerJoin(bloodUnits, eq(crossMatchUnitAssignments.bloodUnitId, bloodUnits.id))
			.where(
				and(
					eq(crossMatchUnitAssignments.crossMatchRequestId, input.crossMatchId),
					eq(bloodUnits.unitBarcode, input.unitBarcode)
				)
			)

		const patientMatch = [row.patientId, row.patientMrn].includes(input.patientWristbandBarcode)
		const unitMatch = Boolean(assignedUnit)
		const statusAllowsTransfusion = ["approved", "issued"].includes(row.request.status)
		const verified = patientMatch && unitMatch && statusAllowsTransfusion
		const message = this.buildVerificationMessage({
			patientMatch,
			unitMatch,
			statusAllowsTransfusion,
		})
		const staff = verifiedById ? await this.getOptionalStaffProfileForUser(verifiedById) : null

		await db.insert(transfusionVerifications).values({
			crossMatchRequestId: input.crossMatchId,
			bloodUnitId: assignedUnit?.unit.id ?? null,
			patientId: row.patientId,
			verifiedByStaffId: staff?.id ?? null,
			unitBarcode: input.unitBarcode,
			patientWristbandBarcode: input.patientWristbandBarcode,
			verified,
			patientMatch,
			unitMatch,
			message,
		})

		return { verified, patientMatch, unitMatch, message }
	}

	private async getCrossMatchOrThrow(id: string): Promise<CrossMatchRequest> {
		const [row] = await db
			.select({
				request: crossMatchRequests,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMiddleName: patients.middleName,
				patientMrn: patients.mrn,
			})
			.from(crossMatchRequests)
			.innerJoin(patients, eq(crossMatchRequests.patientId, patients.id))
			.where(eq(crossMatchRequests.id, id))

		if (!row) throw new NotFoundException(`Cross-match request with id ${id} not found`)

		const [mapped] = await this.mapRows([row])
		return mapped!
	}

	private async mapRows(
		rows: Array<{
			request: CrossMatchRow
			patientFirstName: string
			patientLastName: string
			patientMiddleName: string | null
			patientMrn: string | null
		}>
	): Promise<CrossMatchRequest[]> {
		const requestIds = rows.map(row => row.request.id)
		const assignedUnits = await this.getAssignedUnits(requestIds)
		const staffNames = await this.getStaffDisplayNames(
			rows.flatMap(row => [
				row.request.requestedByStaffId,
				row.request.crossMatchedByStaffId,
				row.request.approvedByStaffId,
				row.request.issuedByStaffId,
				row.request.cancelledByStaffId,
			])
		)

		return rows.map(row => ({
			id: row.request.id,
			facilityId: row.request.facilityId,
			patientId: row.request.patientId,
			encounterId: row.request.encounterId,
			sourceLabOrderId: row.request.sourceLabOrderId,
			patientMrn: row.patientMrn,
			patientName: this.formatPatientName(row),
			bloodType: row.request.bloodType,
			componentType: row.request.componentType,
			unitsRequested: row.request.unitsRequested,
			urgency: row.request.urgency,
			clinicalIndication: row.request.clinicalIndication,
			compatibilityResult: row.request.compatibilityResult,
			status: row.request.status,
			requestedBy: staffNames.get(row.request.requestedByStaffId) ?? row.request.requestedByStaffId,
			requestedAt: this.serializeRequiredDate(row.request.requestedAt),
			crossMatchedBy: this.lookupNullableStaff(staffNames, row.request.crossMatchedByStaffId),
			crossMatchedAt: this.serializeDate(row.request.crossMatchedAt),
			approvedBy: this.lookupNullableStaff(staffNames, row.request.approvedByStaffId),
			approvedAt: this.serializeDate(row.request.approvedAt),
			issuedBy: this.lookupNullableStaff(staffNames, row.request.issuedByStaffId),
			issuedAt: this.serializeDate(row.request.issuedAt),
			cancelledBy: this.lookupNullableStaff(staffNames, row.request.cancelledByStaffId),
			cancelledAt: this.serializeDate(row.request.cancelledAt),
			rejectionReason: row.request.rejectionReason,
			bloodUnits: assignedUnits.get(row.request.id) ?? [],
			createdAt: this.serializeRequiredDate(row.request.createdAt),
			updatedAt: this.serializeRequiredDate(row.request.updatedAt),
		}))
	}

	private async getAssignedUnits(requestIds: string[]): Promise<Map<string, BloodUnit[]>> {
		if (requestIds.length === 0) return new Map()

		const rows = await db
			.select({ requestId: crossMatchUnitAssignments.crossMatchRequestId, unit: bloodUnits })
			.from(crossMatchUnitAssignments)
			.innerJoin(bloodUnits, eq(crossMatchUnitAssignments.bloodUnitId, bloodUnits.id))
			.where(inArray(crossMatchUnitAssignments.crossMatchRequestId, requestIds))

		const byRequest = new Map<string, BloodUnit[]>()
		for (const row of rows) {
			const units = byRequest.get(row.requestId) ?? []
			units.push(this.mapBloodUnit(row.unit))
			byRequest.set(row.requestId, units)
		}

		return byRequest
	}

	private async getStaffDisplayNames(staffIds: Array<string | null>): Promise<Map<string, string>> {
		const ids = [...new Set(staffIds.filter((id): id is string => Boolean(id)))]
		if (ids.length === 0) return new Map()

		const rows = await db
			.select({ staffId: staffProfiles.id, userName: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.where(inArray(staffProfiles.id, ids))

		return new Map(rows.map(row => [row.staffId, row.userName]))
	}

	private async getStaffProfileForUser(userId: string) {
		const [staff] = await db.select().from(staffProfiles).where(eq(staffProfiles.userId, userId))
		if (!staff) throw new NotFoundException("Staff profile not found for user")
		return staff
	}

	private async getOptionalStaffProfileForUser(userId: string) {
		const [staff] = await db.select().from(staffProfiles).where(eq(staffProfiles.userId, userId))
		return staff ?? null
	}

	private async resolveEncounterId(input: CreateCrossMatch): Promise<string | null> {
		let encounterId = input.encounterId ?? null

		if (input.sourceLabOrderId) {
			const [sourceOrder] = await db
				.select({
					facilityId: labOrders.facilityId,
					encounterId: labOrders.encounterId,
				})
				.from(labOrders)
				.where(eq(labOrders.id, input.sourceLabOrderId))

			if (!sourceOrder) throw new NotFoundException(`Lab order ${input.sourceLabOrderId} not found`)
			if (sourceOrder.facilityId !== input.facilityId) {
				throw new BadRequestException("Source lab order does not belong to the selected facility")
			}

			encounterId ??= sourceOrder.encounterId
		}

		if (encounterId) {
			const [encounter] = await db
				.select({
					id: encounters.id,
					facilityId: encounters.facilityId,
					patientId: encounters.patientId,
				})
				.from(encounters)
				.where(eq(encounters.id, encounterId))

			if (!encounter) throw new NotFoundException(`Encounter ${encounterId} not found`)
			if (encounter.facilityId !== input.facilityId || encounter.patientId !== input.patientId) {
				throw new BadRequestException("Encounter does not match the selected patient and facility")
			}
		}

		return encounterId
	}

	private validateBloodUnitsForApproval(
		request: CrossMatchRow,
		units: BloodUnitRow[],
		requestedUnitIds: string[]
	) {
		if (units.length !== requestedUnitIds.length) {
			throw new NotFoundException("One or more blood units were not found")
		}

		for (const unit of units) {
			if (unit.facilityId !== request.facilityId) {
				throw new BadRequestException(`Blood unit ${unit.unitBarcode} belongs to another facility`)
			}
			if (unit.status !== "available") {
				throw new BadRequestException(`Blood unit ${unit.unitBarcode} is not available`)
			}
			if (unit.componentType !== request.componentType) {
				throw new BadRequestException(`Blood unit ${unit.unitBarcode} component does not match`)
			}
			if (!this.isBloodTypeCompatible(request.bloodType, unit.bloodType)) {
				throw new BadRequestException(`Blood unit ${unit.unitBarcode} is not ABO/Rh compatible`)
			}
		}
	}

	private isBloodTypeCompatible(
		recipientType: CrossMatchRow["bloodType"],
		donorType: BloodUnitRow["bloodType"]
	) {
		if (!recipientType) return false

		const compatibleDonors: Record<
			NonNullable<CrossMatchRow["bloodType"]>,
			BloodUnitRow["bloodType"][]
		> = {
			"A+": ["A+", "A-", "O+", "O-"],
			"A-": ["A-", "O-"],
			"B+": ["B+", "B-", "O+", "O-"],
			"B-": ["B-", "O-"],
			"AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
			"AB-": ["A-", "B-", "AB-", "O-"],
			"O+": ["O+", "O-"],
			"O-": ["O-"],
		}

		return compatibleDonors[recipientType]?.includes(donorType) ?? false
	}

	private buildVerificationMessage(input: {
		patientMatch: boolean
		unitMatch: boolean
		statusAllowsTransfusion: boolean
	}) {
		if (input.patientMatch && input.unitMatch && input.statusAllowsTransfusion) {
			return "Patient and blood unit match. Safe to proceed with transfusion."
		}
		if (!input.statusAllowsTransfusion)
			return "Cross-match is not approved or issued for transfusion."
		if (!input.patientMatch) return "Patient wristband does not match the cross-match request."
		return "Blood unit barcode is not assigned to this cross-match request."
	}

	private formatPatientName(row: {
		patientFirstName: string
		patientLastName: string
		patientMiddleName: string | null
	}) {
		return [row.patientLastName, row.patientFirstName, row.patientMiddleName]
			.filter(Boolean)
			.join(", ")
	}

	private lookupNullableStaff(names: Map<string, string>, staffId: string | null) {
		return staffId ? (names.get(staffId) ?? staffId) : null
	}

	private mapBloodUnit(unit: BloodUnitRow): BloodUnit {
		return {
			id: unit.id,
			facilityId: unit.facilityId,
			unitBarcode: unit.unitBarcode,
			bloodType: unit.bloodType,
			componentType: unit.componentType,
			collectionDate: this.serializeDate(unit.collectionDate),
			expiryDate: this.serializeRequiredDate(unit.expiryDate),
			status: unit.status,
			donorId: unit.donorId,
		}
	}

	private serializeDate(value: Date | string | null): string | null {
		if (!value) return null
		return value instanceof Date ? value.toISOString() : value
	}

	private serializeRequiredDate(value: Date | string): string {
		return value instanceof Date ? value.toISOString() : value
	}
}

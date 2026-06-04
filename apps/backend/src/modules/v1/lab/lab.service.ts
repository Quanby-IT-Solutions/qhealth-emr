import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"

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
// Type-only imports: used purely for row typing. No Drizzle client/connection
// is created here — this module talks to the database via the Supabase JS client.
import type { bloodUnits, crossMatchRequests } from "@repo/db/schema"

import { supabase, unwrap, unwrapMany } from "@/common/database/supabase.client"

type CrossMatchRow = typeof crossMatchRequests.$inferSelect
type BloodUnitRow = typeof bloodUnits.$inferSelect

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const toDate = (value: unknown): Date | null => (value == null ? null : new Date(value as string))
const toDateReq = (value: unknown): Date => new Date(value as string)

/** Map a snake_case cross_match_requests row from Supabase to the camelCase row shape. */
function toCrossMatchRow(r: Record<string, unknown>): CrossMatchRow {
	return {
		id: r.id,
		facilityId: r.facility_id,
		patientId: r.patient_id,
		encounterId: r.encounter_id,
		sourceLabOrderId: r.source_lab_order_id,
		bloodType: r.blood_type,
		componentType: r.component_type,
		unitsRequested: r.units_requested,
		urgency: r.urgency,
		clinicalIndication: r.clinical_indication,
		compatibilityResult: r.compatibility_result,
		status: r.status,
		requestedByStaffId: r.requested_by_staff_id,
		requestedAt: toDateReq(r.requested_at),
		crossMatchedByStaffId: r.cross_matched_by_staff_id,
		crossMatchedAt: toDate(r.cross_matched_at),
		approvedByStaffId: r.approved_by_staff_id,
		approvedAt: toDate(r.approved_at),
		issuedByStaffId: r.issued_by_staff_id,
		issuedAt: toDate(r.issued_at),
		cancelledByStaffId: r.cancelled_by_staff_id,
		cancelledAt: toDate(r.cancelled_at),
		rejectionReason: r.rejection_reason,
		createdAt: toDateReq(r.created_at),
		updatedAt: toDateReq(r.updated_at),
	} as CrossMatchRow
}

/** Map a snake_case blood_units row from Supabase to the camelCase row shape. */
function toBloodUnitRow(r: Record<string, unknown>): BloodUnitRow {
	return {
		id: r.id,
		facilityId: r.facility_id,
		unitBarcode: r.unit_barcode,
		bloodType: r.blood_type,
		componentType: r.component_type,
		donorId: r.donor_id,
		collectionDate: r.collection_date,
		expiryDate: r.expiry_date,
		status: r.status,
		createdAt: toDateReq(r.created_at),
		updatedAt: toDateReq(r.updated_at),
	} as BloodUnitRow
}

type CrossMatchListRow = {
	request: CrossMatchRow
	patientFirstName: string
	patientLastName: string
	patientMiddleName: string | null
	patientMrn: string | null
}

@Injectable()
export class LabService {
	// ========================================================================
	// Blood Bank — Cross-Match Requests
	// ========================================================================

	async listCrossMatches(query: CrossMatchListQuery): Promise<CrossMatchListResponse> {
		const page = Number(query.page ?? 1)
		const limit = Number(query.limit ?? 50)
		const offset = (page - 1) * limit

		// Resolve patient MRN → id (the original used an inner join on patients).
		let patientId: string | undefined
		if (query.patientMrn) {
			const patient = unwrap(
				await supabase
					.from("patients")
					.select("id")
					.eq("facility_id", query.facilityId)
					.eq("mrn", query.patientMrn)
					.maybeSingle()
			)
			if (!patient) return { data: [], total: 0, page, limit, totalPages: 0 }
			patientId = patient.id
		}

		let countQuery = supabase
			.from("cross_match_requests")
			.select("*", { count: "exact", head: true })
			.eq("facility_id", query.facilityId)
		if (query.status) countQuery = countQuery.eq("status", query.status)
		if (patientId) countQuery = countQuery.eq("patient_id", patientId)
		const countResult = await countQuery
		if (countResult.error) throw new Error(countResult.error.message)
		const total = countResult.count ?? 0

		let rowsQuery = supabase
			.from("cross_match_requests")
			.select("*")
			.eq("facility_id", query.facilityId)
		if (query.status) rowsQuery = rowsQuery.eq("status", query.status)
		if (patientId) rowsQuery = rowsQuery.eq("patient_id", patientId)
		const rawRows = unwrapMany(
			await rowsQuery
				.order("requested_at", { ascending: false })
				.order("created_at", { ascending: false })
				.range(offset, offset + limit - 1)
		)

		const data = await this.mapRows(await this.assembleRows(rawRows))

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

		const patient = await this.getPatientForCrossMatch(input.patientId, input.facilityId)

		if (patient.facilityId !== input.facilityId) {
			throw new BadRequestException("Patient does not belong to the selected facility")
		}

		const encounterId = await this.resolveEncounterId(input, patient.id)
		const donorUnits = await this.getCompatibleDonorUnits(input)
		const hasUnits = donorUnits.length > 0

		// Atomic insert + unit reservation runs in the bb_create_cross_match RPC.
		const createdId = unwrap(
			await supabase.rpc("bb_create_cross_match", {
				p_request: {
					facility_id: input.facilityId,
					patient_id: patient.id,
					encounter_id: encounterId,
					source_lab_order_id: input.sourceLabOrderId ?? null,
					blood_type: input.bloodType ?? null,
					component_type: input.componentType,
					units_requested: input.unitsRequested,
					urgency: input.urgency,
					clinical_indication: input.clinicalIndication ?? null,
					compatibility_result: "pending",
					status: hasUnits ? "cross_matched" : "pending",
					requested_by_staff_id: staff.id,
					cross_matched_by_staff_id: hasUnits ? staff.id : null,
					cross_matched_at: hasUnits ? new Date().toISOString() : null,
				},
				p_blood_unit_ids: donorUnits.map(unit => unit.id),
			})
		)

		if (!createdId) throw new BadRequestException("Unable to create cross-match request")

		return this.getCrossMatchOrThrow(createdId as string)
	}

	async approveCrossMatch(
		input: ApproveCrossMatch,
		approvedById: string
	): Promise<CrossMatchRequest> {
		const staff = await this.getStaffProfileForUser(approvedById)
		const raw = unwrap(
			await supabase.from("cross_match_requests").select("*").eq("id", input.id).maybeSingle()
		)

		if (!raw) throw new NotFoundException(`Cross-match request with id ${input.id} not found`)
		const request = toCrossMatchRow(raw)
		if (!["pending", "cross_matched"].includes(request.status)) {
			throw new BadRequestException(`Cross-match request is already ${request.status}`)
		}

		if (input.compatibilityResult === "incompatible") {
			unwrap(
				await supabase.rpc("bb_approve_cross_match_incompatible", {
					p_id: input.id,
					p_staff_id: staff.id,
					p_rejection_reason: input.rejectionReason ?? null,
				})
			)

			return this.getCrossMatchOrThrow(input.id)
		}

		const existingAssignments = unwrapMany(
			await supabase
				.from("cross_match_unit_assignments")
				.select("blood_unit_id")
				.eq("cross_match_request_id", input.id)
		)
		const existingAssignedUnitIds = existingAssignments.map(
			(row: { blood_unit_id: string }) => row.blood_unit_id
		)
		const existingAssignedUnitIdSet = new Set<string>(existingAssignedUnitIds)
		const submittedBloodUnitIds = [...new Set(input.bloodUnitIds ?? [])]
		const bloodUnitIds =
			submittedBloodUnitIds.length > 0 ? submittedBloodUnitIds : existingAssignedUnitIds

		if (bloodUnitIds.length > 0 && bloodUnitIds.length < request.unitsRequested) {
			throw new BadRequestException("Assigned blood units are fewer than the requested units")
		}
		if (bloodUnitIds.length > 0 && !request.bloodType) {
			throw new BadRequestException("Patient blood type is required before compatible approval")
		}

		if (bloodUnitIds.length > 0) {
			const units = unwrapMany(
				await supabase.from("blood_units").select("*").in("id", bloodUnitIds)
			).map(toBloodUnitRow)

			this.validateBloodUnitsForApproval(request, units, bloodUnitIds, existingAssignedUnitIdSet)
		}

		const newBloodUnitIds = bloodUnitIds.filter(id => !existingAssignedUnitIdSet.has(id))

		// Atomic unit reservation + request approval runs in the RPC.
		unwrap(
			await supabase.rpc("bb_approve_cross_match_compatible", {
				p_id: input.id,
				p_blood_unit_ids: bloodUnitIds,
				p_new_blood_unit_ids: newBloodUnitIds,
				p_staff_id: staff.id,
				p_cross_matched_at: request.crossMatchedAt ? request.crossMatchedAt.toISOString() : null,
			})
		)

		return this.getCrossMatchOrThrow(input.id)
	}

	// ========================================================================
	// Blood Bank — Bedside Verification
	// ========================================================================

	async bedsideVerify(
		input: BedsideVerifyInput,
		verifiedById?: string
	): Promise<BedsideVerifyResult> {
		const raw = unwrap(
			await supabase
				.from("cross_match_requests")
				.select("*")
				.eq("id", input.crossMatchId)
				.maybeSingle()
		)
		if (!raw) throw new NotFoundException(`Cross-match request ${input.crossMatchId} not found`)
		const request = toCrossMatchRow(raw)

		const patient = unwrap(
			await supabase.from("patients").select("id, mrn").eq("id", request.patientId).maybeSingle()
		)
		const patientId = patient?.id ?? request.patientId
		const patientMrn: string | null = patient?.mrn ?? null

		// Find the assigned blood unit for this request that matches the scanned barcode.
		const assignments = unwrapMany(
			await supabase
				.from("cross_match_unit_assignments")
				.select("blood_unit_id")
				.eq("cross_match_request_id", input.crossMatchId)
		)
		const assignedUnitIds = assignments.map((a: { blood_unit_id: string }) => a.blood_unit_id)
		let assignedUnitId: string | null = null
		if (assignedUnitIds.length > 0) {
			const unit = unwrap(
				await supabase
					.from("blood_units")
					.select("id")
					.in("id", assignedUnitIds)
					.eq("unit_barcode", input.unitBarcode)
					.maybeSingle()
			)
			assignedUnitId = unit?.id ?? null
		}

		const patientMatch = [patientId, patientMrn].includes(input.patientWristbandBarcode)
		const unitMatch = Boolean(assignedUnitId)
		const statusAllowsTransfusion = ["approved", "issued"].includes(request.status)
		const verified = patientMatch && unitMatch && statusAllowsTransfusion
		const message = this.buildVerificationMessage({
			patientMatch,
			unitMatch,
			statusAllowsTransfusion,
		})

		if (verified) {
			const staff = verifiedById ? await this.getOptionalStaffProfileForUser(verifiedById) : null

			unwrap(
				await supabase.from("transfusion_verifications").insert({
					cross_match_request_id: input.crossMatchId,
					blood_unit_id: assignedUnitId,
					patient_id: patientId,
					verified_by_staff_id: staff?.id ?? null,
					unit_barcode: input.unitBarcode,
					patient_wristband_barcode: input.patientWristbandBarcode,
					verified,
					patient_match: patientMatch,
					unit_match: unitMatch,
					message,
				})
			)
		}

		return { verified, patientMatch, unitMatch, message }
	}

	private async getCrossMatchOrThrow(id: string): Promise<CrossMatchRequest> {
		const raw = unwrap(
			await supabase.from("cross_match_requests").select("*").eq("id", id).maybeSingle()
		)

		if (!raw) throw new NotFoundException(`Cross-match request with id ${id} not found`)

		const [mapped] = await this.mapRows(await this.assembleRows([raw]))
		return mapped!
	}

	/** Attach patient name/MRN to raw cross-match rows (replaces the patients join). */
	private async assembleRows(
		rawRows: Array<Record<string, unknown>>
	): Promise<CrossMatchListRow[]> {
		if (rawRows.length === 0) return []

		const patientIds = [...new Set(rawRows.map(r => r.patient_id as string))]
		const patients = unwrapMany(
			await supabase
				.from("patients")
				.select("id, first_name, last_name, middle_name, mrn")
				.in("id", patientIds)
		)
		const byId = new Map<string, Record<string, unknown>>(
			patients.map((p: Record<string, unknown>) => [p.id as string, p])
		)

		return rawRows.map(r => {
			const p = byId.get(r.patient_id as string)
			return {
				request: toCrossMatchRow(r),
				patientFirstName: (p?.first_name as string) ?? "",
				patientLastName: (p?.last_name as string) ?? "",
				patientMiddleName: (p?.middle_name as string | null) ?? null,
				patientMrn: (p?.mrn as string | null) ?? null,
			}
		})
	}

	private async mapRows(rows: CrossMatchListRow[]): Promise<CrossMatchRequest[]> {
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

		const assignments = unwrapMany(
			await supabase
				.from("cross_match_unit_assignments")
				.select("cross_match_request_id, blood_unit_id")
				.in("cross_match_request_id", requestIds)
		)
		const unitIds = [...new Set(assignments.map((a: { blood_unit_id: string }) => a.blood_unit_id))]
		if (unitIds.length === 0) return new Map()

		const units = unwrapMany(await supabase.from("blood_units").select("*").in("id", unitIds))
		const unitById = new Map<string, BloodUnitRow>(
			units.map((u: Record<string, unknown>) => [u.id as string, toBloodUnitRow(u)])
		)

		const byRequest = new Map<string, BloodUnit[]>()
		for (const assignment of assignments as Array<{
			cross_match_request_id: string
			blood_unit_id: string
		}>) {
			const unitRow = unitById.get(assignment.blood_unit_id)
			if (!unitRow) continue
			const list = byRequest.get(assignment.cross_match_request_id) ?? []
			list.push(this.mapBloodUnit(unitRow))
			byRequest.set(assignment.cross_match_request_id, list)
		}

		return byRequest
	}

	private async getStaffDisplayNames(staffIds: Array<string | null>): Promise<Map<string, string>> {
		const ids = [...new Set(staffIds.filter((id): id is string => Boolean(id)))]
		if (ids.length === 0) return new Map()

		const staff = unwrapMany(
			await supabase.from("staff_profiles").select("id, user_id").in("id", ids)
		)
		const userIds = [...new Set(staff.map((s: { user_id: string }) => s.user_id))]
		const users = userIds.length
			? unwrapMany(await supabase.from("users").select("id, name").in("id", userIds))
			: []
		const userName = new Map<string, string>(
			users.map((u: { id: string; name: string }) => [u.id, u.name])
		)

		return new Map(
			(staff as Array<{ id: string; user_id: string }>).map(s => [
				s.id,
				userName.get(s.user_id) ?? s.user_id,
			])
		)
	}

	private async getStaffProfileForUser(userId: string): Promise<{ id: string }> {
		const staff = unwrap(
			await supabase.from("staff_profiles").select("id").eq("user_id", userId).maybeSingle()
		)
		if (!staff) throw new NotFoundException("Staff profile not found for user")
		return { id: staff.id }
	}

	private async getOptionalStaffProfileForUser(userId: string): Promise<{ id: string } | null> {
		const staff = unwrap(
			await supabase.from("staff_profiles").select("id").eq("user_id", userId).maybeSingle()
		)
		return staff ? { id: staff.id } : null
	}

	private async getPatientForCrossMatch(
		patientIdentifier: string,
		facilityId: string
	): Promise<{ id: string; facilityId: string }> {
		const normalizedIdentifier = patientIdentifier.trim()
		let query = supabase.from("patients").select("id, facility_id")
		query = UUID_REGEX.test(normalizedIdentifier)
			? query.eq("id", normalizedIdentifier)
			: query.eq("facility_id", facilityId).eq("mrn", normalizedIdentifier)

		const patient = unwrap(await query.maybeSingle())

		if (!patient) throw new NotFoundException(`Patient ${patientIdentifier} not found`)

		return { id: patient.id, facilityId: patient.facility_id }
	}

	private async resolveEncounterId(
		input: CreateCrossMatch,
		resolvedPatientId: string
	): Promise<string | null> {
		let encounterId = input.encounterId ?? null

		if (input.sourceLabOrderId) {
			const sourceOrder = unwrap(
				await supabase
					.from("lab_orders")
					.select("facility_id, encounter_id")
					.eq("id", input.sourceLabOrderId)
					.maybeSingle()
			)

			if (!sourceOrder) throw new NotFoundException(`Lab order ${input.sourceLabOrderId} not found`)
			if (sourceOrder.facility_id !== input.facilityId) {
				throw new BadRequestException("Source lab order does not belong to the selected facility")
			}

			encounterId ??= sourceOrder.encounter_id
		}

		if (encounterId) {
			const encounter = unwrap(
				await supabase
					.from("encounters")
					.select("id, facility_id, patient_id")
					.eq("id", encounterId)
					.maybeSingle()
			)

			if (!encounter) throw new NotFoundException(`Encounter ${encounterId} not found`)
			if (
				encounter.facility_id !== input.facilityId ||
				encounter.patient_id !== resolvedPatientId
			) {
				throw new BadRequestException("Encounter does not match the selected patient and facility")
			}
		}

		return encounterId
	}

	private async getCompatibleDonorUnits(input: CreateCrossMatch): Promise<BloodUnitRow[]> {
		if (!input.donorId && !input.bloodUnitBarcode) return []

		let query = supabase.from("blood_units").select("*").eq("facility_id", input.facilityId)
		query = input.donorId
			? query.eq("donor_id", input.donorId)
			: query.eq("unit_barcode", input.bloodUnitBarcode!)
		const identifierLabel = input.donorId
			? `Donor ${input.donorId}`
			: `Blood unit ${input.bloodUnitBarcode}`

		const rows = unwrapMany(
			await query
				.eq("component_type", input.componentType)
				.eq("status", "available")
				.order("expiry_date", { ascending: true })
		)
		const units = rows.map(toBloodUnitRow)

		const recipientBloodType = input.bloodType
		const compatibleUnits = recipientBloodType
			? units.filter(unit => this.isBloodTypeCompatible(recipientBloodType, unit.bloodType))
			: units

		if (compatibleUnits.length < input.unitsRequested) {
			throw new BadRequestException(
				`${identifierLabel} does not have enough compatible available ${input.componentType} units`
			)
		}

		return compatibleUnits.slice(0, input.unitsRequested)
	}

	private validateBloodUnitsForApproval(
		request: CrossMatchRow,
		units: BloodUnitRow[],
		requestedUnitIds: string[],
		existingAssignedUnitIds = new Set<string>()
	) {
		if (units.length !== requestedUnitIds.length) {
			throw new NotFoundException("One or more blood units were not found")
		}

		for (const unit of units) {
			if (unit.facilityId !== request.facilityId) {
				throw new BadRequestException(`Blood unit ${unit.unitBarcode} belongs to another facility`)
			}
			const isAlreadyReservedForRequest =
				unit.status === "reserved" && existingAssignedUnitIds.has(unit.id)
			if (unit.status !== "available" && !isAlreadyReservedForRequest) {
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

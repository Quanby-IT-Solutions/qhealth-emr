import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { randomUUID } from "node:crypto"
import { and, desc, eq, isNotNull, isNull, or } from "drizzle-orm"

import {
	ancillaryClearance,
	coeCertificates,
	encounters,
	imagingOrders,
	labOrders,
	malasakitCases,
	mswEvaluations,
	patients,
	staffProfiles,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { supabase, unwrap } from "@/common/database/supabase.client"

type CoverageSource = {
	type: "malasakit" | "philhealth" | "coe"
	referenceId: string
	amount: number
}

type AncillaryClearanceRow = typeof ancillaryClearance.$inferSelect

const ANCILLARY_PROCEDURE_SLA_MINUTES = 120
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const toClearanceDate = (value: unknown): Date | null =>
	value == null ? null : new Date(value as string)
const toClearanceDateReq = (value: unknown): Date => new Date(value as string)

/** Map a snake_case ancillary_clearance row from Supabase to the camelCase row shape. */
function toAncillaryClearanceRow(r: Record<string, unknown>): AncillaryClearanceRow {
	return {
		id: r.id,
		orderId: r.order_id,
		encounterId: r.encounter_id,
		appliedCoverages: r.applied_coverages_json,
		status: r.status,
		clearedByStaffId: r.cleared_by_staff_id,
		clearedAt: toClearanceDate(r.cleared_at),
		overrideReason: r.override_reason,
		procedureStartAt: toClearanceDate(r.procedure_start_at),
		procedureEndAt: toClearanceDate(r.procedure_end_at),
		procedureStartBarcode: r.procedure_start_barcode,
		procedureEndBarcode: r.procedure_end_barcode,
		procedureStartBarcodeMatched: r.procedure_start_barcode_matched,
		procedureEndBarcodeMatched: r.procedure_end_barcode_matched,
		procedureStartedByStaffId: r.procedure_started_by_staff_id,
		procedureEndedByStaffId: r.procedure_ended_by_staff_id,
		createdAt: toClearanceDateReq(r.created_at),
		updatedAt: toClearanceDateReq(r.updated_at),
	} as AncillaryClearanceRow
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

	async procedureLog(input: { facilityId?: string; limit?: number }) {
		const facilityFilter = input.facilityId
			? or(
					eq(encounters.facilityId, input.facilityId),
					eq(labOrders.facilityId, input.facilityId),
					eq(imagingOrders.facilityId, input.facilityId)
				)
			: undefined

		const rows = await this.db
			.select({
				id: ancillaryClearance.id,
				orderId: ancillaryClearance.orderId,
				encounterId: ancillaryClearance.encounterId,
				status: ancillaryClearance.status,
				createdAt: ancillaryClearance.createdAt,
				clearedAt: ancillaryClearance.clearedAt,
				procedureStartAt: ancillaryClearance.procedureStartAt,
				procedureEndAt: ancillaryClearance.procedureEndAt,
				procedureStartBarcodeMatched: ancillaryClearance.procedureStartBarcodeMatched,
				procedureEndBarcodeMatched: ancillaryClearance.procedureEndBarcodeMatched,
				procedureStartedByStaffId: ancillaryClearance.procedureStartedByStaffId,
				procedureEndedByStaffId: ancillaryClearance.procedureEndedByStaffId,
				patientMrn: patients.mrn,
				patientFirstName: patients.firstName,
				patientMiddleName: patients.middleName,
				patientLastName: patients.lastName,
				labOrderId: labOrders.id,
				labTestName: labOrders.testName,
				labPanelName: labOrders.panelName,
				imagingOrderId: imagingOrders.id,
				imagingModality: imagingOrders.modality,
				imagingBodyPart: imagingOrders.bodyPart,
			})
			.from(ancillaryClearance)
			.leftJoin(labOrders, eq(ancillaryClearance.orderId, labOrders.id))
			.leftJoin(imagingOrders, eq(ancillaryClearance.orderId, imagingOrders.id))
			.leftJoin(encounters, this.clearanceEncounterJoinCondition())
			.leftJoin(patients, eq(encounters.patientId, patients.id))
			.where(facilityFilter)
			.orderBy(desc(ancillaryClearance.createdAt))
			.limit(input.limit ?? 50)

		return rows.map(row => {
			const startedAt = row.procedureStartAt ? new Date(row.procedureStartAt) : null
			const endedAt = row.procedureEndAt ? new Date(row.procedureEndAt) : null
			const durationMinutes =
				startedAt && endedAt
					? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000))
					: null
			const elapsedMinutes = startedAt
				? Math.max(0, Math.floor(((endedAt ?? new Date()).getTime() - startedAt.getTime()) / 60000))
				: 0
			const procedureName =
				row.labPanelName ??
				row.labTestName ??
				[row.imagingModality?.toUpperCase(), row.imagingBodyPart].filter(Boolean).join(" ") ??
				null
			const ancillaryType: "Lab" | "Imaging" | "Pharmacy" = row.imagingOrderId ? "Imaging" : "Lab"
			const procedureStatus: "not_started" | "in_progress" | "completed" = !startedAt
				? "not_started"
				: endedAt
					? "completed"
					: "in_progress"
			const slaStatus: "ok" | "breach" | "in_progress" | "not_started" =
				procedureStatus === "not_started"
					? "not_started"
					: procedureStatus === "in_progress"
						? "in_progress"
						: elapsedMinutes > ANCILLARY_PROCEDURE_SLA_MINUTES
							? "breach"
							: "ok"

			return {
				id: row.id,
				orderId: row.orderId,
				encounterId: row.encounterId,
				patientName:
					[row.patientFirstName, row.patientMiddleName, row.patientLastName]
						.filter(Boolean)
						.join(" ") || null,
				patientMrn: row.patientMrn ?? null,
				ancillaryType,
				procedureName: procedureName || null,
				status: row.status,
				procedureStatus,
				startAt: row.procedureStartAt,
				endAt: row.procedureEndAt,
				durationMinutes,
				slaStatus,
				procedureStartBarcodeMatched: row.procedureStartBarcodeMatched,
				procedureEndBarcodeMatched: row.procedureEndBarcodeMatched,
				procedureStartedByStaffId: row.procedureStartedByStaffId,
				procedureEndedByStaffId: row.procedureEndedByStaffId,
			}
		})
	}

	async resolveProcedureClearance(input: {
		facilityId?: string
		patientMrn: string
		scanType: "start" | "end"
	}) {
		const patientMrn = input.patientMrn.trim()
		const patientConditions = [eq(patients.mrn, patientMrn)]
		if (input.facilityId) {
			patientConditions.push(eq(patients.facilityId, input.facilityId))
		}

		const [patient] = await this.db
			.select({
				id: patients.id,
				mrn: patients.mrn,
				firstName: patients.firstName,
				middleName: patients.middleName,
				lastName: patients.lastName,
			})
			.from(patients)
			.where(and(...patientConditions))
			.limit(1)

		if (!patient) {
			return { patient: null, clearance: null }
		}

		const clearanceRows = await this.db
			.select({
				id: ancillaryClearance.id,
				orderId: ancillaryClearance.orderId,
				encounterId: ancillaryClearance.encounterId,
				procedureStartAt: ancillaryClearance.procedureStartAt,
				procedureEndAt: ancillaryClearance.procedureEndAt,
			})
			.from(ancillaryClearance)
			.leftJoin(labOrders, eq(ancillaryClearance.orderId, labOrders.id))
			.leftJoin(imagingOrders, eq(ancillaryClearance.orderId, imagingOrders.id))
			.leftJoin(encounters, this.clearanceEncounterJoinCondition())
			.where(eq(encounters.patientId, patient.id))
			.orderBy(desc(ancillaryClearance.createdAt))
			.limit(25)

		const clearance =
			clearanceRows.find(row => this.isProcedureScanEligible(row, input.scanType)) ??
			clearanceRows[0] ??
			null

		return {
			patient: {
				id: patient.id,
				mrn: patient.mrn,
				name: this.formatPatientName({
					patientFirstName: patient.firstName,
					patientMiddleName: patient.middleName,
					patientLastName: patient.lastName,
				}),
			},
			clearance: clearance
				? {
						id: clearance.id,
						orderId: clearance.orderId,
						encounterId: clearance.encounterId,
						procedureStatus: this.getProcedureStatus(clearance),
						scanEligible: this.isProcedureScanEligible(clearance, input.scanType),
						created: false,
						startAt: clearance.procedureStartAt,
						endAt: clearance.procedureEndAt,
					}
				: null,
		}
	}

	async saveProcedureClearance(input: {
		facilityId?: string
		patientMrn: string
		scanType: "start" | "end"
		clearanceId?: string
	}) {
		const patientMrn = input.patientMrn.trim()
		const patientConditions = [eq(patients.mrn, patientMrn)]
		if (input.facilityId) {
			patientConditions.push(eq(patients.facilityId, input.facilityId))
		}

		const [patient] = await this.db
			.select({
				id: patients.id,
				mrn: patients.mrn,
				firstName: patients.firstName,
				middleName: patients.middleName,
				lastName: patients.lastName,
			})
			.from(patients)
			.where(and(...patientConditions))
			.limit(1)

		if (!patient) {
			throw new NotFoundException("Cannot find the MRN of the patient.")
		}

		const clearanceRows = await this.db
			.select({
				id: ancillaryClearance.id,
				orderId: ancillaryClearance.orderId,
				encounterId: ancillaryClearance.encounterId,
				procedureStartAt: ancillaryClearance.procedureStartAt,
				procedureEndAt: ancillaryClearance.procedureEndAt,
			})
			.from(ancillaryClearance)
			.leftJoin(labOrders, eq(ancillaryClearance.orderId, labOrders.id))
			.leftJoin(imagingOrders, eq(ancillaryClearance.orderId, imagingOrders.id))
			.leftJoin(encounters, this.clearanceEncounterJoinCondition())
			.where(eq(encounters.patientId, patient.id))
			.orderBy(desc(ancillaryClearance.createdAt))
			.limit(25)

		let clearance =
			clearanceRows.find(row => this.isProcedureScanEligible(row, input.scanType)) ??
			clearanceRows[0] ??
			null
		let clearanceCreated = false

		if (!clearance) {
			const encounter = await this.getLatestPatientEncounterForProcedureClearance(patient.id)
			if (!encounter) {
				throw new BadRequestException(
					"Patient must have an encounter before saving a clearance record."
				)
			}

			const values: typeof ancillaryClearance.$inferInsert = {
				orderId: randomUUID(),
				encounterId: encounter.id,
				status: "pending",
				updatedAt: new Date(),
			}
			if (input.clearanceId) values.id = input.clearanceId

			const [created] = await this.db.insert(ancillaryClearance).values(values).returning({
				id: ancillaryClearance.id,
				orderId: ancillaryClearance.orderId,
				encounterId: ancillaryClearance.encounterId,
				procedureStartAt: ancillaryClearance.procedureStartAt,
				procedureEndAt: ancillaryClearance.procedureEndAt,
			})

			if (!created) throw new BadRequestException("Unable to save ancillary clearance record.")

			clearance = created
			clearanceCreated = true
		}

		return {
			patient: {
				id: patient.id,
				mrn: patient.mrn,
				name: this.formatPatientName({
					patientFirstName: patient.firstName,
					patientMiddleName: patient.middleName,
					patientLastName: patient.lastName,
				}),
			},
			clearance: {
				id: clearance.id,
				orderId: clearance.orderId,
				encounterId: clearance.encounterId,
				procedureStatus: this.getProcedureStatus(clearance),
				scanEligible: this.isProcedureScanEligible(clearance, input.scanType),
				created: clearanceCreated,
				startAt: clearance.procedureStartAt,
				endAt: clearance.procedureEndAt,
			},
		}
	}

	async procedureScan(input: {
		identifier: string
		scanType: "start" | "end"
		patientBarcode: string
		staffId?: string
	}) {
		const identifier = input.identifier.trim()
		const patientBarcode = input.patientBarcode.trim()

		if (!UUID_REGEX.test(identifier)) {
			throw new BadRequestException("Clearance ID or order ID must be a UUID")
		}

		// Fetch the clearance record (by clearance id or order id).
		const clearanceRaw = unwrap(
			await supabase
				.from("ancillary_clearance")
				.select("*")
				.or(`id.eq.${identifier},order_id.eq.${identifier}`)
				.limit(1)
				.maybeSingle()
		)

		if (!clearanceRaw) {
			throw new NotFoundException("Ancillary clearance record not found")
		}
		const clearance = toAncillaryClearanceRow(clearanceRaw)

		// Resolve the encounter (clearance → lab/imaging order → encounter) then patient.
		let encounterId: string | null = clearance.encounterId
		if (!encounterId) {
			const labOrder = unwrap(
				await supabase
					.from("lab_orders")
					.select("encounter_id")
					.eq("id", clearance.orderId)
					.maybeSingle()
			)
			encounterId = (labOrder?.encounter_id as string | null) ?? null
			if (!encounterId) {
				const imagingOrder = unwrap(
					await supabase
						.from("imaging_orders")
						.select("encounter_id")
						.eq("id", clearance.orderId)
						.maybeSingle()
				)
				encounterId = (imagingOrder?.encounter_id as string | null) ?? null
			}
		}

		let patient: Record<string, unknown> | null = null
		if (encounterId) {
			const encounter = unwrap(
				await supabase.from("encounters").select("patient_id").eq("id", encounterId).maybeSingle()
			)
			if (encounter?.patient_id) {
				patient = unwrap(
					await supabase
						.from("patients")
						.select("id, mrn, first_name, middle_name, last_name")
						.eq("id", encounter.patient_id)
						.maybeSingle()
				)
			}
		}

		const nameRow = {
			patientFirstName: (patient?.first_name as string | null) ?? null,
			patientMiddleName: (patient?.middle_name as string | null) ?? null,
			patientLastName: (patient?.last_name as string | null) ?? null,
		}

		const patientIdentifiers = [
			patient?.id as string | null,
			patient?.mrn as string | null,
		].filter((value): value is string => Boolean(value))
		if (patientIdentifiers.length === 0) {
			throw new BadRequestException("Unable to verify patient barcode for this clearance record")
		}

		const normalizedBarcode = patientBarcode.toUpperCase()
		const patientBarcodeMatched = patientIdentifiers.some(
			value => value.trim().toUpperCase() === normalizedBarcode
		)
		if (!patientBarcodeMatched) {
			throw new BadRequestException("Patient barcode does not match the ancillary order patient")
		}

		const now = new Date()
		const staff = input.staffId ? await this.getOptionalStaffProfileForUser(input.staffId) : null

		if (input.scanType === "start") {
			if (clearance.procedureStartAt) {
				throw new BadRequestException("Procedure start is already recorded")
			}

			const updated = unwrap(
				await supabase
					.from("ancillary_clearance")
					.update({
						procedure_start_at: now.toISOString(),
						procedure_start_barcode: patientBarcode,
						procedure_start_barcode_matched: true,
						procedure_started_by_staff_id: staff?.id ?? null,
						updated_at: now.toISOString(),
					})
					.eq("id", clearance.id)
					.select("*")
					.single()
			)

			if (!updated) throw new BadRequestException("Procedure start scan failed")

			return {
				record: this.formatRecord(toAncillaryClearanceRow(updated)),
				patientBarcodeMatched,
				message: `Procedure start recorded for ${this.formatPatientName(nameRow)}.`,
			}
		}

		if (!clearance.procedureStartAt) {
			throw new BadRequestException("Record the procedure start scan before marking end")
		}
		if (clearance.procedureEndAt) {
			throw new BadRequestException("Procedure end is already recorded")
		}

		const updated = unwrap(
			await supabase
				.from("ancillary_clearance")
				.update({
					procedure_end_at: now.toISOString(),
					procedure_end_barcode: patientBarcode,
					procedure_end_barcode_matched: true,
					procedure_ended_by_staff_id: staff?.id ?? null,
					updated_at: now.toISOString(),
				})
				.eq("id", clearance.id)
				.select("*")
				.single()
		)

		if (!updated) throw new BadRequestException("Procedure end scan failed")

		return {
			record: this.formatRecord(toAncillaryClearanceRow(updated)),
			patientBarcodeMatched,
			message: `Procedure end recorded for ${this.formatPatientName(nameRow)}.`,
		}
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
			procedureStartAt: r.procedureStartAt,
			procedureEndAt: r.procedureEndAt,
			procedureStartBarcode: r.procedureStartBarcode,
			procedureEndBarcode: r.procedureEndBarcode,
			procedureStartBarcodeMatched: r.procedureStartBarcodeMatched,
			procedureEndBarcodeMatched: r.procedureEndBarcodeMatched,
			procedureStartedByStaffId: r.procedureStartedByStaffId,
			procedureEndedByStaffId: r.procedureEndedByStaffId,
			createdAt: r.createdAt,
			updatedAt: r.updatedAt,
		}
	}

	private async getOptionalStaffProfileForUser(userId: string) {
		const [staff] = await this.db
			.select()
			.from(staffProfiles)
			.where(eq(staffProfiles.userId, userId))
		return staff ?? null
	}

	private async getLatestPatientEncounterForProcedureClearance(patientId: string) {
		const rows = await this.db
			.select({
				id: encounters.id,
				status: encounters.status,
			})
			.from(encounters)
			.where(eq(encounters.patientId, patientId))
			.orderBy(desc(encounters.admissionDatetime))
			.limit(10)

		return (
			rows.find(row => row.status === "active" || row.status === "pending_discharge") ??
			rows[0] ??
			null
		)
	}

	private getProcedureStatus(row: {
		procedureStartAt: Date | string | null
		procedureEndAt: Date | string | null
	}): "not_started" | "in_progress" | "completed" {
		if (!row.procedureStartAt) return "not_started"
		return row.procedureEndAt ? "completed" : "in_progress"
	}

	private isProcedureScanEligible(
		row: { procedureStartAt: Date | string | null; procedureEndAt: Date | string | null },
		scanType: "start" | "end"
	) {
		return scanType === "start"
			? !row.procedureStartAt
			: Boolean(row.procedureStartAt) && !row.procedureEndAt
	}

	private clearanceEncounterJoinCondition() {
		return or(
			and(
				isNotNull(ancillaryClearance.encounterId),
				eq(ancillaryClearance.encounterId, encounters.id)
			),
			and(
				isNull(ancillaryClearance.encounterId),
				isNotNull(labOrders.encounterId),
				eq(labOrders.encounterId, encounters.id)
			),
			and(
				isNull(ancillaryClearance.encounterId),
				isNull(labOrders.encounterId),
				eq(imagingOrders.encounterId, encounters.id)
			)
		)
	}

	private formatPatientName(row: {
		patientFirstName: string | null
		patientMiddleName: string | null
		patientLastName: string | null
	}) {
		return (
			[row.patientFirstName, row.patientMiddleName, row.patientLastName]
				.filter(Boolean)
				.join(" ") || "patient"
		)
	}
}

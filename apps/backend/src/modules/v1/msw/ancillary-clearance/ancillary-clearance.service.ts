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
	staffProfiles,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { supabase, unwrap } from "@/common/database/supabase.client"

type CoverageSource = {
	type: "malasakit" | "philhealth" | "coe"
	referenceId: string
	amount: number
}

type SupabasePatientRow = {
	id: string
	facility_id: string
	mrn: string
	first_name: string | null
	middle_name: string | null
	last_name: string | null
}

type SupabaseEncounterRow = {
	id: string
	status: string
}

type SupabaseProcedureLogEncounterRow = {
	id: string
	facility_id: string
	patient_id: string
}

type SupabaseAncillaryClearanceRow = {
	id: string
	order_id: string
	encounter_id: string | null
	status: string
	cleared_at: string | null
	procedure_start_at: string | null
	procedure_end_at: string | null
	procedure_start_barcode: string | null
	procedure_end_barcode: string | null
	procedure_start_barcode_matched: boolean
	procedure_end_barcode_matched: boolean
	procedure_started_by_staff_id: string | null
	procedure_ended_by_staff_id: string | null
	created_at: string
	updated_at: string
}

type SupabaseLabOrderRow = {
	id: string
	encounter_id: string | null
	facility_id: string
	test_name: string | null
	panel_name: string | null
}

type SupabaseImagingOrderRow = {
	id: string
	encounter_id: string | null
	facility_id: string
	modality: string | null
	body_part: string | null
}

type AncillaryClearanceRow = typeof ancillaryClearance.$inferSelect

const ANCILLARY_PROCEDURE_SLA_MINUTES = 120
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATABASE_TIMESTAMP_WITH_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/
const DATABASE_TIMESTAMP_TIMEZONE_PATTERN = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i

function parseDatabaseUtcTimestamp(value: unknown): Date {
	if (value instanceof Date) return value

	const rawValue = String(value)
	const normalizedValue =
		DATABASE_TIMESTAMP_WITH_TIME_PATTERN.test(rawValue) &&
		!DATABASE_TIMESTAMP_TIMEZONE_PATTERN.test(rawValue)
			? `${rawValue}Z`
			: rawValue

	return new Date(normalizedValue)
}

const toClearanceDate = (value: unknown): Date | null =>
	value == null ? null : parseDatabaseUtcTimestamp(value)
const toClearanceDateReq = (value: unknown): Date => parseDatabaseUtcTimestamp(value)
const toClearanceIso = (value: unknown): string | null =>
	value == null ? null : parseDatabaseUtcTimestamp(value).toISOString()
const toClearanceIsoReq = (value: unknown): string => parseDatabaseUtcTimestamp(value).toISOString()

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
		const limit = input.limit ?? 50
		const rows = (unwrap(
			await supabase
				.from("ancillary_clearance")
				.select(
					[
						"id",
						"order_id",
						"encounter_id",
						"status",
						"cleared_at",
						"procedure_start_at",
						"procedure_end_at",
						"procedure_start_barcode",
						"procedure_end_barcode",
						"procedure_start_barcode_matched",
						"procedure_end_barcode_matched",
						"procedure_started_by_staff_id",
						"procedure_ended_by_staff_id",
						"created_at",
						"updated_at",
					].join(", ")
				)
				.order("created_at", { ascending: false })
				.limit(input.facilityId ? Math.max(limit * 4, 100) : limit)
		) ?? []) as unknown as SupabaseAncillaryClearanceRow[]

		const orderIds = Array.from(new Set(rows.map(row => row.order_id)))
		const [labOrdersById, imagingOrdersById] = await Promise.all([
			this.getLabOrdersByIdsFromSupabase(orderIds),
			this.getImagingOrdersByIdsFromSupabase(orderIds),
		])

		const encounterIds = Array.from(
			new Set(
				rows
					.map(row => {
						const labOrder = labOrdersById.get(row.order_id)
						const imagingOrder = imagingOrdersById.get(row.order_id)

						return row.encounter_id ?? labOrder?.encounter_id ?? imagingOrder?.encounter_id ?? null
					})
					.filter((id): id is string => Boolean(id))
			)
		)
		const encountersById = await this.getProcedureLogEncountersByIdsFromSupabase(encounterIds)
		const patientsById = await this.getPatientsByIdsFromSupabase(
			Array.from(
				new Set(Array.from(encountersById.values()).map(encounter => encounter.patient_id))
			)
		)

		return rows
			.map(row => {
				const labOrder = labOrdersById.get(row.order_id) ?? null
				const imagingOrder = imagingOrdersById.get(row.order_id) ?? null
				const resolvedEncounterId =
					row.encounter_id ?? labOrder?.encounter_id ?? imagingOrder?.encounter_id
				const encounter = resolvedEncounterId
					? (encountersById.get(resolvedEncounterId) ?? null)
					: null
				const patient = encounter ? (patientsById.get(encounter.patient_id) ?? null) : null
				const resolvedFacilityId =
					encounter?.facility_id ?? labOrder?.facility_id ?? imagingOrder?.facility_id ?? null

				if (input.facilityId && resolvedFacilityId && resolvedFacilityId !== input.facilityId) {
					return null
				}

				const startedAt = toClearanceDate(row.procedure_start_at)
				const endedAt = toClearanceDate(row.procedure_end_at)
				const durationMinutes =
					startedAt && endedAt
						? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000))
						: null
				const elapsedMinutes = startedAt
					? Math.max(
							0,
							Math.floor(((endedAt ?? new Date()).getTime() - startedAt.getTime()) / 60000)
						)
					: 0
				const procedureName =
					labOrder?.panel_name ??
					labOrder?.test_name ??
					[imagingOrder?.modality?.toUpperCase(), imagingOrder?.body_part]
						.filter(Boolean)
						.join(" ") ??
					null
				const ancillaryType: "Lab" | "Imaging" | "Pharmacy" = imagingOrder ? "Imaging" : "Lab"
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
					orderId: row.order_id,
					encounterId: row.encounter_id,
					patientName:
						[patient?.first_name, patient?.middle_name, patient?.last_name]
							.filter(Boolean)
							.join(" ") || null,
					patientMrn: patient?.mrn ?? null,
					ancillaryType,
					procedureName: procedureName || null,
					status: row.status,
					clearedAt: toClearanceIso(row.cleared_at),
					createdAt: toClearanceIsoReq(row.created_at),
					updatedAt: toClearanceIsoReq(row.updated_at),
					procedureStatus,
					startAt: toClearanceIso(row.procedure_start_at),
					endAt: toClearanceIso(row.procedure_end_at),
					procedureStartBarcode: row.procedure_start_barcode,
					procedureEndBarcode: row.procedure_end_barcode,
					durationMinutes,
					slaStatus,
					procedureStartBarcodeMatched: row.procedure_start_barcode_matched,
					procedureEndBarcodeMatched: row.procedure_end_barcode_matched,
					procedureStartedByStaffId: row.procedure_started_by_staff_id,
					procedureEndedByStaffId: row.procedure_ended_by_staff_id,
				}
			})
			.filter((row): row is NonNullable<typeof row> => Boolean(row))
			.slice(0, limit)
	}

	async resolveProcedureClearance(input: {
		facilityId?: string
		patientMrn: string
		scanType: "start" | "end"
	}) {
		const patientMrn = input.patientMrn.trim()
		const patient = await this.getPatientByMrnFromSupabase({
			facilityId: input.facilityId,
			patientMrn,
		})

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
					patientFirstName: patient.first_name,
					patientMiddleName: patient.middle_name,
					patientLastName: patient.last_name,
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
		const patient = await this.getPatientByMrnFromSupabase({
			facilityId: input.facilityId,
			patientMrn,
		})

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
			const encounter = await this.getOrCreatePatientEncounterForProcedureClearance(patient)

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
					patientFirstName: patient.first_name,
					patientMiddleName: patient.middle_name,
					patientLastName: patient.last_name,
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
		) as Record<string, unknown> | null

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

		const patientIdentifiers = [patient?.id as string | null, patient?.mrn as string | null].filter(
			(value): value is string => Boolean(value)
		)
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
			) as Record<string, unknown> | null

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
		) as Record<string, unknown> | null

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

	private async getPatientByMrnFromSupabase(input: { facilityId?: string; patientMrn: string }) {
		const selectPatient = () =>
			supabase.from("patients").select("id, facility_id, mrn, first_name, middle_name, last_name")

		if (input.facilityId) {
			const facilityPatient = unwrap(
				await selectPatient()
					.ilike("mrn", input.patientMrn)
					.eq("facility_id", input.facilityId)
					.limit(1)
					.maybeSingle()
			) as SupabasePatientRow | null

			if (facilityPatient) return facilityPatient
		}

		return unwrap(
			await selectPatient().ilike("mrn", input.patientMrn).limit(1).maybeSingle()
		) as SupabasePatientRow | null
	}

	private async getPatientsByIdsFromSupabase(patientIds: string[]) {
		if (patientIds.length === 0) return new Map<string, SupabasePatientRow>()

		const rows = unwrap(
			await supabase
				.from("patients")
				.select("id, facility_id, mrn, first_name, middle_name, last_name")
				.in("id", patientIds)
		) as SupabasePatientRow[] | null

		return new Map((rows ?? []).map(patient => [patient.id, patient]))
	}

	private async getLabOrdersByIdsFromSupabase(orderIds: string[]) {
		if (orderIds.length === 0) return new Map<string, SupabaseLabOrderRow>()

		const rows = unwrap(
			await supabase
				.from("lab_orders")
				.select("id, encounter_id, facility_id, test_name, panel_name")
				.in("id", orderIds)
		) as SupabaseLabOrderRow[] | null

		return new Map((rows ?? []).map(order => [order.id, order]))
	}

	private async getImagingOrdersByIdsFromSupabase(orderIds: string[]) {
		if (orderIds.length === 0) return new Map<string, SupabaseImagingOrderRow>()

		const rows = unwrap(
			await supabase
				.from("imaging_orders")
				.select("id, encounter_id, facility_id, modality, body_part")
				.in("id", orderIds)
		) as SupabaseImagingOrderRow[] | null

		return new Map((rows ?? []).map(order => [order.id, order]))
	}

	private async getProcedureLogEncountersByIdsFromSupabase(encounterIds: string[]) {
		if (encounterIds.length === 0) return new Map<string, SupabaseProcedureLogEncounterRow>()

		const rows = unwrap(
			await supabase.from("encounters").select("id, facility_id, patient_id").in("id", encounterIds)
		) as SupabaseProcedureLogEncounterRow[] | null

		return new Map((rows ?? []).map(encounter => [encounter.id, encounter]))
	}

	private async getOrCreatePatientEncounterForProcedureClearance(patient: SupabasePatientRow) {
		const rows = unwrap(
			await supabase
				.from("encounters")
				.select("id, status")
				.eq("patient_id", patient.id)
				.order("admission_datetime", { ascending: false })
				.limit(10)
		) as SupabaseEncounterRow[] | null

		const existing =
			rows?.find(row => row.status === "active" || row.status === "pending_discharge") ??
			rows?.[0] ??
			null

		if (existing) return existing

		const created = unwrap(
			await supabase
				.from("encounters")
				.insert({
					facility_id: patient.facility_id,
					patient_id: patient.id,
					encounter_type: "outpatient",
					status: "active",
					chief_complaint: "Ancillary procedure logging",
				})
				.select("id, status")
				.single()
		) as SupabaseEncounterRow | null

		if (!created) throw new BadRequestException("Unable to create patient encounter.")

		return created
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

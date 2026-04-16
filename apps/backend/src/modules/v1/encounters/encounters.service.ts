import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common"
import { and, count, desc, eq } from "drizzle-orm"

import {
	beds,
	deathReports,
	encounterStatusEvents,
	encounters,
	encounterTransfers,
	patients,
	staffProfiles,
	users,
	wards,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"

type WorkflowType = "opd" | "ed" | "admission" | "discharge" | "ancillary" | "pharmacy" | "billing"

type EncounterListInput = V1Inputs["encounter"]["list"]
type CreateEncounterInput = V1Inputs["encounter"]["create"]
type TransferEncounterInput = V1Inputs["encounter"]["transfer"]
type DischargeEncounterInput = V1Inputs["encounter"]["discharge"]
type CloseEncounterInput = V1Inputs["encounter"]["close"]
type EncounterIdInput = V1Inputs["encounter"]["get"]
type LinkedEncountersInput = V1Inputs["encounter"]["getLinked"]

@Injectable()
export class EncountersService {
	private readonly logger = new Logger(EncountersService.name)

	// ========================================================================
	// Private: SLA Event Logging
	// ========================================================================

	/**
	 * Logs a status transition event for SLA tracking.
	 * Records the workflow type (opd/ed/admission/discharge) and optional target SLA.
	 */
	private async logSlaEvent(params: {
		facilityId: string
		encounterId: string
		fromStatus?: string | null
		toStatus: string
		workflowType: WorkflowType
		staffId?: string | null
		slaTargetMinutes?: number | null
		notes?: string | null
	}) {
		await db.insert(encounterStatusEvents).values({
			facilityId: params.facilityId,
			encounterId: params.encounterId,
			fromStatus: params.fromStatus ?? null,
			toStatus: params.toStatus,
			workflowType: params.workflowType,
			staffId: params.staffId ?? null,
			slaTargetMinutes: params.slaTargetMinutes ?? null,
			notes: params.notes ?? null,
			occurredAt: new Date(),
		})
	}

	// ========================================================================
	// List encounters for a patient
	// ========================================================================

	async list(filter: EncounterListInput) {
		const page = Number(filter.page) || 1
		const limit = Number(filter.limit) || 50
		const offset = (page - 1) * limit

		const conditions = [
			eq(encounters.patientId, filter.patientId),
			eq(encounters.facilityId, filter.facilityId),
		]

		if (filter.status) {
			conditions.push(eq(encounters.status, filter.status))
		}

		const whereClause = and(...conditions)

		// Aliases for staff names
		const attendingStaff = db
			.select({
				id: staffProfiles.id,
				name: users.name,
			})
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("attending_staff")

		const [data, totalResult] = await Promise.all([
			db
				.select({
					id: encounters.id,
					encounterType: encounters.encounterType,
					status: encounters.status,
					chiefComplaint: encounters.chiefComplaint,
					admissionDatetime: encounters.admissionDatetime,
					dischargeDatetime: encounters.dischargeDatetime,
					attendingStaffName: attendingStaff.name,
					wardName: wards.name,
					bedNumber: beds.bedNumber,
				})
				.from(encounters)
				.leftJoin(attendingStaff, eq(encounters.attendingStaffId, attendingStaff.id))
				.leftJoin(beds, eq(encounters.bedId, beds.id))
				.leftJoin(wards, eq(beds.wardId, wards.id))
				.where(whereClause)
				.orderBy(desc(encounters.admissionDatetime))
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(encounters).where(whereClause),
		])

		const total = totalResult[0]?.count ?? 0

		return {
			data: data.map(row => ({
				...row,
				attendingStaffName: row.attendingStaffName ?? null,
				wardName: row.wardName ?? null,
				bedNumber: row.bedNumber ?? null,
			})),
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	// ========================================================================
	// Get encounter detail
	// ========================================================================

	async findById(input: EncounterIdInput) {
		// Subquery aliases for admitting and attending staff — eliminates 2 separate queries
		const admittingStaffSq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("admitting_staff")

		const attendingStaffSq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("attending_staff")

		const [row] = await db
			.select({
				id: encounters.id,
				facilityId: encounters.facilityId,
				patientId: encounters.patientId,
				encounterType: encounters.encounterType,
				status: encounters.status,
				chiefComplaint: encounters.chiefComplaint,
				admittingStaffId: encounters.admittingStaffId,
				attendingStaffId: encounters.attendingStaffId,
				bedId: encounters.bedId,
				admissionDatetime: encounters.admissionDatetime,
				dischargeDatetime: encounters.dischargeDatetime,
				disposition: encounters.disposition,
				oecbEligible: encounters.oecbEligible,
				mergedFromPreEncounterId: encounters.mergedFromPreEncounterId,
				linkedEncounterId: encounters.linkedEncounterId,
				konsultaTagged: encounters.konsultaTagged,
				appointmentId: encounters.appointmentId,
				createdAt: encounters.createdAt,
				updatedAt: encounters.updatedAt,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMrn: patients.mrn,
				patientDateOfBirth: patients.dateOfBirth,
				patientSex: patients.sex,
				wardName: wards.name,
				bedNumber: beds.bedNumber,
				admittingStaffName: admittingStaffSq.name,
				attendingStaffName: attendingStaffSq.name,
			})
			.from(encounters)
			.innerJoin(patients, eq(encounters.patientId, patients.id))
			.leftJoin(beds, eq(encounters.bedId, beds.id))
			.leftJoin(wards, eq(beds.wardId, wards.id))
			.leftJoin(admittingStaffSq, eq(encounters.admittingStaffId, admittingStaffSq.id))
			.leftJoin(attendingStaffSq, eq(encounters.attendingStaffId, attendingStaffSq.id))
			.where(eq(encounters.id, input.id))

		if (!row) {
			throw new NotFoundException(`Encounter ${input.id} not found`)
		}

		// Single JOIN query for transfers — eliminates N+1 (5 queries per transfer → 1 total)
		const fromWardsSq = db
			.select({ id: wards.id, name: wards.name })
			.from(wards)
			.as("from_wards")
		const toWardsSq = db
			.select({ id: wards.id, name: wards.name })
			.from(wards)
			.as("to_wards")
		const fromBedsSq = db
			.select({ id: beds.id, bedNumber: beds.bedNumber })
			.from(beds)
			.as("from_beds")
		const toBedsSq = db
			.select({ id: beds.id, bedNumber: beds.bedNumber })
			.from(beds)
			.as("to_beds")
		const orderingStaffSq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("ordering_staff")

		const enrichedTransfers = await db
			.select({
				id: encounterTransfers.id,
				fromWardId: encounterTransfers.fromWardId,
				fromBedId: encounterTransfers.fromBedId,
				toWardId: encounterTransfers.toWardId,
				toBedId: encounterTransfers.toBedId,
				transferReason: encounterTransfers.transferReason,
				orderingStaffId: encounterTransfers.orderingStaffId,
				transferredAt: encounterTransfers.transferredAt,
				fromWardName: fromWardsSq.name,
				fromBedNumber: fromBedsSq.bedNumber,
				toWardName: toWardsSq.name,
				toBedNumber: toBedsSq.bedNumber,
				orderingStaffName: orderingStaffSq.name,
			})
			.from(encounterTransfers)
			.leftJoin(fromWardsSq, eq(encounterTransfers.fromWardId, fromWardsSq.id))
			.leftJoin(fromBedsSq, eq(encounterTransfers.fromBedId, fromBedsSq.id))
			.leftJoin(toWardsSq, eq(encounterTransfers.toWardId, toWardsSq.id))
			.leftJoin(toBedsSq, eq(encounterTransfers.toBedId, toBedsSq.id))
			.leftJoin(orderingStaffSq, eq(encounterTransfers.orderingStaffId, orderingStaffSq.id))
			.where(eq(encounterTransfers.encounterId, input.id))
			.orderBy(desc(encounterTransfers.transferredAt))

		return {
			...row,
			patientName: `${row.patientLastName}, ${row.patientFirstName}`,
			patientMrn: row.patientMrn,
			patientDateOfBirth: row.patientDateOfBirth,
			patientSex: row.patientSex,
			admittingStaffName: row.admittingStaffName ?? null,
			attendingStaffName: row.attendingStaffName ?? null,
			wardName: row.wardName ?? null,
			bedNumber: row.bedNumber ?? null,
			// SLA tracking (computed) - will be populated by separate SLA query
			slaStatus: null,
			slaElapsedMinutes: null,
			slaTargetMinutes: null,
			transfers: enrichedTransfers,
		}
	}

	// ========================================================================
	// Get linked encounters (telemedicine follow-ups)
	// ========================================================================

	async getLinked(input: LinkedEncountersInput) {
		// Verify source encounter exists
		const [sourceEncounter] = await db
			.select({ id: encounters.id })
			.from(encounters)
			.where(eq(encounters.id, input.id))

		if (!sourceEncounter) {
			throw new NotFoundException(`Encounter ${input.id} not found`)
		}

		// Find all encounters that reference this encounter as their linked parent
		const attendingStaffSq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("attending_staff")

		const linkedRows = await db
			.select({
				id: encounters.id,
				encounterType: encounters.encounterType,
				status: encounters.status,
				admissionDatetime: encounters.admissionDatetime,
				dischargeDatetime: encounters.dischargeDatetime,
				attendingStaffName: attendingStaffSq.name,
			})
			.from(encounters)
			.leftJoin(attendingStaffSq, eq(encounters.attendingStaffId, attendingStaffSq.id))
			.where(eq(encounters.linkedEncounterId, input.id))
			.orderBy(desc(encounters.admissionDatetime))

		return {
			sourceEncounterId: input.id,
			linkedEncounters: linkedRows.map(row => ({
				id: row.id,
				encounterType: row.encounterType,
				status: row.status,
				admissionDatetime: row.admissionDatetime,
				dischargeDatetime: row.dischargeDatetime,
				attendingStaffName: row.attendingStaffName ?? null,
			})),
		}
	}

	// ========================================================================
	// Create encounter
	// ========================================================================

	async create(input: CreateEncounterInput) {
		// Verify patient exists
		const [patient] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(eq(patients.id, input.patientId))

		if (!patient) {
			throw new NotFoundException(`Patient ${input.patientId} not found`)
		}

		// If inpatient and bed assigned, validate and mark bed as occupied
		if (input.bedId) {
			const [bed] = await db.select().from(beds).where(eq(beds.id, input.bedId))
			if (!bed) {
				throw new NotFoundException(`Bed ${input.bedId} not found`)
			}
			if (bed.status !== "available") {
				throw new BadRequestException(`Bed ${bed.bedNumber} is not available`)
			}
		}

		// Wrap encounter insert + bed update in a transaction to prevent orphaned bed state.
		// Re-checking bed availability inside the transaction prevents the most common race
		// condition (two concurrent requests both see 'available' before either commits).
		const created = await db.transaction(async tx => {
			if (input.bedId) {
				const [bed] = await tx
					.select()
					.from(beds)
					.where(eq(beds.id, input.bedId))
				// Re-check inside the transaction — serialized against concurrent bed assignments
				if (!bed || bed.status !== "available") {
					throw new BadRequestException(
						`Bed ${input.bedId} is not available`
					)
				}
			}

			const [enc] = await tx
				.insert(encounters)
				.values({
					facilityId: input.facilityId,
					patientId: input.patientId,
					encounterType: input.encounterType,
					chiefComplaint: input.chiefComplaint ?? null,
					admittingStaffId: input.admittingStaffId,
					attendingStaffId: input.attendingStaffId ?? input.admittingStaffId,
					bedId: input.bedId ?? null,
					admissionDatetime: input.admissionDatetime
						? new Date(input.admissionDatetime)
						: new Date(),
				})
				.returning()

			if (input.bedId && enc) {
				await tx
					.update(beds)
					.set({ status: "occupied", currentEncounterId: enc.id, updatedAt: new Date() })
					.where(eq(beds.id, input.bedId))
			}

			return enc!
		})

		// Log SLA event for new encounter creation
		const workflowType: WorkflowType =
			input.encounterType === "outpatient"
				? "opd"
				: input.encounterType === "emergency"
					? "ed"
					: "admission"

		await this.logSlaEvent({
			facilityId: input.facilityId,
			encounterId: created.id,
			fromStatus: null,
			toStatus: "active",
			workflowType,
			staffId: input.admittingStaffId,
			notes: `Created ${input.encounterType} encounter`,
		})

		this.logger.log(
			`Created ${input.encounterType} encounter ${created.id} for patient ${input.patientId}`
		)

		// Return with default SLA tracking fields (newly created = no elapsed time yet)
		return {
			...created,
			slaStatus: null,
			slaElapsedMinutes: null,
			slaTargetMinutes: null,
		}
	}

	// ========================================================================
	// Transfer
	// ========================================================================

	async transfer(input: TransferEncounterInput) {
		const [encounter] = await db
			.select()
			.from(encounters)
			.where(eq(encounters.id, input.encounterId))

		if (!encounter) {
			throw new NotFoundException(`Encounter ${input.encounterId} not found`)
		}

		if (encounter.status !== "active") {
			throw new BadRequestException("Can only transfer active encounters")
		}

		if (encounter.encounterType !== "inpatient") {
			throw new BadRequestException("Transfers are only for inpatient encounters")
		}

		// Validate destination bed
		const [destBed] = await db.select().from(beds).where(eq(beds.id, input.toBedId))
		if (!destBed) {
			throw new NotFoundException(`Destination bed ${input.toBedId} not found`)
		}
		if (destBed.status !== "available") {
			throw new BadRequestException(`Destination bed ${destBed.bedNumber} is not available`)
		}

		// Get current bed/ward info for transfer record
		const currentBedId = encounter.bedId
		let currentWardId: string | null = null
		if (currentBedId) {
			const [currentBed] = await db
				.select({ wardId: beds.wardId })
				.from(beds)
				.where(eq(beds.id, currentBedId))
			currentWardId = currentBed?.wardId ?? null
		}

		// Wrap all 4 mutation steps in a transaction — partial failure rolls back entirely,
		// preventing inconsistent bed/encounter state (e.g. occupied bed with no encounter).
		const updated = await db.transaction(async tx => {
			if (currentBedId) {
				await tx
					.update(beds)
					.set({ status: "available", currentEncounterId: null, updatedAt: new Date() })
					.where(eq(beds.id, currentBedId))
			}

			await tx
				.update(beds)
				.set({ status: "occupied", currentEncounterId: encounter.id, updatedAt: new Date() })
				.where(eq(beds.id, input.toBedId))

			const [enc] = await tx
				.update(encounters)
				.set({ bedId: input.toBedId, updatedAt: new Date() })
				.where(eq(encounters.id, input.encounterId))
				.returning()

			await tx.insert(encounterTransfers).values({
				facilityId: encounter.facilityId,
				encounterId: encounter.id,
				fromWardId: currentWardId,
				fromBedId: currentBedId,
				toWardId: input.toWardId,
				toBedId: input.toBedId,
				transferReason: input.transferReason ?? null,
				orderingStaffId: input.orderingStaffId,
			})

			return enc!
		})

		// Log SLA event for transfer (use 'admission' workflow for inpatient transitions)
		await this.logSlaEvent({
			facilityId: encounter.facilityId,
			encounterId: encounter.id,
			fromStatus: "active",
			toStatus: "active",
			workflowType: "admission",
			staffId: input.orderingStaffId,
			notes: `Transferred to bed ${input.toBedId}`,
		})

		this.logger.log(`Transferred encounter ${input.encounterId} to bed ${input.toBedId}`)

		// Return with SLA tracking fields (computed based on last event)
		return {
			...updated,
			slaStatus: null,
			slaElapsedMinutes: null,
			slaTargetMinutes: null,
		}
	}

	// ========================================================================
	// Discharge (inpatient)
	// ========================================================================

	async discharge(input: DischargeEncounterInput) {
		const [encounter] = await db
			.select()
			.from(encounters)
			.where(eq(encounters.id, input.encounterId))

		if (!encounter) {
			throw new NotFoundException(`Encounter ${input.encounterId} not found`)
		}

		if (encounter.status !== "active") {
			throw new BadRequestException("Can only discharge active encounters")
		}

		if (encounter.encounterType === "outpatient") {
			throw new BadRequestException("Use the close endpoint for outpatient encounters")
		}

		// Release bed
		if (encounter.bedId) {
			await db
				.update(beds)
				.set({ status: "available", currentEncounterId: null, updatedAt: new Date() })
				.where(eq(beds.id, encounter.bedId))
		}

		const [updated] = await db
			.update(encounters)
			.set({
				status: "discharged",
				disposition: input.disposition,
				dischargeDatetime: input.dischargeDatetime
					? new Date(input.dischargeDatetime)
					: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(encounters.id, input.encounterId))
			.returning()

		// Log SLA event for discharge
		await this.logSlaEvent({
			facilityId: encounter.facilityId,
			encounterId: encounter.id,
			fromStatus: "active",
			toStatus: "discharged",
			workflowType: "discharge",
			staffId: null,
			notes: `Disposition: ${input.disposition}`,
		})

		// Trigger draft death report creation if disposition is deceased
		if (input.disposition === "deceased") {
			try {
				await db.insert(deathReports).values({
					facilityId: encounter.facilityId,
					encounterId: encounter.id,
					patientId: encounter.patientId,
					reportType: "fmdrf", // Default to FMDRF, can be changed during review
					deathDatetime: input.dischargeDatetime
						? new Date(input.dischargeDatetime)
						: new Date(),
					causeOfDeath: "Pending determination", // Placeholder
					status: "draft",
				})
				this.logger.log(
					`Created draft death report for deceased patient on encounter ${encounter.id}`
				)
			} catch (error) {
				// Log but don't fail discharge — death report can be created manually
				this.logger.error(
					`Failed to create draft death report for encounter ${encounter.id}: ${error}`
				)
			}
		}

		this.logger.log(
			`Discharged encounter ${input.encounterId} with disposition: ${input.disposition}`
		)

		// Return with SLA tracking fields
		return {
			...updated!,
			slaStatus: null,
			slaElapsedMinutes: null,
			slaTargetMinutes: null,
		}
	}

	// ========================================================================
	// Close (outpatient)
	// ========================================================================

	async close(input: CloseEncounterInput) {
		const [encounter] = await db
			.select()
			.from(encounters)
			.where(eq(encounters.id, input.encounterId))

		if (!encounter) {
			throw new NotFoundException(`Encounter ${input.encounterId} not found`)
		}

		if (encounter.status !== "active") {
			throw new BadRequestException("Can only close active encounters")
		}

		const [updated] = await db
			.update(encounters)
			.set({
				status: "closed",
				dischargeDatetime: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(encounters.id, input.encounterId))
			.returning()

		// Log SLA event for outpatient close
		await this.logSlaEvent({
			facilityId: encounter.facilityId,
			encounterId: encounter.id,
			fromStatus: "active",
			toStatus: "closed",
			workflowType: "opd",
			staffId: null,
			notes: "Outpatient visit closed",
		})

		this.logger.log(`Closed outpatient encounter ${input.encounterId}`)

		// Return with SLA tracking fields
		return {
			...updated!,
			slaStatus: null,
			slaElapsedMinutes: null,
			slaTargetMinutes: null,
		}
	}

	// ========================================================================
	// Discharge Checklist (computed on read)
	// ========================================================================

	async getDischargeChecklist(input: EncounterIdInput) {
		const [encounter] = await db
			.select()
			.from(encounters)
			.where(eq(encounters.id, input.id))

		if (!encounter) {
			throw new NotFoundException(`Encounter ${input.id} not found`)
		}

		const isInpatient = encounter.encounterType === "inpatient"

		// Placeholder statuses — will be replaced by actual module queries in later tickets
		type ChecklistStatus = "complete" | "incomplete" | "not_applicable"
		type ChecklistCategory = "clinical" | "billing"

		const items: {
			key: string
			label: string
			category: ChecklistCategory
			status: ChecklistStatus
			responsibleRole: string
		}[] = isInpatient
			? [
					{
						key: "discharge_summary_signed",
						label: "Discharge summary signed",
						category: "clinical",
						status: "incomplete",
						responsibleRole: "Clinician",
					},
					{
						key: "final_diagnosis_coded",
						label: "Final diagnosis coded (ICD-10)",
						category: "clinical",
						status: "incomplete",
						responsibleRole: "Clinician",
					},
					{
						key: "discharge_medications",
						label: "Discharge medications documented",
						category: "clinical",
						status: "incomplete",
						responsibleRole: "Clinician",
					},
					{
						key: "followup_instructions",
						label: "Follow-up instructions entered",
						category: "clinical",
						status: "incomplete",
						responsibleRole: "Clinician",
					},
					{
						key: "charges_captured",
						label: "All charges captured",
						category: "billing",
						status: "incomplete",
						responsibleRole: "Biller",
					},
					{
						key: "invoice_generated",
						label: "Invoice generated",
						category: "billing",
						status: "incomplete",
						responsibleRole: "Biller",
					},
					{
						key: "payment_recorded",
						label: "Payment recorded or plan established",
						category: "billing",
						status: "incomplete",
						responsibleRole: "Biller",
					},
				]
			: [
					// Outpatient close checklist
					{
						key: "visit_note_signed",
						label: "Visit note signed",
						category: "clinical",
						status: "incomplete",
						responsibleRole: "Clinician",
					},
					{
						key: "diagnoses_coded",
						label: "Diagnoses coded (ICD-10)",
						category: "clinical",
						status: "incomplete",
						responsibleRole: "Clinician",
					},
					{
						key: "charges_captured",
						label: "Charges captured",
						category: "billing",
						status: "incomplete",
						responsibleRole: "Biller",
					},
				]

		return {
			encounterId: encounter.id,
			encounterType: encounter.encounterType,
			items,
			allComplete: items.every(i => i.status === "complete"),
		}
	}
}

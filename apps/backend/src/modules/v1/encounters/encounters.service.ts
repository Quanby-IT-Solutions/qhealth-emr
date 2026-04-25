import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common"
import { and, count, desc, eq, gte, inArray, lt, max, sql } from "drizzle-orm"

import {
	beds,
	clinicalNotes,
	deathReports,
	encounterStatusEvents,
	encounters,
	encounterTransfers,
	flowsheetEntries,
	medicationOrders,
	opdTriageIntakes,
	patients,
	staffProfiles,
	users,
	vitalSigns,
	wards,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"
import { AuditService } from "@/modules/v1/audit/audit.service"
import { resolveStepTarget } from "@/utils/sla-step-target"

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

	constructor(private readonly auditService: AuditService) {}

	// ========================================================================
	// Helper: resolve staffProfileId from userId (null-safe for audit)
	// ========================================================================

	private async getOptionalStaffProfileId(userId: string): Promise<string | null> {
		try {
			return await this.auditService.resolveStaffProfileId(userId)
		} catch {
			return null
		}
	}

	// ========================================================================
	// Private: SLA Event Logging
	// ========================================================================

	/**
	 * Logs a status transition event for SLA tracking.
	 * Records the workflow type (opd/ed/admission/discharge) and optional target SLA.
	 * When `slaTargetMinutes` is not explicitly provided the method resolves it from
	 * the facility step-override table (falling back to TOR defaults).
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
		occurredAt?: Date | null // PS-039: allow backfilling with triage arrival timestamp
	}) {
		// Auto-resolve when the caller did not explicitly supply a target
		const resolvedTarget =
			params.slaTargetMinutes !== undefined
				? params.slaTargetMinutes
				: await resolveStepTarget(params.facilityId, params.workflowType, params.toStatus)

		await db.insert(encounterStatusEvents).values({
			facilityId: params.facilityId,
			encounterId: params.encounterId,
			fromStatus: params.fromStatus ?? null,
			toStatus: params.toStatus,
			workflowType: params.workflowType,
			staffId: params.staffId ?? null,
			slaTargetMinutes: resolvedTarget,
			notes: params.notes ?? null,
			occurredAt: params.occurredAt ?? new Date(),
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
					queueNumber: encounters.queueNumber,
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
				queueNumber: row.queueNumber ?? null,
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
				queueNumber: encounters.queueNumber,
				clinicianStaffId: encounters.clinicianStaffId,
				queueStatus: encounters.queueStatus,
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
			queueNumber: row.queueNumber ?? null,
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

	async create(input: CreateEncounterInput, userId?: string) {
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

			// PS-044: defence-in-depth — outpatient encounters must originate from a triage record
			// (also enforced at contract level via superRefine; TOR Flow 1 Step 1 is mandatory).
			if (input.encounterType === "outpatient" && !input.triageIntakeId) {
				throw new BadRequestException(
					"Outpatient encounters require a triage intake (TOR Flow 1 Step 1)"
				)
			}

			// PS-041: Validate triage intake before creating the encounter — prevents forged,
			// stale, or cross-facility triage IDs from producing OPD encounters and ARTA events.
			let triageIntakeChiefComplaint: string | null = null
			if (input.triageIntakeId && input.encounterType === "outpatient") {
				const [intake] = await tx
					.select({
						id: opdTriageIntakes.id,
						facilityId: opdTriageIntakes.facilityId,
						status: opdTriageIntakes.status,
						chiefComplaint: opdTriageIntakes.chiefComplaint, // PS-045
					})
					.from(opdTriageIntakes)
					.where(eq(opdTriageIntakes.id, input.triageIntakeId))
				if (!intake) {
					throw new NotFoundException(
						`Triage intake ${input.triageIntakeId} not found`
					)
				}
				if (intake.facilityId !== input.facilityId) {
					throw new BadRequestException(
						`Triage intake does not belong to this facility`
					)
				}
				if (intake.status !== "pending_registration") { // PS-043
					throw new BadRequestException(
						`Triage intake is no longer eligible for registration (status: ${intake.status})`
					)
				}
				triageIntakeChiefComplaint = intake.chiefComplaint // PS-045
			}

			// PS-048: validate clinicianStaffId for outpatient encounters
			if (input.encounterType === "outpatient" && input.clinicianStaffId) {
				const [clinician] = await tx
					.select({ id: staffProfiles.id })
					.from(staffProfiles)
					.where(
						and(
							eq(staffProfiles.id, input.clinicianStaffId),
							eq(staffProfiles.facilityId, input.facilityId),
							eq(staffProfiles.isActive, true)
						)
					)
				if (!clinician) {
					throw new BadRequestException(
						"The selected clinician is not a valid active staff member for this facility"
					)
				}
			}

			// Generate OPD queue number for outpatient encounters (sequential per clinic per day)
			let queueNumber: number | null = null
			if (input.encounterType === "outpatient") {
				const todayStart = new Date()
				todayStart.setUTCHours(0, 0, 0, 0)
				const tomorrowStart = new Date(todayStart)
				tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1)

// PS-036: clinicianStaffId required for outpatient — validated by contract; this is defense-in-depth
				if (!input.clinicianStaffId) {
					throw new BadRequestException(
						"clinicianStaffId is required for outpatient encounter registration"
					)
				}

				// PS-002/PS-036: Always scope queue per clinician (clinic) per day
				const queueConditions: Parameters<typeof and>[0][] = [
					eq(encounters.facilityId, input.facilityId),
					eq(encounters.encounterType, sql`'outpatient'`),
					gte(encounters.admissionDatetime, todayStart),
					lt(encounters.admissionDatetime, tomorrowStart),
					eq(encounters.clinicianStaffId, input.clinicianStaffId),
				]

				const [maxResult] = await tx
					.select({ maxQueue: max(encounters.queueNumber) })
					.from(encounters)
					.where(and(...queueConditions))
				queueNumber = (maxResult?.maxQueue ?? 0) + 1
			}

			const [enc] = await tx
				.insert(encounters)
				.values({
					facilityId: input.facilityId,
					patientId: input.patientId,
					encounterType: input.encounterType,
					chiefComplaint: input.chiefComplaint ?? triageIntakeChiefComplaint ?? null, // PS-045
					admittingStaffId: input.admittingStaffId,
					attendingStaffId: input.attendingStaffId ?? input.admittingStaffId,
					bedId: input.bedId ?? null,
					admissionDatetime: input.admissionDatetime
						? new Date(input.admissionDatetime)
						: new Date(),
					queueNumber,
					// PS-002: persist clinician for clinic-scoped queue
					clinicianStaffId: input.clinicianStaffId ?? null,
					// PS-003: outpatient walk-ins start in waiting state
					queueStatus: input.encounterType === "outpatient" ? "waiting" : null,
				})
				.returning()

			if (input.bedId && enc) {
				await tx
					.update(beds)
					.set({ status: "occupied", currentEncounterId: enc.id, updatedAt: new Date() })
					.where(eq(beds.id, input.bedId))
			}

			// PS-001/PS-033: Mark triage intake as registered and link both patientId and
			// encounterId atomically — eliminates the need for a separate linkToPatient call
			if (input.triageIntakeId && enc) {
				await tx
					.update(opdTriageIntakes)
					.set({
						patientId: input.patientId,
						status: "registered",
						encounterId: enc.id,
						updatedAt: new Date(),
					})
					.where(eq(opdTriageIntakes.id, input.triageIntakeId))
			}

			// PS-049: DPA audit record — atomic with the encounter insert
			if (userId && enc) {
				const staffProfileId = await this.getOptionalStaffProfileId(userId)
				await this.auditService.log(
					{
						facilityId: input.facilityId,
						userId,
						staffProfileId,
						action: "create",
						entityType: "encounter",
						entityId: enc.id,
						beforeState: null,
						afterState: {
							encounterType: input.encounterType,
							patientId: input.patientId,
							queueNumber,
							clinicianStaffId: input.clinicianStaffId ?? null,
						},
						ipAddress: null,
						userAgent: null,
						metadata: {
							workflow: input.encounterType === "outpatient" ? "opd_triage_reconciliation" : "encounter_creation",
							triageIntakeId: input.triageIntakeId ?? null,
						},
					},
					{ tx }
				)
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

		// PS-039: Fetch triage record once — used for both the ARTA arrival backfill and
		// the PS-024 flowsheet pre-population below, avoiding a duplicate DB round-trip
		const triageRecord =
			input.triageIntakeId && input.encounterType === "outpatient"
				? ((
						await db
							.select()
							.from(opdTriageIntakes)
							.where(eq(opdTriageIntakes.id, input.triageIntakeId))
					)[0] ?? null)
				: null

		// PS-037/PS-039: Emit ARTA workflow events for Citizen's Charter time-motion reporting.
		// When a triage record is present, backfill the arrival milestone using the patient's
		// actual triage timestamp so the full OPD timeline is auditable from one source.
		// SLA-001: Resolve OPD step targets from facility overrides first, then TOR defaults
		const [arrivalTarget, registrationTarget] = await Promise.all([
			resolveStepTarget(input.facilityId, "opd", "arrived"),
			resolveStepTarget(input.facilityId, "opd", "waiting"),
		])

		if (input.encounterType === "outpatient") {
			if (triageRecord) {
				// Arrival event — timestamped from triage, captures TOR Flow 1 Step 1
				await this.logSlaEvent({
					facilityId: input.facilityId,
					encounterId: created.id,
					fromStatus: null,
					toStatus: "arrived",
					workflowType: "opd",
					staffId: input.admittingStaffId,
					slaTargetMinutes: arrivalTarget,
					notes: "OPD arrival: triage assessment completed",
					occurredAt: triageRecord.arrivalTime ?? new Date(),
				})
				// Registration event — captures TOR Flow 1 Step 2
				await this.logSlaEvent({
					facilityId: input.facilityId,
					encounterId: created.id,
					fromStatus: "arrived",
					toStatus: "waiting",
					workflowType: "opd",
					staffId: input.admittingStaffId,
					slaTargetMinutes: registrationTarget,
					notes: "OPD registration: placed in waiting queue",
				})
			} else {
				// No prior triage — direct encounter creation without a triage intake
				await this.logSlaEvent({
					facilityId: input.facilityId,
					encounterId: created.id,
					fromStatus: null,
					toStatus: "waiting",
					workflowType: "opd",
					staffId: input.admittingStaffId,
					slaTargetMinutes: registrationTarget,
					notes: "OPD registration: placed in waiting queue",
				})
			}
		} else {
			await this.logSlaEvent({
				facilityId: input.facilityId,
				encounterId: created.id,
				fromStatus: null,
				toStatus: "active",
				workflowType,
				staffId: input.admittingStaffId,
				notes: `Created ${input.encounterType} encounter`,
			})
		}

		this.logger.log(
			`Created ${input.encounterType} encounter ${created.id} for patient ${input.patientId}`
		)

		// PS-024: materialize triage vitals into vitalSigns + flowsheetEntries so the
		// nursing flowsheet is pre-populated from triage data at encounter start
		// (PS-039: triageRecord already fetched above for ARTA backfill; reused here)
		if (triageRecord) {
			try {
				const triage = triageRecord

				if (triage) {
					const hasVitals =
						triage.systolicBp != null ||
						triage.diastolicBp != null ||
						triage.temperatureCelsius != null ||
						triage.heartRateBpm != null ||
						triage.respiratoryRate != null ||
						triage.oxygenSatPct != null ||
						triage.heightCm != null ||
						triage.weightKg != null

					if (hasVitals) {
						const recordedByStaffId =
							triage.triageNurseStaffId ?? input.admittingStaffId
						const recordedAt = triage.arrivalTime ?? new Date()

						await db.insert(vitalSigns).values({
							facilityId: input.facilityId,
							encounterId: created.id,
							temperature: triage.temperatureCelsius?.toString() ?? null,
							bpSystolic: triage.systolicBp ?? null,
							bpDiastolic: triage.diastolicBp ?? null,
							heartRate: triage.heartRateBpm ?? null,
							respiratoryRate: triage.respiratoryRate ?? null,
							spo2: triage.oxygenSatPct?.toString() ?? null,
							weight: triage.weightKg?.toString() ?? null,
							height: triage.heightCm?.toString() ?? null,
							recordedByStaffId,
							recordedAt,
						})

						const vitalsMap = [
							{ name: "Temperature", value: triage.temperatureCelsius, unit: "°C" },
							{ name: "BP Systolic", value: triage.systolicBp, unit: "mmHg" },
							{ name: "BP Diastolic", value: triage.diastolicBp, unit: "mmHg" },
							{ name: "Heart Rate", value: triage.heartRateBpm, unit: "bpm" },
							{ name: "Respiratory Rate", value: triage.respiratoryRate, unit: "breaths/min" },
							{ name: "SpO2", value: triage.oxygenSatPct, unit: "%" },
							{ name: "Weight", value: triage.weightKg, unit: "kg" },
							{ name: "Height", value: triage.heightCm, unit: "cm" },
						]

						const entriesToInsert = vitalsMap
							.filter(v => v.value != null)
							.map(v => ({
								facilityId: input.facilityId,
								encounterId: created.id,
								parameterName: v.name,
								parameterValue: String(v.value),
								unit: v.unit,
								recordedByStaffId,
								recordedAt,
							}))

						if (entriesToInsert.length > 0) {
							await db.insert(flowsheetEntries).values(entriesToInsert)
						}
					}
				}
			} catch (error) {
				// Log but don't fail encounter creation — flowsheet can be populated manually
				this.logger.error(
					`Failed to materialize triage vitals for encounter ${created.id}: ${error}`
				)
			}
		}

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

		// PS-022: enforce discharge checklist server-side — client gate can be bypassed
		const checklist = await this.getDischargeChecklist({ id: input.encounterId })
		if (!checklist.allComplete) {
			throw new BadRequestException(
				"Encounter cannot be closed: required checklist items are incomplete"
			)
		}

		const [updated] = await db
			.update(encounters)
			.set({
				// PS-017: TOR Flow 1 Step 5 terminal status is Completed/Discharged
				status: "discharged",
				dischargeDatetime: new Date(),
				queueStatus: "completed",
				updatedAt: new Date(),
			})
			.where(eq(encounters.id, input.encounterId))
			.returning()

		// Log SLA event for outpatient close (TOR: Completed/Discharged)
		await this.logSlaEvent({
			facilityId: encounter.facilityId,
			encounterId: encounter.id,
			fromStatus: "active",
			toStatus: "discharged",
			workflowType: "opd",
			staffId: null,
			notes: "Outpatient visit completed and discharged",
		})

		this.logger.log(`Discharged outpatient encounter ${input.encounterId}`)

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
					// Outpatient close checklist — computed from real chart state
					{
						key: "visit_note_signed",
						label: "Visit note signed",
						category: "clinical" as ChecklistCategory,
						status: await (async (): Promise<ChecklistStatus> => {
							const [row] = await db
								.select({ n: count() })
								.from(clinicalNotes)
								.where(
									and(
										eq(clinicalNotes.encounterId, encounter.id),
										eq(clinicalNotes.status, "signed")
									)
								)
							return (row?.n ?? 0) > 0 ? "complete" : "incomplete"
						})(),
						responsibleRole: "Clinician",
					},
					{
						key: "diagnoses_coded",
						label: "Diagnoses coded (ICD-10)",
						category: "clinical" as ChecklistCategory,
						// PS-020: require at least one signed consultation note with ICD-10 diagnoses
						status: await (async (): Promise<ChecklistStatus> => {
							const [row] = await db
								.select({ n: count() })
								.from(clinicalNotes)
								.where(
									and(
										eq(clinicalNotes.encounterId, encounter.id),
										eq(clinicalNotes.status, "signed"),
										eq(clinicalNotes.noteType, "consultation"),
										sql`jsonb_array_length(COALESCE((${clinicalNotes.structuredData})->'diagnoses', '[]'::jsonb)) > 0`
									)
								)
							return (row?.n ?? 0) > 0 ? "complete" : "incomplete"
						})(),
						responsibleRole: "Clinician",
					},
					{
						key: "charges_captured",
						label: "Charges captured",
						category: "billing" as ChecklistCategory,
						// Billing capture is not a required gate for OPD close in current TOR scope
						status: "not_applicable" as ChecklistStatus,
						responsibleRole: "Biller",
					},
				{
					key: "orders_finalized",
					label: "Orders/prescriptions finalized",
					category: "clinical" as ChecklistCategory,
					// PS-018: check real medication orders — blocks close if pending orders exist
					status: await (async (): Promise<ChecklistStatus> => {
						const [totalRow] = await db
							.select({ n: count() })
							.from(medicationOrders)
							.where(eq(medicationOrders.encounterId, encounter.id))
						if ((totalRow?.n ?? 0) === 0) return "not_applicable" // no orders
						const [pendingRow] = await db
							.select({ n: count() })
							.from(medicationOrders)
							.where(
								and(
									eq(medicationOrders.encounterId, encounter.id),
									inArray(medicationOrders.status, [
										"pending_verification",
										"verified",
										"active",
									])
								)
							)
						return (pendingRow?.n ?? 0) === 0 ? "complete" : "incomplete"
					})(),
					responsibleRole: "Clinician",
				},
			]

		return {
			encounterId: encounter.id,
			encounterType: encounter.encounterType,
			items,
			// PS-015: not_applicable items are non-blocking — only incomplete items prevent close
			allComplete: items.every(i => i.status === "complete" || i.status === "not_applicable"),
		}
	}
}

import {
	BadRequestException,
	ConflictException,
	HttpException,
	HttpStatus,
	Injectable,
	Logger,
	NotFoundException,
	UnprocessableEntityException,
} from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { and, count, desc, eq, gte, inArray, isNull, lt, max, sql } from "drizzle-orm"

import {
	beds,
	charges,
	clinicalNotes,
	consentRecords,
	deathReports,
	dischargeClearances,
	encounters,
	encounterStatusEvents,
	encounterTransfers,
	flowsheetEntries,
	invoices,
	medicationOrders,
	opdTriageIntakes,
	patients,
	payments,
	prescriptions,
	rolePermissions,
	roles,
	staffProfiles,
	userRoles,
	users,
	vitalSigns,
	wards,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"
import { AuditService } from "@/modules/v1/audit/audit.service"
import { ChartAccessService, type ChartAccessActor } from "@/modules/v1/audit/chart-access.service"
import {
	formatDeathReportLabels,
	getRequiredDeathReportTypes,
	isSubmittedDeathReportStatus,
} from "@/modules/v1/death-reporting/death-reporting-eligibility"
import { NotificationService } from "@/modules/v1/notifications/notification.service"
import { resolveStepTarget } from "@/utils/sla-step-target"

type WorkflowType = "opd" | "ed" | "admission" | "discharge" | "ancillary" | "pharmacy" | "billing"

type EncounterListInput = V1Inputs["encounter"]["list"]
type CreateEncounterInput = V1Inputs["encounter"]["create"]
type InitiateTransferInput = V1Inputs["encounter"]["initiateTransfer"]
type ReceiveTransferInput = V1Inputs["encounter"]["receiveTransfer"]
type ListPendingTransfersInput = V1Inputs["encounter"]["listPendingTransfers"]
type DischargeEncounterInput = V1Inputs["encounter"]["discharge"]
type SignMayGoHomeOrderInput = V1Inputs["encounter"]["signMayGoHomeOrder"]
type CloseEncounterInput = V1Inputs["encounter"]["close"]
type EncounterIdInput = V1Inputs["encounter"]["get"]
type LinkedEncountersInput = V1Inputs["encounter"]["getLinked"]

@Injectable()
export class EncountersService {
	private readonly logger = new Logger(EncountersService.name)

	constructor(
		private readonly auditService: AuditService,
		private readonly chartAccessService: ChartAccessService,
		private readonly eventEmitter: EventEmitter2,
		private readonly notificationService?: NotificationService
	) {}

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
	// Private: OPD Queue Number Assignment
	// ========================================================================

	// PS-002/PS-036: MAX+1 per clinician per day. Known race: two simultaneous
	// registrations may read the same MAX. Acceptable for typical facility volume.
	private async assignQueueNumber(facilityId: string, clinicianStaffId: string): Promise<number> {
		const todayStart = new Date()
		todayStart.setUTCHours(0, 0, 0, 0)
		const tomorrowStart = new Date(todayStart)
		tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1)

		const [result] = await db
			.select({ maxQueue: max(encounters.queueNumber) })
			.from(encounters)
			.where(
				and(
					eq(encounters.facilityId, facilityId),
					eq(encounters.clinicianStaffId, clinicianStaffId),
					gte(encounters.admissionDatetime, todayStart),
					lt(encounters.admissionDatetime, tomorrowStart)
				)
			)

		return (result?.maxQueue ?? 0) + 1
	}

	// ========================================================================
	// List encounters for a patient
	// ========================================================================

	async list(filter: EncounterListInput, actor?: ChartAccessActor) {
		if (filter.patientId) {
			await this.chartAccessService.ensurePatientChartReadAccess(actor, filter.patientId, {
				entityType: "encounter_list",
				entityId: filter.patientId,
			})
		}

		const page = Number(filter.page) || 1
		const limit = Number(filter.limit) || 50
		const offset = (page - 1) * limit

		const conditions = [eq(encounters.facilityId, filter.facilityId)]

		if (filter.patientId) {
			conditions.push(eq(encounters.patientId, filter.patientId))
		}

		if (filter.status) {
			conditions.push(eq(encounters.status, filter.status))
		}

		if (filter.encounterType) {
			conditions.push(eq(encounters.encounterType, filter.encounterType))
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
					patientFirstName: patients.firstName,
					patientLastName: patients.lastName,
				})
				.from(encounters)
				.innerJoin(patients, eq(encounters.patientId, patients.id))
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
		const encounterIds = data.map(row => row.id)
		const transferRows =
			encounterIds.length > 0
				? await db
						.select({
							encounterId: encounterTransfers.encounterId,
							status: encounterTransfers.status,
							transferredAt: encounterTransfers.transferredAt,
						})
						.from(encounterTransfers)
						.where(inArray(encounterTransfers.encounterId, encounterIds))
						.orderBy(desc(encounterTransfers.transferredAt))
				: []
		const latestTransferByEncounterId = new Map<string, { status: "pending" | "completed" }>()

		for (const transfer of transferRows) {
			if (!latestTransferByEncounterId.has(transfer.encounterId)) {
				latestTransferByEncounterId.set(transfer.encounterId, {
					status: transfer.status,
				})
			}
		}

		return {
			data: data.map(row => {
				const latestTransfer = latestTransferByEncounterId.get(row.id)

				return {
					...row,
					patientName: `${row.patientLastName}, ${row.patientFirstName}`,
					attendingStaffName: row.attendingStaffName ?? null,
					wardName: row.wardName ?? null,
					bedNumber: row.bedNumber ?? null,
					queueNumber: row.queueNumber ?? null,
					transferStatus: latestTransfer?.status ?? null,
				}
			}),
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	// ========================================================================
	// Get encounter detail
	// ========================================================================

	async findById(input: EncounterIdInput, actor?: ChartAccessActor) {
		await this.chartAccessService.ensureEncounterChartReadAccess(actor, input.id, {
			entityType: "encounter",
			entityId: input.id,
		})

		// Subquery aliases for admitting and attending staff — eliminates 2 separate queries
		const admittingStaffSq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("admitting_staff")

		const attendingStaffSq = db
			.select({
				id: staffProfiles.id,
				name: users.name,
				prcLicenseNumber: staffProfiles.prcLicenseNumber,
			})
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
				patientAddressLine1: patients.addressLine1,
				patientAddressLine2: patients.addressLine2,
				patientCity: patients.city,
				patientProvince: patients.province,
				patientDateOfBirth: patients.dateOfBirth,
				patientSex: patients.sex,
				wardName: wards.name,
				bedNumber: beds.bedNumber,
				admittingStaffName: admittingStaffSq.name,
				attendingStaffName: attendingStaffSq.name,
				attendingStaffLicenseNo: attendingStaffSq.prcLicenseNumber,
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
		const fromWardsSq = db.select({ id: wards.id, name: wards.name }).from(wards).as("from_wards")
		const toWardsSq = db.select({ id: wards.id, name: wards.name }).from(wards).as("to_wards")
		const fromBedsSq = db
			.select({ id: beds.id, bedNumber: beds.bedNumber })
			.from(beds)
			.as("from_beds")
		const toBedsSq = db.select({ id: beds.id, bedNumber: beds.bedNumber }).from(beds).as("to_beds")
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
				// Legacy local DB schema may not include transfer status/received timestamps yet.
				status: sql<"pending" | "completed">`'pending'`,
				receivedAt: sql<Date | null>`null`,
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
			patientAddress:
				[row.patientAddressLine1, row.patientAddressLine2, row.patientCity, row.patientProvince]
					.filter(Boolean)
					.join(", ") || null,
			patientDateOfBirth: new Date(row.patientDateOfBirth).toISOString(),
			patientSex: row.patientSex,
			admittingStaffName: row.admittingStaffName ?? null,
			attendingStaffName: row.attendingStaffName ?? null,
			attendingStaffLicenseNo: row.attendingStaffLicenseNo ?? null,
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
		if (!input.consentCaptured) {
			throw new UnprocessableEntityException(
				"Patient consent must be captured before creating an encounter"
			)
		}

		// Verify patient exists
		const [patient] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(and(eq(patients.id, input.patientId), eq(patients.facilityId, input.facilityId)))

		if (!patient) {
			throw new NotFoundException(`Patient ${input.patientId} not found in this facility`)
		}

		// RA 10173: DPA consent must be active before clinical registration
		const [dpaConsent] = await db
			.select({ id: consentRecords.id })
			.from(consentRecords)
			.where(
				and(
					eq(consentRecords.patientId, input.patientId),
					eq(consentRecords.facilityId, input.facilityId),
					eq(consentRecords.consentType, "dpa"),
					eq(consentRecords.isActive, true),
					isNull(consentRecords.revokedAt)
				)
			)
			.limit(1)

		if (!dpaConsent) {
			throw new HttpException(
				{
					statusCode: 422,
					message: "DPA consent is required before creating an encounter.",
					error: "CONSENT_REQUIRED",
				},
				HttpStatus.UNPROCESSABLE_ENTITY
			)
		}

		// If inpatient and bed assigned, validate and mark bed as occupied
		if (input.bedId) {
			const [bed] = await db.select().from(beds).where(eq(beds.id, input.bedId))
			if (!bed) {
				throw new NotFoundException(`Bed ${input.bedId} not found`)
			}
			if (bed.facilityId !== input.facilityId) {
				throw new NotFoundException(`Bed ${input.bedId} not found in this facility`)
			}
			if (bed.status !== "available") {
				throw new ConflictException(`Bed ${bed.bedNumber} is not available`)
			}
		}

		// ENC-BE-003: assign queue number before the transaction so the helper can be tested independently
		const queueNumber =
			input.encounterType === "outpatient" && input.clinicianStaffId
				? await this.assignQueueNumber(input.facilityId, input.clinicianStaffId)
				: null

		// Wrap encounter insert + bed update in a transaction to prevent orphaned bed state.
		// Re-checking bed availability inside the transaction prevents the most common race
		// condition (two concurrent requests both see 'available' before either commits).
		const created = await db.transaction(async tx => {
			if (input.bedId) {
				const [bed] = await tx.select().from(beds).where(eq(beds.id, input.bedId))
				// Re-check inside the transaction — serialized against concurrent bed assignments
				if (!bed || bed.status !== "available") {
					throw new ConflictException(`Bed ${input.bedId} is not available`)
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
					throw new NotFoundException(`Triage intake ${input.triageIntakeId} not found`)
				}
				if (intake.facilityId !== input.facilityId) {
					throw new BadRequestException(`Triage intake does not belong to this facility`)
				}
				if (intake.status !== "pending_registration") {
					// PS-043
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
							workflow:
								input.encounterType === "outpatient"
									? "opd_triage_reconciliation"
									: "encounter_creation",
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
						triage.systolicBp !== null ||
						triage.diastolicBp !== null ||
						triage.temperatureCelsius !== null ||
						triage.heartRateBpm !== null ||
						triage.respiratoryRate !== null ||
						triage.oxygenSatPct !== null ||
						triage.heightCm !== null ||
						triage.weightKg !== null

					if (hasVitals) {
						const recordedByStaffId = triage.triageNurseStaffId ?? input.admittingStaffId
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
							.filter(v => v.value !== null)
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
	// Initiate Transfer (Registrar)
	// ========================================================================

	async initiateTransfer(input: InitiateTransferInput) {
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

		// Block if there is already a pending transfer for this encounter
		const [existingPending] = await db
			.select({ id: encounterTransfers.id })
			.from(encounterTransfers)
			.where(
				and(
					eq(encounterTransfers.encounterId, encounter.id),
					eq(encounterTransfers.status, "pending")
				)
			)
		if (existingPending) {
			throw new ConflictException(
				"There is already a pending transfer for this encounter. Wait for Ward Nurse confirmation before initiating another."
			)
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

		// Transaction: source bed → pending_transfer, dest bed → reserved, insert pending transfer record
		const [updated, transferRow] = await db.transaction(async tx => {
			if (currentBedId) {
				await tx
					.update(beds)
					.set({ status: "pending_transfer", updatedAt: new Date() })
					.where(eq(beds.id, currentBedId))
			}

			await tx
				.update(beds)
				.set({ status: "reserved", updatedAt: new Date() })
				.where(eq(beds.id, input.toBedId))

			const [enc] = await tx
				.update(encounters)
				.set({ updatedAt: new Date() })
				.where(eq(encounters.id, input.encounterId))
				.returning()

			const [transfer] = await tx
				.insert(encounterTransfers)
				.values({
					facilityId: encounter.facilityId,
					encounterId: encounter.id,
					fromWardId: currentWardId,
					fromBedId: currentBedId,
					toWardId: input.toWardId,
					toBedId: input.toBedId,
					transferReason: input.transferReason ?? null,
					orderingStaffId: input.orderingStaffId,
					status: "pending",
				})
				.returning()

			return [enc!, transfer!] as const
		})

		// Notify ward nurses at destination ward
		void this.notifyTransferDestinationNurses(encounter, transferRow.id, input.toWardId)

		await this.logSlaEvent({
			facilityId: encounter.facilityId,
			encounterId: encounter.id,
			fromStatus: "active",
			toStatus: "active",
			workflowType: "admission",
			staffId: input.orderingStaffId,
			notes: `Transfer initiated to ward ${input.toWardId}, bed ${input.toBedId}`,
		})

		this.logger.log(`Transfer initiated for encounter ${input.encounterId} to bed ${input.toBedId}`)

		return {
			...updated,
			slaStatus: null,
			slaElapsedMinutes: null,
			slaTargetMinutes: null,
		}
	}

	// ========================================================================
	// Receive Transfer (Ward Nurse confirms patient arrival)
	// ========================================================================

	async receiveTransfer(input: ReceiveTransferInput) {
		const [transfer] = await db
			.select()
			.from(encounterTransfers)
			.where(eq(encounterTransfers.id, input.transferId))

		if (!transfer) {
			throw new NotFoundException(`Transfer ${input.transferId} not found`)
		}

		if (transfer.status !== "pending") {
			throw new BadRequestException("Transfer is already completed")
		}

		const [encounter] = await db
			.select()
			.from(encounters)
			.where(eq(encounters.id, transfer.encounterId))

		if (!encounter || encounter.status !== "active") {
			throw new BadRequestException("Associated encounter is not active")
		}

		const now = new Date()

		const updated = await db.transaction(async tx => {
			// Source bed → dirty (vacated but needs cleaning)
			if (transfer.fromBedId) {
				await tx
					.update(beds)
					.set({ status: "dirty", currentEncounterId: null, updatedAt: now })
					.where(eq(beds.id, transfer.fromBedId))
			}

			// Destination bed → occupied, link to encounter
			if (transfer.toBedId) {
				await tx
					.update(beds)
					.set({ status: "occupied", currentEncounterId: encounter.id, updatedAt: now })
					.where(eq(beds.id, transfer.toBedId))
			}

			// Move encounter to destination bed
			const [enc] = await tx
				.update(encounters)
				.set({ bedId: transfer.toBedId, updatedAt: now })
				.where(eq(encounters.id, encounter.id))
				.returning()

			// Mark transfer as completed
			await tx
				.update(encounterTransfers)
				.set({
					status: "completed",
					receivedAt: now,
					receivingStaffId: input.receivingStaffId,
				})
				.where(eq(encounterTransfers.id, input.transferId))

			return enc!
		})

		await this.logSlaEvent({
			facilityId: encounter.facilityId,
			encounterId: encounter.id,
			fromStatus: "active",
			toStatus: "active",
			workflowType: "admission",
			staffId: input.receivingStaffId,
			notes: `Transfer received at destination bed ${transfer.toBedId ?? ""}`,
		})

		this.logger.log(
			`Transfer ${input.transferId} received for encounter ${encounter.id} at bed ${transfer.toBedId}`
		)

		return {
			...updated,
			slaStatus: null,
			slaElapsedMinutes: null,
			slaTargetMinutes: null,
		}
	}

	// ========================================================================
	// List Pending Transfers (Ward Nurse view)
	// ========================================================================

	async listPendingTransfers(input: ListPendingTransfersInput) {
		const fromWardsSq = db.select({ id: wards.id, name: wards.name }).from(wards).as("from_wards")
		const toWardsSq = db.select({ id: wards.id, name: wards.name }).from(wards).as("to_wards")
		const fromBedsSq = db
			.select({ id: beds.id, bedNumber: beds.bedNumber })
			.from(beds)
			.as("from_beds")
		const toBedsSq = db.select({ id: beds.id, bedNumber: beds.bedNumber }).from(beds).as("to_beds")
		const orderingStaffSq = db
			.select({ id: staffProfiles.id, name: users.name })
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.as("ordering_staff")

		const conditions = [
			eq(encounterTransfers.facilityId, input.facilityId),
			eq(encounterTransfers.status, "pending"),
		]

		if (input.toWardId) {
			conditions.push(eq(encounterTransfers.toWardId, input.toWardId))
		}

		const rows = await db
			.select({
				transferId: encounterTransfers.id,
				encounterId: encounterTransfers.encounterId,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMrn: patients.mrn,
				fromWardName: fromWardsSq.name,
				fromBedNumber: fromBedsSq.bedNumber,
				toWardName: toWardsSq.name,
				toBedNumber: toBedsSq.bedNumber,
				transferReason: encounterTransfers.transferReason,
				orderingStaffName: orderingStaffSq.name,
				transferredAt: encounterTransfers.transferredAt,
			})
			.from(encounterTransfers)
			.innerJoin(encounters, eq(encounterTransfers.encounterId, encounters.id))
			.innerJoin(patients, eq(encounters.patientId, patients.id))
			.leftJoin(fromWardsSq, eq(encounterTransfers.fromWardId, fromWardsSq.id))
			.leftJoin(fromBedsSq, eq(encounterTransfers.fromBedId, fromBedsSq.id))
			.leftJoin(toWardsSq, eq(encounterTransfers.toWardId, toWardsSq.id))
			.leftJoin(toBedsSq, eq(encounterTransfers.toBedId, toBedsSq.id))
			.leftJoin(orderingStaffSq, eq(encounterTransfers.orderingStaffId, orderingStaffSq.id))
			.where(and(...conditions))
			.orderBy(desc(encounterTransfers.transferredAt))

		return rows.map(row => ({
			transferId: row.transferId,
			encounterId: row.encounterId,
			patientName: `${row.patientLastName}, ${row.patientFirstName}`,
			patientMrn: row.patientMrn,
			fromWardName: row.fromWardName ?? null,
			fromBedNumber: row.fromBedNumber ?? null,
			toWardName: row.toWardName ?? null,
			toBedNumber: row.toBedNumber ?? null,
			transferReason: row.transferReason ?? null,
			orderingStaffName: row.orderingStaffName ?? null,
			transferredAt: row.transferredAt,
		}))
	}

	private async notifyTransferDestinationNurses(
		encounter: typeof encounters.$inferSelect,
		transferId: string,
		toWardId: string
	) {
		if (!this.notificationService) return

		const recipients = await db
			.selectDistinct({ staffId: staffProfiles.id })
			.from(staffProfiles)
			.innerJoin(userRoles, eq(userRoles.staffProfileId, staffProfiles.id))
			.innerJoin(roles, eq(userRoles.roleId, roles.id))
			.innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
			.where(
				and(
					eq(staffProfiles.facilityId, encounter.facilityId),
					eq(staffProfiles.isActive, true),
					eq(rolePermissions.module, "nursing"),
					eq(rolePermissions.action, "create")
				)
			)

		await Promise.all(
			recipients.map(recipient =>
				this.notificationService?.send({
					facilityId: encounter.facilityId,
					recipientStaffId: recipient.staffId,
					topic: "system",
					title: "Patient Transfer Incoming",
					body: "A patient has been transferred to your ward. Please confirm receipt.",
					data: {
						encounterId: encounter.id,
						patientId: encounter.patientId,
						transferId,
						toWardId,
					},
				})
			)
		)
	}

	private async notifyDischargeQueues(encounter: typeof encounters.$inferSelect) {
		if (!this.notificationService) return

		const recipients = await db
			.selectDistinct({ staffId: staffProfiles.id })
			.from(staffProfiles)
			.innerJoin(userRoles, eq(userRoles.staffProfileId, staffProfiles.id))
			.innerJoin(roles, eq(userRoles.roleId, roles.id))
			.innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
			.where(
				and(
					eq(staffProfiles.facilityId, encounter.facilityId),
					eq(staffProfiles.isActive, true),
					sql`(
						(${rolePermissions.module} = 'orders' and ${rolePermissions.action} = 'verify')
						or (${rolePermissions.module} = 'billing' and ${rolePermissions.action} in ('view', 'create', 'edit'))
					)`
				)
			)

		await Promise.all(
			recipients.map(recipient =>
				this.notificationService?.send({
					facilityId: encounter.facilityId,
					recipientStaffId: recipient.staffId,
					topic: "system",
					title: "May Go Home order signed",
					body: "Ward charges are frozen. Review discharge pharmacy and billing tasks.",
					data: {
						encounterId: encounter.id,
						patientId: encounter.patientId,
						status: "pending_discharge",
					},
				})
			)
		)
	}

	async signMayGoHomeOrder(input: SignMayGoHomeOrderInput, userId?: string) {
		const [encounter] = await db
			.select()
			.from(encounters)
			.where(eq(encounters.id, input.encounterId))

		if (!encounter) {
			throw new NotFoundException(`Encounter ${input.encounterId} not found`)
		}

		if (encounter.encounterType === "outpatient") {
			throw new BadRequestException("May Go Home orders are only for inpatient discharge")
		}

		if (encounter.status === "pending_discharge") {
			return {
				...encounter,
				slaStatus: null,
				slaElapsedMinutes: null,
				slaTargetMinutes: null,
			}
		}

		if (encounter.status !== "active") {
			throw new BadRequestException("Can only sign May Go Home order for active encounters")
		}

		const [updated] = await db
			.update(encounters)
			.set({ status: "pending_discharge", updatedAt: new Date() })
			.where(eq(encounters.id, input.encounterId))
			.returning()

		const staffId = userId ? await this.getOptionalStaffProfileId(userId) : null
		await this.logSlaEvent({
			facilityId: encounter.facilityId,
			encounterId: encounter.id,
			fromStatus: "active",
			toStatus: "pending_discharge",
			workflowType: "discharge",
			staffId,
			notes: "May Go Home order signed; ward charges frozen and Pharmacy/Billing notified",
		})

		await this.notifyDischargeQueues(updated!)

		return {
			...updated!,
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

		if (encounter.status !== "active" && encounter.status !== "pending_discharge") {
			throw new BadRequestException("Can only discharge active or pending-discharge encounters")
		}

		if (encounter.encounterType === "inpatient" && encounter.status !== "pending_discharge") {
			throw new BadRequestException("May Go Home order must be signed before discharge")
		}

		if (encounter.encounterType === "outpatient") {
			throw new BadRequestException("Use the close endpoint for outpatient encounters")
		}

		// Enforce death report mandate before discharge
		if (input.disposition === "deceased") {
			const [patient] = await db
				.select({
					sex: patients.sex,
					dateOfBirth: patients.dateOfBirth,
				})
				.from(patients)
				.where(eq(patients.id, encounter.patientId))
				.limit(1)

			if (!patient) {
				throw new NotFoundException(`Patient ${encounter.patientId} not found`)
			}

			const deathDatetime = input.dischargeDatetime ? new Date(input.dischargeDatetime) : new Date()
			if (Number.isNaN(deathDatetime.getTime())) {
				throw new BadRequestException(
					"A valid discharge date/time is required for deceased disposition."
				)
			}

			const requiredReportTypes = getRequiredDeathReportTypes(
				patient.sex,
				patient.dateOfBirth,
				deathDatetime
			)

			if (requiredReportTypes.length > 0) {
				const reports = await db
					.select({
						reportType: deathReports.reportType,
						status: deathReports.status,
					})
					.from(deathReports)
					.where(
						and(
							eq(deathReports.encounterId, input.encounterId),
							inArray(deathReports.reportType, requiredReportTypes)
						)
					)

				const submittedTypes = new Set(
					reports
						.filter(report => isSubmittedDeathReportStatus(report.status))
						.map(report => report.reportType)
				)
				const missingTypes = requiredReportTypes.filter(type => !submittedTypes.has(type))

				if (missingTypes.length > 0) {
					throw new BadRequestException(
						`${formatDeathReportLabels(missingTypes)} must be submitted before discharging a deceased patient.`
					)
				}
			}
		}

		// Release bed — mark dirty (needs housekeeping before next admission)
		if (encounter.bedId) {
			await db
				.update(beds)
				.set({ status: "dirty", currentEncounterId: null, updatedAt: new Date() })
				.where(eq(beds.id, encounter.bedId))
		}

		const [updated] = await db
			.update(encounters)
			.set({
				status: "discharged",
				disposition: input.disposition,
				dischargeDatetime: input.dischargeDatetime ? new Date(input.dischargeDatetime) : new Date(),
				updatedAt: new Date(),
			})
			.where(eq(encounters.id, input.encounterId))
			.returning()

		// Log SLA event for discharge
		await this.logSlaEvent({
			facilityId: encounter.facilityId,
			encounterId: encounter.id,
			fromStatus: encounter.status,
			toStatus: "discharged",
			workflowType: "discharge",
			staffId: null,
			notes: `Disposition: ${input.disposition}`,
		})

		this.logger.log(
			`Discharged encounter ${input.encounterId} with disposition: ${input.disposition}`
		)

		this.eventEmitter.emit("encounter.discharged", {
			facilityId: encounter.facilityId,
			encounterId: encounter.id,
			encounterType: encounter.encounterType,
			disposition: input.disposition,
		})

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

		this.eventEmitter.emit("encounter.discharged", {
			facilityId: encounter.facilityId,
			encounterId: encounter.id,
			encounterType: encounter.encounterType,
			disposition: null,
		})

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
		const [encounter] = await db.select().from(encounters).where(eq(encounters.id, input.id))

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
			? await (async () => {
					// Resolve billing items from DB
					const [chargesRow] = await db
						.select({ n: count() })
						.from(charges)
						.where(eq(charges.encounterId, encounter.id))
					const chargesCaptured = (chargesRow?.n ?? 0) > 0

					const [invoiceRow] = await db
						.select({ n: count() })
						.from(invoices)
						.where(
							and(
								eq(invoices.encounterId, encounter.id),
								inArray(invoices.status, ["finalized", "paid"])
							)
						)
					const invoiceGenerated = (invoiceRow?.n ?? 0) > 0

					let paymentRecorded: ChecklistStatus = "incomplete"
					if (invoiceGenerated) {
						const [paymentRow] = await db
							.select({ n: count() })
							.from(payments)
							.innerJoin(invoices, eq(payments.invoiceId, invoices.id))
							.where(eq(invoices.encounterId, encounter.id))
						paymentRecorded = (paymentRow?.n ?? 0) > 0 ? "complete" : "incomplete"
					}

					// Resolve clearance items from discharge_clearances table
					const [clearances] = await db
						.select()
						.from(dischargeClearances)
						.where(eq(dischargeClearances.encounterId, encounter.id))

					const [signedDischargeSummaryRow] = await db
						.select({ n: count() })
						.from(clinicalNotes)
						.where(
							and(
								eq(clinicalNotes.encounterId, encounter.id),
								eq(clinicalNotes.noteType, "discharge_summary"),
								eq(clinicalNotes.status, "signed")
							)
						)
					const dischargeSummarySigned = (signedDischargeSummaryRow?.n ?? 0) > 0

					const [finalDiagnosisRow] = await db
						.select({ n: count() })
						.from(clinicalNotes)
						.where(
							and(
								eq(clinicalNotes.encounterId, encounter.id),
								eq(clinicalNotes.noteType, "discharge_summary"),
								eq(clinicalNotes.status, "signed"),
								sql`COALESCE((${clinicalNotes.structuredData}->'icd10_diagnosis'->>'icd10Code'), '') <> ''`
							)
						)
					const finalDiagnosisCoded = (finalDiagnosisRow?.n ?? 0) > 0

					const [followupRow] = await db
						.select({ n: count() })
						.from(clinicalNotes)
						.where(
							and(
								eq(clinicalNotes.encounterId, encounter.id),
								eq(clinicalNotes.noteType, "discharge_summary"),
								eq(clinicalNotes.status, "signed"),
								sql`length(trim(COALESCE(${clinicalNotes.structuredData}->>'plan', ''))) > 0`
							)
						)
					const followupInstructionsEntered = (followupRow?.n ?? 0) > 0

					const [activeMedRow] = await db
						.select({ n: count() })
						.from(medicationOrders)
						.where(
							and(
								eq(medicationOrders.encounterId, encounter.id),
								inArray(medicationOrders.status, ["verified", "active"])
							)
						)
					const activeMedicationOrderCount = activeMedRow?.n ?? 0

					const [signedPrescriptionRow] = await db
						.select({ n: count() })
						.from(prescriptions)
						.where(
							and(
								eq(prescriptions.encounterId, encounter.id),
								inArray(prescriptions.status, ["signed", "issued"])
							)
						)
					const signedPrescriptionCount = signedPrescriptionRow?.n ?? 0
					const dischargeMedicationsStatus: ChecklistStatus =
						signedPrescriptionCount > 0
							? "complete"
							: activeMedicationOrderCount === 0
								? "not_applicable"
								: "incomplete"

					return [
						{
							key: "discharge_summary_signed",
							label: "Discharge summary signed",
							category: "clinical" as ChecklistCategory,
							status: (dischargeSummarySigned ? "complete" : "incomplete") as ChecklistStatus,
							responsibleRole: "Clinician",
						},
						{
							key: "final_diagnosis_coded",
							label: "Final diagnosis coded (ICD-10)",
							category: "clinical" as ChecklistCategory,
							status: (finalDiagnosisCoded ? "complete" : "incomplete") as ChecklistStatus,
							responsibleRole: "Clinician",
						},
						{
							key: "discharge_medications",
							label: "Discharge medications documented",
							category: "clinical" as ChecklistCategory,
							status: dischargeMedicationsStatus,
							responsibleRole: "Clinician",
						},
						{
							key: "followup_instructions",
							label: "Follow-up instructions entered",
							category: "clinical" as ChecklistCategory,
							status: (followupInstructionsEntered
								? "complete"
								: "incomplete") as ChecklistStatus,
							responsibleRole: "Clinician",
						},
						{
							key: "charges_captured",
							label: "All charges captured",
							category: "billing" as ChecklistCategory,
							status: (chargesCaptured ? "complete" : "incomplete") as ChecklistStatus,
							responsibleRole: "Biller",
						},
						{
							key: "invoice_generated",
							label: "Invoice generated",
							category: "billing" as ChecklistCategory,
							status: (invoiceGenerated ? "complete" : "incomplete") as ChecklistStatus,
							responsibleRole: "Biller",
						},
						{
							key: "payment_recorded",
							label: "Payment recorded or plan established",
							category: "billing" as ChecklistCategory,
							status: paymentRecorded,
							responsibleRole: "Biller",
						},
						{
							key: "pharmacy_clearance",
							label: "Pharmacy clearance confirmed",
							category: "billing" as ChecklistCategory,
							status: (clearances?.pharmacyClearedAt
								? "complete"
								: "incomplete") as ChecklistStatus,
							responsibleRole: "Pharmacist",
						},
						{
							key: "nursing_clearance",
							label: "Nurse ward clearance confirmed",
							category: "clinical" as ChecklistCategory,
							status: (clearances?.nursingClearedAt ? "complete" : "incomplete") as ChecklistStatus,
							responsibleRole: "Nurse",
						},
						{
							key: "billing_sign_off",
							label: "Billing sign-off received",
							category: "billing" as ChecklistCategory,
							status: (clearances?.billingSignedOffAt
								? "complete"
								: "incomplete") as ChecklistStatus,
							responsibleRole: "Biller",
						},
					]
				})()
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
										inArray(medicationOrders.status, ["pending_verification", "verified", "active"])
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

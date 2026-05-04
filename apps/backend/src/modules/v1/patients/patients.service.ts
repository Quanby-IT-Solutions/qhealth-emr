import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq, gte, ilike, inArray, lt, max, or, sql } from "drizzle-orm"

import {
	encounters,
	encounterStatusEvents,
	opdTriageIntakes,
	patients,
	staffProfiles,
	users,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"
import { AuditService } from "@/modules/v1/audit/audit.service"
import { ChartAccessService, type ChartAccessActor } from "@/modules/v1/audit/chart-access.service"
import { resolveStepTarget } from "@/utils/sla-step-target"

type PatientSearchInput = V1Inputs["patient"]["search"]
type CreatePatientInput = V1Inputs["patient"]["create"]
type UpdatePatientInput = V1Inputs["patient"]["update"]
type RegisterPatientWithOpdEncounterInput = V1Inputs["patient"]["registerWithOpdEncounter"]
type ListCliniciansInput = V1Inputs["patient"]["listClinicians"]

@Injectable()
export class PatientsService {
	private readonly logger = new Logger(PatientsService.name)

	constructor(
		private readonly auditService: AuditService,
		private readonly chartAccessService: ChartAccessService
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
	// List Clinicians — registrar-accessible (PS-047, no admin:view required)
	// ========================================================================

	async listClinicians(input: ListCliniciansInput) {
		const rows = await db
			.select({
				staffProfileId: staffProfiles.id,
				name: users.name,
				department: staffProfiles.department,
			})
			.from(staffProfiles)
			.innerJoin(users, eq(staffProfiles.userId, users.id))
			.where(and(eq(staffProfiles.facilityId, input.facilityId), eq(staffProfiles.isActive, true)))
			.orderBy(users.name)

		return {
			data: rows.map(r => ({
				staffProfileId: r.staffProfileId,
				name: r.name,
				department: r.department ?? null,
			})),
		}
	}

	// ========================================================================
	// Search
	// ========================================================================

	async search(filter: PatientSearchInput) {
		const page = Number(filter.page) || 1
		const limit = Number(filter.limit) || 50
		const offset = (page - 1) * limit
		const isActive =
			filter.isActive === true || filter.isActive === "true"
				? true
				: filter.isActive === false || filter.isActive === "false"
					? false
					: true

		const conditions = [eq(patients.facilityId, filter.facilityId)]

		conditions.push(eq(patients.isActive, isActive))

		if (filter.search) {
			const searchTokens = this.tokenizeSearch(filter.search)

			if (searchTokens.length > 0) {
				conditions.push(
					and(...searchTokens.map(token => this.buildPatientSearchTokenCondition(token)))!
				)
			}
		}

		if (filter.mrn) {
			const m = this.escapeLike(filter.mrn)
			conditions.push(ilike(patients.mrn, `%${m}%`))
		}

		if (filter.dateOfBirth) {
			conditions.push(eq(patients.dateOfBirth, filter.dateOfBirth))
		}

		if (filter.philhealthMemberId) {
			const philhealthMemberId = this.escapeLike(filter.philhealthMemberId)
			conditions.push(ilike(patients.philhealthMemberId, `%${philhealthMemberId}%`))
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
					philhealthMemberId: patients.philhealthMemberId,
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

		const hasDirectAccessSet = new Set<string>()
		if (filter.clinicianStaffId && data.length > 0) {
			const patientIds = data.map(r => r.id)
			const accessRows = await db
				.selectDistinct({ patientId: encounters.patientId })
				.from(encounters)
				.where(
					and(
						inArray(encounters.patientId, patientIds),
						inArray(encounters.status, ["active", "discharged", "closed"]),
						or(
							eq(encounters.clinicianStaffId, filter.clinicianStaffId),
							eq(encounters.attendingStaffId, filter.clinicianStaffId),
							eq(encounters.admittingStaffId, filter.clinicianStaffId)
						)
					)
				)
			for (const row of accessRows) {
				hasDirectAccessSet.add(row.patientId)
			}
		}

		return {
			data: data.map(row => ({
				...row,
				lastEncounterDate: row.lastEncounterDate ?? null,
				hasDirectAccess: filter.clinicianStaffId ? hasDirectAccessSet.has(row.id) : true,
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

	async findById(id: string, actor?: ChartAccessActor) {
		const [patient] = await db.select().from(patients).where(eq(patients.id, id))

		if (!patient) {
			throw new NotFoundException(`Patient ${id} not found`)
		}

		const access = await this.chartAccessService.ensurePatientChartReadAccess(actor, id, {
			entityType: "patient",
			entityId: id,
		})

		// PS-049: emit DPA audit record for patient lookup
		if (actor?.userId) {
			const staffProfileId = await this.getOptionalStaffProfileId(actor.userId)
			void this.auditService.log({
				facilityId: patient.facilityId,
				userId: actor.userId,
				staffProfileId,
				action: "read",
				entityType: "patient",
				entityId: patient.id,
				beforeState: null,
				afterState: null,
				ipAddress: actor.ipAddress ?? null,
				userAgent: actor.userAgent ?? null,
				metadata: {
					mrn: patient.mrn,
					...(access.mode === "break_glass"
						? {
								accessMode: "break_glass",
								breakGlassEventId: access.breakGlassEventId ?? null,
							}
						: {}),
				},
			})
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
	// Register Patient + OPD Encounter (PS-034 — single atomic transaction)
	// ========================================================================

	async registerWithOpdEncounter(input: RegisterPatientWithOpdEncounterInput, userId?: string) {
		const MAX_RETRIES = 5
		const patientValues = {
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
				const result = await db.transaction(async tx => {
					// PS-044: defence-in-depth — OPD registration always requires prior triage
					// (also enforced at contract level); prevents creating ghost encounters.
					if (!input.pendingTriageId) {
						throw new BadRequestException(
							"Outpatient registration requires a pending triage intake (TOR Flow 1 Step 1)"
						)
					}

					// PS-041: Validate triage intake before proceeding — prevents forged, stale,
					// or cross-facility IDs from creating an OPD encounter and ARTA events.
					let triageIntakeChiefComplaint: string | null = null
					const [intake] = await tx
						.select({
							id: opdTriageIntakes.id,
							facilityId: opdTriageIntakes.facilityId,
							status: opdTriageIntakes.status,
							chiefComplaint: opdTriageIntakes.chiefComplaint, // PS-045
						})
						.from(opdTriageIntakes)
						.where(eq(opdTriageIntakes.id, input.pendingTriageId))
					if (!intake) {
						throw new NotFoundException(`Triage intake ${input.pendingTriageId} not found`)
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

					// PS-048: validate clinicianStaffId belongs to this facility and is active
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

					// 1. Insert patient with generated MRN
					const [patient] = await tx
						.insert(patients)
						.values({ ...patientValues, mrn })
						.returning()
					if (!patient) throw new Error("Patient insert failed")

					// 2. Generate sequential OPD queue number for this clinic + day
					const todayStart = new Date()
					todayStart.setUTCHours(0, 0, 0, 0)
					const tomorrowStart = new Date(todayStart)
					tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1)

					// PS-036: clinicianStaffId is required — always scope queue to clinic
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
					const queueNumber = (maxResult?.maxQueue ?? 0) + 1

					// 3. Insert OPD encounter
					const [encounter] = await tx
						.insert(encounters)
						.values({
							facilityId: input.facilityId,
							patientId: patient.id,
							encounterType: "outpatient",
							chiefComplaint: triageIntakeChiefComplaint, // PS-045: carry from triage
							admittingStaffId: input.admittingStaffId ?? null,
							attendingStaffId: input.admittingStaffId ?? null,
							admissionDatetime: new Date(),
							queueNumber,
							clinicianStaffId: input.clinicianStaffId ?? null,
							queueStatus: "waiting",
						})
						.returning()
					if (!encounter) throw new Error("Encounter insert failed")

					// 4. If reconciling a walk-in triage, link intake atomically (PS-033/PS-034)
					if (input.pendingTriageId) {
						await tx
							.update(opdTriageIntakes)
							.set({
								patientId: patient.id,
								status: "registered",
								encounterId: encounter.id,
								updatedAt: new Date(),
							})
							.where(eq(opdTriageIntakes.id, input.pendingTriageId))
					}

					// PS-049: DPA audit record — atomic with the patient/encounter insert
					if (userId) {
						const staffProfileId = await this.getOptionalStaffProfileId(userId)
						await this.auditService.log(
							{
								facilityId: input.facilityId,
								userId,
								staffProfileId,
								action: "create",
								entityType: "patient",
								entityId: patient.id,
								beforeState: null,
								afterState: { mrn, encounterId: encounter.id, queueNumber },
								ipAddress: null,
								userAgent: null,
								metadata: {
									workflow: "opd_registration",
									pendingTriageId: input.pendingTriageId ?? null,
									clinicianStaffId: input.clinicianStaffId,
								},
							},
							{ tx }
						)
					}

					return {
						patientId: patient.id,
						mrn,
						encounterId: encounter.id,
						queueNumber,
						clinicianStaffId: input.clinicianStaffId,
					}
				})

				this.logger.log(
					`Registered patient ${result.mrn} with OPD encounter ${result.encounterId} (queue #${result.queueNumber})`
				)
				// PS-037/PS-039: Emit ARTA events; when triage is linked, backfill the arrival
				// milestone so the full OPD timeline is auditable from encounterStatusEvents
				// without needing to infer intermediate steps from other tables.
				// SLA-001: Resolve step targets from facility overrides (slaStepConfigs) first,
				// then fall back to TOR defaults — so admin-configured overrides are authoritative.
				const [arrivalTarget, registrationTarget] = await Promise.all([
					resolveStepTarget(input.facilityId, "opd", "arrived"),
					resolveStepTarget(input.facilityId, "opd", "waiting"),
				])
				if (input.pendingTriageId) {
					const [triage] = await db
						.select({ arrivalTime: opdTriageIntakes.arrivalTime })
						.from(opdTriageIntakes)
						.where(eq(opdTriageIntakes.id, input.pendingTriageId))
					await db.insert(encounterStatusEvents).values({
						facilityId: input.facilityId,
						encounterId: result.encounterId,
						fromStatus: null,
						toStatus: "arrived",
						workflowType: "opd",
						staffId: input.admittingStaffId ?? null,
						slaTargetMinutes: arrivalTarget,
						notes: "OPD arrival: triage assessment completed",
						occurredAt: triage?.arrivalTime ?? new Date(),
					})
					await db.insert(encounterStatusEvents).values({
						facilityId: input.facilityId,
						encounterId: result.encounterId,
						fromStatus: "arrived",
						toStatus: "waiting",
						workflowType: "opd",
						staffId: input.admittingStaffId ?? null,
						slaTargetMinutes: registrationTarget,
						notes: "OPD registration: placed in waiting queue",
						occurredAt: new Date(),
					})
				} else {
					await db.insert(encounterStatusEvents).values({
						facilityId: input.facilityId,
						encounterId: result.encounterId,
						fromStatus: null,
						toStatus: "waiting",
						workflowType: "opd",
						staffId: input.admittingStaffId ?? null,
						slaTargetMinutes: registrationTarget,
						notes: "OPD registration: placed in waiting queue",
						occurredAt: new Date(),
					})
				}
				return result
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
	// MRN Generation — unique per facility, format: MRN-YYYYMMDD-NNNN
	// ========================================================================

	/** Escape special ILIKE pattern characters: %, _, \ */
	private escapeLike(str: string): string {
		return str.replace(/[%_\\]/g, "\\$&")
	}

	private tokenizeSearch(search: string): string[] {
		return search
			.trim()
			.replaceAll(",", " ")
			.split(/\s+/)
			.map(token => token.trim())
			.filter(Boolean)
	}

	private buildPatientSearchTokenCondition(token: string) {
		const escapedToken = this.escapeLike(token)

		return or(
			ilike(patients.firstName, `%${escapedToken}%`),
			ilike(patients.middleName, `%${escapedToken}%`),
			ilike(patients.lastName, `%${escapedToken}%`),
			ilike(patients.mrn, `%${escapedToken}%`)
		)!
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
			.where(and(eq(patients.facilityId, facilityId), ilike(patients.mrn, `${prefix}%`)))

		const sequence = (result?.count ?? 0) + 1
		return `${prefix}${sequence.toString().padStart(4, "0")}`
	}
}

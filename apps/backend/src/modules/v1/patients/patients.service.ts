import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq, gte, ilike, lt, max, sql } from "drizzle-orm"

import {
	encounters,
	encounterStatusEvents,
	opdTriageIntakes,
	patients,
	staffProfiles,
	users,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { supabase, unwrapMany } from "@/common/database/supabase.client"
import type { V1Inputs } from "@/config/contract-types"
import { AuditService } from "@/modules/v1/audit/audit.service"
import { ChartAccessService, type ChartAccessActor } from "@/modules/v1/audit/chart-access.service"
import { resolveStepTarget } from "@/utils/sla-step-target"

type PatientSearchInput = V1Inputs["patient"]["search"]
type CreatePatientInput = V1Inputs["patient"]["create"]
type UpdatePatientInput = V1Inputs["patient"]["update"]
type RegisterPatientWithOpdEncounterInput = V1Inputs["patient"]["registerWithOpdEncounter"]
type ListCliniciansInput = V1Inputs["patient"]["listClinicians"]
type VerifyMrnInput = V1Inputs["patient"]["verifyMrn"]

type SupabasePatientSearchRow = {
	id: string
	mrn: string
	first_name: string
	last_name: string
	middle_name: string | null
	date_of_birth: string
	sex: "male" | "female" | "other"
	philhealth_member_id: string | null
	is_active: boolean
}

type SupabasePatientEncounterRow = {
	patient_id: string
	admission_datetime: string | null
}

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

		const hasPatientIdentifierSearch = Boolean(filter.search?.trim() || filter.mrn?.trim())
		const buildPatientQuery = (facilityScoped: boolean) => {
			let query = supabase
				.from("patients")
				.select(
					"id, mrn, first_name, last_name, middle_name, date_of_birth, sex, philhealth_member_id, is_active",
					{ count: "exact" }
				)
				.eq("is_active", isActive)

			if (facilityScoped) {
				query = query.eq("facility_id", filter.facilityId)
			}

			if (filter.search) {
				const searchTokens = this.tokenizeSearch(filter.search)

				for (const token of searchTokens) {
					query = query.or(this.buildSupabasePatientSearchTokenFilter(token))
				}
			}

			if (filter.mrn) {
				const m = this.escapeLike(filter.mrn)
				query = query.ilike("mrn", `%${m}%`)
			}

			if (filter.dateOfBirth) {
				query = query.eq("date_of_birth", filter.dateOfBirth)
			}

			if (filter.philhealthMemberId) {
				const philhealthMemberId = this.escapeLike(filter.philhealthMemberId)
				query = query.ilike("philhealth_member_id", `%${philhealthMemberId}%`)
			}

			return query
				.order("last_name", { ascending: true })
				.order("first_name", { ascending: true })
				.range(offset, offset + limit - 1)
		}

		let result = await buildPatientQuery(true)

		if (result.error) throw new Error(result.error.message)

		let data = (result.data ?? []) as SupabasePatientSearchRow[]
		let total = result.count ?? 0

		if (data.length === 0 && hasPatientIdentifierSearch) {
			result = await buildPatientQuery(false)
			if (result.error) throw new Error(result.error.message)

			data = (result.data ?? []) as SupabasePatientSearchRow[]
			total = result.count ?? 0
		}

		const patientIds = data.map(row => row.id)
		const lastEncounterDates = await this.getSupabaseLastEncounterDates(patientIds)

		const hasDirectAccessSet = new Set<string>()
		if (filter.clinicianStaffId && data.length > 0) {
			const accessRows = unwrapMany(
				await supabase
					.from("encounters")
					.select("patient_id")
					.in("patient_id", patientIds)
					.in("status", ["active", "discharged", "closed"])
					.or(
						[
							`clinician_staff_id.eq.${filter.clinicianStaffId}`,
							`attending_staff_id.eq.${filter.clinicianStaffId}`,
							`admitting_staff_id.eq.${filter.clinicianStaffId}`,
						].join(",")
					)
			) as Array<{ patient_id: string }>

			for (const row of accessRows) hasDirectAccessSet.add(row.patient_id)
		}

		return {
			data: data.map(row => ({
				id: row.id,
				mrn: row.mrn,
				firstName: row.first_name,
				lastName: row.last_name,
				middleName: row.middle_name,
				dateOfBirth: this.formatDateOnly(row.date_of_birth),
				sex: row.sex,
				philhealthMemberId: row.philhealth_member_id,
				isActive: row.is_active,
				lastEncounterDate: lastEncounterDates.get(row.id) ?? null,
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
			...this.serializePatient(patient),
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
				return this.serializePatient(created!)
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
		return this.serializePatient(updated)
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

	/**
	 * Convert Postgres DATE values into stable YYYY-MM-DD strings that match the
	 * shared contract without shifting the calendar day across timezones.
	 */
	private formatDateOnly(value: Date | string): string {
		if (typeof value === "string") return value

		const year = value.getFullYear().toString()
		const month = (value.getMonth() + 1).toString().padStart(2, "0")
		const day = value.getDate().toString().padStart(2, "0")

		return `${year}-${month}-${day}`
	}

	private serializePatient<T extends { dateOfBirth: Date | string }>(
		patient: T
	): Omit<T, "dateOfBirth"> & { dateOfBirth: string } {
		return {
			...patient,
			dateOfBirth: this.formatDateOnly(patient.dateOfBirth),
		}
	}

	private tokenizeSearch(search: string): string[] {
		return search
			.trim()
			.replaceAll(",", " ")
			.split(/\s+/)
			.map(token => token.trim())
			.filter(Boolean)
	}

	private buildSupabasePatientSearchTokenFilter(token: string) {
		const escapedToken = this.escapeLike(token)
		const pattern = `%${escapedToken}%`

		return [
			`first_name.ilike.${pattern}`,
			`middle_name.ilike.${pattern}`,
			`last_name.ilike.${pattern}`,
			`mrn.ilike.${pattern}`,
		].join(",")
	}

	private async getSupabaseLastEncounterDates(patientIds: string[]) {
		const ids = [...new Set(patientIds)]
		const lastEncounterDates = new Map<string, string>()
		if (ids.length === 0) return lastEncounterDates

		const rows = unwrapMany(
			await supabase
				.from("encounters")
				.select("patient_id, admission_datetime")
				.in("patient_id", ids)
		) as SupabasePatientEncounterRow[]

		for (const row of rows) {
			if (!row.admission_datetime) continue

			const current = lastEncounterDates.get(row.patient_id)
			if (!current || new Date(row.admission_datetime) > new Date(current)) {
				lastEncounterDates.set(row.patient_id, row.admission_datetime)
			}
		}

		return lastEncounterDates
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

	// ========================================================================
	// Verify MRN
	// ========================================================================

	async verifyMrn(input: VerifyMrnInput) {
		const [patient] = await db
			.select({
				id: patients.id,
				mrn: patients.mrn,
				firstName: patients.firstName,
				lastName: patients.lastName,
				middleName: patients.middleName,
				dateOfBirth: patients.dateOfBirth,
				sex: patients.sex,
			})
			.from(patients)
			.where(and(eq(patients.facilityId, input.facilityId), eq(patients.mrn, input.mrn)))

		if (!patient) {
			throw new NotFoundException("Cannot find the MRN of the patient.")
		}

		return {
			patientId: patient.id,
			mrn: patient.mrn,
			firstName: patient.firstName,
			lastName: patient.lastName,
			middleName: patient.middleName,
			dateOfBirth: this.formatDateOnly(patient.dateOfBirth),
			sex: patient.sex,
		}
	}
}

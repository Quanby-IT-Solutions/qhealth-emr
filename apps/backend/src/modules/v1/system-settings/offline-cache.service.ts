import {
	Injectable,
	Logger,
	NotFoundException,
	OnModuleDestroy,
	OnModuleInit,
} from "@nestjs/common"
import { and, desc, eq, inArray, sql } from "drizzle-orm"

import type { OfflinePreparedPatientSummary, OfflineSummarySnapshot } from "@repo/contracts"
import {
	allergies,
	beds,
	encounters,
	medicationOrders,
	offlineCacheJobs,
	offlinePatientSummaries,
	patients,
	problems,
	staffProfiles,
	systemSettings,
	users,
	vitalSigns,
	wards,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"

const SCHEDULER_INITIAL_DELAY_MS = 30_000
const SCHEDULER_INTERVAL_MS = 60 * 60 * 1000

export type OfflineCacheJobResult = {
	jobId: string
	status: "running" | "completed" | "failed"
	cachedPatientCount: number | null
	errorMessage: string | null
}

type ActivePatientRow = {
	id: string
	mrn: string
	firstName: string
	middleName: string | null
	lastName: string
	dateOfBirth: Date | string
	sex: "male" | "female" | "other"
	isActive: boolean
}

@Injectable()
export class OfflineCacheService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(OfflineCacheService.name)
	private schedulerHandle: ReturnType<typeof setInterval> | null = null

	onModuleInit() {
		const run = () => this.runScheduledJobsForAllFacilities()
		const timeout = setTimeout(() => {
			void run()
			this.schedulerHandle = setInterval(() => void run(), SCHEDULER_INTERVAL_MS)
		}, SCHEDULER_INITIAL_DELAY_MS)
		timeout.unref?.()
	}

	onModuleDestroy() {
		if (this.schedulerHandle) {
			clearInterval(this.schedulerHandle)
			this.schedulerHandle = null
		}
	}

	async runJobForFacility(facilityId: string, triggeredBy: string): Promise<OfflineCacheJobResult> {
		const [settings] = await db
			.select({ enableOfflineSummaryCache: systemSettings.enableOfflineSummaryCache })
			.from(systemSettings)
			.where(eq(systemSettings.facilityId, facilityId))
			.limit(1)

		if (settings && !settings.enableOfflineSummaryCache) {
			return {
				jobId: crypto.randomUUID(),
				status: "failed",
				cachedPatientCount: null,
				errorMessage: "Offline summary caching is disabled for this facility",
			}
		}

		const [jobRecord] = await db
			.insert(offlineCacheJobs)
			.values({ facilityId, status: "running", triggeredBy })
			.returning({ id: offlineCacheJobs.id })

		const jobId = jobRecord!.id

		try {
			const activePatients = await db
				.select({
					id: patients.id,
					mrn: patients.mrn,
					firstName: patients.firstName,
					middleName: patients.middleName,
					lastName: patients.lastName,
					dateOfBirth: patients.dateOfBirth,
					sex: patients.sex,
					isActive: patients.isActive,
				})
				.from(patients)
				.where(and(eq(patients.facilityId, facilityId), eq(patients.isActive, true)))
				.orderBy(patients.lastName, patients.firstName)

			let cachedPatientCount = 0
			for (const patient of activePatients) {
				const payload = await this.buildPatientSummaryPayload(facilityId, patient, jobId)

				await db
					.insert(offlinePatientSummaries)
					.values({
						facilityId,
						patientId: patient.id,
						summaryPayload: payload,
						preparedAt: new Date(payload.preparedAt),
						sourceJobId: jobId,
						updatedAt: new Date(),
					})
					.onConflictDoUpdate({
						target: [offlinePatientSummaries.facilityId, offlinePatientSummaries.patientId],
						set: {
							summaryPayload: sql`excluded.summary_payload`,
							preparedAt: sql`excluded.prepared_at`,
							sourceJobId: jobId,
							updatedAt: new Date(),
						},
					})

				cachedPatientCount++
			}

			await db
				.update(offlineCacheJobs)
				.set({ status: "completed", completedAt: new Date(), cachedPatientCount })
				.where(eq(offlineCacheJobs.id, jobId))

			this.logger.log(
				`Offline cache job completed for facility ${facilityId}: prepared ${cachedPatientCount} patient summaries (triggered by ${triggeredBy})`
			)

			return { jobId, status: "completed", cachedPatientCount, errorMessage: null }
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Unknown error during cache preparation"

			await db
				.update(offlineCacheJobs)
				.set({ status: "failed", completedAt: new Date(), errorMessage })
				.where(eq(offlineCacheJobs.id, jobId))

			this.logger.error(`Offline cache job failed for facility ${facilityId}: ${errorMessage}`)

			return { jobId, status: "failed", cachedPatientCount: null, errorMessage }
		}
	}

	async getPreparedSnapshot(facilityId: string): Promise<OfflineSummarySnapshot> {
		const rows = await db
			.select({
				summaryPayload: offlinePatientSummaries.summaryPayload,
				preparedAt: offlinePatientSummaries.preparedAt,
			})
			.from(offlinePatientSummaries)
			.where(eq(offlinePatientSummaries.facilityId, facilityId))
			.orderBy(desc(offlinePatientSummaries.preparedAt))

		const summaries = rows.map(row => row.summaryPayload as OfflinePreparedPatientSummary)
		const latestPreparedAt =
			rows.map(row => row.preparedAt).sort((a, b) => b.getTime() - a.getTime())[0] ?? null

		return {
			schemaVersion: 1,
			facilityId,
			preparedAt: latestPreparedAt?.toISOString() ?? null,
			patientCount: summaries.length,
			summaries,
		}
	}

	async getPreparedPatientSummary(
		facilityId: string,
		patientId: string
	): Promise<OfflinePreparedPatientSummary> {
		const [row] = await db
			.select({ summaryPayload: offlinePatientSummaries.summaryPayload })
			.from(offlinePatientSummaries)
			.where(
				and(
					eq(offlinePatientSummaries.facilityId, facilityId),
					eq(offlinePatientSummaries.patientId, patientId)
				)
			)
			.limit(1)

		if (!row) {
			throw new NotFoundException(`No prepared offline summary exists for patient ${patientId}`)
		}

		return row.summaryPayload as OfflinePreparedPatientSummary
	}

	private async buildPatientSummaryPayload(
		facilityId: string,
		patient: ActivePatientRow,
		sourceJobId: string
	): Promise<OfflinePreparedPatientSummary> {
		const preparedAt = new Date()
		const latestEncounter = await this.getLatestActiveEncounter(facilityId, patient.id)

		return {
			schemaVersion: 1,
			facilityId,
			patient: {
				id: patient.id,
				mrn: patient.mrn,
				firstName: patient.firstName,
				middleName: patient.middleName,
				lastName: patient.lastName,
				dateOfBirth: this.formatDateOnly(patient.dateOfBirth),
				sex: patient.sex,
				isActive: patient.isActive,
			},
			encounterSummary: latestEncounter
				? await this.buildEncounterSummary(facilityId, patient, latestEncounter)
				: null,
			preparedAt: preparedAt.toISOString(),
			sourceJobId,
		}
	}

	private async getLatestActiveEncounter(facilityId: string, patientId: string) {
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
				admissionDatetime: encounters.admissionDatetime,
				dischargeDatetime: encounters.dischargeDatetime,
				disposition: encounters.disposition,
				oecbEligible: encounters.oecbEligible,
				admittingStaffName: admittingStaffSq.name,
				attendingStaffName: attendingStaffSq.name,
				wardName: wards.name,
				bedNumber: beds.bedNumber,
			})
			.from(encounters)
			.leftJoin(beds, eq(encounters.bedId, beds.id))
			.leftJoin(wards, eq(beds.wardId, wards.id))
			.leftJoin(admittingStaffSq, eq(encounters.admittingStaffId, admittingStaffSq.id))
			.leftJoin(attendingStaffSq, eq(encounters.attendingStaffId, attendingStaffSq.id))
			.where(
				and(
					eq(encounters.facilityId, facilityId),
					eq(encounters.patientId, patientId),
					inArray(encounters.status, ["active", "pending_discharge"])
				)
			)
			.orderBy(desc(encounters.admissionDatetime))
			.limit(1)

		return row ?? null
	}

	private async buildEncounterSummary(
		facilityId: string,
		patient: ActivePatientRow,
		encounter: NonNullable<Awaited<ReturnType<OfflineCacheService["getLatestActiveEncounter"]>>>
	): Promise<OfflinePreparedPatientSummary["encounterSummary"]> {
		const [latestVitals, activeProblems, activeAllergies, activeMedications] = await Promise.all([
			this.getLatestVitals(facilityId, encounter.id),
			this.getActiveProblems(facilityId, patient.id),
			this.getActiveAllergies(facilityId, patient.id),
			this.getActiveMedications(encounter.id),
		])

		return {
			encounter: {
				id: encounter.id,
				facilityId: encounter.facilityId,
				patientId: patient.id,
				patientName: `${patient.lastName}, ${patient.firstName}`,
				patientMrn: patient.mrn,
				patientDateOfBirth: this.formatDateOnly(patient.dateOfBirth),
				patientSex: patient.sex,
				encounterType: encounter.encounterType,
				status: encounter.status,
				chiefComplaint: encounter.chiefComplaint,
				admissionDatetime: encounter.admissionDatetime.toISOString(),
				dischargeDatetime: encounter.dischargeDatetime?.toISOString() ?? null,
				disposition: encounter.disposition ?? null,
				admittingStaffName: encounter.admittingStaffName ?? null,
				attendingStaffName: encounter.attendingStaffName ?? null,
				wardName: encounter.wardName ?? null,
				bedNumber: encounter.bedNumber ?? null,
				oecbEligible: encounter.oecbEligible,
				transfers: [],
			},
			latestVitals,
			activeProblems,
			activeAllergies,
			activeMedications,
			activeProblemCount: activeProblems.length,
			activeAllergyCount: activeAllergies.length,
			hasSevereAllergies: activeAllergies.some(
				allergy => allergy.severity === "severe" && allergy.isVerified
			),
		}
	}

	private async getLatestVitals(facilityId: string, encounterId: string) {
		const [row] = await db
			.select({
				id: vitalSigns.id,
				temperature: vitalSigns.temperature,
				bpSystolic: vitalSigns.bpSystolic,
				bpDiastolic: vitalSigns.bpDiastolic,
				heartRate: vitalSigns.heartRate,
				respiratoryRate: vitalSigns.respiratoryRate,
				spo2: vitalSigns.spo2,
				newsScore: vitalSigns.newsScore,
				newsRiskLevel: vitalSigns.newsRiskLevel,
				recordedAt: vitalSigns.recordedAt,
			})
			.from(vitalSigns)
			.where(and(eq(vitalSigns.facilityId, facilityId), eq(vitalSigns.encounterId, encounterId)))
			.orderBy(desc(vitalSigns.recordedAt))
			.limit(1)

		return row ? { ...row, recordedAt: row.recordedAt.toISOString() } : null
	}

	private async getActiveProblems(facilityId: string, patientId: string) {
		const rows = await db
			.select({
				id: problems.id,
				description: problems.description,
				icd10Code: problems.icd10Code,
				icd10Display: problems.icd10Display,
				snomedCode: problems.snomedCode,
				snomedDisplay: problems.snomedDisplay,
				onsetDate: problems.onsetDate,
				status: problems.status,
			})
			.from(problems)
			.where(
				and(
					eq(problems.facilityId, facilityId),
					eq(problems.patientId, patientId),
					eq(problems.status, "active")
				)
			)
			.orderBy(desc(problems.createdAt))

		return rows.map(row => ({
			...row,
			onsetDate: row.onsetDate ? this.formatDateOnly(row.onsetDate) : null,
		}))
	}

	private async getActiveAllergies(facilityId: string, patientId: string) {
		const rows = await db
			.select({
				id: allergies.id,
				allergenName: allergies.allergenName,
				allergenType: allergies.allergenType,
				reactionType: allergies.reactionType,
				severity: allergies.severity,
				onsetDate: allergies.onsetDate,
				isActive: allergies.isActive,
				isVerified: allergies.isVerified,
			})
			.from(allergies)
			.where(
				and(
					eq(allergies.facilityId, facilityId),
					eq(allergies.patientId, patientId),
					eq(allergies.isActive, true)
				)
			)
			.orderBy(desc(allergies.createdAt))

		return rows.map(row => ({
			...row,
			onsetDate: row.onsetDate ? this.formatDateOnly(row.onsetDate) : null,
		}))
	}

	private async getActiveMedications(encounterId: string) {
		return db
			.select({
				id: medicationOrders.id,
				genericName: medicationOrders.genericName,
				dose: medicationOrders.dose,
				doseUnit: medicationOrders.doseUnit,
				route: medicationOrders.route,
				frequency: medicationOrders.frequency,
				status: medicationOrders.status,
			})
			.from(medicationOrders)
			.where(
				and(
					eq(medicationOrders.encounterId, encounterId),
					inArray(medicationOrders.status, ["pending_verification", "verified", "active"])
				)
			)
			.orderBy(desc(medicationOrders.createdAt))
	}

	private formatDateOnly(value: Date | string): string {
		if (typeof value === "string") return value

		const year = value.getFullYear().toString()
		const month = (value.getMonth() + 1).toString().padStart(2, "0")
		const day = value.getDate().toString().padStart(2, "0")

		return `${year}-${month}-${day}`
	}

	private async runScheduledJobsForAllFacilities(): Promise<void> {
		let enabledFacilities: Array<{ facilityId: string }>

		try {
			enabledFacilities = await db
				.select({ facilityId: systemSettings.facilityId })
				.from(systemSettings)
				.where(eq(systemSettings.enableOfflineSummaryCache, true))
		} catch (err) {
			this.logger.error(
				`Scheduled offline cache run failed to query enabled facilities: ${String(err)}`
			)
			return
		}

		this.logger.log(`Scheduled offline cache run: ${enabledFacilities.length} facilities enabled`)

		for (const { facilityId } of enabledFacilities) {
			await this.runJobForFacility(facilityId, "scheduler")
		}
	}
}

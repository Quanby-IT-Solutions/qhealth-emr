import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common"
import { and, eq } from "drizzle-orm"

import {
	deathReports,
	encounters,
	patients,
	staffProfiles,
	surveillanceFlags,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"

import { isMaternalDeathCandidate, isNeonatalDeathCandidate } from "./death-reporting-eligibility"

// ============================================================================
// Input Types
// ============================================================================

interface GetDeathReportStatusInput {
	encounterId: string
}

interface GetFmdrfInput {
	encounterId: string
}

interface CreateFmdrfInput {
	encounterId: string
	patientId: string
	facilityId: string
	patientName: string
	patientMrn: string
	patientAge: number
	patientAddress: string
	dateOfDeath: string
	placeOfDeath: string
	causeOfDeathImmediate: string
	causeOfDeathAntecedent: string
	causeOfDeathUnderlying: string
	causeOfDeathContributing: string | null
	gravidity: number
	parity: number
	lastMenstrualPeriod: string | null
	gestationalAgeWeeks: number | null
	antenatalCare: boolean
	antenatalVisitCount: number | null
	complicationType: string | null
	factorHemorrhage: boolean
	factorSepsis: boolean
	factorEclampsia: boolean
	factorObstructedLabor: boolean
	factorUnsafeAbortion: boolean
	factorOther: string | null
	avoidableFactors: boolean
	avoidableRemark: string | null
	physicianName: string
	physicianLicenseNo: string
	physicianSignatureDataUrl: string
	certificationDate: string
}

type UpdateFmdrfInput = Partial<CreateFmdrfInput> & { id: string }

interface GetFndrfInput {
	encounterId: string
}

interface CreateFndrfInput {
	encounterId: string
	patientId: string
	facilityId: string
	newbornName: string
	newbornMrn: string
	newbornDateOfBirth: string
	gestationalAgeWeeks: number
	birthWeightGrams: number
	deliveryType: "svd" | "cs" | "forceps" | "vacuum" | "other"
	apgarScore1Min: number | null
	apgarScore5Min: number | null
	resuscitationRequired: boolean
	motherName: string
	motherAge: number
	motherGravidity: number
	motherParity: number
	motherAncVisits: number | null
	dateOfDeath: string
	ageAtDeathHours: number | null
	ageAtDeathDays: number | null
	placeOfDeath: string
	causePrematurity: boolean
	causeBirthAsphyxia: boolean
	causeSepsis: boolean
	causeCongenitalAnomaly: boolean
	causeRds: boolean
	causeOther: string | null
	contributingRemarks: string | null
	physicianName: string
	physicianLicenseNo: string
	physicianSignatureDataUrl: string
	certificationDate: string
}

interface UpdateFndrfInput {
	id: string
	// All fields are optional for update
	[key: string]: unknown
}

type MaternalHistoryPayload = NonNullable<(typeof deathReports.$inferSelect)["maternalHistory"]>
type NeonatalDetailsPayload = NonNullable<(typeof deathReports.$inferSelect)["neonatalDetails"]>
type DeathReportRow = typeof deathReports.$inferSelect

function hasRequiredValue(value: unknown) {
	if (typeof value === "string") return value.trim().length > 0
	if (typeof value === "number") return Number.isFinite(value)
	return value !== null && value !== undefined
}

@Injectable()
export class DeathReportingService {
	private readonly logger = new Logger(DeathReportingService.name)

	/**
	 * Get death report status for an encounter
	 */
	async getStatus(input: GetDeathReportStatusInput) {
		const reports = await db
			.select({
				id: deathReports.id,
				reportType: deathReports.reportType,
				status: deathReports.status,
			})
			.from(deathReports)
			.where(eq(deathReports.encounterId, input.encounterId))

		const fmdrf = reports.find(r => r.reportType === "fmdrf")
		const fndrf = reports.find(r => r.reportType === "fndrf")

		return {
			hasFmdrf: !!fmdrf,
			hasFndrf: !!fndrf,
			fmdrfId: fmdrf?.id ?? null,
			fndrfId: fndrf?.id ?? null,
			fmdrfStatus: fmdrf?.status ?? null,
			fndrfStatus: fndrf?.status ?? null,
		}
	}

	/**
	 * Get FMDRF report by encounter
	 */
	async getFmdrf(input: GetFmdrfInput) {
		const [report] = await db
			.select()
			.from(deathReports)
			.where(
				and(eq(deathReports.encounterId, input.encounterId), eq(deathReports.reportType, "fmdrf"))
			)
			.limit(1)

		if (!report) {
			return null
		}

		return this.mapFmdrfReport(report)
	}

	/**
	 * Create FMDRF report
	 */
	async createFmdrf(input: CreateFmdrfInput) {
		await this.assertCanCreateFmdrf(input)
		const submittedAt = new Date()

		const [report] = await db
			.insert(deathReports)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				patientId: input.patientId,
				reportType: "fmdrf" as const,
				deathDatetime: new Date(input.dateOfDeath),
				causeOfDeath: input.causeOfDeathImmediate,
				contributingFactors: [
					...(input.factorHemorrhage ? [{ factor: "Hemorrhage" }] : []),
					...(input.factorSepsis ? [{ factor: "Sepsis" }] : []),
					...(input.factorEclampsia ? [{ factor: "Eclampsia" }] : []),
					...(input.factorObstructedLabor ? [{ factor: "Obstructed Labor" }] : []),
					...(input.factorUnsafeAbortion ? [{ factor: "Unsafe Abortion" }] : []),
					...(input.factorOther ? [{ factor: input.factorOther }] : []),
				],
				maternalHistory: {
					patientName: input.patientName,
					patientMrn: input.patientMrn,
					patientAge: input.patientAge,
					patientAddress: input.patientAddress,
					placeOfDeath: input.placeOfDeath,
					causeOfDeathAntecedent: input.causeOfDeathAntecedent,
					causeOfDeathUnderlying: input.causeOfDeathUnderlying,
					causeOfDeathContributing: input.causeOfDeathContributing ?? undefined,
					gravida: input.gravidity,
					para: input.parity,
					lastMenstrualPeriod: input.lastMenstrualPeriod ?? undefined,
					gestationalAge: input.gestationalAgeWeeks ?? undefined,
					antenatalCare: input.antenatalCare,
					antenatalCareVisits: input.antenatalVisitCount ?? undefined,
					complications: input.complicationType ? [input.complicationType] : undefined,
					preventableFactors:
						input.avoidableFactors && input.avoidableRemark ? [input.avoidableRemark] : undefined,
				},
				physicianCertification: {
					certifyingPhysicianName: input.physicianName,
					prcLicenseNumber: input.physicianLicenseNo,
					certificationDate: input.certificationDate,
					signatureData: input.physicianSignatureDataUrl,
				},
				status: "submitted" as const,
				requestedAt: submittedAt,
				submittedAt,
			})
			.returning()

		if (!report) {
			throw new Error("Failed to create FMDRF report")
		}

		await this.forwardSubmittedFmdrfToSurveillance(input, report.id)

		return this.mapFmdrfReport(report, input)
	}

	/**
	 * Update FMDRF report
	 */
	async updateFmdrf(input: UpdateFmdrfInput) {
		const { id, ...data } = input

		const [existing] = await db.select().from(deathReports).where(eq(deathReports.id, id)).limit(1)

		if (!existing) {
			throw new NotFoundException(`FMDRF report ${id} not found`)
		}

		this.assertFmdrfRequiredFields(data, false)

		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		}

		if (typeof data.dateOfDeath === "string") {
			const deathDatetime = new Date(data.dateOfDeath)
			if (Number.isNaN(deathDatetime.getTime())) {
				throw new BadRequestException("A valid date and time of death is required for FMDRF.")
			}
			updateData.deathDatetime = deathDatetime
		}
		if (typeof data.causeOfDeathImmediate === "string") {
			updateData.causeOfDeath = data.causeOfDeathImmediate
		}

		const knownFactors = [
			"Hemorrhage",
			"Sepsis",
			"Eclampsia",
			"Obstructed Labor",
			"Unsafe Abortion",
		]
		const hasFactorUpdate = [
			data.factorHemorrhage,
			data.factorSepsis,
			data.factorEclampsia,
			data.factorObstructedLabor,
			data.factorUnsafeAbortion,
			data.factorOther,
		].some(v => v !== undefined)

		if (hasFactorUpdate) {
			const ef = (existing.contributingFactors ?? []) as Array<{ factor: string }>
			const flagH = data.factorHemorrhage ?? ef.some(f => f.factor === "Hemorrhage")
			const flagS = data.factorSepsis ?? ef.some(f => f.factor === "Sepsis")
			const flagE = data.factorEclampsia ?? ef.some(f => f.factor === "Eclampsia")
			const flagL = data.factorObstructedLabor ?? ef.some(f => f.factor === "Obstructed Labor")
			const flagA = data.factorUnsafeAbortion ?? ef.some(f => f.factor === "Unsafe Abortion")
			const existingOther = ef.find(f => !knownFactors.includes(f.factor))?.factor ?? null
			const otherFactor = data.factorOther !== undefined ? data.factorOther || null : existingOther
			updateData.contributingFactors = [
				...(flagH ? [{ factor: "Hemorrhage" }] : []),
				...(flagS ? [{ factor: "Sepsis" }] : []),
				...(flagE ? [{ factor: "Eclampsia" }] : []),
				...(flagL ? [{ factor: "Obstructed Labor" }] : []),
				...(flagA ? [{ factor: "Unsafe Abortion" }] : []),
				...(otherFactor ? [{ factor: otherFactor }] : []),
			]
		}

		const hasMaternalUpdate = [
			data.patientName,
			data.patientMrn,
			data.patientAge,
			data.patientAddress,
			data.placeOfDeath,
			data.causeOfDeathAntecedent,
			data.causeOfDeathUnderlying,
			data.causeOfDeathContributing,
			data.gravidity,
			data.parity,
			data.lastMenstrualPeriod,
			data.gestationalAgeWeeks,
			data.antenatalCare,
			data.antenatalVisitCount,
			data.complicationType,
			data.avoidableFactors,
			data.avoidableRemark,
		].some(v => v !== undefined)

		if (hasMaternalUpdate) {
			const em = (existing.maternalHistory ?? {}) as MaternalHistoryPayload
			const avoidable =
				data.avoidableFactors !== undefined
					? data.avoidableFactors
					: !!em.preventableFactors?.length
			const avoidRemark =
				data.avoidableRemark !== undefined
					? data.avoidableRemark || null
					: (em.preventableFactors?.[0] ?? null)
			updateData.maternalHistory = {
				...em,
				...(data.patientName !== undefined ? { patientName: data.patientName } : {}),
				...(data.patientMrn !== undefined ? { patientMrn: data.patientMrn } : {}),
				...(data.patientAge !== undefined ? { patientAge: data.patientAge } : {}),
				...(data.patientAddress !== undefined ? { patientAddress: data.patientAddress } : {}),
				...(data.placeOfDeath !== undefined ? { placeOfDeath: data.placeOfDeath } : {}),
				...(data.causeOfDeathAntecedent !== undefined
					? { causeOfDeathAntecedent: data.causeOfDeathAntecedent }
					: {}),
				...(data.causeOfDeathUnderlying !== undefined
					? { causeOfDeathUnderlying: data.causeOfDeathUnderlying }
					: {}),
				...(data.causeOfDeathContributing !== undefined
					? { causeOfDeathContributing: data.causeOfDeathContributing ?? undefined }
					: {}),
				...(data.gravidity !== undefined ? { gravida: data.gravidity } : {}),
				...(data.parity !== undefined ? { para: data.parity } : {}),
				...(data.lastMenstrualPeriod !== undefined
					? { lastMenstrualPeriod: data.lastMenstrualPeriod ?? undefined }
					: {}),
				...(data.gestationalAgeWeeks !== undefined
					? { gestationalAge: data.gestationalAgeWeeks ?? undefined }
					: {}),
				...(data.antenatalCare !== undefined ? { antenatalCare: data.antenatalCare } : {}),
				...(data.antenatalVisitCount !== undefined
					? { antenatalCareVisits: data.antenatalVisitCount ?? undefined }
					: {}),
				...(data.complicationType !== undefined
					? { complications: data.complicationType ? [data.complicationType] : undefined }
					: {}),
				...(data.avoidableFactors !== undefined || data.avoidableRemark !== undefined
					? { preventableFactors: avoidable && avoidRemark ? [avoidRemark] : undefined }
					: {}),
			}
		}

		const hasCertUpdate = [
			data.physicianName,
			data.physicianLicenseNo,
			data.certificationDate,
			data.physicianSignatureDataUrl,
		].some(v => v !== undefined)

		if (hasCertUpdate) {
			const ec = (existing.physicianCertification ?? {}) as {
				certifyingPhysicianName?: string
				prcLicenseNumber?: string
				certificationDate?: string
				signatureData?: string
			}
			updateData.physicianCertification = {
				...ec,
				...(data.physicianName !== undefined
					? { certifyingPhysicianName: data.physicianName }
					: {}),
				...(data.physicianLicenseNo !== undefined
					? { prcLicenseNumber: data.physicianLicenseNo }
					: {}),
				...(data.certificationDate !== undefined
					? { certificationDate: data.certificationDate }
					: {}),
				...(data.physicianSignatureDataUrl !== undefined
					? { signatureData: data.physicianSignatureDataUrl }
					: {}),
			}
		}

		const [report] = await db
			.update(deathReports)
			.set(updateData)
			.where(eq(deathReports.id, id))
			.returning()

		if (!report) {
			throw new Error("Failed to update FMDRF report")
		}

		return this.mapFmdrfReport(report, data)
	}

	/**
	 * Get FNDRF report by encounter
	 */
	async getFndrf(input: GetFndrfInput) {
		const [report] = await db
			.select()
			.from(deathReports)
			.where(
				and(eq(deathReports.encounterId, input.encounterId), eq(deathReports.reportType, "fndrf"))
			)
			.limit(1)

		if (!report) {
			return null
		}

		return this.mapFndrfReport(report)
	}

	/**
	 * Create FNDRF report
	 */
	async createFndrf(input: CreateFndrfInput) {
		await this.assertCanCreateFndrf(input)
		const submittedAt = new Date()

		const [report] = await db
			.insert(deathReports)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				patientId: input.patientId,
				reportType: "fndrf" as const,
				deathDatetime: new Date(input.dateOfDeath),
				causeOfDeath: [
					...(input.causePrematurity ? ["Prematurity"] : []),
					...(input.causeBirthAsphyxia ? ["Birth Asphyxia"] : []),
					...(input.causeSepsis ? ["Sepsis"] : []),
					...(input.causeCongenitalAnomaly ? ["Congenital Anomaly"] : []),
					...(input.causeRds ? ["Respiratory Distress Syndrome"] : []),
					...(input.causeOther ? [input.causeOther] : []),
				].join(", "),
				contributingFactors: input.contributingRemarks
					? [{ factor: input.contributingRemarks }]
					: [],
				neonatalDetails: {
					newbornName: input.newbornName,
					newbornMrn: input.newbornMrn,
					newbornDateOfBirth: input.newbornDateOfBirth,
					birthWeight: input.birthWeightGrams,
					gestationalAgeWeeks: input.gestationalAgeWeeks,
					deliveryType: input.deliveryType,
					apgarScore1Min: input.apgarScore1Min ?? undefined,
					apgarScore5Min: input.apgarScore5Min ?? undefined,
					resuscitationRequired: input.resuscitationRequired,
					motherName: input.motherName,
					motherAge: input.motherAge,
					motherGravidity: input.motherGravidity,
					motherParity: input.motherParity,
					motherAncVisits: input.motherAncVisits ?? undefined,
					ageAtDeathHours: input.ageAtDeathHours ?? undefined,
					ageAtDeathDays: input.ageAtDeathDays ?? undefined,
					placeOfDeath: input.placeOfDeath,
				},
				physicianCertification: {
					certifyingPhysicianName: input.physicianName,
					prcLicenseNumber: input.physicianLicenseNo,
					certificationDate: input.certificationDate,
					signatureData: input.physicianSignatureDataUrl,
				},
				status: "submitted" as const,
				requestedAt: submittedAt,
				submittedAt,
			})
			.returning()

		if (!report) {
			throw new Error("Failed to create FNDRF report")
		}

		await this.forwardSubmittedFndrfToSurveillance(input, report.id)

		return this.mapFndrfReport(report, input)
	}

	/**
	 * Update FNDRF report
	 */
	async updateFndrf(input: UpdateFndrfInput) {
		const { id, ...data } = input

		const [existing] = await db.select().from(deathReports).where(eq(deathReports.id, id)).limit(1)

		if (!existing) {
			throw new NotFoundException(`FNDRF report ${id} not found`)
		}

		this.assertFndrfRequiredFields(data as Partial<CreateFndrfInput>, false)

		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		}

		if (typeof data.dateOfDeath === "string") {
			const deathDatetime = new Date(data.dateOfDeath)
			if (Number.isNaN(deathDatetime.getTime())) {
				throw new BadRequestException("A valid date and time of death is required for FNDRF.")
			}
			updateData.deathDatetime = deathDatetime
		}

		const knownCauses = [
			"Prematurity",
			"Birth Asphyxia",
			"Sepsis",
			"Congenital Anomaly",
			"Respiratory Distress Syndrome",
		]
		const hasCauseUpdate = [
			data.causePrematurity,
			data.causeBirthAsphyxia,
			data.causeSepsis,
			data.causeCongenitalAnomaly,
			data.causeRds,
			data.causeOther,
		].some(v => v !== undefined)

		if (hasCauseUpdate) {
			const existingCauses = existing.causeOfDeath.split(", ").filter(Boolean)
			const flagP = data.causePrematurity ?? existingCauses.includes("Prematurity")
			const flagB = data.causeBirthAsphyxia ?? existingCauses.includes("Birth Asphyxia")
			const flagS = data.causeSepsis ?? existingCauses.includes("Sepsis")
			const flagC = data.causeCongenitalAnomaly ?? existingCauses.includes("Congenital Anomaly")
			const flagR = data.causeRds ?? existingCauses.includes("Respiratory Distress Syndrome")
			const existingOther = existingCauses.find(c => !knownCauses.includes(c)) ?? null
			const otherCause = data.causeOther !== undefined ? data.causeOther || null : existingOther
			updateData.causeOfDeath =
				[
					...(flagP ? ["Prematurity"] : []),
					...(flagB ? ["Birth Asphyxia"] : []),
					...(flagS ? ["Sepsis"] : []),
					...(flagC ? ["Congenital Anomaly"] : []),
					...(flagR ? ["Respiratory Distress Syndrome"] : []),
					...(otherCause ? [otherCause] : []),
				].join(", ") || existing.causeOfDeath

			if (data.contributingRemarks !== undefined) {
				updateData.contributingFactors = data.contributingRemarks
					? [{ factor: data.contributingRemarks }]
					: []
			}
		} else if (data.contributingRemarks !== undefined) {
			updateData.contributingFactors = data.contributingRemarks
				? [{ factor: data.contributingRemarks }]
				: []
		}

		const hasNeonatalUpdate = [
			data.newbornName,
			data.newbornMrn,
			data.newbornDateOfBirth,
			data.gestationalAgeWeeks,
			data.birthWeightGrams,
			data.deliveryType,
			data.apgarScore1Min,
			data.apgarScore5Min,
			data.resuscitationRequired,
			data.motherName,
			data.motherAge,
			data.motherGravidity,
			data.motherParity,
			data.motherAncVisits,
			data.ageAtDeathHours,
			data.ageAtDeathDays,
			data.placeOfDeath,
		].some(v => v !== undefined)

		if (hasNeonatalUpdate) {
			const en = (existing.neonatalDetails ?? {}) as NeonatalDetailsPayload
			updateData.neonatalDetails = {
				...en,
				...(data.newbornName !== undefined ? { newbornName: data.newbornName } : {}),
				...(data.newbornMrn !== undefined ? { newbornMrn: data.newbornMrn } : {}),
				...(data.newbornDateOfBirth !== undefined
					? { newbornDateOfBirth: data.newbornDateOfBirth }
					: {}),
				...(data.gestationalAgeWeeks !== undefined
					? { gestationalAgeWeeks: data.gestationalAgeWeeks }
					: {}),
				...(data.birthWeightGrams !== undefined ? { birthWeight: data.birthWeightGrams } : {}),
				...(data.deliveryType !== undefined ? { deliveryType: data.deliveryType } : {}),
				...(data.apgarScore1Min !== undefined
					? { apgarScore1Min: data.apgarScore1Min ?? undefined }
					: {}),
				...(data.apgarScore5Min !== undefined
					? { apgarScore5Min: data.apgarScore5Min ?? undefined }
					: {}),
				...(data.resuscitationRequired !== undefined
					? { resuscitationRequired: data.resuscitationRequired }
					: {}),
				...(data.motherName !== undefined ? { motherName: data.motherName } : {}),
				...(data.motherAge !== undefined ? { motherAge: data.motherAge } : {}),
				...(data.motherGravidity !== undefined ? { motherGravidity: data.motherGravidity } : {}),
				...(data.motherParity !== undefined ? { motherParity: data.motherParity } : {}),
				...(data.motherAncVisits !== undefined
					? { motherAncVisits: data.motherAncVisits ?? undefined }
					: {}),
				...(data.ageAtDeathHours !== undefined
					? { ageAtDeathHours: data.ageAtDeathHours ?? undefined }
					: {}),
				...(data.ageAtDeathDays !== undefined
					? { ageAtDeathDays: data.ageAtDeathDays ?? undefined }
					: {}),
				...(data.placeOfDeath !== undefined ? { placeOfDeath: data.placeOfDeath } : {}),
			}
		}

		const hasNeonatalCertUpdate = [
			data.physicianName,
			data.physicianLicenseNo,
			data.certificationDate,
			data.physicianSignatureDataUrl,
		].some(v => v !== undefined)

		if (hasNeonatalCertUpdate) {
			const ec = (existing.physicianCertification ?? {}) as {
				certifyingPhysicianName?: string
				prcLicenseNumber?: string
				certificationDate?: string
				signatureData?: string
			}
			updateData.physicianCertification = {
				...ec,
				...(data.physicianName !== undefined
					? { certifyingPhysicianName: data.physicianName }
					: {}),
				...(data.physicianLicenseNo !== undefined
					? { prcLicenseNumber: data.physicianLicenseNo }
					: {}),
				...(data.certificationDate !== undefined
					? { certificationDate: data.certificationDate }
					: {}),
				...(data.physicianSignatureDataUrl !== undefined
					? { signatureData: data.physicianSignatureDataUrl }
					: {}),
			}
		}

		const [report] = await db
			.update(deathReports)
			.set(updateData)
			.where(eq(deathReports.id, id))
			.returning()

		if (!report) {
			throw new Error("Failed to update FNDRF report")
		}

		return this.mapFndrfReport(report, data as Partial<CreateFndrfInput>)
	}

	private async assertCanCreateFmdrf(input: CreateFmdrfInput) {
		this.assertFmdrfRequiredFields(input, true)

		const deathDatetime = new Date(input.dateOfDeath)
		if (Number.isNaN(deathDatetime.getTime())) {
			throw new BadRequestException("A valid date and time of death is required for FMDRF.")
		}

		const [context] = await db
			.select({
				encounterId: encounters.id,
				encounterFacilityId: encounters.facilityId,
				encounterPatientId: encounters.patientId,
				patientFacilityId: patients.facilityId,
				patientSex: patients.sex,
				patientDateOfBirth: patients.dateOfBirth,
			})
			.from(encounters)
			.innerJoin(patients, eq(encounters.patientId, patients.id))
			.where(eq(encounters.id, input.encounterId))
			.limit(1)

		if (!context) {
			throw new NotFoundException(`Encounter ${input.encounterId} not found`)
		}

		if (context.encounterPatientId !== input.patientId) {
			throw new BadRequestException("FMDRF patient does not match the encounter patient.")
		}

		if (
			context.encounterFacilityId !== input.facilityId ||
			context.patientFacilityId !== input.facilityId
		) {
			throw new BadRequestException("FMDRF facility does not match the encounter facility.")
		}

		if (!isMaternalDeathCandidate(context.patientSex, context.patientDateOfBirth, deathDatetime)) {
			throw new BadRequestException(
				"FMDRF is required only for female patients aged 10-49 years at death."
			)
		}

		const [existing] = await db
			.select({ id: deathReports.id })
			.from(deathReports)
			.where(
				and(eq(deathReports.encounterId, input.encounterId), eq(deathReports.reportType, "fmdrf"))
			)
			.limit(1)

		if (existing) {
			throw new ConflictException("An FMDRF already exists for this encounter.")
		}
	}

	private assertFmdrfRequiredFields(input: Partial<CreateFmdrfInput>, requireAll: boolean) {
		const requiredTextFields: Array<keyof CreateFmdrfInput> = [
			"patientName",
			"patientMrn",
			"patientAddress",
			"placeOfDeath",
			"dateOfDeath",
			"causeOfDeathImmediate",
			"causeOfDeathUnderlying",
			"physicianName",
			"physicianLicenseNo",
			"physicianSignatureDataUrl",
			"certificationDate",
		]

		for (const field of requiredTextFields) {
			if (!requireAll && input[field] === undefined) continue
			const value = input[field]
			if (typeof value !== "string" || value.trim().length === 0) {
				throw new BadRequestException(`${String(field)} is required for FMDRF submission.`)
			}
		}

		if (
			(requireAll || input.patientAge !== undefined) &&
			(!input.patientAge || input.patientAge <= 0)
		) {
			throw new BadRequestException("patientAge must be greater than 0 for FMDRF submission.")
		}
	}

	private async assertCanCreateFndrf(input: CreateFndrfInput) {
		this.assertFndrfRequiredFields(input, true)

		const deathDatetime = new Date(input.dateOfDeath)
		if (Number.isNaN(deathDatetime.getTime())) {
			throw new BadRequestException("A valid date and time of death is required for FNDRF.")
		}

		const newbornDateOfBirth = new Date(input.newbornDateOfBirth)
		if (Number.isNaN(newbornDateOfBirth.getTime())) {
			throw new BadRequestException("A valid newborn date and time of birth is required for FNDRF.")
		}

		const [context] = await db
			.select({
				encounterId: encounters.id,
				encounterFacilityId: encounters.facilityId,
				encounterPatientId: encounters.patientId,
				patientFacilityId: patients.facilityId,
				patientDateOfBirth: patients.dateOfBirth,
			})
			.from(encounters)
			.innerJoin(patients, eq(encounters.patientId, patients.id))
			.where(eq(encounters.id, input.encounterId))
			.limit(1)

		if (!context) {
			throw new NotFoundException(`Encounter ${input.encounterId} not found`)
		}

		if (context.encounterPatientId !== input.patientId) {
			throw new BadRequestException("FNDRF patient does not match the encounter patient.")
		}

		if (
			context.encounterFacilityId !== input.facilityId ||
			context.patientFacilityId !== input.facilityId
		) {
			throw new BadRequestException("FNDRF facility does not match the encounter facility.")
		}

		if (!isNeonatalDeathCandidate(context.patientDateOfBirth, deathDatetime)) {
			throw new BadRequestException("FNDRF is required only for neonates aged 28 days or less.")
		}

		const [existing] = await db
			.select({ id: deathReports.id })
			.from(deathReports)
			.where(
				and(eq(deathReports.encounterId, input.encounterId), eq(deathReports.reportType, "fndrf"))
			)
			.limit(1)

		if (existing) {
			throw new ConflictException("An FNDRF already exists for this encounter.")
		}
	}

	private assertFndrfRequiredFields(input: Partial<CreateFndrfInput>, requireAll: boolean) {
		const requiredTextFields: Array<keyof CreateFndrfInput> = [
			"newbornName",
			"newbornMrn",
			"newbornDateOfBirth",
			"motherName",
			"dateOfDeath",
			"placeOfDeath",
			"physicianName",
			"physicianLicenseNo",
			"physicianSignatureDataUrl",
			"certificationDate",
		]

		for (const field of requiredTextFields) {
			if (!requireAll && input[field] === undefined) continue
			const value = input[field]
			if (typeof value !== "string" || value.trim().length === 0) {
				throw new BadRequestException(`${String(field)} is required for FNDRF submission.`)
			}
		}

		const requirePositive = (field: keyof CreateFndrfInput, label: string) => {
			if (!requireAll && input[field] === undefined) return
			const value = input[field]
			if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
				throw new BadRequestException(`${label} must be greater than 0 for FNDRF submission.`)
			}
		}

		const requireNonnegative = (field: keyof CreateFndrfInput, label: string) => {
			if (!requireAll && input[field] === undefined) return
			const value = input[field]
			if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
				throw new BadRequestException(`${label} must be 0 or greater for FNDRF submission.`)
			}
		}

		requirePositive("gestationalAgeWeeks", "gestationalAgeWeeks")
		requirePositive("birthWeightGrams", "birthWeightGrams")
		requirePositive("motherAge", "motherAge")
		requireNonnegative("motherGravidity", "motherGravidity")
		requireNonnegative("motherParity", "motherParity")

		if ((requireAll || input.deliveryType !== undefined) && !input.deliveryType) {
			throw new BadRequestException("deliveryType is required for FNDRF submission.")
		}

		if (
			(requireAll || input.resuscitationRequired !== undefined) &&
			typeof input.resuscitationRequired !== "boolean"
		) {
			throw new BadRequestException("resuscitationRequired is required for FNDRF submission.")
		}

		if (
			requireAll &&
			!input.causePrematurity &&
			!input.causeBirthAsphyxia &&
			!input.causeSepsis &&
			!input.causeCongenitalAnomaly &&
			!input.causeRds &&
			!(typeof input.causeOther === "string" && input.causeOther.trim().length > 0)
		) {
			throw new BadRequestException("At least one cause of death is required for FNDRF.")
		}
	}

	private async forwardSubmittedFmdrfToSurveillance(
		input: CreateFmdrfInput,
		deathReportId: string
	) {
		const triggerValue = `FMDRF:${deathReportId}`
		const existingFlags = await db
			.select({ id: surveillanceFlags.id })
			.from(surveillanceFlags)
			.where(
				and(
					eq(surveillanceFlags.encounterId, input.encounterId),
					eq(surveillanceFlags.flagType, "mndrs_fmdrf"),
					eq(surveillanceFlags.triggerValue, triggerValue)
				)
			)
			.limit(1)

		if (existingFlags.length > 0) return

		await db.insert(surveillanceFlags).values({
			facilityId: input.facilityId,
			encounterId: input.encounterId,
			noteId: null,
			flagType: "mndrs_fmdrf",
			triggeredBy: `FMDRF submitted for ${input.patientName}`,
			triggerValue,
		})
	}

	private async forwardSubmittedFndrfToSurveillance(
		input: CreateFndrfInput,
		deathReportId: string
	) {
		const triggerValue = `FNDRF:${deathReportId}`
		const existingFlags = await db
			.select({ id: surveillanceFlags.id })
			.from(surveillanceFlags)
			.where(
				and(
					eq(surveillanceFlags.encounterId, input.encounterId),
					eq(surveillanceFlags.flagType, "mndrs_fndrf"),
					eq(surveillanceFlags.triggerValue, triggerValue)
				)
			)
			.limit(1)

		if (existingFlags.length > 0) return

		await db.insert(surveillanceFlags).values({
			facilityId: input.facilityId,
			encounterId: input.encounterId,
			noteId: null,
			flagType: "mndrs_fndrf",
			triggeredBy: `FNDRF submitted for ${input.newbornName}`,
			triggerValue,
		})
	}

	// ============================================================================
	// Private Helpers
	// ============================================================================

	private mapFmdrfReport(
		report: typeof deathReports.$inferSelect,
		input?: Partial<CreateFmdrfInput>
	) {
		const maternal = (report.maternalHistory ?? {}) as MaternalHistoryPayload
		const cert = report.physicianCertification ?? {}
		const factors = report.contributingFactors ?? []

		return {
			id: report.id,
			encounterId: report.encounterId ?? "",
			patientId: report.patientId,
			facilityId: report.facilityId,
			patientName: maternal.patientName ?? input?.patientName ?? "",
			patientMrn: maternal.patientMrn ?? input?.patientMrn ?? "",
			patientAge: maternal.patientAge ?? input?.patientAge ?? 0,
			patientAddress: maternal.patientAddress ?? input?.patientAddress ?? "",
			dateOfDeath: report.deathDatetime.toISOString(),
			placeOfDeath: maternal.placeOfDeath ?? input?.placeOfDeath ?? "",
			causeOfDeathImmediate: report.causeOfDeath,
			causeOfDeathAntecedent:
				maternal.causeOfDeathAntecedent ?? input?.causeOfDeathAntecedent ?? "",
			causeOfDeathUnderlying:
				maternal.causeOfDeathUnderlying ?? input?.causeOfDeathUnderlying ?? "",
			causeOfDeathContributing:
				maternal.causeOfDeathContributing ?? input?.causeOfDeathContributing ?? null,
			gravidity: maternal.gravida ?? input?.gravidity ?? 0,
			parity: maternal.para ?? input?.parity ?? 0,
			lastMenstrualPeriod: maternal.lastMenstrualPeriod ?? input?.lastMenstrualPeriod ?? null,
			gestationalAgeWeeks: maternal.gestationalAge ?? null,
			antenatalCare: maternal.antenatalCare ?? input?.antenatalCare ?? false,
			antenatalVisitCount: maternal.antenatalCareVisits ?? null,
			complicationType: maternal.complications?.[0] ?? null,
			factorHemorrhage: factors.some(f => f.factor === "Hemorrhage"),
			factorSepsis: factors.some(f => f.factor === "Sepsis"),
			factorEclampsia: factors.some(f => f.factor === "Eclampsia"),
			factorObstructedLabor: factors.some(f => f.factor === "Obstructed Labor"),
			factorUnsafeAbortion: factors.some(f => f.factor === "Unsafe Abortion"),
			factorOther:
				factors.find(
					f =>
						!["Hemorrhage", "Sepsis", "Eclampsia", "Obstructed Labor", "Unsafe Abortion"].includes(
							f.factor
						)
				)?.factor ?? null,
			avoidableFactors: !!maternal.preventableFactors?.length,
			avoidableRemark: maternal.preventableFactors?.[0] ?? null,
			physicianName: cert.certifyingPhysicianName ?? "",
			physicianLicenseNo: cert.prcLicenseNumber ?? "",
			physicianSignatureDataUrl: cert.signatureData ?? "",
			certificationDate: cert.certificationDate ?? "",
			status: report.status as "draft" | "completed" | "submitted",
			createdAt: report.createdAt.toISOString(),
			updatedAt: report.updatedAt.toISOString(),
		}
	}

	// ============================================================================
	// SLA-017: Payment checkpoints
	// ============================================================================

	/**
	 * Mark a death report (FMDRF or FNDRF) as paid.
	 * Sets paidAt to record the moment payment was received for the death certificate (Flow 7 Step 2).
	 */
	async markDeathReportPaid(input: { id: string; paidAt?: Date }) {
		const paidAt = input.paidAt ?? new Date()

		const [report] = await db
			.update(deathReports)
			.set({ paidAt, updatedAt: new Date() })
			.where(eq(deathReports.id, input.id))
			.returning()

		if (!report) {
			throw new NotFoundException(`Death report ${input.id} not found`)
		}

		this.logger.log(
			`workflow.death_reporting.certificate.paid id=${report.id} facilityId=${report.facilityId} reportType=${report.reportType} paidAt=${report.paidAt?.toISOString() ?? "null"}`
		)

		return { id: report.id, paidAt: report.paidAt?.toISOString() ?? null }
	}

	/**
	 * SLA-021: Mark a death report as released to the family.
	 * Sets releasedByStaffId, releasedAt, completedAt, and status="completed" to provide
	 * an authoritative Flow 7 Step 3 evidence trail and close the SLA window.
	 */
	async markDeathReportReleased(input: {
		id: string
		releasedByStaffId: string
		releasedAt?: Date
	}) {
		const releasedAt = input.releasedAt ?? new Date()
		await this.assertActiveReleaseStaffProfile(input.id, input.releasedByStaffId)
		await this.assertDeathReportReadyForRelease(input.id)

		const [report] = await db
			.update(deathReports)
			.set({
				releasedByStaffId: input.releasedByStaffId,
				releasedAt,
				completedAt: releasedAt,
				status: "completed" as const,
				updatedAt: new Date(),
			})
			.where(eq(deathReports.id, input.id))
			.returning()

		if (!report) {
			throw new NotFoundException(`Death report ${input.id} not found`)
		}

		this.logger.log(
			`workflow.death_reporting.certificate.released id=${report.id} facilityId=${report.facilityId} reportType=${report.reportType} releasedByStaffId=${report.releasedByStaffId ?? "null"} releasedAt=${report.releasedAt?.toISOString() ?? "null"}`
		)

		return {
			id: report.id,
			releasedByStaffId: report.releasedByStaffId ?? null,
			releasedAt: report.releasedAt?.toISOString() ?? null,
			status: report.status,
			completedAt: report.completedAt?.toISOString() ?? null,
		}
	}

	private async assertActiveReleaseStaffProfile(id: string, releasedByStaffId: string) {
		const [report] = await db
			.select({ facilityId: deathReports.facilityId })
			.from(deathReports)
			.where(eq(deathReports.id, id))
			.limit(1)

		if (!report) {
			throw new NotFoundException(`Death report ${id} not found`)
		}

		const [profile] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(
				and(
					eq(staffProfiles.id, releasedByStaffId),
					eq(staffProfiles.facilityId, report.facilityId),
					eq(staffProfiles.isActive, true)
				)
			)
			.limit(1)

		if (!profile) {
			throw new ForbiddenException(
				"An active staff profile in this facility is required to release a death certificate"
			)
		}
	}

	private async assertDeathReportReadyForRelease(id: string) {
		const [report] = await db.select().from(deathReports).where(eq(deathReports.id, id)).limit(1)

		if (!report) {
			throw new NotFoundException(`Death report ${id} not found`)
		}

		if (!report.paidAt) {
			throw new BadRequestException("Death certificate payment must be recorded before release")
		}
		if (report.releasedAt || report.releasedByStaffId) {
			throw new BadRequestException("Death certificate has already been released")
		}

		const missingFields = this.getMissingDeathReportCertificateFields(report)
		if (missingFields.length > 0) {
			throw new BadRequestException(
				`Required death certificate fields are missing: ${missingFields.join(", ")}`
			)
		}
	}

	private getMissingDeathReportCertificateFields(report: DeathReportRow) {
		const cert = report.physicianCertification ?? {}
		const commonFields: Array<{ label: string; value: unknown }> = [
			{ label: "cause of death", value: report.causeOfDeath },
			{ label: "certifying physician name", value: cert.certifyingPhysicianName },
			{ label: "PRC license number", value: cert.prcLicenseNumber },
			{ label: "certification date", value: cert.certificationDate },
			{ label: "physician signature", value: cert.signatureData },
		]

		const reportFields =
			report.reportType === "fmdrf"
				? this.getFmdrfCertificateFields(report)
				: this.getFndrfCertificateFields(report)

		return [...reportFields, ...commonFields]
			.filter(field => !hasRequiredValue(field.value))
			.map(field => field.label)
	}

	private getFmdrfCertificateFields(report: DeathReportRow) {
		const maternal = report.maternalHistory ?? {}
		return [
			{ label: "patient full name", value: maternal.patientName },
			{ label: "patient MRN", value: maternal.patientMrn },
			{ label: "patient age", value: maternal.patientAge },
			{ label: "patient address", value: maternal.patientAddress },
			{ label: "place of death", value: maternal.placeOfDeath },
			{ label: "underlying cause of death", value: maternal.causeOfDeathUnderlying },
		]
	}

	private getFndrfCertificateFields(report: DeathReportRow) {
		const neonatal = report.neonatalDetails ?? {}
		return [
			{ label: "newborn full name", value: neonatal.newbornName },
			{ label: "newborn MRN", value: neonatal.newbornMrn },
			{ label: "newborn date of birth", value: neonatal.newbornDateOfBirth },
			{ label: "gestational age", value: neonatal.gestationalAgeWeeks },
			{ label: "birth weight", value: neonatal.birthWeight },
			{ label: "delivery type", value: neonatal.deliveryType },
			{ label: "mother full name", value: neonatal.motherName },
			{ label: "mother age", value: neonatal.motherAge },
			{ label: "mother gravidity", value: neonatal.motherGravidity },
			{ label: "mother parity", value: neonatal.motherParity },
			{ label: "place of death", value: neonatal.placeOfDeath },
		]
	}

	private mapFndrfReport(
		report: typeof deathReports.$inferSelect,
		input?: Partial<CreateFndrfInput>
	) {
		const neonatal = (report.neonatalDetails ?? {}) as NeonatalDetailsPayload
		const cert = report.physicianCertification ?? {}
		const causes = report.causeOfDeath.split(", ")

		return {
			id: report.id,
			encounterId: report.encounterId ?? "",
			patientId: report.patientId,
			facilityId: report.facilityId,
			newbornName: neonatal.newbornName ?? input?.newbornName ?? "",
			newbornMrn: neonatal.newbornMrn ?? input?.newbornMrn ?? "",
			newbornDateOfBirth: neonatal.newbornDateOfBirth ?? input?.newbornDateOfBirth ?? "",
			gestationalAgeWeeks: neonatal.gestationalAgeWeeks ?? input?.gestationalAgeWeeks ?? 0,
			birthWeightGrams: neonatal.birthWeight ?? input?.birthWeightGrams ?? 0,
			deliveryType: neonatal.deliveryType ?? input?.deliveryType ?? "svd",
			apgarScore1Min: neonatal.apgarScore1Min ?? null,
			apgarScore5Min: neonatal.apgarScore5Min ?? null,
			resuscitationRequired:
				neonatal.resuscitationRequired ?? input?.resuscitationRequired ?? false,
			motherName: neonatal.motherName ?? input?.motherName ?? "",
			motherAge: neonatal.motherAge ?? input?.motherAge ?? 0,
			motherGravidity: neonatal.motherGravidity ?? input?.motherGravidity ?? 0,
			motherParity: neonatal.motherParity ?? input?.motherParity ?? 0,
			motherAncVisits: neonatal.motherAncVisits ?? input?.motherAncVisits ?? null,
			dateOfDeath: report.deathDatetime.toISOString(),
			ageAtDeathHours: neonatal.ageAtDeathHours ?? null,
			ageAtDeathDays: neonatal.ageAtDeathDays ?? input?.ageAtDeathDays ?? null,
			placeOfDeath: neonatal.placeOfDeath ?? input?.placeOfDeath ?? "",
			causePrematurity: causes.includes("Prematurity"),
			causeBirthAsphyxia: causes.includes("Birth Asphyxia"),
			causeSepsis: causes.includes("Sepsis"),
			causeCongenitalAnomaly: causes.includes("Congenital Anomaly"),
			causeRds: causes.includes("Respiratory Distress Syndrome"),
			causeOther:
				causes.find(
					c =>
						![
							"Prematurity",
							"Birth Asphyxia",
							"Sepsis",
							"Congenital Anomaly",
							"Respiratory Distress Syndrome",
						].includes(c)
				) ?? null,
			contributingRemarks: report.contributingFactors?.[0]?.factor ?? null,
			physicianName: cert.certifyingPhysicianName ?? "",
			physicianLicenseNo: cert.prcLicenseNumber ?? "",
			physicianSignatureDataUrl: cert.signatureData ?? "",
			certificationDate: cert.certificationDate ?? "",
			status: report.status as "draft" | "completed" | "submitted",
			createdAt: report.createdAt.toISOString(),
			updatedAt: report.updatedAt.toISOString(),
		}
	}
}

import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, eq } from "drizzle-orm"

import { deathReports } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

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

interface UpdateFmdrfInput {
	id: string
	// All fields are optional for update
	[key: string]: unknown
}

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
				and(
					eq(deathReports.encounterId, input.encounterId),
					eq(deathReports.reportType, "fmdrf")
				)
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
					gravida: input.gravidity,
					para: input.parity,
					gestationalAge: input.gestationalAgeWeeks ?? undefined,
					antenatalCareVisits: input.antenatalVisitCount ?? undefined,
					complications: input.complicationType ? [input.complicationType] : undefined,
					preventableFactors: input.avoidableFactors && input.avoidableRemark
						? [input.avoidableRemark]
						: undefined,
				},
				physicianCertification: {
					certifyingPhysicianName: input.physicianName,
					prcLicenseNumber: input.physicianLicenseNo,
					certificationDate: input.certificationDate,
					signatureData: input.physicianSignatureDataUrl,
				},
				// SLA-023: create as draft so the certificate has a genuine open SLA window,
				// consistent with the FNDRF path. Completion and release are recorded via
				// markDeathReportReleased() which sets releasedAt + releasedByStaffId and
				// closes the Flow 7 lifecycle.
				status: "draft" as const,
				// SLA-017: record the moment the death certificate request was formally submitted
				requestedAt: new Date(),
			})
			.returning()

		if (!report) {
			throw new Error("Failed to create FMDRF report")
		}

		return this.mapFmdrfReport(report, input)
	}

	/**
	 * Update FMDRF report
	 */
	async updateFmdrf(input: UpdateFmdrfInput) {
		const { id, ...data } = input

		const [existing] = await db
			.select()
			.from(deathReports)
			.where(eq(deathReports.id, id))
			.limit(1)

		if (!existing) {
			throw new NotFoundException(`FMDRF report ${id} not found`)
		}

		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		}

		if (typeof data.dateOfDeath === "string") {
			updateData.deathDatetime = new Date(data.dateOfDeath)
		}
		if (typeof data.causeOfDeathImmediate === "string") {
			updateData.causeOfDeath = data.causeOfDeathImmediate
		}

		const [report] = await db
			.update(deathReports)
			.set(updateData)
			.where(eq(deathReports.id, id))
			.returning()

		if (!report) {
			throw new Error("Failed to update FMDRF report")
		}

		return this.mapFmdrfReport(report, data as Partial<CreateFmdrfInput>)
	}

	/**
	 * Get FNDRF report by encounter
	 */
	async getFndrf(input: GetFndrfInput) {
		const [report] = await db
			.select()
			.from(deathReports)
			.where(
				and(
					eq(deathReports.encounterId, input.encounterId),
					eq(deathReports.reportType, "fndrf")
				)
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
					birthWeight: input.birthWeightGrams,
					gestationalAgeWeeks: input.gestationalAgeWeeks,
					apgarScore1Min: input.apgarScore1Min ?? undefined,
					apgarScore5Min: input.apgarScore5Min ?? undefined,
					ageAtDeathHours: input.ageAtDeathHours ?? undefined,
				},
				physicianCertification: {
					certifyingPhysicianName: input.physicianName,
					prcLicenseNumber: input.physicianLicenseNo,
					certificationDate: input.certificationDate,
					signatureData: input.physicianSignatureDataUrl,
				},
				// SLA-021: create as draft so the certificate has a genuine open SLA window.
				// Completion and release are recorded via markDeathReportReleased() which sets
				// releasedAt + releasedByStaffId and closes the Flow 7 lifecycle.
				status: "draft" as const,
				// SLA-017: record the moment the death certificate request was formally submitted
				requestedAt: new Date(),
			})
			.returning()

		if (!report) {
			throw new Error("Failed to create FNDRF report")
		}

		return this.mapFndrfReport(report, input)
	}

	/**
	 * Update FNDRF report
	 */
	async updateFndrf(input: UpdateFndrfInput) {
		const { id, ...data } = input

		const [existing] = await db
			.select()
			.from(deathReports)
			.where(eq(deathReports.id, id))
			.limit(1)

		if (!existing) {
			throw new NotFoundException(`FNDRF report ${id} not found`)
		}

		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		}

		if (typeof data.dateOfDeath === "string") {
			updateData.deathDatetime = new Date(data.dateOfDeath)
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

	// ============================================================================
	// Private Helpers
	// ============================================================================

	private mapFmdrfReport(
		report: typeof deathReports.$inferSelect,
		input?: Partial<CreateFmdrfInput>
	) {
		const maternal = report.maternalHistory ?? {}
		const cert = report.physicianCertification ?? {}
		const factors = report.contributingFactors ?? []

		return {
			id: report.id,
			encounterId: report.encounterId ?? "",
			patientId: report.patientId,
			facilityId: report.facilityId,
			patientName: input?.patientName ?? "",
			patientMrn: input?.patientMrn ?? "",
			patientAge: input?.patientAge ?? 0,
			patientAddress: input?.patientAddress ?? "",
			dateOfDeath: report.deathDatetime.toISOString(),
			causeOfDeathImmediate: report.causeOfDeath,
			causeOfDeathAntecedent: input?.causeOfDeathAntecedent ?? "",
			causeOfDeathUnderlying: input?.causeOfDeathUnderlying ?? "",
			causeOfDeathContributing: input?.causeOfDeathContributing ?? null,
			gravidity: maternal.gravida ?? input?.gravidity ?? 0,
			parity: maternal.para ?? input?.parity ?? 0,
			lastMenstrualPeriod: input?.lastMenstrualPeriod ?? null,
			gestationalAgeWeeks: maternal.gestationalAge ?? null,
			antenatalCare: input?.antenatalCare ?? false,
			antenatalVisitCount: maternal.antenatalCareVisits ?? null,
			complicationType: maternal.complications?.[0] ?? null,
			factorHemorrhage: factors.some(f => f.factor === "Hemorrhage"),
			factorSepsis: factors.some(f => f.factor === "Sepsis"),
			factorEclampsia: factors.some(f => f.factor === "Eclampsia"),
			factorObstructedLabor: factors.some(f => f.factor === "Obstructed Labor"),
			factorUnsafeAbortion: factors.some(f => f.factor === "Unsafe Abortion"),
			factorOther: factors.find(f =>
				!["Hemorrhage", "Sepsis", "Eclampsia", "Obstructed Labor", "Unsafe Abortion"].includes(f.factor)
			)?.factor ?? null,
			avoidableFactors: !!maternal.preventableFactors?.length,
			avoidableRemark: maternal.preventableFactors?.[0] ?? null,
			physicianName: cert.certifyingPhysicianName ?? "",
			physicianLicenseNo: cert.prcLicenseNumber ?? "",
			physicianSignatureDataUrl: cert.signatureData ?? "",
			certificationDate: cert.certificationDate ?? "",
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

		return { id: report.id, paidAt: report.paidAt?.toISOString() ?? null }
	}

	/**
	 * SLA-021: Mark a death report as released to the family.
	 * Sets releasedByStaffId, releasedAt, completedAt, and status="completed" to provide
	 * an authoritative Flow 7 Step 3 evidence trail and close the SLA window.
	 */
	async markDeathReportReleased(input: { id: string; releasedByStaffId: string; releasedAt?: Date }) {
		const releasedAt = input.releasedAt ?? new Date()

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

		return {
			id: report.id,
			releasedByStaffId: report.releasedByStaffId ?? null,
			releasedAt: report.releasedAt?.toISOString() ?? null,
			status: report.status,
			completedAt: report.completedAt?.toISOString() ?? null,
		}
	}

	private mapFndrfReport(
		report: typeof deathReports.$inferSelect,
		input?: Partial<CreateFndrfInput>
	) {
		const neonatal = report.neonatalDetails ?? {}
		const cert = report.physicianCertification ?? {}
		const causes = report.causeOfDeath.split(", ")

		return {
			id: report.id,
			encounterId: report.encounterId ?? "",
			patientId: report.patientId,
			facilityId: report.facilityId,
			newbornName: input?.newbornName ?? "",
			newbornMrn: input?.newbornMrn ?? "",
			newbornDateOfBirth: input?.newbornDateOfBirth ?? "",
			gestationalAgeWeeks: neonatal.gestationalAgeWeeks ?? input?.gestationalAgeWeeks ?? 0,
			birthWeightGrams: neonatal.birthWeight ?? input?.birthWeightGrams ?? 0,
			deliveryType: input?.deliveryType ?? "svd",
			apgarScore1Min: neonatal.apgarScore1Min ?? null,
			apgarScore5Min: neonatal.apgarScore5Min ?? null,
			motherName: input?.motherName ?? "",
			motherAge: input?.motherAge ?? 0,
			motherGravidity: input?.motherGravidity ?? 0,
			motherParity: input?.motherParity ?? 0,
			motherAncVisits: input?.motherAncVisits ?? null,
			dateOfDeath: report.deathDatetime.toISOString(),
			ageAtDeathHours: neonatal.ageAtDeathHours ?? null,
			ageAtDeathDays: input?.ageAtDeathDays ?? null,
			placeOfDeath: input?.placeOfDeath ?? "",
			causePrematurity: causes.includes("Prematurity"),
			causeBirthAsphyxia: causes.includes("Birth Asphyxia"),
			causeSepsis: causes.includes("Sepsis"),
			causeCongenitalAnomaly: causes.includes("Congenital Anomaly"),
			causeRds: causes.includes("Respiratory Distress Syndrome"),
			causeOther: causes.find(c =>
				!["Prematurity", "Birth Asphyxia", "Sepsis", "Congenital Anomaly", "Respiratory Distress Syndrome"].includes(c)
			) ?? null,
			contributingRemarks: report.contributingFactors?.[0]?.factor ?? null,
			physicianName: cert.certifyingPhysicianName ?? "",
			physicianLicenseNo: cert.prcLicenseNumber ?? "",
			physicianSignatureDataUrl: cert.signatureData ?? "",
			certificationDate: cert.certificationDate ?? "",
			createdAt: report.createdAt.toISOString(),
			updatedAt: report.updatedAt.toISOString(),
		}
	}
}

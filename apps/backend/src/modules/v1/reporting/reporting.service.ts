import { createHash } from "node:crypto"

import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, avg, count, desc, eq, gte, ilike, isNotNull, lte, or, sql } from "drizzle-orm"

import {
	ahsrSnapshots,
	beds,
	bedCensusSnapshots,
	clinicalNotes,
	encounters,
	haiTags,
	notifications,
	patients,
	pidsrCases,
	problems,
	staffProfiles,
	surveillanceFlags,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"

// ============================================================================
// Input Types (explicit — avoids TypeScript depth limit with InferContractRouterInputs)
// ============================================================================

interface ListSurveillanceFlagsInput {
	page: number
	limit: number
	facilityId: string
	isReviewed?: boolean
	flagType?: string
	category?: string
}

interface ReviewFlagInput {
	id: string
	action: "confirm" | "dismiss"
	dismissReason?: string
}

interface ScanEncounterInput {
	encounterId: string
	facilityId: string
}

interface ListPidsrCasesInput {
	page: number
	limit: number
	facilityId: string
	reportStatus?: "draft" | "submitted" | "rejected" | "blocked"
	category?: string
	dateFrom?: string
	dateTo?: string
}

interface GetPidsrCaseInput {
	id: string
}

interface SubmitPidsrCaseInput {
	id: string
}

interface GenerateWeeklyReportInput {
	facilityId: string
	weekStartDate: string
}

interface AhsrMetricsInput {
	facilityId: string
	year: number
	month?: number
}

interface AhsrDrilldownInput {
	facilityId: string
	year: number
	month?: number
	metric: "admissions" | "discharges" | "deaths" | "morbidity" | "mortality" | "hai"
	icdCode?: string
	haiType?: string
	page: number
	limit: number
}

interface ExportAhsrInput {
	facilityId: string
	year: number
	month?: number
}

interface ListDetectionRulesInput {
	facilityId: string
	category?: "category_1" | "category_2"
	isActive?: boolean
}

interface RunAutoDetectionInput {
	facilityId: string
	encounterId: string
}

interface AhsrRealTimeInput {
	facilityId: string
}

// ============================================================================
// PIDSR Category 1 notifiable diseases (ICD-10 codes + keywords)
// ============================================================================

const CATEGORY_1_DISEASES: { code: string; name: string; keywords: string[] }[] = [
	{ code: "A00", name: "Cholera", keywords: ["cholera", "profuse watery diarrhea"] },
	{ code: "A20", name: "Plague", keywords: ["plague", "bubonic"] },
	{ code: "A33", name: "Tetanus Neonatorum", keywords: ["neonatal tetanus"] },
	{ code: "A35", name: "Tetanus (non-neonatal)", keywords: ["tetanus", "lockjaw"] },
	{ code: "A36", name: "Diphtheria", keywords: ["diphtheria"] },
	{ code: "A37", name: "Pertussis", keywords: ["pertussis", "whooping cough"] },
	{ code: "A80", name: "Acute Poliomyelitis", keywords: ["polio", "acute flaccid paralysis"] },
	{ code: "A82", name: "Rabies", keywords: ["rabies", "animal bite with neurologic"] },
	{ code: "A95", name: "Yellow Fever", keywords: ["yellow fever"] },
	{ code: "A98.5", name: "Ebola", keywords: ["ebola"] },
	{ code: "B05", name: "Measles", keywords: ["measles", "rubeola"] },
	{ code: "U07.1", name: "COVID-19", keywords: ["covid", "sars-cov-2"] },
	{ code: "A01", name: "Typhoid Fever", keywords: ["typhoid"] },
]

const CATEGORY_2_DISEASES: { code: string; name: string; keywords: string[] }[] = [
	{ code: "A15", name: "Tuberculosis", keywords: ["tuberculosis", "tb", "pulmonary tb"] },
	{ code: "A90", name: "Dengue Fever", keywords: ["dengue"] },
	{ code: "A91", name: "Dengue Hemorrhagic Fever", keywords: ["dengue hemorrhagic"] },
	{ code: "B15", name: "Hepatitis A", keywords: ["hepatitis a"] },
	{ code: "B16", name: "Hepatitis B", keywords: ["hepatitis b"] },
	{ code: "B50", name: "Malaria (P. falciparum)", keywords: ["malaria"] },
	{ code: "B54", name: "Malaria (unspecified)", keywords: ["malaria"] },
	{ code: "A09", name: "Acute Gastroenteritis", keywords: ["gastroenteritis", "age"] },
	{ code: "J09", name: "Influenza (novel)", keywords: ["avian influenza", "novel influenza"] },
	{ code: "A39", name: "Meningococcal Disease", keywords: ["meningococcal", "meningitis"] },
	{ code: "B01", name: "Varicella (Chickenpox)", keywords: ["chickenpox", "varicella"] },
]

const ALL_NOTIFIABLE = [...CATEGORY_1_DISEASES, ...CATEGORY_2_DISEASES]

@Injectable()
export class ReportingService {
	private readonly logger = new Logger(ReportingService.name)

	// ========================================================================
	// HELPER — Resolve staff profile from better-auth userId
	// ========================================================================

	private async getStaffProfileId(userId: string): Promise<string> {
		const [row] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(eq(staffProfiles.userId, userId))
			.limit(1)
		if (!row) throw new NotFoundException("Staff profile not found")
		return row.id
	}

	private getDetectionRuleId(diseaseCode: string): string {
		const hex = createHash("md5").update(diseaseCode).digest("hex")
		return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
	}

	private async collectDetectionMatches(input: RunAutoDetectionInput) {
		const [enc] = await db
			.select({ patientId: encounters.patientId })
			.from(encounters)
			.where(eq(encounters.id, input.encounterId))
			.limit(1)

		if (!enc) throw new NotFoundException("Encounter not found")

		const patientProblems = await db
			.select({ icd10Code: problems.icd10Code, description: problems.description })
			.from(problems)
			.where(and(eq(problems.patientId, enc.patientId), eq(problems.status, "active")))

		const notes = await db
			.select({ id: clinicalNotes.id, content: clinicalNotes.content })
			.from(clinicalNotes)
			.where(and(eq(clinicalNotes.encounterId, input.encounterId), eq(clinicalNotes.status, "signed")))

		const diseaseMatches = new Map<string, {
			diseaseCode: string
			diseaseName: string
			category: "category_1" | "category_2"
			confidence: "high" | "medium" | "low"
			matchedOn: Array<{ type: "icd_code" | "keyword" | "lab_result"; value: string; source: string }>
		}>()

		for (const problem of patientProblems) {
			if (!problem.icd10Code) continue
			const matched = ALL_NOTIFIABLE.find(d => problem.icd10Code!.toUpperCase().startsWith(d.code))
			if (!matched) continue

			const category = CATEGORY_1_DISEASES.some(d => d.code === matched.code) ? "category_1" : "category_2"
			const existing = diseaseMatches.get(matched.code) ?? {
				diseaseCode: matched.code,
				diseaseName: matched.name,
				category,
				confidence: "medium" as const,
				matchedOn: [],
			}
			existing.confidence = "high"
			existing.matchedOn.push({
				type: "icd_code",
				value: problem.icd10Code,
				source: problem.description ?? "problem_list",
			})
			diseaseMatches.set(matched.code, existing)
		}

		for (const note of notes) {
			const content = (note.content ?? "").toLowerCase()
			for (const disease of ALL_NOTIFIABLE) {
				const keyword = disease.keywords.find(value => content.includes(value.toLowerCase()))
				if (!keyword) continue

				const category = CATEGORY_1_DISEASES.some(d => d.code === disease.code) ? "category_1" : "category_2"
				const existing = diseaseMatches.get(disease.code) ?? {
					diseaseCode: disease.code,
					diseaseName: disease.name,
					category,
					confidence: "low" as const,
					matchedOn: [],
				}
				if (existing.confidence !== "high") {
					existing.confidence = existing.matchedOn.length > 0 ? "medium" : "low"
				}
				existing.matchedOn.push({
					type: "keyword",
					value: keyword,
					source: note.id,
				})
				diseaseMatches.set(disease.code, existing)
			}
		}

		return Array.from(diseaseMatches.values())
	}

	private async persistDetectionFlags(input: RunAutoDetectionInput, matches: Awaited<ReturnType<ReportingService["collectDetectionMatches"]>>) {
		const existingFlags = await db
			.select({ triggerValue: surveillanceFlags.triggerValue })
			.from(surveillanceFlags)
			.where(eq(surveillanceFlags.encounterId, input.encounterId))

		const existingValues = new Set(existingFlags.map(flag => flag.triggerValue))
		let flagsCreated = 0

		for (const match of matches) {
			if (existingValues.has(match.diseaseCode)) continue

			const [row] = await db.insert(surveillanceFlags).values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				noteId: match.matchedOn.find(item => item.type === "keyword")?.source ?? null,
				flagType: match.matchedOn.some(item => item.type === "icd_code") ? "icd10_match" : "syndromic_keyword",
				triggeredBy: match.matchedOn.map(item => `${item.type}:${item.value}`).join(", "),
				triggerValue: match.diseaseCode,
			}).returning({ id: surveillanceFlags.id })

			if (row) {
				flagsCreated += 1
			}
		}

		return flagsCreated
	}

	// ========================================================================
	// Surveillance Flags
	// ========================================================================

	async listSurveillanceFlags(input: ListSurveillanceFlagsInput) {
		const offset = (input.page - 1) * input.limit

		const conditions = [eq(surveillanceFlags.facilityId, input.facilityId)]
		if (input.isReviewed !== undefined) {
			conditions.push(eq(surveillanceFlags.isReviewed, input.isReviewed))
		}
		if (input.flagType) {
			conditions.push(eq(surveillanceFlags.flagType, input.flagType))
		}

		const [totalRow] = await db
			.select({ count: count() })
			.from(surveillanceFlags)
			.where(and(...conditions))

		const total = totalRow?.count ?? 0

		const rows = await db
			.select({
				id: surveillanceFlags.id,
				facilityId: surveillanceFlags.facilityId,
				encounterId: surveillanceFlags.encounterId,
				noteId: surveillanceFlags.noteId,
				flagType: surveillanceFlags.flagType,
				triggeredBy: surveillanceFlags.triggeredBy,
				triggerValue: surveillanceFlags.triggerValue,
				isReviewed: surveillanceFlags.isReviewed,
				reviewedByStaffId: surveillanceFlags.reviewedByStaffId,
				reviewedAt: surveillanceFlags.reviewedAt,
				createdAt: surveillanceFlags.createdAt,
				patientName: sql<string | null>`CASE WHEN ${patients.firstName} IS NOT NULL THEN ${patients.firstName} || ' ' || ${patients.lastName} ELSE NULL END`,
				patientMrn: patients.mrn,
				encounterType: encounters.encounterType,
			})
			.from(surveillanceFlags)
			.leftJoin(encounters, eq(surveillanceFlags.encounterId, encounters.id))
			.leftJoin(patients, eq(encounters.patientId, patients.id))
			.where(and(...conditions))
			.orderBy(desc(surveillanceFlags.createdAt))
			.limit(input.limit)
			.offset(offset)

		// Derive category and diseaseName from triggerValue
		const flags = rows.map(r => {
			const matched = ALL_NOTIFIABLE.find(d => d.code === r.triggerValue || d.name.toLowerCase() === r.triggerValue.toLowerCase())
			const isCategory1 = CATEGORY_1_DISEASES.some(d => d.code === r.triggerValue || d.name.toLowerCase() === r.triggerValue.toLowerCase())

			return {
				...r,
				reviewedAt: r.reviewedAt?.toISOString() ?? null,
				createdAt: r.createdAt.toISOString(),
				category: matched ? (isCategory1 ? "category_1" : "category_2") : null,
				diseaseName: matched?.name ?? r.triggerValue,
			}
		})

		// Optional category filter (post-query since category is derived)
		const filtered = input.category
			? flags.filter(f => f.category === input.category)
			: flags

		return {
			flags: filtered,
			total: input.category ? filtered.length : total,
			page: input.page,
			limit: input.limit,
			totalPages: Math.ceil((input.category ? filtered.length : total) / input.limit),
		}
	}

	async reviewSurveillanceFlag(input: ReviewFlagInput, userId: string) {
		const staffId = await this.getStaffProfileId(userId)

		const [flag] = await db
			.select()
			.from(surveillanceFlags)
			.where(eq(surveillanceFlags.id, input.id))
			.limit(1)

		if (!flag) throw new NotFoundException("Surveillance flag not found")

		// Mark reviewed
		await db
			.update(surveillanceFlags)
			.set({
				isReviewed: true,
				reviewedByStaffId: staffId,
				reviewedAt: new Date(),
			})
			.where(eq(surveillanceFlags.id, input.id))

		let pidsrCaseId: string | null = null

		if (input.action === "confirm" && flag.encounterId) {
			// Find encounter + patient for this flag
			const [enc] = await db
				.select({
					patientId: encounters.patientId,
					facilityId: encounters.facilityId,
				})
				.from(encounters)
				.where(eq(encounters.id, flag.encounterId))
				.limit(1)

			if (enc) {
				const matched = ALL_NOTIFIABLE.find(d => d.code === flag.triggerValue || d.name.toLowerCase() === flag.triggerValue.toLowerCase())

				const [newCase] = await db
					.insert(pidsrCases)
					.values({
						facilityId: enc.facilityId,
						encounterId: flag.encounterId,
						patientId: enc.patientId,
						diseaseCode: matched?.code ?? flag.triggerValue,
						diseaseName: matched?.name ?? flag.triggerValue,
						caseClassification: "suspected",
						diagnosisDate: new Date().toISOString().split("T")[0]!,
						reportingStaffId: staffId,
						reportStatus: "draft",
					})
					.returning({ id: pidsrCases.id })

				if (newCase) pidsrCaseId = newCase.id
			}
		}

		return { success: true, pidsrCaseId }
	}

	async scanEncounter(input: ScanEncounterInput) {
		const matches = await this.collectDetectionMatches(input)
		const flagsCreated = await this.persistDetectionFlags(input, matches)

		const flags = matches.map(match => ({
			id: this.getDetectionRuleId(`${input.encounterId}:${match.diseaseCode}`),
			flagType: match.matchedOn.some(item => item.type === "icd_code") ? "icd10_match" : "syndromic_keyword",
			triggeredBy: match.matchedOn.map(item => `${item.type}:${item.value}`).join(", "),
			triggerValue: match.diseaseCode,
		}))

		if (flagsCreated > 0) {
			const reportingStaff = await db
				.select({ id: staffProfiles.id })
				.from(staffProfiles)
				.where(eq(staffProfiles.facilityId, input.facilityId))

			for (const match of matches.filter(item => item.category === "category_1")) {
				for (const staff of reportingStaff) {
					await db.insert(notifications).values({
						facilityId: input.facilityId,
						recipientStaffId: staff.id,
						topic: "pidsr",
						title: `Category 1 Alert: ${match.diseaseName}`,
						body: "A Category 1 notifiable disease has been detected. Please review.",
						data: { encounterId: input.encounterId, diseaseCode: match.diseaseCode },
					})
				}
			}
		}

		return { flagsCreated, flags }
	}

	async listDetectionRules(input: ListDetectionRulesInput) {
		void input.facilityId
		const rules = ALL_NOTIFIABLE
			.map(disease => {
				const category: "category_1" | "category_2" = CATEGORY_1_DISEASES.some(item => item.code === disease.code)
					? "category_1"
					: "category_2"
				return {
					id: this.getDetectionRuleId(disease.code),
					diseaseCode: disease.code,
					diseaseName: disease.name,
					category,
					icdCodes: [disease.code],
					keywords: disease.keywords,
					labTestCodes: [],
					isActive: true,
				}
			})
			.filter(rule => (input.category ? rule.category === input.category : true))
			.filter(rule => (input.isActive !== undefined ? rule.isActive === input.isActive : true))

		return { rules }
	}

	async runAutoDetection(input: RunAutoDetectionInput) {
		const detectedDiseases = await this.collectDetectionMatches(input)
		const flagsCreated = await this.persistDetectionFlags(input, detectedDiseases)

		return {
			encounterId: input.encounterId,
			detectedDiseases,
			flagsCreated,
		}
	}

	// ========================================================================
	// PIDSR Cases
	// ========================================================================

	async listPidsrCases(input: ListPidsrCasesInput) {
		const offset = (input.page - 1) * input.limit

		const conditions = [eq(pidsrCases.facilityId, input.facilityId)]
		if (input.reportStatus) {
			conditions.push(eq(pidsrCases.reportStatus, input.reportStatus))
		}
		if (input.dateFrom) {
			conditions.push(gte(pidsrCases.diagnosisDate, input.dateFrom))
		}
		if (input.dateTo) {
			conditions.push(lte(pidsrCases.diagnosisDate, input.dateTo))
		}

		// Filter by category
		if (input.category) {
			const codes = input.category === "category_1"
				? CATEGORY_1_DISEASES.map(d => d.code)
				: CATEGORY_2_DISEASES.map(d => d.code)
			conditions.push(
				sql`${pidsrCases.diseaseCode} = ANY(${codes})`
			)
		}

		const [totalRow] = await db
			.select({ count: count() })
			.from(pidsrCases)
			.where(and(...conditions))

		const total = totalRow?.count ?? 0

		const rows = await db
			.select({
				id: pidsrCases.id,
				facilityId: pidsrCases.facilityId,
				encounterId: pidsrCases.encounterId,
				patientId: pidsrCases.patientId,
				diseaseCode: pidsrCases.diseaseCode,
				diseaseName: pidsrCases.diseaseName,
				caseClassification: pidsrCases.caseClassification,
				onsetDate: pidsrCases.onsetDate,
				diagnosisDate: pidsrCases.diagnosisDate,
				reportingStaffId: pidsrCases.reportingStaffId,
				reportStatus: pidsrCases.reportStatus,
				submissionData: pidsrCases.submissionData,
				submittedAt: pidsrCases.submittedAt,
				createdAt: pidsrCases.createdAt,
				updatedAt: pidsrCases.updatedAt,
				patientName: sql<string | null>`${patients.firstName} || ' ' || ${patients.lastName}`,
				patientMrn: patients.mrn,
			})
			.from(pidsrCases)
			.leftJoin(patients, eq(pidsrCases.patientId, patients.id))
			.where(and(...conditions))
			.orderBy(desc(pidsrCases.createdAt))
			.limit(input.limit)
			.offset(offset)

		return {
			cases: rows.map(r => ({
				...r,
				onsetDate: r.onsetDate ?? null,
				submissionData: (r.submissionData as Record<string, unknown> | null) ?? null,
				submittedAt: r.submittedAt?.toISOString() ?? null,
				createdAt: r.createdAt.toISOString(),
				updatedAt: r.updatedAt.toISOString(),
			})),
			total,
			page: input.page,
			limit: input.limit,
			totalPages: Math.ceil(total / input.limit),
		}
	}

	async getPidsrCase(input: GetPidsrCaseInput) {
		const [row] = await db
			.select({
				id: pidsrCases.id,
				facilityId: pidsrCases.facilityId,
				encounterId: pidsrCases.encounterId,
				patientId: pidsrCases.patientId,
				diseaseCode: pidsrCases.diseaseCode,
				diseaseName: pidsrCases.diseaseName,
				caseClassification: pidsrCases.caseClassification,
				onsetDate: pidsrCases.onsetDate,
				diagnosisDate: pidsrCases.diagnosisDate,
				reportingStaffId: pidsrCases.reportingStaffId,
				reportStatus: pidsrCases.reportStatus,
				submissionData: pidsrCases.submissionData,
				submittedAt: pidsrCases.submittedAt,
				createdAt: pidsrCases.createdAt,
				updatedAt: pidsrCases.updatedAt,
				patientName: sql<string | null>`${patients.firstName} || ' ' || ${patients.lastName}`,
				patientMrn: patients.mrn,
				encounterType: encounters.encounterType,
				chiefComplaint: encounters.chiefComplaint,
				attendingPhysician: sql<string | null>`(SELECT sp."display_name" FROM "qemr_staff_profiles" sp WHERE sp."id" = ${encounters.attendingStaffId})`,
			})
			.from(pidsrCases)
			.leftJoin(patients, eq(pidsrCases.patientId, patients.id))
			.leftJoin(encounters, eq(pidsrCases.encounterId, encounters.id))
			.where(eq(pidsrCases.id, input.id))
			.limit(1)

		if (!row) throw new NotFoundException("PIDSR case not found")

		return {
			...row,
			onsetDate: row.onsetDate ?? null,
			submissionData: (row.submissionData as Record<string, unknown> | null) ?? null,
			submittedAt: row.submittedAt?.toISOString() ?? null,
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
		}
	}

	async submitPidsrCase(input: SubmitPidsrCaseInput) {
		const [existing] = await db
			.select({ id: pidsrCases.id, reportStatus: pidsrCases.reportStatus })
			.from(pidsrCases)
			.where(eq(pidsrCases.id, input.id))
			.limit(1)

		if (!existing) throw new NotFoundException("PIDSR case not found")

		// Stubbed — mark as submitted
		await db
			.update(pidsrCases)
			.set({
				reportStatus: "submitted",
				submittedAt: new Date(),
				submissionData: { submittedVia: "stub", submittedAt: new Date().toISOString() },
				updatedAt: new Date(),
			})
			.where(eq(pidsrCases.id, input.id))

		return {
			success: true,
			message: "Integration pending — PIDSR submission is stubbed. Case marked as submitted.",
		}
	}

	// ========================================================================
	// PIDSR Weekly Report
	// ========================================================================

	async generateWeeklyReport(input: GenerateWeeklyReportInput) {
		const weekStart = new Date(input.weekStartDate)
		const weekEnd = new Date(weekStart)
		weekEnd.setDate(weekEnd.getDate() + 6)

		const weekStartStr = weekStart.toISOString().split("T")[0]!
		const weekEndStr = weekEnd.toISOString().split("T")[0]!

		// Get Category 2 cases for this week
		const cat2Codes = CATEGORY_2_DISEASES.map(d => d.code)
		const cases = await db
			.select({
				diseaseCode: pidsrCases.diseaseCode,
				diseaseName: pidsrCases.diseaseName,
				caseClassification: pidsrCases.caseClassification,
			})
			.from(pidsrCases)
			.where(
				and(
					eq(pidsrCases.facilityId, input.facilityId),
					gte(pidsrCases.diagnosisDate, weekStartStr),
					lte(pidsrCases.diagnosisDate, weekEndStr),
					sql`${pidsrCases.diseaseCode} = ANY(${cat2Codes})`
				)
			)

		// Group by disease
		const diseaseMap = new Map<string, { code: string; name: string; count: number }>()
		for (const c of cases) {
			const key = c.diseaseCode
			const existing = diseaseMap.get(key)
			if (existing) {
				existing.count++
			} else {
				diseaseMap.set(key, { code: c.diseaseCode, name: c.diseaseName, count: 1 })
			}
		}

		return {
			weekStartDate: weekStartStr,
			weekEndDate: weekEndStr,
			totalCases: cases.length,
			confirmedCases: cases.filter(c => c.caseClassification === "confirmed").length,
			diseaseBreakdown: Array.from(diseaseMap.values()).map(d => ({
				diseaseCode: d.code,
				diseaseName: d.name,
				count: d.count,
			})),
			status: "generated" as const,
		}
	}

	// ========================================================================
	// AHSR Metrics
	// ========================================================================

	async getAhsrMetrics(input: AhsrMetricsInput) {
		const yearStart = `${input.year}-01-01`
		const yearEnd = `${input.year}-12-31`

		let dateStart = yearStart
		let dateEnd = yearEnd

		if (input.month) {
			const mm = input.month.toString().padStart(2, "0")
			dateStart = `${input.year}-${mm}-01`
			const nextMonth = input.month === 12 ? 1 : input.month + 1
			const nextYear = input.month === 12 ? input.year + 1 : input.year
			const nmm = nextMonth.toString().padStart(2, "0")
			dateEnd = `${nextYear}-${nmm}-01`
		}

		// Admissions in period
		const [admissionsRow] = await db
			.select({ count: count() })
			.from(encounters)
			.where(
				and(
					eq(encounters.facilityId, input.facilityId),
					gte(encounters.admissionDatetime, new Date(dateStart)),
					input.month
						? lte(encounters.admissionDatetime, new Date(dateEnd))
						: lte(encounters.admissionDatetime, new Date(`${input.year + 1}-01-01`))
				)
			)
		const totalAdmissions = admissionsRow?.count ?? 0

		// Discharges in period
		const [dischargesRow] = await db
			.select({ count: count() })
			.from(encounters)
			.where(
				and(
					eq(encounters.facilityId, input.facilityId),
					isNotNull(encounters.dischargeDatetime),
					gte(encounters.dischargeDatetime, new Date(dateStart)),
					input.month
						? lte(encounters.dischargeDatetime, new Date(dateEnd))
						: lte(encounters.dischargeDatetime, new Date(`${input.year + 1}-01-01`))
				)
			)
		const totalDischarges = dischargesRow?.count ?? 0

		// Deaths in period
		const [deathsRow] = await db
			.select({ count: count() })
			.from(encounters)
			.where(
				and(
					eq(encounters.facilityId, input.facilityId),
					eq(encounters.disposition, "deceased"),
					isNotNull(encounters.dischargeDatetime),
					gte(encounters.dischargeDatetime, new Date(dateStart)),
					input.month
						? lte(encounters.dischargeDatetime, new Date(dateEnd))
						: lte(encounters.dischargeDatetime, new Date(`${input.year + 1}-01-01`))
				)
			)
		const totalDeaths = deathsRow?.count ?? 0

		// Death rates
		const grossDeathRate = totalDischarges > 0 ? (totalDeaths / totalDischarges) * 100 : null

		// Net death rate = (deaths - deaths <48hrs) / (discharges - deaths <48hrs) * 100
		// Deaths <48hrs: died within 48 hours of admission
		const [earlyDeathsRow] = await db
			.select({ count: count() })
			.from(encounters)
			.where(
				and(
					eq(encounters.facilityId, input.facilityId),
					eq(encounters.disposition, "deceased"),
					isNotNull(encounters.dischargeDatetime),
					gte(encounters.dischargeDatetime, new Date(dateStart)),
					input.month
						? lte(encounters.dischargeDatetime, new Date(dateEnd))
						: lte(encounters.dischargeDatetime, new Date(`${input.year + 1}-01-01`)),
					sql`EXTRACT(EPOCH FROM (${encounters.dischargeDatetime} - ${encounters.admissionDatetime})) < 172800`
				)
			)
		const earlyDeaths = earlyDeathsRow?.count ?? 0
		const denominator = totalDischarges - earlyDeaths
		const netDeathRate = denominator > 0 ? ((totalDeaths - earlyDeaths) / denominator) * 100 : null

		// BOR — average from census snapshots
		const [borRow] = await db
			.select({ avgBor: avg(bedCensusSnapshots.borPercentage) })
			.from(bedCensusSnapshots)
			.where(
				and(
					eq(bedCensusSnapshots.facilityId, input.facilityId),
					gte(bedCensusSnapshots.snapshotDate, dateStart),
					lte(bedCensusSnapshots.snapshotDate, input.month ? dateEnd : `${input.year}-12-31`)
				)
			)
		const bedOccupancyRate = borRow?.avgBor ? Number(borRow.avgBor) : null

		// Top 10 Morbidities — ICD-10 codes from problems scoped to admitted encounters in period
		// AD-009: join via problems.encounterId (encounter-scoped) so each diagnosis is counted
		// only once per the specific admission encounter, not for every encounter the patient had.
		const morbidityRows = await db
			.select({
				icdCode: problems.icd10Code,
				diseaseName: problems.icd10Display,
				count: count(),
			})
			.from(problems)
			.innerJoin(encounters, and(
				eq(problems.encounterId, encounters.id),
				eq(encounters.facilityId, input.facilityId),
				gte(encounters.admissionDatetime, new Date(dateStart)),
				input.month
					? lte(encounters.admissionDatetime, new Date(dateEnd))
					: lte(encounters.admissionDatetime, new Date(`${input.year + 1}-01-01`))
			))
			.where(isNotNull(problems.icd10Code))
			.groupBy(problems.icd10Code, problems.icd10Display)
			.orderBy(desc(count()))
			.limit(10)

		const totalMorbidityCount = morbidityRows.reduce((s, r) => s + r.count, 0)
		const topMorbidities = morbidityRows.map((r, idx) => ({
			rank: idx + 1,
			icdCode: r.icdCode ?? "",
			diseaseName: r.diseaseName ?? r.icdCode ?? "Unknown",
			count: r.count,
			percentage: totalMorbidityCount > 0 ? (r.count / totalMorbidityCount) * 100 : 0,
		}))

		// Top 10 Mortalities — ICD-10 codes from problems scoped to deceased encounters in period
		// AD-009: join via problems.encounterId (encounter-scoped) so each diagnosis is counted
		// only once per the specific death encounter, not for every encounter the patient had.
		const mortalityRows = await db
			.select({
				icdCode: problems.icd10Code,
				diseaseName: problems.icd10Display,
				count: count(),
			})
			.from(problems)
			.innerJoin(encounters, and(
				eq(problems.encounterId, encounters.id),
				eq(encounters.facilityId, input.facilityId),
				eq(encounters.disposition, "deceased"),
				isNotNull(encounters.dischargeDatetime),
				gte(encounters.dischargeDatetime, new Date(dateStart)),
				input.month
					? lte(encounters.dischargeDatetime, new Date(dateEnd))
					: lte(encounters.dischargeDatetime, new Date(`${input.year + 1}-01-01`))
			))
			.where(isNotNull(problems.icd10Code))
			.groupBy(problems.icd10Code, problems.icd10Display)
			.orderBy(desc(count()))
			.limit(10)

		const totalMortalityCount = mortalityRows.reduce((s, r) => s + r.count, 0)
		const topMortalities = mortalityRows.map((r, idx) => ({
			rank: idx + 1,
			icdCode: r.icdCode ?? "",
			diseaseName: r.diseaseName ?? r.icdCode ?? "Unknown",
			count: r.count,
			percentage: totalMortalityCount > 0 ? (r.count / totalMortalityCount) * 100 : 0,
		}))

		// HAI metrics
		const haiRows = await db
			.select({
				haiType: haiTags.haiType,
				count: count(),
			})
			.from(haiTags)
			.innerJoin(encounters, and(
				eq(haiTags.encounterId, encounters.id),
				eq(encounters.facilityId, input.facilityId),
				gte(encounters.admissionDatetime, new Date(dateStart)),
				input.month
					? lte(encounters.admissionDatetime, new Date(dateEnd))
					: lte(encounters.admissionDatetime, new Date(`${input.year + 1}-01-01`))
			))
			.groupBy(haiTags.haiType)
			.orderBy(desc(count()))

		const haiMetrics = haiRows.map(r => ({
			haiType: r.haiType,
			count: r.count,
			rate: totalAdmissions > 0 ? (r.count / totalAdmissions) * 1000 : 0, // per 1000 admissions
		}))

		return {
			facilityId: input.facilityId,
			year: input.year,
			month: input.month ?? null,
			bedOccupancyRate,
			totalAdmissions,
			totalDischarges,
			totalDeaths,
			grossDeathRate: grossDeathRate !== null ? Number(grossDeathRate.toFixed(2)) : null,
			netDeathRate: netDeathRate !== null ? Number(netDeathRate.toFixed(2)) : null,
			topMorbidities,
			topMortalities,
			haiMetrics,
		}
	}

	// ========================================================================
	// AHSR Drilldown
	// ========================================================================

	async drilldownAhsr(input: AhsrDrilldownInput) {
		const offset = (input.page - 1) * input.limit

		const dateStart = input.month
			? `${input.year}-${input.month.toString().padStart(2, "0")}-01`
			: `${input.year}-01-01`
		const dateEnd = input.month
			? (() => {
				const nm = input.month === 12 ? 1 : input.month + 1
				const ny = input.month === 12 ? input.year + 1 : input.year
				return `${ny}-${nm.toString().padStart(2, "0")}-01`
			})()
			: `${input.year + 1}-01-01`

		const baseConditions = [
			eq(encounters.facilityId, input.facilityId),
		]

		// Metric-specific filters
		if (input.metric === "admissions") {
			baseConditions.push(
				gte(encounters.admissionDatetime, new Date(dateStart)),
				lte(encounters.admissionDatetime, new Date(dateEnd))
			)
		} else if (input.metric === "discharges") {
			baseConditions.push(
				isNotNull(encounters.dischargeDatetime),
				gte(encounters.dischargeDatetime, new Date(dateStart)),
				lte(encounters.dischargeDatetime, new Date(dateEnd))
			)
		} else if (input.metric === "deaths") {
			baseConditions.push(
				eq(encounters.disposition, "deceased"),
				isNotNull(encounters.dischargeDatetime),
				gte(encounters.dischargeDatetime, new Date(dateStart)),
				lte(encounters.dischargeDatetime, new Date(dateEnd))
			)
		} else if (input.metric === "morbidity" || input.metric === "mortality") {
			if (input.metric === "mortality") {
				baseConditions.push(eq(encounters.disposition, "deceased"))
			}
			baseConditions.push(
				gte(encounters.admissionDatetime, new Date(dateStart)),
				lte(encounters.admissionDatetime, new Date(dateEnd))
			)
		} else if (input.metric === "hai") {
			baseConditions.push(
				gte(encounters.admissionDatetime, new Date(dateStart)),
				lte(encounters.admissionDatetime, new Date(dateEnd))
			)
		}

		let query = db
			.select({
				encounterId: encounters.id,
				patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
				patientMrn: patients.mrn,
				encounterType: encounters.encounterType,
				admissionDate: encounters.admissionDatetime,
				dischargeDate: encounters.dischargeDatetime,
				disposition: encounters.disposition,
			})
			.from(encounters)
			.innerJoin(patients, eq(encounters.patientId, patients.id))
			.where(and(...baseConditions))
			.orderBy(desc(encounters.admissionDatetime))
			.limit(input.limit)
			.offset(offset)

		const rows = await query

		// Get total count
		const [totalRow] = await db
			.select({ count: count() })
			.from(encounters)
			.where(and(...baseConditions))

		const total = totalRow?.count ?? 0

		// Get diagnosis codes for each encounter
		const encounterIds = rows.map(r => r.encounterId)
		const diagnosesMap = new Map<string, string[]>()

		if (encounterIds.length > 0) {
			const diagRows = await db
				.select({
					patientId: encounters.patientId,
					encounterId: encounters.id,
					icdCode: problems.icd10Code,
				})
				.from(problems)
				.innerJoin(encounters, eq(problems.patientId, encounters.patientId))
				.where(
					and(
						sql`${encounters.id} = ANY(${encounterIds})`,
						isNotNull(problems.icd10Code)
					)
				)

			for (const dr of diagRows) {
				const existing = diagnosesMap.get(dr.encounterId) ?? []
				if (dr.icdCode) existing.push(dr.icdCode)
				diagnosesMap.set(dr.encounterId, existing)
			}
		}

		return {
			encounters: rows.map(r => ({
				encounterId: r.encounterId,
				patientName: r.patientName,
				patientMrn: r.patientMrn,
				encounterType: r.encounterType,
				admissionDate: r.admissionDate.toISOString(),
				dischargeDate: r.dischargeDate?.toISOString() ?? null,
				disposition: r.disposition ?? null,
				diagnosisCodes: diagnosesMap.get(r.encounterId) ?? [],
			})),
			total,
			page: input.page,
			limit: input.limit,
			totalPages: Math.ceil(total / input.limit),
		}
	}

	async getAhsrRealTime(input: AhsrRealTimeInput) {
		const todayStart = new Date()
		todayStart.setHours(0, 0, 0, 0)

		const [bedCounts, admissionsToday, dischargesToday, deathsToday, pendingAlerts, activeEncounterRows] = await Promise.all([
			db
				.select({
					totalBeds: count(),
					occupiedBeds: sql<number>`count(*) filter (where ${beds.status} = 'occupied')`,
					availableBeds: sql<number>`count(*) filter (where ${beds.status} = 'available')`,
				})
				.from(beds)
				.where(eq(beds.facilityId, input.facilityId)),
			db.select({ count: count() }).from(encounters).where(and(eq(encounters.facilityId, input.facilityId), gte(encounters.admissionDatetime, todayStart))),
			db.select({ count: count() }).from(encounters).where(and(eq(encounters.facilityId, input.facilityId), isNotNull(encounters.dischargeDatetime), gte(encounters.dischargeDatetime, todayStart))),
			db.select({ count: count() }).from(encounters).where(and(eq(encounters.facilityId, input.facilityId), eq(encounters.disposition, "deceased"), isNotNull(encounters.dischargeDatetime), gte(encounters.dischargeDatetime, todayStart))),
			db.select({ count: count() }).from(surveillanceFlags).where(and(eq(surveillanceFlags.facilityId, input.facilityId), eq(surveillanceFlags.isReviewed, false))),
			db
				.select({ encounterType: encounters.encounterType, activeCount: count() })
				.from(encounters)
				.where(and(eq(encounters.facilityId, input.facilityId), eq(encounters.status, "active")))
				.groupBy(encounters.encounterType),
		])

		const weeklyTrend: Array<{ date: string; admissions: number; discharges: number; deaths: number }> = []
		for (let index = 6; index >= 0; index -= 1) {
			const dayStart = new Date(todayStart)
			dayStart.setDate(todayStart.getDate() - index)
			const dayEnd = new Date(dayStart)
			dayEnd.setDate(dayStart.getDate() + 1)

			const [admissions, discharges, deaths] = await Promise.all([
				db.select({ count: count() }).from(encounters).where(and(eq(encounters.facilityId, input.facilityId), gte(encounters.admissionDatetime, dayStart), lte(encounters.admissionDatetime, dayEnd))),
				db.select({ count: count() }).from(encounters).where(and(eq(encounters.facilityId, input.facilityId), isNotNull(encounters.dischargeDatetime), gte(encounters.dischargeDatetime, dayStart), lte(encounters.dischargeDatetime, dayEnd))),
				db.select({ count: count() }).from(encounters).where(and(eq(encounters.facilityId, input.facilityId), eq(encounters.disposition, "deceased"), isNotNull(encounters.dischargeDatetime), gte(encounters.dischargeDatetime, dayStart), lte(encounters.dischargeDatetime, dayEnd))),
			])

			weeklyTrend.push({
				date: dayStart.toISOString().split("T")[0]!,
				admissions: admissions[0]?.count ?? 0,
				discharges: discharges[0]?.count ?? 0,
				deaths: deaths[0]?.count ?? 0,
			})
		}

		const census = bedCounts[0] ?? { totalBeds: 0, occupiedBeds: 0, availableBeds: 0 }

		return {
			facilityId: input.facilityId,
			timestamp: new Date().toISOString(),
			currentCensus: {
				totalBeds: census.totalBeds ?? 0,
				occupiedBeds: Number(census.occupiedBeds ?? 0),
				availableBeds: Number(census.availableBeds ?? 0),
				borPercentage: (census.totalBeds ?? 0) > 0 ? Number(((Number(census.occupiedBeds ?? 0) / Number(census.totalBeds ?? 0)) * 100).toFixed(2)) : 0,
			},
			todayActivity: {
				admissions: admissionsToday[0]?.count ?? 0,
				discharges: dischargesToday[0]?.count ?? 0,
				deaths: deathsToday[0]?.count ?? 0,
				transfers: 0,
			},
			weeklyTrend,
			encountersByType: activeEncounterRows.map(row => ({
				encounterType: row.encounterType,
				activeCount: row.activeCount,
			})),
			edMetrics: null,
			pendingAlerts: pendingAlerts[0]?.count ?? 0,
		}
	}

	// ========================================================================
	// AHSR Export (stubbed)
	// ========================================================================

	async exportAhsr(input: ExportAhsrInput, userId: string) {
		const staffId = await this.getStaffProfileId(userId)

		// Create a snapshot record
		const metrics = await this.getAhsrMetrics(input)

		const [snapshot] = await db
			.insert(ahsrSnapshots)
			.values({
				facilityId: input.facilityId,
				reportYear: input.year,
				reportMonth: input.month ?? 0,
				snapshotData: metrics,
				generatedByStaffId: staffId,
			})
			.returning({ id: ahsrSnapshots.id })

		return {
			success: true,
			message: "Integration pending — AHSR export is stubbed. Snapshot saved for future submission.",
			snapshotId: snapshot?.id ?? null,
		}
	}
}

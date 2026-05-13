import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { createHash } from "node:crypto"
import {
	and,
	avg,
	count,
	desc,
	eq,
	gte,
	ilike,
	inArray,
	isNotNull,
	lt,
	lte,
	or,
	sql,
} from "drizzle-orm"

import {
	ahsrPeriods,
	ahsrSnapshots,
	ahsrValidationIssues,
	bedCensusSnapshots,
	beds,
	clinicalNotes,
	encounters,
	haiTags,
	integrations,
	mortalityMorbiditySnapshots,
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

interface DismissPidsrCaseInput {
	id: string
	reason: string
}

interface GenerateWeeklyReportInput {
	facilityId: string
	weekStartDate: string
	caseIds?: string[]
}

interface AhsrMetricsInput {
	facilityId: string
	year: number
	month?: number
	quarter?: number
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
	adminOverride?: boolean
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

interface ValidateAhsrInput {
	facilityId: string
	year: number
	quarter?: number
	page?: number
	limit?: number
}

interface LockAhsrPeriodInput {
	facilityId: string
	year: number
	quarter?: number
}

interface MmTop10Input {
	facilityId: string
	type: "mortality" | "morbidity"
	year: number
	quarter?: number
	ward?: string
	sex?: string
	ageBand?: string
}

interface MmConditionInput {
	facilityId: string
	icdCode: string
	year: number
	quarter?: number
}

interface ExportMmPdfInput {
	facilityId: string
	type: "mortality" | "morbidity"
	year: number
	quarter?: number
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

	// ========================================================================
	// PIDSR auto-transmission helper (INTREG-013)
	// ========================================================================

	/**
	 * Silently attempt to transmit a PIDSR case to the facility-scoped PIDSR
	 * endpoint.  Used by auto-detection paths so that a manual submit action is
	 * not required when an enabled integration is configured.
	 *
	 * Differences from the manual `submitPidsrCase`:
	 * - When no integration exists the case is left as "draft" (not "blocked").
	 *   The admin can configure an integration and manually submit later.
	 * - Errors are caught and recorded but never thrown — the caller continues.
	 */
	private async _autoTransmitPidsrCase(caseId: string, facilityId: string): Promise<void> {
		const [pidsrIntegration] = await db
			.select({
				id: integrations.id,
				endpointUrl: integrations.endpointUrl,
				credentialsRef: integrations.credentialsRef,
			})
			.from(integrations)
			.where(
				and(
					eq(integrations.facilityId, facilityId),
					eq(integrations.kind, "pidsr"),
					eq(integrations.enabled, true)
				)
			)
			.limit(1)

		if (!pidsrIntegration) {
			// No integration configured — leave the case as draft, nothing to do.
			return
		}

		const now = new Date()
		const apiKey = pidsrIntegration.credentialsRef
			? process.env[pidsrIntegration.credentialsRef]
			: undefined

		let submissionStatus: "submitted" | "rejected" = "rejected"
		let submissionData: Record<string, unknown>

		try {
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
				"Accept": "application/json",
			}
			if (apiKey) headers["X-API-Key"] = apiKey

			const response = await fetch(pidsrIntegration.endpointUrl, {
				method: "POST",
				headers,
				body: JSON.stringify({ caseId, submittedAt: now.toISOString(), mode: "auto" }),
			})

			const responseBody = await response.text().catch(() => "(no body)")

			if (response.ok) {
				submissionStatus = "submitted"
				submissionData = {
					submittedVia: "auto_transmission",
					httpStatus: response.status,
					response: responseBody,
					submittedAt: now.toISOString(),
				}
			} else {
				submissionData = {
					submittedVia: "auto_transmission",
					error: `HTTP ${response.status}`,
					response: responseBody,
					attemptedAt: now.toISOString(),
				}
			}
		} catch (err) {
			submissionData = {
				submittedVia: "auto_transmission",
				error: err instanceof Error ? err.message : "Unknown transmission error",
				attemptedAt: now.toISOString(),
			}
		}

		await db
			.update(pidsrCases)
			.set({
				reportStatus: submissionStatus,
				submittedAt: submissionStatus === "submitted" ? now : null,
				submissionData,
				updatedAt: new Date(),
			})
			.where(eq(pidsrCases.id, caseId))

		await db
			.update(integrations)
			.set({
				lastSyncAt: now,
				lastSyncStatus: submissionStatus === "submitted" ? "ok" : "error",
				updatedAt: new Date(),
			})
			.where(eq(integrations.id, pidsrIntegration.id))
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
			.where(
				and(eq(clinicalNotes.encounterId, input.encounterId), eq(clinicalNotes.status, "signed"))
			)

		const diseaseMatches = new Map<
			string,
			{
				diseaseCode: string
				diseaseName: string
				category: "category_1" | "category_2"
				confidence: "high" | "medium" | "low"
				matchedOn: Array<{
					type: "icd_code" | "keyword" | "lab_result"
					value: string
					source: string
				}>
			}
		>()

		for (const problem of patientProblems) {
			if (!problem.icd10Code) continue
			const matched = ALL_NOTIFIABLE.find(d => problem.icd10Code!.toUpperCase().startsWith(d.code))
			if (!matched) continue

			const category = CATEGORY_1_DISEASES.some(d => d.code === matched.code)
				? "category_1"
				: "category_2"
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

				const category = CATEGORY_1_DISEASES.some(d => d.code === disease.code)
					? "category_1"
					: "category_2"
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

	private async persistDetectionFlags(
		input: RunAutoDetectionInput,
		matches: Awaited<ReturnType<ReportingService["collectDetectionMatches"]>>
	) {
		const existingFlags = await db
			.select({ triggerValue: surveillanceFlags.triggerValue })
			.from(surveillanceFlags)
			.where(eq(surveillanceFlags.encounterId, input.encounterId))

		const existingValues = new Set(existingFlags.map(flag => flag.triggerValue))
		let flagsCreated = 0

		for (const match of matches) {
			if (existingValues.has(match.diseaseCode)) continue

			const [row] = await db
				.insert(surveillanceFlags)
				.values({
					facilityId: input.facilityId,
					encounterId: input.encounterId,
					noteId: match.matchedOn.find(item => item.type === "keyword")?.source ?? null,
					flagType: match.matchedOn.some(item => item.type === "icd_code")
						? "icd10_match"
						: "syndromic_keyword",
					triggeredBy: match.matchedOn.map(item => `${item.type}:${item.value}`).join(", "),
					triggerValue: match.diseaseCode,
				})
				.returning({ id: surveillanceFlags.id })

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
				patientName: sql<
					string | null
				>`CASE WHEN ${patients.firstName} IS NOT NULL THEN ${patients.firstName} || ' ' || ${patients.lastName} ELSE NULL END`,
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
			const matched = ALL_NOTIFIABLE.find(
				d => d.code === r.triggerValue || d.name.toLowerCase() === r.triggerValue.toLowerCase()
			)
			const isCategory1 = CATEGORY_1_DISEASES.some(
				d => d.code === r.triggerValue || d.name.toLowerCase() === r.triggerValue.toLowerCase()
			)

			return {
				...r,
				reviewedAt: r.reviewedAt?.toISOString() ?? null,
				createdAt: r.createdAt.toISOString(),
				category: matched ? (isCategory1 ? "category_1" : "category_2") : null,
				diseaseName: matched?.name ?? r.triggerValue,
			}
		})

		// Optional category filter (post-query since category is derived)
		const filtered = input.category ? flags.filter(f => f.category === input.category) : flags

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
				const matched = ALL_NOTIFIABLE.find(
					d =>
						d.code === flag.triggerValue || d.name.toLowerCase() === flag.triggerValue.toLowerCase()
				)

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

				if (newCase) {
					pidsrCaseId = newCase.id
					// INTREG-013: Category 1 cases require immediate transmission.
					// Attempt auto-submission now so no manual action is needed when an
					// enabled PIDSR integration is configured for this facility.
					const isCategory1 = CATEGORY_1_DISEASES.some(
						d => d.code === (matched?.code ?? flag.triggerValue)
					)
					if (isCategory1) {
						await this._autoTransmitPidsrCase(newCase.id, enc.facilityId)
					}
				}
			}
		}

		return { success: true, pidsrCaseId }
	}

	async scanEncounter(input: ScanEncounterInput) {
		const matches = await this.collectDetectionMatches(input)
		const flagsCreated = await this.persistDetectionFlags(input, matches)

		const flags = matches.map(match => ({
			id: this.getDetectionRuleId(`${input.encounterId}:${match.diseaseCode}`),
			flagType: match.matchedOn.some(item => item.type === "icd_code")
				? "icd10_match"
				: "syndromic_keyword",
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
		const rules = ALL_NOTIFIABLE.map(disease => {
			const category: "category_1" | "category_2" = CATEGORY_1_DISEASES.some(
				item => item.code === disease.code
			)
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
			const codes =
				input.category === "category_1"
					? CATEGORY_1_DISEASES.map(d => d.code)
					: CATEGORY_2_DISEASES.map(d => d.code)
			conditions.push(sql`${pidsrCases.diseaseCode} = ANY(${codes})`)
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
				attendingPhysician: sql<
					string | null
				>`(SELECT sp."display_name" FROM "qemr_staff_profiles" sp WHERE sp."id" = ${encounters.attendingStaffId})`,
			})
			.from(pidsrCases)
			.leftJoin(patients, eq(pidsrCases.patientId, patients.id))
			.leftJoin(encounters, eq(pidsrCases.encounterId, encounters.id))
			.where(eq(pidsrCases.id, input.id))
			.limit(1)

		if (!row) throw new NotFoundException("PIDSR case not found")

		const isCategory1 = CATEGORY_1_DISEASES.some(d => d.code === row.diseaseCode)
		const isCategory2 = CATEGORY_2_DISEASES.some(d => d.code === row.diseaseCode)
		const category: "category_1" | "category_2" | null = isCategory1
			? "category_1"
			: isCategory2
				? "category_2"
				: null

		return {
			...row,
			category,
			onsetDate: row.onsetDate ?? null,
			submissionData: (row.submissionData as Record<string, unknown> | null) ?? null,
			submittedAt: row.submittedAt?.toISOString() ?? null,
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
		}
	}

	async submitPidsrCase(input: SubmitPidsrCaseInput) {
		const [existing] = await db
			.select({
				id: pidsrCases.id,
				reportStatus: pidsrCases.reportStatus,
				facilityId: pidsrCases.facilityId,
			})
			.from(pidsrCases)
			.where(eq(pidsrCases.id, input.id))
			.limit(1)

		if (!existing) throw new NotFoundException("PIDSR case not found")

		// Idempotency guard — already submitted cases must not be re-transmitted
		if (existing.reportStatus === "submitted") {
			return {
				success: true,
				message: "PIDSR case has already been submitted. No further action required.",
			}
		}

		// Resolve active, enabled PIDSR integration for this case's facility
		const [pidsrIntegration] = await db
			.select({
				id: integrations.id,
				endpointUrl: integrations.endpointUrl,
				credentialsRef: integrations.credentialsRef,
			})
			.from(integrations)
			.where(
				and(
					eq(integrations.facilityId, existing.facilityId),
					eq(integrations.kind, "pidsr"),
					eq(integrations.enabled, true)
				)
			)
			.limit(1)

		const now = new Date()

		if (!pidsrIntegration) {
			// No active integration — block the submission and record the reason
			await db
				.update(pidsrCases)
				.set({
					reportStatus: "blocked",
					submissionData: {
						error: "No active PIDSR integration configured for this facility.",
						blockedAt: now.toISOString(),
					},
					updatedAt: new Date(),
				})
				.where(eq(pidsrCases.id, input.id))

			return {
				success: false,
				message:
					"PIDSR submission blocked: no active PIDSR integration is configured for this facility. " +
					"Configure and enable one in Admin → Integration Registry.",
			}
		}

		// Resolve API key from environment (credentialsRef is the env var name)
		const apiKey = pidsrIntegration.credentialsRef
			? process.env[pidsrIntegration.credentialsRef]
			: undefined

		// POST the case to the PIDSR endpoint
		let submissionStatus: "submitted" | "rejected" = "rejected"
		let submissionData: Record<string, unknown>

		try {
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
				"Accept": "application/json",
			}
			if (apiKey) {
				headers["X-API-Key"] = apiKey
			}

			const response = await fetch(pidsrIntegration.endpointUrl, {
				method: "POST",
				headers,
				body: JSON.stringify({ caseId: existing.id, submittedAt: now.toISOString() }),
			})

			const responseBody = await response.text().catch(() => "(no body)")

			if (response.ok) {
				submissionStatus = "submitted"
				submissionData = {
					submittedVia: "integration_registry",
					httpStatus: response.status,
					response: responseBody,
					submittedAt: now.toISOString(),
				}
			} else {
				submissionData = {
					submittedVia: "integration_registry",
					error: `HTTP ${response.status}`,
					response: responseBody,
					attemptedAt: now.toISOString(),
				}
			}
		} catch (err) {
			submissionData = {
				submittedVia: "integration_registry",
				error: err instanceof Error ? err.message : "Unknown submission error",
				attemptedAt: now.toISOString(),
			}
		}

		await db
			.update(pidsrCases)
			.set({
				reportStatus: submissionStatus,
				submittedAt: submissionStatus === "submitted" ? now : null,
				submissionData,
				updatedAt: new Date(),
			})
			.where(eq(pidsrCases.id, input.id))

		// INTREG-014: Write sync outcome back to the integration row so the admin
		// dashboard reflects the real last-transmission result.
		await db
			.update(integrations)
			.set({
				lastSyncAt: now,
				lastSyncStatus: submissionStatus === "submitted" ? "ok" : "error",
				updatedAt: new Date(),
			})
			.where(eq(integrations.id, pidsrIntegration.id))

		return {
			success: submissionStatus === "submitted",
			message:
				submissionStatus === "submitted"
					? "PIDSR case submitted successfully."
					: `PIDSR submission failed: ${(submissionData.error as string | undefined) ?? "Unknown error"}`,
		}
	}

	async dismissPidsrCase(input: DismissPidsrCaseInput) {
		const [existing] = await db
			.select({ id: pidsrCases.id, reportStatus: pidsrCases.reportStatus })
			.from(pidsrCases)
			.where(eq(pidsrCases.id, input.id))
			.limit(1)

		if (!existing) throw new NotFoundException("PIDSR case not found")

		await db
			.update(pidsrCases)
			.set({
				reportStatus: "rejected",
				submissionData: {
					dismissed: true,
					reason: input.reason,
					dismissedAt: new Date().toISOString(),
				},
				updatedAt: new Date(),
			})
			.where(eq(pidsrCases.id, input.id))

		return { success: true, message: "PIDSR case dismissed." }
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
					sql`${pidsrCases.diseaseCode} = ANY(${cat2Codes})`,
					input.caseIds && input.caseIds.length > 0
						? inArray(pidsrCases.id, input.caseIds)
						: undefined
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

		const diseaseBreakdown = Array.from(diseaseMap.values()).map(d => ({
			diseaseCode: d.code,
			diseaseName: d.name,
			count: d.count,
		}))

		const reportPayload = {
			weekStartDate: weekStartStr,
			weekEndDate: weekEndStr,
			totalCases: cases.length,
			confirmedCases: cases.filter(c => c.caseClassification === "confirmed").length,
			diseaseBreakdown,
		}

		// INTREG-013: Attempt automatic transmission of the weekly report when an
		// enabled PIDSR integration is configured for this facility.
		const [pidsrIntegration] = await db
			.select({
				id: integrations.id,
				endpointUrl: integrations.endpointUrl,
				credentialsRef: integrations.credentialsRef,
			})
			.from(integrations)
			.where(
				and(
					eq(integrations.facilityId, input.facilityId),
					eq(integrations.kind, "pidsr"),
					eq(integrations.enabled, true)
				)
			)
			.limit(1)

		if (!pidsrIntegration) {
			// No integration configured — return the generated report without transmission.
			return {
				...reportPayload,
				status: "generated" as const,
				transmissionNote:
					"No enabled PIDSR integration is configured for this facility. Configure one in Admin → Integration Registry.",
			}
		}

		const now = new Date()
		const apiKey = pidsrIntegration.credentialsRef
			? process.env[pidsrIntegration.credentialsRef]
			: undefined

		try {
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
				"Accept": "application/json",
			}
			if (apiKey) headers["X-API-Key"] = apiKey

			const response = await fetch(pidsrIntegration.endpointUrl, {
				method: "POST",
				headers,
				body: JSON.stringify({
					type: "weekly_report",
					...reportPayload,
					submittedAt: now.toISOString(),
				}),
			})

			const syncStatus: "ok" | "error" = response.ok ? "ok" : "error"
			await db
				.update(integrations)
				.set({ lastSyncAt: now, lastSyncStatus: syncStatus, updatedAt: now })
				.where(eq(integrations.id, pidsrIntegration.id))

			if (response.ok) {
				return { ...reportPayload, status: "submitted" as const }
			}

			const errText = await response.text().catch(() => `HTTP ${response.status}`)
			return {
				...reportPayload,
				status: "failed" as const,
				transmissionNote: `Transmission failed: ${errText}`,
			}
		} catch (err) {
			await db
				.update(integrations)
				.set({ lastSyncAt: now, lastSyncStatus: "error", updatedAt: now })
				.where(eq(integrations.id, pidsrIntegration.id))

			return {
				...reportPayload,
				status: "failed" as const,
				transmissionNote: `Transmission failed: ${err instanceof Error ? err.message : "Unknown error"}`,
			}
		}
	}

	// ========================================================================
	// AHSR Metrics
	// ========================================================================

	async getAhsrMetrics(input: AhsrMetricsInput) {
		let dateStart = `${input.year}-01-01`
		let dateEnd = `${input.year + 1}-01-01`

		if (input.quarter) {
			const range = this.getDateRange(input.year, input.quarter)
			dateStart = range.start.toISOString().slice(0, 10)!
			dateEnd = range.end.toISOString().slice(0, 10)!
		} else if (input.month) {
			const mm = input.month.toString().padStart(2, "0")
			dateStart = `${input.year}-${mm}-01`
			const nextMonth = input.month === 12 ? 1 : input.month + 1
			const nextYear = input.month === 12 ? input.year + 1 : input.year
			const nmm = nextMonth.toString().padStart(2, "0")
			dateEnd = `${nextYear}-${nmm}-01`
		}

		const dateStartDate = new Date(dateStart)
		const dateEndDate = new Date(dateEnd)

		// Admissions in period
		const [admissionsRow] = await db
			.select({ count: count() })
			.from(encounters)
			.where(
				and(
					eq(encounters.facilityId, input.facilityId),
					gte(encounters.admissionDatetime, dateStartDate),
					lte(encounters.admissionDatetime, dateEndDate)
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
					gte(encounters.dischargeDatetime, dateStartDate),
					lte(encounters.dischargeDatetime, dateEndDate)
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
					gte(encounters.dischargeDatetime, dateStartDate),
					lte(encounters.dischargeDatetime, dateEndDate)
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
					gte(encounters.dischargeDatetime, dateStartDate),
					lte(encounters.dischargeDatetime, dateEndDate),
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
					lte(bedCensusSnapshots.snapshotDate, dateEnd)
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
			.innerJoin(
				encounters,
				and(
					eq(problems.encounterId, encounters.id),
					eq(encounters.facilityId, input.facilityId),
					gte(encounters.admissionDatetime, dateStartDate),
					lte(encounters.admissionDatetime, dateEndDate)
				)
			)
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
			.innerJoin(
				encounters,
				and(
					eq(problems.encounterId, encounters.id),
					eq(encounters.facilityId, input.facilityId),
					eq(encounters.disposition, "deceased"),
					isNotNull(encounters.dischargeDatetime),
					gte(encounters.dischargeDatetime, dateStartDate),
					lte(encounters.dischargeDatetime, dateEndDate)
				)
			)
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
			.innerJoin(
				encounters,
				and(
					eq(haiTags.encounterId, encounters.id),
					eq(encounters.facilityId, input.facilityId),
					gte(encounters.admissionDatetime, dateStartDate),
					lte(encounters.admissionDatetime, dateEndDate)
				)
			)
			.groupBy(haiTags.haiType)
			.orderBy(desc(count()))

		const haiMetrics = haiRows.map(r => ({
			haiType: r.haiType,
			count: r.count,
			rate: totalAdmissions > 0 ? (r.count / totalAdmissions) * 1000 : 0, // per 1000 admissions
		}))

		// Readiness %: encounters with at least one ICD-10 coded problem / total encounters
		const encountersWithIcd = await db
			.selectDistinct({ encounterId: encounters.id })
			.from(encounters)
			.innerJoin(
				problems,
				and(
					eq(problems.patientId, encounters.patientId),
					eq(problems.status, "active"),
					isNotNull(problems.icd10Code)
				)
			)
			.where(
				and(
					eq(encounters.facilityId, input.facilityId),
					gte(encounters.admissionDatetime, dateStartDate),
					lte(encounters.admissionDatetime, dateEndDate)
				)
			)
		const readinessPercent =
			totalAdmissions > 0 ? Math.round((encountersWithIcd.length / totalAdmissions) * 100) : 100

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
			readinessPercent,
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

		const baseConditions = [eq(encounters.facilityId, input.facilityId)]

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

		const query = db
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
				.where(and(sql`${encounters.id} = ANY(${encounterIds})`, isNotNull(problems.icd10Code)))

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

		const [
			bedCounts,
			admissionsToday,
			dischargesToday,
			deathsToday,
			pendingAlerts,
			activeEncounterRows,
		] = await Promise.all([
			db
				.select({
					totalBeds: count(),
					occupiedBeds: sql<number>`count(*) filter (where ${beds.status} = 'occupied')`,
					availableBeds: sql<number>`count(*) filter (where ${beds.status} = 'available')`,
				})
				.from(beds)
				.where(eq(beds.facilityId, input.facilityId)),
			db
				.select({ count: count() })
				.from(encounters)
				.where(
					and(
						eq(encounters.facilityId, input.facilityId),
						gte(encounters.admissionDatetime, todayStart)
					)
				),
			db
				.select({ count: count() })
				.from(encounters)
				.where(
					and(
						eq(encounters.facilityId, input.facilityId),
						isNotNull(encounters.dischargeDatetime),
						gte(encounters.dischargeDatetime, todayStart)
					)
				),
			db
				.select({ count: count() })
				.from(encounters)
				.where(
					and(
						eq(encounters.facilityId, input.facilityId),
						eq(encounters.disposition, "deceased"),
						isNotNull(encounters.dischargeDatetime),
						gte(encounters.dischargeDatetime, todayStart)
					)
				),
			db
				.select({ count: count() })
				.from(surveillanceFlags)
				.where(
					and(
						eq(surveillanceFlags.facilityId, input.facilityId),
						eq(surveillanceFlags.isReviewed, false)
					)
				),
			db
				.select({ encounterType: encounters.encounterType, activeCount: count() })
				.from(encounters)
				.where(and(eq(encounters.facilityId, input.facilityId), eq(encounters.status, "active")))
				.groupBy(encounters.encounterType),
		])

		const weeklyTrend: Array<{
			date: string
			admissions: number
			discharges: number
			deaths: number
		}> = []
		for (let index = 6; index >= 0; index -= 1) {
			const dayStart = new Date(todayStart)
			dayStart.setDate(todayStart.getDate() - index)
			const dayEnd = new Date(dayStart)
			dayEnd.setDate(dayStart.getDate() + 1)

			const [admissions, discharges, deaths] = await Promise.all([
				db
					.select({ count: count() })
					.from(encounters)
					.where(
						and(
							eq(encounters.facilityId, input.facilityId),
							gte(encounters.admissionDatetime, dayStart),
							lte(encounters.admissionDatetime, dayEnd)
						)
					),
				db
					.select({ count: count() })
					.from(encounters)
					.where(
						and(
							eq(encounters.facilityId, input.facilityId),
							isNotNull(encounters.dischargeDatetime),
							gte(encounters.dischargeDatetime, dayStart),
							lte(encounters.dischargeDatetime, dayEnd)
						)
					),
				db
					.select({ count: count() })
					.from(encounters)
					.where(
						and(
							eq(encounters.facilityId, input.facilityId),
							eq(encounters.disposition, "deceased"),
							isNotNull(encounters.dischargeDatetime),
							gte(encounters.dischargeDatetime, dayStart),
							lte(encounters.dischargeDatetime, dayEnd)
						)
					),
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
				borPercentage:
					(census.totalBeds ?? 0) > 0
						? Number(
								((Number(census.occupiedBeds ?? 0) / Number(census.totalBeds ?? 0)) * 100).toFixed(
									2
								)
							)
						: 0,
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

		// Readiness gate: reject below 95% unless adminOverride is true
		const READINESS_THRESHOLD = 95
		const metrics = await this.getAhsrMetrics(input)
		if (metrics.readinessPercent < READINESS_THRESHOLD && !input.adminOverride) {
			return {
				success: false,
				message: `AHSR export rejected: data readiness is ${metrics.readinessPercent}% (threshold: ${READINESS_THRESHOLD}%). Resolve validation issues or use admin override.`,
				snapshotId: null,
			}
		}

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
			message:
				"Integration pending — AHSR export is stubbed. Snapshot saved for future submission.",
			snapshotId: snapshot?.id ?? null,
		}
	}

	// ========================================================================
	// AHSR Validation & Lock
	// ========================================================================

	private getDateRange(year: number, quarter?: number): { start: Date; end: Date } {
		if (quarter) {
			const monthStart = (quarter - 1) * 3
			const start = new Date(year, monthStart, 1)
			const end = new Date(year, monthStart + 3, 1)
			return { start, end }
		}
		return { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) }
	}

	async validateAhsr(input: ValidateAhsrInput) {
		const page = input.page ?? 1
		const limit = input.limit ?? 50
		const { start, end } = this.getDateRange(input.year, input.quarter)

		// Total encounters in period
		const [totalRow] = await db
			.select({ count: count() })
			.from(encounters)
			.where(
				and(
					eq(encounters.facilityId, input.facilityId),
					gte(encounters.admissionDatetime, start),
					lte(encounters.admissionDatetime, end)
				)
			)
		const totalEncounters = totalRow?.count ?? 0

		// Encounters with at least one ICD-10 coded active problem
		const encountersWithIcd = await db
			.selectDistinct({ encounterId: encounters.id })
			.from(encounters)
			.innerJoin(
				problems,
				and(
					eq(problems.patientId, encounters.patientId),
					eq(problems.status, "active"),
					isNotNull(problems.icd10Code)
				)
			)
			.where(
				and(
					eq(encounters.facilityId, input.facilityId),
					gte(encounters.admissionDatetime, start),
					lte(encounters.admissionDatetime, end)
				)
			)

		const withIcdSet = new Set(encountersWithIcd.map(r => r.encounterId))

		// All encounter IDs in period
		const allEncounterRows = await db
			.select({ id: encounters.id })
			.from(encounters)
			.where(
				and(
					eq(encounters.facilityId, input.facilityId),
					gte(encounters.admissionDatetime, start),
					lte(encounters.admissionDatetime, end)
				)
			)

		const missingIcdIds = allEncounterRows.filter(r => !withIcdSet.has(r.id)).map(r => r.id)

		// Encounters with at least one signed clinical note
		const encountersWithNote = await db
			.selectDistinct({ encounterId: clinicalNotes.encounterId })
			.from(clinicalNotes)
			.where(and(eq(clinicalNotes.status, "signed"), isNotNull(clinicalNotes.encounterId)))

		const withNoteSet = new Set(encountersWithNote.map(r => r.encounterId))
		const missingNoteIds = allEncounterRows.filter(r => !withNoteSet.has(r.id)).map(r => r.id)

		// Build issues list — use encounterId as the issue id (it's a UUID)
		// Deduplicate encounters that appear in both missing lists
		const uniqueMissingIds = new Set([...missingIcdIds, ...missingNoteIds])
		const issues: Array<{
			id: string
			issueType: "missing_icd10" | "no_finalized_note" | "deprecated_code"
			encounterId: string | null
			patientName: string | null
			patientMrn: string | null
			detail: string | null
			status: "open" | "resolved"
		}> = [
			...missingIcdIds.map(id => ({
				id,
				issueType: "missing_icd10" as const,
				encounterId: id,
				patientName: null,
				patientMrn: null,
				detail: "No active ICD-10 coded problem found for this encounter",
				status: "open" as const,
			})),
			...missingNoteIds.map(id => ({
				id,
				issueType: "no_finalized_note" as const,
				encounterId: id,
				patientName: null,
				patientMrn: null,
				detail: "No signed clinical note found for this encounter",
				status: "open" as const,
			})),
		]

		const issueCount = issues.length
		const readinessPercent =
			totalEncounters > 0
				? Math.max(
						0,
						Math.round(
							((totalEncounters - Math.min(uniqueMissingIds.size, totalEncounters)) /
								totalEncounters) *
								100
						)
					)
				: 100

		const offset = (page - 1) * limit
		const paginatedIssues = issues.slice(offset, offset + limit)

		return {
			readinessPercent,
			issuesByType: {
				missing_icd10: missingIcdIds.length,
				deprecated_code: 0,
				no_finalized_note: missingNoteIds.length,
			},
			issues: paginatedIssues,
			total: issueCount,
			page,
			limit,
			totalPages: Math.ceil(issueCount / limit),
		}
	}

	async lockAhsrPeriod(input: LockAhsrPeriodInput, userId: string) {
		const staffId = await this.getStaffProfileId(userId)
		const now = new Date()
		const quarter = (input.quarter ?? null) as 1 | 2 | 3 | 4 | null

		const [existing] = await db
			.select({ id: ahsrPeriods.id })
			.from(ahsrPeriods)
			.where(
				and(
					eq(ahsrPeriods.facilityId, input.facilityId),
					eq(ahsrPeriods.year, input.year),
					quarter !== null ? eq(ahsrPeriods.quarter, quarter) : sql`${ahsrPeriods.quarter} IS NULL`
				)
			)
			.limit(1)

		let periodId: string
		if (existing) {
			await db
				.update(ahsrPeriods)
				.set({ status: "locked", lockedAt: now, lockedByStaffId: staffId, updatedAt: now })
				.where(eq(ahsrPeriods.id, existing.id))
			periodId = existing.id
		} else {
			const [inserted] = await db
				.insert(ahsrPeriods)
				.values({
					facilityId: input.facilityId,
					year: input.year,
					quarter,
					status: "locked",
					lockedAt: now,
					lockedByStaffId: staffId,
				})
				.returning({ id: ahsrPeriods.id })
			periodId = inserted!.id
		}

		return { success: true, periodId }
	}

	// ========================================================================
	// Mortality & Morbidity
	// ========================================================================

	/**
	 * Returns the top 10 mortality or morbidity causes for the given period.
	 *
	 * Period boundary: [start, end) — start inclusive, end exclusive.
	 * Tie-breaking: when two ICD-10 codes have the same count they are ordered
	 * alphabetically by ICD-10 code ascending (A00 before A01). Ties share the
	 * same rank and the next rank is skipped.
	 */
	async getMmTop10(input: MmTop10Input) {
		const { start, end } = this.getDateRange(input.year, input.quarter)

		const baseConditions = [
			eq(encounters.facilityId, input.facilityId),
			gte(encounters.admissionDatetime, start),
			lt(encounters.admissionDatetime, end),
			isNotNull(problems.icd10Code),
			eq(problems.status, "active"),
		]

		if (input.type === "mortality") {
			baseConditions.push(eq(encounters.disposition, "deceased"))
		}

		const rows = await db
			.select({
				icdCode: problems.icd10Code,
				diseaseName: problems.description,
				cnt: count(),
			})
			.from(encounters)
			.innerJoin(problems, eq(problems.patientId, encounters.patientId))
			.where(and(...baseConditions))
			.groupBy(problems.icd10Code, problems.description)
			.orderBy(desc(count()), sql`${problems.icd10Code} ASC`)
			.limit(10)

		const total = rows.reduce((sum, r) => sum + r.cnt, 0)

		// Prior period for comparison
		let priorRows: typeof rows = []
		if (input.quarter) {
			const prevQ = input.quarter === 1 ? 4 : ((input.quarter - 1) as 1 | 2 | 3 | 4)
			const prevYear = input.quarter === 1 ? input.year - 1 : input.year
			const prior = this.getDateRange(prevYear, prevQ)
			const priorConditions = [
				eq(encounters.facilityId, input.facilityId),
				gte(encounters.admissionDatetime, prior.start),
				lt(encounters.admissionDatetime, prior.end),
				isNotNull(problems.icd10Code),
				eq(problems.status, "active"),
			]
			if (input.type === "mortality") priorConditions.push(eq(encounters.disposition, "deceased"))
			priorRows = await db
				.select({ icdCode: problems.icd10Code, diseaseName: problems.description, cnt: count() })
				.from(encounters)
				.innerJoin(problems, eq(problems.patientId, encounters.patientId))
				.where(and(...priorConditions))
				.groupBy(problems.icd10Code, problems.description)
				.orderBy(desc(count()), sql`${problems.icd10Code} ASC`)
				.limit(10)
		}

		// Build prior rank map with shared-rank semantics so rankChange is correct.
		const priorRankMap = new Map<string, number>()
		{
			let rank = 0
			let prevCnt: number | null = null
			priorRows.forEach((r, i) => {
				if (r.cnt !== prevCnt) {
					rank = i + 1
					prevCnt = r.cnt
				}
				if (r.icdCode) priorRankMap.set(r.icdCode, rank)
			})
		}
		const priorCountMap = new Map(priorRows.map(r => [r.icdCode!, r.cnt]))

		// Assign shared ranks: ties get the same rank; next entry skips.
		let currentRank = 0
		let prevCnt: number | null = null
		const items = rows.map((r, i) => {
			if (r.cnt !== prevCnt) {
				currentRank = i + 1
				prevCnt = r.cnt
			}
			const priorCount = r.icdCode ? (priorCountMap.get(r.icdCode) ?? null) : null
			const priorRank = r.icdCode ? (priorRankMap.get(r.icdCode) ?? null) : null
			const rankChange = priorRank !== null ? priorRank - currentRank : null
			return {
				rank: currentRank,
				icdCode: r.icdCode ?? "Unknown",
				diseaseName: r.diseaseName ?? r.icdCode ?? "Unknown",
				count: r.cnt,
				percentage: total > 0 ? Math.round((r.cnt / total) * 10000) / 100 : 0,
				priorCount,
				rankChange,
			}
		})

		return {
			facilityId: input.facilityId,
			type: input.type,
			year: input.year,
			quarter: input.quarter ?? null,
			items,
		}
	}

	async getMmCondition(input: MmConditionInput) {
		const { start, end } = this.getDateRange(input.year, input.quarter)

		const rows = await db
			.select({
				sex: patients.sex,
				ageBand: sql<string>`
					CASE
						WHEN EXTRACT(YEAR FROM AGE(${patients.dateOfBirth})) < 1 THEN '<1'
						WHEN EXTRACT(YEAR FROM AGE(${patients.dateOfBirth})) BETWEEN 1 AND 4 THEN '1-4'
						WHEN EXTRACT(YEAR FROM AGE(${patients.dateOfBirth})) BETWEEN 5 AND 14 THEN '5-14'
						WHEN EXTRACT(YEAR FROM AGE(${patients.dateOfBirth})) BETWEEN 15 AND 24 THEN '15-24'
						WHEN EXTRACT(YEAR FROM AGE(${patients.dateOfBirth})) BETWEEN 25 AND 44 THEN '25-44'
						WHEN EXTRACT(YEAR FROM AGE(${patients.dateOfBirth})) BETWEEN 45 AND 64 THEN '45-64'
						ELSE '65+'
					END
				`,
				cnt: count(),
			})
			.from(encounters)
			.innerJoin(patients, eq(encounters.patientId, patients.id))
			.innerJoin(
				problems,
				and(
					eq(problems.patientId, encounters.patientId),
					eq(problems.status, "active"),
					ilike(problems.icd10Code, `${input.icdCode}%`)
				)
			)
			.where(
				and(
					eq(encounters.facilityId, input.facilityId),
					gte(encounters.admissionDatetime, start),
					lt(encounters.admissionDatetime, end)
				)
			)
			.groupBy(
				patients.sex,
				sql`
				CASE
					WHEN EXTRACT(YEAR FROM AGE(${patients.dateOfBirth})) < 1 THEN '<1'
					WHEN EXTRACT(YEAR FROM AGE(${patients.dateOfBirth})) BETWEEN 1 AND 4 THEN '1-4'
					WHEN EXTRACT(YEAR FROM AGE(${patients.dateOfBirth})) BETWEEN 5 AND 14 THEN '5-14'
					WHEN EXTRACT(YEAR FROM AGE(${patients.dateOfBirth})) BETWEEN 15 AND 24 THEN '15-24'
					WHEN EXTRACT(YEAR FROM AGE(${patients.dateOfBirth})) BETWEEN 25 AND 44 THEN '25-44'
					WHEN EXTRACT(YEAR FROM AGE(${patients.dateOfBirth})) BETWEEN 45 AND 64 THEN '45-64'
					ELSE '65+'
				END
			`
			)

		// Pivot into age bands
		const bandMap = new Map<string, { male: number; female: number; unknown: number }>()
		const AGE_BANDS = ["<1", "1-4", "5-14", "15-24", "25-44", "45-64", "65+"]
		for (const band of AGE_BANDS) bandMap.set(band, { male: 0, female: 0, unknown: 0 })

		for (const row of rows) {
			const band = bandMap.get(row.ageBand) ?? { male: 0, female: 0, unknown: 0 }
			if (row.sex === "male") band.male += row.cnt
			else if (row.sex === "female") band.female += row.cnt
			else band.unknown += row.cnt
			bandMap.set(row.ageBand, band)
		}

		const diseaseName = ALL_NOTIFIABLE.find(d => d.code === input.icdCode)?.name ?? input.icdCode

		type AgeBand = "<1" | "1-4" | "5-14" | "15-24" | "25-44" | "45-64" | "65+"
		const AGE_BAND_LITERALS: AgeBand[] = ["<1", "1-4", "5-14", "15-24", "25-44", "45-64", "65+"]

		const demographics = AGE_BAND_LITERALS.map(band => {
			const b = bandMap.get(band)!
			return {
				ageBand: band as AgeBand,
				male: b.male,
				female: b.female,
				unknown: b.unknown,
				total: b.male + b.female + b.unknown,
			}
		})
		const totalCount = demographics.reduce((sum, d) => sum + d.total, 0)

		// Fetch individual encounters for verification links (capped at 100)
		const encounterRows = await db
			.selectDistinct({
				encounterId: encounters.id,
				patientName: sql<string | null>`${patients.firstName} || ' ' || ${patients.lastName}`,
				patientMrn: patients.mrn,
				admissionDate: encounters.admissionDatetime,
				dischargeDate: encounters.dischargeDatetime,
				disposition: encounters.disposition,
			})
			.from(encounters)
			.innerJoin(patients, eq(encounters.patientId, patients.id))
			.innerJoin(
				problems,
				and(
					eq(problems.patientId, encounters.patientId),
					eq(problems.status, "active"),
					ilike(problems.icd10Code, `${input.icdCode}%`)
				)
			)
			.where(
				and(
					eq(encounters.facilityId, input.facilityId),
					gte(encounters.admissionDatetime, start),
					lt(encounters.admissionDatetime, end)
				)
			)
			.orderBy(desc(encounters.admissionDatetime))
			.limit(100)

		const encounterList = encounterRows.map(r => ({
			encounterId: r.encounterId,
			patientName: r.patientName ?? null,
			patientMrn: r.patientMrn ?? null,
			admissionDate: r.admissionDate?.toISOString() ?? null,
			dischargeDate: r.dischargeDate?.toISOString() ?? null,
			disposition: r.disposition ?? null,
		}))

		return {
			facilityId: input.facilityId,
			icdCode: input.icdCode,
			diseaseName,
			totalCount,
			demographics,
			encounters: encounterList,
		}
	}

	async exportMmPdf(input: ExportMmPdfInput, userId: string) {
		const staffId = await this.getStaffProfileId(userId)
		const top10 = await this.getMmTop10(input)

		const [snapshot] = await db
			.insert(mortalityMorbiditySnapshots)
			.values({
				facilityId: input.facilityId,
				period: input.quarter ? `${input.year}-Q${input.quarter}` : `${input.year}`,
				type: input.type,
				top10Json: top10.items,
				generatedByStaffId: staffId,
			})
			.returning({ id: mortalityMorbiditySnapshots.id })

		return {
			success: true,
			message: "PDF export is stubbed. Snapshot saved for future PDF generation.",
			snapshotId: snapshot?.id ?? null,
			downloadUrl: null,
		}
	}
}

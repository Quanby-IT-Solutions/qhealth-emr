import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { and, count, desc, eq, gte, ilike, inArray, isNotNull, lte, sql } from "drizzle-orm"
import { PDFDocument, StandardFonts } from "pdf-lib"

import {
	beds,
	chartDeficiencies,
	clinicalNotes,
	codeVersions,
	codes,
	deficiencyNotifications,
	encounterCodes,
	encounters,
	facilities,
	haiReconciliations,
	haiTags,
	medicalRecordsRequests,
	operationRecords,
	problems,
	patients,
	recordsReleaseAudit,
	staffProfiles,
	users,
	wards,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { AuditService } from "../audit/audit.service"

interface ListDeficienciesInput {
	facilityId: string
	page: number
	limit: number
	deficiencyType?: "missing_discharge_summary" | "missing_signature" | "undocumented_procedure"
	status?: "open" | "notified" | "resolved" | "dismissed"
	ownerStaffId?: string
	ownerQuery?: string
	ageBucket?: "lt_7" | "d7_14" | "d14_30" | "gt_30"
	sortBy?: "dischargeDatetime" | "ageDays" | "status" | "deficiencyType" | "patientName"
	sortDirection?: "asc" | "desc"
}

interface NotifyInput {
	id: string
	channel: "email" | "in_app" | "sms"
	staffId: string
}

interface MarkResolvedInput {
	id: string
	notes?: string
	staffId: string
}

interface ScanInput {
	facilityId: string
	encounterId?: string
	staffId?: string
}

type NormalizedDeficiencyType = "missing_discharge_summary" | "missing_signature" | "undocumented_procedure"
type DeficiencySourceKind = "encounter" | "clinical_note" | "operation_record"

interface DeficiencyDetectionResult {
	missing: boolean
	sourceKind: DeficiencySourceKind | null
	sourceId: string | null
}

interface UpsertCodesInput {
	encounterId: string
	codes: CodingDraftCode[]
	staffId: string
}

interface CodingDraftCode {
	id?: string
	code: string
	display?: string | null
	isPrimary: boolean
	linkedDiagnosisRef?: string | null
	notes?: string | null
}

interface CodingValidationSummary {
	violations: Array<{ path: string; code?: string; message: string; suggestedReplacement?: string | null }>
	hasPrimary: boolean
	hasDeprecated: boolean
	primaryCount: number
}

interface SignCodesInput {
	encounterId: string
	staffId: string
}

interface AmendCodesInput {
	encounterId: string
	reason: string
	codes: CodingDraftCode[]
	staffId: string
}

interface CaptureDpaConsentInput {
	requestId: string
	signatureUri: string
	staffId: string
	ipAddress?: string | null
	userAgent?: string | null
}

interface AttachIdentityProofInput {
	requestId: string
	uri: string
	documentType: string
	contentHash: string
	staffId: string
}

interface AttachPhysicianSignatureInput {
	requestId: string
	uri: string
	contentHash: string
	staffId: string
}

interface MarkPaymentClearedInput {
	requestId: string
	invoiceId: string
	staffId: string
}

interface ReleaseRecordsInput {
	requestId: string
	recipient: string
	documentTypes: string[]
	contentHashes: string[]
	staffId: string
	ipAddress?: string | null
	userAgent?: string | null
}

interface ListRecordsAuditInput {
	facilityId: string
	page: number
	limit: number
	requestId?: string
	dateFrom?: string
	dateTo?: string
	documentType?: string
	recipient?: string
}

interface ListHaiInput {
	facilityId: string
	page: number
	limit: number
	haiType?: "clabsi" | "cauti" | "vap" | "ssi" | "cdiff"
	wardId?: string
	dateFrom?: string
	dateTo?: string
}

interface HaiDecisionInput {
	haiTagId: string
	decision: "confirm" | "reclassify" | "dismiss"
	newType?: "clabsi" | "cauti" | "vap" | "ssi" | "cdiff"
	reason?: string
	staffId: string
}

interface HaiReportInput {
	facilityId: string
	periodStart: string
	periodEnd: string
	wardId?: string
}

@Injectable()
export class HimService {
	private readonly logger = new Logger(HimService.name)

	constructor(
		private readonly auditService: AuditService,
		private readonly eventEmitter: EventEmitter2
	) {}

	private normalizeDeficiencyType(type: string): NormalizedDeficiencyType {
		if (type === "missing_diagnosis_code") {
			return "undocumented_procedure"
		}

		return type as NormalizedDeficiencyType
	}

	private buildPatientName(patient: { firstName: string; lastName: string; middleName: string | null }) {
		return [patient.lastName, patient.firstName, patient.middleName].filter(Boolean).join(", ")
	}

	private getAgeDays(dischargeDatetime: Date | null, detectedAt: Date) {
		const ageAnchor = dischargeDatetime ?? detectedAt
		return Math.max(0, Math.floor((Date.now() - ageAnchor.getTime()) / 86_400_000))
	}

	private matchesAgeBucket(ageDays: number, ageBucket?: ListDeficienciesInput["ageBucket"]) {
		if (!ageBucket) return true
		if (ageBucket === "lt_7") return ageDays < 7
		if (ageBucket === "d7_14") return ageDays >= 7 && ageDays <= 14
		if (ageBucket === "d14_30") return ageDays >= 15 && ageDays <= 30
		return ageDays > 30
	}

	private buildDeficiencyDescription(input: {
		deficiencyType: string
		patientName: string
		dischargeDatetime: Date | null
		sourceKind: DeficiencySourceKind | null
	}) {
		const dischargeText = input.dischargeDatetime
			? `Discharged ${input.dischargeDatetime.toLocaleString("en-PH")}.`
			: "Discharge timestamp not yet recorded."
		const type = this.normalizeDeficiencyType(input.deficiencyType)

		if (type === "missing_discharge_summary") {
			return `${input.patientName} has no signed discharge summary on file. ${dischargeText}`
		}

		if (type === "missing_signature") {
			return `${input.patientName} has a discharge summary draft that still needs physician signature. ${dischargeText}`
		}

		const sourceLabel = input.sourceKind === "operation_record" ? "operation record" : "procedure documentation"
		return `${input.patientName} has an undocumented procedure with incomplete ${sourceLabel}. ${dischargeText}`
	}

	private sortDeficiencies<T extends { patientName: string; dischargeDatetime: Date | null; ageDays: number; status: string; deficiencyType: string }>(
		items: T[],
		input: ListDeficienciesInput
	) {
		const sortBy = input.sortBy ?? "dischargeDatetime"
		const direction = input.sortDirection === "asc" ? 1 : -1

		return [...items].sort((left, right) => {
			const leftValue =
				sortBy === "patientName"
					? left.patientName
					: sortBy === "ageDays"
						? left.ageDays
						: sortBy === "status"
							? left.status
							: sortBy === "deficiencyType"
								? left.deficiencyType
								: left.dischargeDatetime?.getTime() ?? 0
			const rightValue =
				sortBy === "patientName"
					? right.patientName
					: sortBy === "ageDays"
						? right.ageDays
						: sortBy === "status"
							? right.status
							: sortBy === "deficiencyType"
								? right.deficiencyType
								: right.dischargeDatetime?.getTime() ?? 0

			if (leftValue === rightValue) return 0
			return leftValue > rightValue ? direction : -direction
		})
	}

	private async lookupDeprecatedIcd10(codeStrings: string[]): Promise<Map<string, { isDeprecated: boolean; replacedByCodeId: string | null; replacementCode: string | null; replacementDisplay: string | null }>> {
		if (codeStrings.length === 0) return new Map()
		const rows = await db
			.select({
				code: codes.code,
				isDeprecated: codes.isDeprecated,
				replacedByCodeId: codes.replacedByCodeId,
			})
			.from(codes)
			.where(and(eq(codes.codeSystemId, sql`(SELECT id FROM code_systems WHERE name = 'ICD-10' LIMIT 1)`), inArray(codes.code, codeStrings)))
		const replacementIds = rows.map(r => r.replacedByCodeId).filter((x): x is string => Boolean(x))
		const replacementDisplays = replacementIds.length > 0
			? await db.select({ id: codes.id, code: codes.code, display: codes.displayName }).from(codes).where(inArray(codes.id, replacementIds))
			: []
		const replacementMap = new Map(replacementDisplays.map(r => [r.id, { code: r.code, display: r.display }]))
		const result = new Map<string, { isDeprecated: boolean; replacedByCodeId: string | null; replacementCode: string | null; replacementDisplay: string | null }>()
		for (const r of rows) {
			const replacement = r.replacedByCodeId ? replacementMap.get(r.replacedByCodeId) : null
			result.set(r.code, {
				isDeprecated: r.isDeprecated,
				replacedByCodeId: r.replacedByCodeId,
				replacementCode: replacement?.code ?? null,
				replacementDisplay: replacement?.display ?? null,
			})
		}
		return result
	}

	private async getStaffProfileId(userId: string): Promise<string> {
		const [profile] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(eq(staffProfiles.userId, userId))
			.limit(1)
		if (!profile) throw new NotFoundException("Staff profile not found")
		return profile.id
	}

	private normalizeSnippet(text: string | null | undefined, maxLength = 220) {
		if (!text) return null
		const normalized = text.replace(/\s+/g, " ").trim()
		if (!normalized) return null
		return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}…`
	}

	private humanizeNoteType(noteType: string | null | undefined) {
		if (!noteType) return "Clinical Note"
		const label = noteType.replace(/_/g, " ")
		return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
	}

	private async getEncounterContext(encounterId: string) {
		const [encounter] = await db
			.select({
				id: encounters.id,
				facilityId: encounters.facilityId,
				admissionDatetime: encounters.admissionDatetime,
				dischargeDatetime: encounters.dischargeDatetime,
				disposition: encounters.disposition,
			})
			.from(encounters)
			.where(eq(encounters.id, encounterId))
			.limit(1)

		if (!encounter) throw new NotFoundException("Encounter not found")
		return encounter
	}

	private async listCodeVersionHistory(encounterId: string) {
		return db
			.select({
				id: codeVersions.id,
				version: codeVersions.version,
				amendmentReason: codeVersions.amendmentReason,
				createdByStaffId: codeVersions.createdByStaffId,
				createdAt: codeVersions.createdAt,
				replacedAt: codeVersions.replacedAt,
			})
			.from(codeVersions)
			.where(eq(codeVersions.encounterId, encounterId))
			.orderBy(desc(codeVersions.version), desc(codeVersions.createdAt))
	}

	private async getDocumentedDiagnoses(encounterId: string) {
		const [problemRows, noteRows] = await Promise.all([
			db
				.select({
					id: problems.id,
					description: problems.description,
					icdCode: problems.icd10Code,
					createdAt: problems.createdAt,
				})
				.from(problems)
				.where(eq(problems.encounterId, encounterId))
				.orderBy(desc(problems.createdAt)),
			db
				.select({
					id: clinicalNotes.id,
					noteType: clinicalNotes.noteType,
					content: clinicalNotes.content,
					structuredData: clinicalNotes.structuredData,
					signedAt: clinicalNotes.signedAt,
					createdAt: clinicalNotes.createdAt,
				})
				.from(clinicalNotes)
				.where(and(eq(clinicalNotes.encounterId, encounterId), eq(clinicalNotes.status, "signed")))
				.orderBy(desc(clinicalNotes.signedAt), desc(clinicalNotes.createdAt)),
		])

		const diagnosesFromProblems = problemRows.map(row => ({
			id: `problem:${row.id}`,
			sourceType: "problem_list" as const,
			sourceId: row.id,
			sourceLabel: "Problem List",
			noteType: null,
			diagnosis: row.description,
			icdCode: row.icdCode,
			isPrimary: false,
			noteExcerpt: this.normalizeSnippet(row.description),
			createdAt: row.createdAt,
		}))

		const diagnosesFromNotes = noteRows.flatMap(note => {
			const structured = (note.structuredData ?? {}) as Record<string, unknown>
			const diagnosisEntries = Array.isArray(structured.finalDiagnoses)
				? structured.finalDiagnoses
				: Array.isArray(structured.diagnoses)
					? structured.diagnoses
					: []

			if (diagnosisEntries.length > 0) {
				return diagnosisEntries
					.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
					.map((item, index) => ({
						id: `note:${note.id}:${index}`,
						sourceType: "clinical_note" as const,
						sourceId: note.id,
						sourceLabel: this.humanizeNoteType(note.noteType),
						noteType: note.noteType,
						diagnosis:
							typeof item.diagnosis === "string"
								? item.diagnosis
								: typeof item.name === "string"
									? item.name
									: "",
						icdCode: typeof item.icdCode === "string" ? item.icdCode : null,
						isPrimary: index === 0,
						noteExcerpt: this.normalizeSnippet(note.content),
						createdAt: note.signedAt ?? note.createdAt,
					}))
					.filter(item => item.diagnosis)
			}

			const fallback = note.content?.match(/final diagnos(?:is|es)[:\s]+([^\n]+)/i)?.[1]?.trim()
			return fallback
				? [
						{
							id: `note:${note.id}:fallback`,
							sourceType: "clinical_note" as const,
							sourceId: note.id,
							sourceLabel: this.humanizeNoteType(note.noteType),
							noteType: note.noteType,
							diagnosis: fallback,
							icdCode: null,
							isPrimary: true,
							noteExcerpt: this.normalizeSnippet(note.content),
							createdAt: note.signedAt ?? note.createdAt,
						},
					]
				: []
		})

		return [...diagnosesFromProblems, ...diagnosesFromNotes].sort((left, right) => {
			if (left.isPrimary !== right.isPrimary) return left.isPrimary ? -1 : 1
			const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0
			const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0
			return rightTime - leftTime
		})
	}

	private async getAhsrReferenceCodes(encounterId: string) {
		const encounter = await this.getEncounterContext(encounterId)
		const referenceDate = encounter.dischargeDatetime ?? encounter.admissionDatetime ?? new Date()
		const year = referenceDate.getFullYear()
		const startDate = new Date(`${year}-01-01T00:00:00.000Z`)
		const endDateExclusive = new Date(`${year + 1}-01-01T00:00:00.000Z`)

		const [morbidityRows, mortalityRows] = await Promise.all([
			db
				.select({ icdCode: problems.icd10Code, count: count() })
				.from(problems)
				.innerJoin(
					encounters,
					and(
						eq(problems.encounterId, encounters.id),
						eq(encounters.facilityId, encounter.facilityId),
						gte(encounters.admissionDatetime, startDate),
						lte(encounters.admissionDatetime, endDateExclusive)
					)
				)
				.where(isNotNull(problems.icd10Code))
				.groupBy(problems.icd10Code)
				.orderBy(desc(count()))
				.limit(10),
			db
				.select({ icdCode: problems.icd10Code, count: count() })
				.from(problems)
				.innerJoin(
					encounters,
					and(
						eq(problems.encounterId, encounters.id),
						eq(encounters.facilityId, encounter.facilityId),
						eq(encounters.disposition, "deceased"),
						isNotNull(encounters.dischargeDatetime),
						gte(encounters.dischargeDatetime, startDate),
						lte(encounters.dischargeDatetime, endDateExclusive)
					)
				)
				.where(isNotNull(problems.icd10Code))
				.groupBy(problems.icd10Code)
				.orderBy(desc(count()))
				.limit(10),
		])

		return new Set(
			[...morbidityRows, ...mortalityRows]
				.map(row => row.icdCode?.toUpperCase() ?? "")
				.filter(Boolean)
		)
	}

	private async validateCodingSet(encounterId: string, codesToValidate: CodingDraftCode[]): Promise<CodingValidationSummary> {
		const violations: CodingValidationSummary["violations"] = []
		const primaryCount = codesToValidate.filter(code => code.isPrimary).length

		if (primaryCount === 0) {
			violations.push({ path: "primary", message: "At least one Primary code required" })
		}

		if (primaryCount > 1) {
			violations.push({ path: "primary_count", message: "Exactly one Primary code is allowed" })
		}

		const deprecatedLookup = await this.lookupDeprecatedIcd10(codesToValidate.map(code => code.code))
		for (const [index, code] of codesToValidate.entries()) {
			if (!code.linkedDiagnosisRef?.trim() && !code.notes?.trim()) {
				violations.push({
					path: `source:${code.id ?? index}`,
					code: code.code,
					message: `Code ${code.code} must link to a documented diagnosis or include an explanatory note`,
				})
			}

			const deprecated = deprecatedLookup.get(code.code)
			if (deprecated?.isDeprecated) {
				violations.push({
					path: `code:${code.id ?? index}`,
					code: code.code,
					message: deprecated.replacementCode
						? `Code ${code.code} is deprecated. Use ${deprecated.replacementCode}${deprecated.replacementDisplay ? ` (${deprecated.replacementDisplay})` : ""} instead`
						: `Code ${code.code} is deprecated`,
					suggestedReplacement: deprecated.replacementDisplay,
				})
			}
		}

		const ahsrReferenceCodes = await this.getAhsrReferenceCodes(encounterId)
		if (codesToValidate.length > 0 && ahsrReferenceCodes.size > 0) {
			const hasAhsrAlignment = codesToValidate.some(code => ahsrReferenceCodes.has(code.code.toUpperCase()))
			if (!hasAhsrAlignment) {
				violations.push({
					path: "ahsr",
					message: "Assigned codes do not yet align with the facility's current Top-10 morbidity/mortality ICD-10 list",
				})
			}
		}

		return {
			violations,
			hasPrimary: primaryCount > 0,
			hasDeprecated: violations.some(violation => violation.path.startsWith("code:")),
			primaryCount,
		}
	}

	// ========================================================================
	// HIM-BE-02 — Deficiencies
	// ========================================================================

	async listDeficiencies(input: ListDeficienciesInput) {
		const { facilityId, page, limit, deficiencyType, status, ownerStaffId, ownerQuery, ageBucket } = input
		const offset = (page - 1) * limit
		const conditions = [eq(chartDeficiencies.facilityId, facilityId)]
		if (status) conditions.push(eq(chartDeficiencies.status, status))
		if (ownerStaffId) conditions.push(eq(chartDeficiencies.ownerStaffId, ownerStaffId))
		const where = and(...conditions)

		const rows = await db
			.select({
				id: chartDeficiencies.id,
				facilityId: chartDeficiencies.facilityId,
				encounterId: chartDeficiencies.encounterId,
				deficiencyType: chartDeficiencies.deficiencyType,
				sourceKind: chartDeficiencies.sourceKind,
				sourceId: chartDeficiencies.sourceId,
				ownerStaffId: chartDeficiencies.ownerStaffId,
				status: chartDeficiencies.status,
				detectedAt: chartDeficiencies.detectedAt,
				resolvedAt: chartDeficiencies.resolvedAt,
				resolvedByStaffId: chartDeficiencies.resolvedByStaffId,
				notes: chartDeficiencies.notes,
				createdAt: chartDeficiencies.createdAt,
				updatedAt: chartDeficiencies.updatedAt,
				dischargeDatetime: encounters.dischargeDatetime,
				patientMrn: patients.mrn,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMiddleName: patients.middleName,
				ownerDisplayName: users.name,
			})
			.from(chartDeficiencies)
			.innerJoin(encounters, eq(encounters.id, chartDeficiencies.encounterId))
			.innerJoin(patients, eq(patients.id, encounters.patientId))
			.leftJoin(staffProfiles, eq(staffProfiles.id, chartDeficiencies.ownerStaffId))
			.leftJoin(users, eq(users.id, staffProfiles.userId))
			.where(where)

		const deficiencies = this.sortDeficiencies(
			rows
				.map(row => {
					const normalizedType = this.normalizeDeficiencyType(row.deficiencyType)
					const ageDays = this.getAgeDays(row.dischargeDatetime, row.detectedAt)

					return {
						...row,
						deficiencyType: normalizedType,
						patientName: this.buildPatientName({
							firstName: row.patientFirstName,
							lastName: row.patientLastName,
							middleName: row.patientMiddleName,
						}),
						ownerDisplayName: row.ownerDisplayName ?? null,
						ageDays,
					}
				})
				.filter(row => this.matchesAgeBucket(row.ageDays, ageBucket))
				.filter(row => !deficiencyType || this.normalizeDeficiencyType(row.deficiencyType) === this.normalizeDeficiencyType(deficiencyType))
				.filter(row => !ownerQuery || (row.ownerDisplayName ?? "").toLowerCase().includes(ownerQuery.toLowerCase())),
			input
		)

		const paged = deficiencies.slice(offset, offset + limit)
		const total = deficiencies.length

		return {
			deficiencies: paged,
			total,
			page,
			limit,
			totalPages: Math.max(1, Math.ceil(total / limit)),
		}
	}

	async getDeficiency(input: { id: string }) {
		const [row] = await db
			.select({
				id: chartDeficiencies.id,
				facilityId: chartDeficiencies.facilityId,
				encounterId: chartDeficiencies.encounterId,
				deficiencyType: chartDeficiencies.deficiencyType,
				sourceKind: chartDeficiencies.sourceKind,
				sourceId: chartDeficiencies.sourceId,
				ownerStaffId: chartDeficiencies.ownerStaffId,
				status: chartDeficiencies.status,
				detectedAt: chartDeficiencies.detectedAt,
				resolvedAt: chartDeficiencies.resolvedAt,
				resolvedByStaffId: chartDeficiencies.resolvedByStaffId,
				notes: chartDeficiencies.notes,
				createdAt: chartDeficiencies.createdAt,
				updatedAt: chartDeficiencies.updatedAt,
				dischargeDatetime: encounters.dischargeDatetime,
				patientMrn: patients.mrn,
				patientFirstName: patients.firstName,
				patientLastName: patients.lastName,
				patientMiddleName: patients.middleName,
				ownerDisplayName: users.name,
			})
			.from(chartDeficiencies)
			.innerJoin(encounters, eq(encounters.id, chartDeficiencies.encounterId))
			.innerJoin(patients, eq(patients.id, encounters.patientId))
			.leftJoin(staffProfiles, eq(staffProfiles.id, chartDeficiencies.ownerStaffId))
			.leftJoin(users, eq(users.id, staffProfiles.userId))
			.where(eq(chartDeficiencies.id, input.id))
			.limit(1)
		if (!row) throw new NotFoundException("Deficiency not found")

		const notificationRows = await db
			.select({
				id: deficiencyNotifications.id,
				channel: deficiencyNotifications.channel,
				sentAt: deficiencyNotifications.sentAt,
				sentByDisplayName: users.name,
			})
			.from(deficiencyNotifications)
			.leftJoin(staffProfiles, eq(staffProfiles.id, deficiencyNotifications.sentByStaffId))
			.leftJoin(users, eq(users.id, staffProfiles.userId))
			.where(eq(deficiencyNotifications.deficiencyId, input.id))
			.orderBy(desc(deficiencyNotifications.sentAt))

		const normalizedType = this.normalizeDeficiencyType(row.deficiencyType)
		const patientName = this.buildPatientName({
			firstName: row.patientFirstName,
			lastName: row.patientLastName,
			middleName: row.patientMiddleName,
		})
		const ageDays = this.getAgeDays(row.dischargeDatetime, row.detectedAt)
		const artifactCheck = await this.detectDeficiencySource(row.encounterId, row.deficiencyType)

		return {
			...row,
			deficiencyType: normalizedType,
			patientName,
			patientMrn: row.patientMrn,
			ownerDisplayName: row.ownerDisplayName ?? null,
			ageDays,
			description: this.buildDeficiencyDescription({
				deficiencyType: normalizedType,
				patientName,
				dischargeDatetime: row.dischargeDatetime,
				sourceKind: row.sourceKind ?? artifactCheck.sourceKind,
			}),
			notifications: notificationRows,
			canMarkResolved: !artifactCheck.missing,
			resolutionBlockedReason: artifactCheck.missing
				? "Linked chart artifact is still incomplete. Finish the source note or procedure documentation first."
				: null,
		}
	}

	async notifyDeficiency(input: NotifyInput) {
		const [def] = await db.select().from(chartDeficiencies).where(eq(chartDeficiencies.id, input.id)).limit(1)
		if (!def) throw new NotFoundException("Deficiency not found")

		const staffProfileId = await this.getStaffProfileId(input.staffId)
		const ageDays = Math.floor((Date.now() - new Date(def.detectedAt).getTime()) / 86_400_000)
		const payload = {
			deficiencyType: def.deficiencyType,
			encounterId: def.encounterId,
			facilityId: def.facilityId,
			ageDays,
			detectedAt: def.detectedAt.toISOString(),
		}
		const [notif] = await db
			.insert(deficiencyNotifications)
			.values({
				deficiencyId: input.id,
				channel: input.channel,
				recipientStaffId: def.ownerStaffId,
				sentByStaffId: staffProfileId,
				payload,
			})
			.returning()
		if (!notif) throw new NotFoundException("Failed to record notification")

		await db
			.update(chartDeficiencies)
			.set({ status: def.status === "open" ? "notified" : def.status, updatedAt: new Date() })
			.where(eq(chartDeficiencies.id, input.id))

		await this.auditService.log({
			facilityId: def.facilityId,
			userId: input.staffId,
			staffProfileId,
			action: "update",
			entityType: "chart_deficiency",
			entityId: input.id,
			beforeState: { status: def.status },
			afterState: { status: "notified", channel: input.channel },
			ipAddress: null,
			userAgent: null,
			metadata: { operation: "notifyDeficiency" },
		})

		this.eventEmitter.emit("deficiency.notified", {
			deficiencyId: input.id,
			notificationId: notif.id,
			channel: input.channel,
			recipientStaffId: def.ownerStaffId,
			payload,
		})

		return { success: true, notificationId: notif.id }
	}

	async markDeficiencyResolved(input: MarkResolvedInput) {
		const [def] = await db.select().from(chartDeficiencies).where(eq(chartDeficiencies.id, input.id)).limit(1)
		if (!def) throw new NotFoundException("Deficiency not found")

		// Verify the underlying artifact actually exists per deficiency type.
		const stillMissing = await this.deficiencyArtifactStillMissing(def.encounterId, def.deficiencyType)
		if (stillMissing) {
			throw new BadRequestException(
				`Cannot mark resolved — required artifact for ${def.deficiencyType} still missing on encounter ${def.encounterId}`
			)
		}

		const staffProfileId = await this.getStaffProfileId(input.staffId)
		const [updated] = await db
			.update(chartDeficiencies)
			.set({
				status: "resolved",
				resolvedAt: new Date(),
				resolvedByStaffId: staffProfileId,
				notes: input.notes ?? def.notes,
				updatedAt: new Date(),
			})
			.where(eq(chartDeficiencies.id, input.id))
			.returning()
		if (!updated) throw new NotFoundException("Deficiency not found after update")

		await this.auditService.log({
			facilityId: def.facilityId,
			userId: input.staffId,
			staffProfileId,
			action: "update",
			entityType: "chart_deficiency",
			entityId: input.id,
			beforeState: { status: def.status },
			afterState: { status: "resolved" },
			ipAddress: null,
			userAgent: null,
			metadata: { operation: "markDeficiencyResolved", notes: input.notes ?? null },
		})
		return this.getDeficiency({ id: updated.id })
	}

	private async deficiencyArtifactStillMissing(encounterId: string, type: string): Promise<boolean> {
		const detection = await this.detectDeficiencySource(encounterId, type)
		return detection.missing
	}

	private async detectDeficiencySource(encounterId: string, type: string): Promise<DeficiencyDetectionResult> {
		const normalizedType = this.normalizeDeficiencyType(type)

		if (normalizedType === "missing_discharge_summary") {
			const [note] = await db
				.select({ id: clinicalNotes.id })
				.from(clinicalNotes)
				.where(and(eq(clinicalNotes.encounterId, encounterId), eq(clinicalNotes.noteType, "discharge_summary")))
				.limit(1)

			return {
				missing: !note,
				sourceKind: "encounter",
				sourceId: note?.id ?? encounterId,
			}
		}

		if (normalizedType === "missing_signature") {
			const notes = await db
				.select({ id: clinicalNotes.id, status: clinicalNotes.status, signedAt: clinicalNotes.signedAt })
				.from(clinicalNotes)
				.where(and(eq(clinicalNotes.encounterId, encounterId), eq(clinicalNotes.noteType, "discharge_summary")))

			const unsigned = notes.find(note => note.status !== "signed" || !note.signedAt)
			return {
				missing: Boolean(unsigned),
				sourceKind: unsigned ? "clinical_note" : null,
				sourceId: unsigned?.id ?? null,
			}
		}

		const records = await db
			.select({
				id: operationRecords.id,
				procedurePerformed: operationRecords.procedurePerformed,
				status: operationRecords.status,
			})
			.from(operationRecords)
			.where(eq(operationRecords.encounterId, encounterId))

		const undocumentedRecord = records.find(
			record => !record.procedurePerformed || record.status !== "signed"
		)

		return {
			missing: Boolean(undocumentedRecord),
			sourceKind: undocumentedRecord ? "operation_record" : null,
			sourceId: undocumentedRecord?.id ?? null,
		}
	}

	async scanDeficiencies(input: ScanInput) {
		// Lightweight scan: walk encounters and create deficiency rows where missing artifacts detected.
		// Idempotent via uniqueIndex (encounterId, deficiencyType).
		const target = input.encounterId
			? await db
				.select({
					id: encounters.id,
					facilityId: encounters.facilityId,
					attendingStaffId: encounters.attendingStaffId,
				})
				.from(encounters)
				.where(eq(encounters.id, input.encounterId))
			: await db
					.select({
						id: encounters.id,
						facilityId: encounters.facilityId,
						attendingStaffId: encounters.attendingStaffId,
					})
					.from(encounters)
					.where(and(eq(encounters.facilityId, input.facilityId), inArray(encounters.status, ["discharged"])))
					.limit(500)

		let created = 0
		for (const enc of target) {
			for (const type of ["missing_discharge_summary", "missing_signature", "undocumented_procedure"] as const) {
				const detection = await this.detectDeficiencySource(enc.id, type)
				if (!detection.missing) continue
				const result = await db
					.insert(chartDeficiencies)
					.values({
						facilityId: enc.facilityId,
						encounterId: enc.id,
						deficiencyType: type,
						sourceKind: detection.sourceKind,
						sourceId: detection.sourceId,
						ownerStaffId: enc.attendingStaffId,
					})
					.onConflictDoNothing()
				if ((result as unknown as { rowCount?: number })?.rowCount) created += 1
			}
		}

		return { scanned: target.length, created }
	}

	@Cron(CronExpression.EVERY_DAY_AT_2AM, { name: "him-deficiency-nightly-scan" })
	async nightlyDeficiencyScan(): Promise<void> {
		const allFacilities = await db.select({ id: facilities.id }).from(facilities)
		let totalCreated = 0
		for (const fac of allFacilities) {
			const summary = await db
				.select({
					id: encounters.id,
					facilityId: encounters.facilityId,
					attendingStaffId: encounters.attendingStaffId,
				})
				.from(encounters)
				.where(and(eq(encounters.facilityId, fac.id), inArray(encounters.status, ["discharged"])))
				.limit(500)
			for (const enc of summary) {
				for (const type of ["missing_discharge_summary", "missing_signature", "undocumented_procedure"] as const) {
					const detection = await this.detectDeficiencySource(enc.id, type)
					if (!detection.missing) continue
					const result = await db
						.insert(chartDeficiencies)
						.values({
							facilityId: enc.facilityId,
							encounterId: enc.id,
							deficiencyType: type,
							sourceKind: detection.sourceKind,
							sourceId: detection.sourceId,
							ownerStaffId: enc.attendingStaffId,
						})
						.onConflictDoNothing()
					if ((result as unknown as { rowCount?: number })?.rowCount) totalCreated += 1
				}
			}
		}
		this.logger.log(`Nightly deficiency scan: facilities=${allFacilities.length} created=${totalCreated}`)
	}

	// ========================================================================
	// HIM-BE-03 — ICD-10 Coding
	// ========================================================================

	async listCodes(input: { encounterId: string }) {
		const [codes, documentedDiagnoses, versionHistory] = await Promise.all([
			db
				.select()
				.from(encounterCodes)
				.where(eq(encounterCodes.encounterId, input.encounterId))
				.orderBy(desc(encounterCodes.isPrimary), encounterCodes.code),
			this.getDocumentedDiagnoses(input.encounterId),
			this.listCodeVersionHistory(input.encounterId),
		])
		const signed = codes.find(c => c.signedAt) ?? null
		const currentVersion = codes.length > 0 ? Math.max(...codes.map(c => c.version)) : (versionHistory[0]?.version ?? 1)
		return {
			codes,
			signedAt: signed?.signedAt ?? null,
			currentVersion,
			documentedDiagnoses,
			versionHistory,
		}
	}

	async upsertCodes(input: UpsertCodesInput) {
		const existing = await db.select().from(encounterCodes).where(eq(encounterCodes.encounterId, input.encounterId))
		if (existing.some(c => c.signedAt)) {
			throw new BadRequestException("Coding is signed; use amend to modify")
		}

		const validation = await this.validateCodingSet(input.encounterId, input.codes)
		const blockingViolations = validation.violations.filter(violation => violation.path === "primary_count" || violation.path.startsWith("source:"))
		if (blockingViolations.length > 0) {
			throw new BadRequestException(blockingViolations.map(violation => violation.message).join("; "))
		}

		const staffProfileId = await this.getStaffProfileId(input.staffId)
		const encounter = await this.getEncounterContext(input.encounterId)
		const currentVersion = existing.length > 0 ? Math.max(...existing.map(code => code.version)) : 1

		// Delete-and-replace pattern; record version snapshot.
		await db.delete(encounterCodes).where(eq(encounterCodes.encounterId, input.encounterId))
		if (input.codes.length > 0) {
			await db.insert(encounterCodes).values(
				input.codes.map(c => ({
					encounterId: input.encounterId,
					codeSystem: "ICD-10" as const,
					code: c.code,
					display: c.display ?? null,
					isPrimary: c.isPrimary,
					linkedDiagnosisRef: c.linkedDiagnosisRef ?? null,
					notes: c.notes ?? null,
					version: currentVersion,
				}))
			)
		}

		await this.auditService.log({
			facilityId: encounter.facilityId,
			userId: input.staffId,
			staffProfileId,
			action: "update",
			entityType: "encounter_codes",
			entityId: input.encounterId,
			beforeState: { count: existing.length },
			afterState: { count: input.codes.length },
			ipAddress: null,
			userAgent: null,
			metadata: { operation: "upsertCodes" },
		})

		return this.listCodes({ encounterId: input.encounterId })
	}

	async signCodes(input: SignCodesInput) {
		const codes = await db.select().from(encounterCodes).where(eq(encounterCodes.encounterId, input.encounterId))
		if (codes.length === 0) throw new BadRequestException("Cannot sign empty coding")
		if (codes.some(code => code.signedAt)) {
			throw new BadRequestException("Coding is already signed; use amend to create a new version")
		}

		const validation = await this.validateCodingSet(input.encounterId, codes)
		const blockingViolations = validation.violations.filter(violation => violation.path !== "ahsr")
		if (blockingViolations.length > 0) {
			throw new BadRequestException(blockingViolations.map(violation => violation.message).join("; "))
		}

		const staffProfileId = await this.getStaffProfileId(input.staffId)
		const encounter = await this.getEncounterContext(input.encounterId)
		const now = new Date()
		await db
			.update(encounterCodes)
			.set({ signedAt: now, signedByStaffId: staffProfileId })
			.where(eq(encounterCodes.encounterId, input.encounterId))

		await db.insert(codeVersions).values({
			encounterId: input.encounterId,
			version: codes[0]?.version ?? 1,
			snapshot: codes,
			createdByStaffId: staffProfileId,
			replacedAt: null,
		})

		await this.auditService.log({
			facilityId: encounter.facilityId,
			userId: input.staffId,
			staffProfileId,
			action: "sign",
			entityType: "encounter_codes",
			entityId: input.encounterId,
			beforeState: null,
			afterState: { signedAt: now.toISOString(), codeCount: codes.length },
			ipAddress: null,
			userAgent: null,
			metadata: { operation: "signCodes", event: "coding.signed" },
		})

		this.eventEmitter.emit("coding.signed", {
			encounterId: input.encounterId,
			facilityId: encounter.facilityId,
			version: codes[0]?.version ?? 1,
			signedAt: now.toISOString(),
		})

		return this.listCodes({ encounterId: input.encounterId })
	}

	async amendCodes(input: AmendCodesInput) {
		const existing = await db.select().from(encounterCodes).where(eq(encounterCodes.encounterId, input.encounterId))
		if (existing.length === 0 || !existing[0]?.signedAt) {
			throw new BadRequestException("Amend requires signed coding")
		}

		const validation = await this.validateCodingSet(input.encounterId, input.codes)
		const blockingViolations = validation.violations.filter(violation => violation.path === "primary_count" || violation.path.startsWith("source:"))
		if (blockingViolations.length > 0) {
			throw new BadRequestException(blockingViolations.map(violation => violation.message).join("; "))
		}

		const staffProfileId = await this.getStaffProfileId(input.staffId)
		const encounter = await this.getEncounterContext(input.encounterId)
		const now = new Date()
		const currentVersion = existing[0]?.version ?? 1
		const nextVersion = (existing[0]?.version ?? 1) + 1

		const [existingHistory] = await db
			.select({ id: codeVersions.id })
			.from(codeVersions)
			.where(and(eq(codeVersions.encounterId, input.encounterId), eq(codeVersions.version, currentVersion)))
			.limit(1)

		if (existingHistory) {
			await db
				.update(codeVersions)
				.set({ amendmentReason: input.reason, replacedAt: now })
				.where(eq(codeVersions.id, existingHistory.id))
		} else {
			await db.insert(codeVersions).values({
				encounterId: input.encounterId,
				version: currentVersion,
				snapshot: existing,
				amendmentReason: input.reason,
				createdByStaffId: staffProfileId,
				replacedAt: now,
			})
		}

		await db.delete(encounterCodes).where(eq(encounterCodes.encounterId, input.encounterId))
		if (input.codes.length > 0) {
			await db.insert(encounterCodes).values(
				input.codes.map(c => ({
					encounterId: input.encounterId,
					codeSystem: "ICD-10" as const,
					code: c.code,
					display: c.display ?? null,
					isPrimary: c.isPrimary,
					linkedDiagnosisRef: c.linkedDiagnosisRef ?? null,
					notes: c.notes ?? null,
					version: nextVersion,
				}))
			)
		}

		await this.auditService.log({
			facilityId: encounter.facilityId,
			userId: input.staffId,
			staffProfileId,
			action: "update",
			entityType: "encounter_codes",
			entityId: input.encounterId,
			beforeState: { version: existing[0]?.version ?? 1 },
			afterState: { version: nextVersion, reason: input.reason },
			ipAddress: null,
			userAgent: null,
			metadata: { operation: "amendCodes" },
		})

		return this.listCodes({ encounterId: input.encounterId })
	}

	async validateCodes(input: { encounterId: string }) {
		const codes = await db.select().from(encounterCodes).where(eq(encounterCodes.encounterId, input.encounterId))
		const validation = await this.validateCodingSet(input.encounterId, codes)
		return {
			violations: validation.violations,
			hasPrimary: validation.hasPrimary,
			hasDeprecated: validation.hasDeprecated,
		}
	}

	// ========================================================================
	// HIM-BE-04 — Records Issuance Audit Gates
	// ========================================================================

	async captureDpaConsent(input: CaptureDpaConsentInput) {
		const [req] = await db.select().from(medicalRecordsRequests).where(eq(medicalRecordsRequests.id, input.requestId)).limit(1)
		if (!req) throw new NotFoundException("Records request not found")
		const staffProfileId = await this.getStaffProfileId(input.staffId)

		await db
			.update(medicalRecordsRequests)
			.set({ dpaConsentObtained: true, updatedAt: new Date() })
			.where(eq(medicalRecordsRequests.id, input.requestId))

		await db.insert(recordsReleaseAudit).values({
			requestId: input.requestId,
			patientId: req.patientId,
			facilityId: req.facilityId,
			actorStaffId: staffProfileId,
			action: "dpa_consent",
			recipient: null,
			documentTypes: null,
			contentHashes: null,
			ipAddress: input.ipAddress ?? null,
			userAgent: input.userAgent ?? null,
		})

		await this.auditService.log({
			facilityId: req.facilityId,
			userId: input.staffId,
			staffProfileId,
			action: "update",
			entityType: "medical_records_request",
			entityId: input.requestId,
			beforeState: { dpaConsent: false },
			afterState: { dpaConsent: true },
			ipAddress: input.ipAddress ?? null,
			userAgent: input.userAgent ?? null,
			metadata: { operation: "captureDpaConsent" },
		})

		return { success: true }
	}

	async attachIdentityProof(input: AttachIdentityProofInput) {
		const [req] = await db.select().from(medicalRecordsRequests).where(eq(medicalRecordsRequests.id, input.requestId)).limit(1)
		if (!req) throw new NotFoundException("Records request not found")
		const staffProfileId = await this.getStaffProfileId(input.staffId)

		await db.insert(recordsReleaseAudit).values({
			requestId: input.requestId,
			patientId: req.patientId,
			facilityId: req.facilityId,
			actorStaffId: staffProfileId,
			action: "identity_proof",
			recipient: null,
			documentTypes: [input.documentType],
			contentHashes: [input.contentHash],
			ipAddress: null,
			userAgent: null,
		})

		await this.auditService.log({
			facilityId: req.facilityId,
			userId: input.staffId,
			staffProfileId,
			action: "update",
			entityType: "medical_records_request",
			entityId: input.requestId,
			beforeState: null,
			afterState: { identityProofUri: input.uri, contentHash: input.contentHash, documentType: input.documentType },
			ipAddress: null,
			userAgent: null,
			metadata: { operation: "attachIdentityProof" },
		})

		return { success: true }
	}

	async attachPhysicianSignature(input: AttachPhysicianSignatureInput) {
		const [req] = await db.select().from(medicalRecordsRequests).where(eq(medicalRecordsRequests.id, input.requestId)).limit(1)
		if (!req) throw new NotFoundException("Records request not found")
		const staffProfileId = await this.getStaffProfileId(input.staffId)

		await db.insert(recordsReleaseAudit).values({
			requestId: input.requestId,
			patientId: req.patientId,
			facilityId: req.facilityId,
			actorStaffId: staffProfileId,
			action: "physician_signature",
			recipient: null,
			documentTypes: ["physician_signature"],
			contentHashes: [input.contentHash],
			ipAddress: null,
			userAgent: null,
		})

		return { success: true }
	}

	async markRecordsPaymentCleared(input: MarkPaymentClearedInput) {
		const [req] = await db.select().from(medicalRecordsRequests).where(eq(medicalRecordsRequests.id, input.requestId)).limit(1)
		if (!req) throw new NotFoundException("Records request not found")
		const staffProfileId = await this.getStaffProfileId(input.staffId)

		await db
			.update(medicalRecordsRequests)
			.set({ paidAt: new Date(), updatedAt: new Date() })
			.where(eq(medicalRecordsRequests.id, input.requestId))

		await db.insert(recordsReleaseAudit).values({
			requestId: input.requestId,
			patientId: req.patientId,
			facilityId: req.facilityId,
			actorStaffId: staffProfileId,
			action: "payment_cleared",
			recipient: null,
			documentTypes: null,
			contentHashes: null,
			ipAddress: null,
			userAgent: null,
		})

		return { success: true }
	}

	async releaseRecords(input: ReleaseRecordsInput) {
		const [req] = await db.select().from(medicalRecordsRequests).where(eq(medicalRecordsRequests.id, input.requestId)).limit(1)
		if (!req) throw new NotFoundException("Records request not found")
		if (!req.dpaConsentObtained) {
			throw new BadRequestException("DPA consent required before release")
		}
		if (!req.paidAt) {
			throw new BadRequestException("Payment must clear before release")
		}

		const staffProfileId = await this.getStaffProfileId(input.staffId)
		await db
			.update(medicalRecordsRequests)
			.set({
				status: "completed",
				releasedAt: new Date(),
				releasedByStaffId: staffProfileId,
				updatedAt: new Date(),
			})
			.where(eq(medicalRecordsRequests.id, input.requestId))

		const [audit] = await db
			.insert(recordsReleaseAudit)
			.values({
				requestId: input.requestId,
				patientId: req.patientId,
				facilityId: req.facilityId,
				actorStaffId: staffProfileId,
				action: "release",
				recipient: input.recipient,
				documentTypes: input.documentTypes,
				contentHashes: input.contentHashes,
				ipAddress: input.ipAddress ?? null,
				userAgent: input.userAgent ?? null,
			})
			.returning()
		if (!audit) throw new NotFoundException("Failed to write release audit")

		await this.auditService.log({
			facilityId: req.facilityId,
			userId: input.staffId,
			staffProfileId,
			action: "update",
			entityType: "medical_records_request",
			entityId: input.requestId,
			beforeState: { status: req.status, releasedAt: req.releasedAt?.toISOString() ?? null },
			afterState: { status: "completed", releasedAt: new Date().toISOString(), recipient: input.recipient },
			ipAddress: input.ipAddress ?? null,
			userAgent: input.userAgent ?? null,
			metadata: { operation: "releaseRecords", documentTypes: input.documentTypes },
		})

		return { success: true, auditId: audit.id }
	}

	async listRecordsAudit(input: ListRecordsAuditInput) {
		const { facilityId, page, limit, requestId, dateFrom, dateTo, recipient, documentType } = input
		const offset = (page - 1) * limit
		const conditions = [eq(recordsReleaseAudit.facilityId, facilityId)]
		if (requestId) conditions.push(eq(recordsReleaseAudit.requestId, requestId))
		if (dateFrom) conditions.push(gte(recordsReleaseAudit.occurredAt, new Date(dateFrom)))
		if (dateTo) conditions.push(lte(recordsReleaseAudit.occurredAt, new Date(`${dateTo}T23:59:59`)))
		if (recipient) conditions.push(ilike(recordsReleaseAudit.recipient, `%${recipient}%`))
		if (documentType) conditions.push(sql`${recordsReleaseAudit.documentTypes}::jsonb @> ${JSON.stringify([documentType])}::jsonb`)
		const where = and(...conditions)
		const [rows, [countRow]] = await Promise.all([
			db.select().from(recordsReleaseAudit).where(where).orderBy(desc(recordsReleaseAudit.occurredAt)).limit(limit).offset(offset),
			db.select({ total: count() }).from(recordsReleaseAudit).where(where),
		])
		const total = countRow?.total ?? 0
		const entries = rows.map(r => ({
			...r,
			documentTypes: (r.documentTypes as string[] | null) ?? null,
			contentHashes: (r.contentHashes as string[] | null) ?? null,
		}))
		return { entries, total, page, limit, totalPages: Math.ceil(total / limit) }
	}

	// ========================================================================
	// HIM-BE-05 — HAI Reconciliation
	// ========================================================================

	async listHai(input: ListHaiInput) {
		const { facilityId, page, limit, haiType, wardId, dateFrom, dateTo } = input
		const offset = (page - 1) * limit
		const conditions = [eq(haiTags.facilityId, facilityId)]
		if (haiType) conditions.push(eq(haiTags.haiType, haiType))
		if (dateFrom) conditions.push(gte(haiTags.onsetDate, dateFrom))
		if (dateTo) conditions.push(lte(haiTags.onsetDate, dateTo))
		if (wardId) conditions.push(eq(beds.wardId, wardId))
		const where = and(...conditions)

		const [rows, [countRow]] = await Promise.all([
			db
				.select({
					id: haiTags.id,
					haiType: haiTags.haiType,
					status: haiTags.status,
					encounterId: haiTags.encounterId,
					detectedAt: haiTags.onsetDate,
					patientFirstName: patients.firstName,
					patientLastName: patients.lastName,
					wardName: wards.name,
					taggedByNurse: users.name,
				})
				.from(haiTags)
				.leftJoin(encounters, eq(encounters.id, haiTags.encounterId))
				.leftJoin(patients, eq(patients.id, encounters.patientId))
				.leftJoin(beds, eq(beds.id, encounters.bedId))
				.leftJoin(wards, eq(wards.id, beds.wardId))
				.leftJoin(staffProfiles, eq(staffProfiles.id, haiTags.documentedByStaffId))
				.leftJoin(users, eq(users.id, staffProfiles.userId))
				.where(where)
				.orderBy(desc(haiTags.onsetDate))
				.limit(limit)
				.offset(offset),
			db
				.select({ total: count() })
				.from(haiTags)
				.leftJoin(encounters, eq(encounters.id, haiTags.encounterId))
				.leftJoin(beds, eq(beds.id, encounters.bedId))
				.where(where),
		])
		const tagIds = rows.map(row => row.id)
		const encounterIds = Array.from(new Set(rows.map(row => row.encounterId)))
		const [reconciliationRows, linkedCodes] = await Promise.all([
			tagIds.length > 0
				? db
					.select({ haiTagId: haiReconciliations.haiTagId, decision: haiReconciliations.decision })
					.from(haiReconciliations)
					.where(inArray(haiReconciliations.haiTagId, tagIds))
				: Promise.resolve([]),
			encounterIds.length > 0
				? db
					.select({ encounterId: encounterCodes.encounterId, code: encounterCodes.code, isPrimary: encounterCodes.isPrimary })
					.from(encounterCodes)
					.where(and(inArray(encounterCodes.encounterId, encounterIds), eq(encounterCodes.codeSystem, "ICD-10")))
					.orderBy(desc(encounterCodes.isPrimary), encounterCodes.code)
				: Promise.resolve([]),
		])
		const statusByTagId = new Map(reconciliationRows.map(row => [row.haiTagId, row.decision]))
		const codeByEncounterId = new Map<string, string>()
		for (const codeRow of linkedCodes) {
			if (!codeByEncounterId.has(codeRow.encounterId)) {
				codeByEncounterId.set(codeRow.encounterId, codeRow.code)
			}
		}
		const total = countRow?.total ?? 0
		return {
			tags: rows.map(row => ({
				id: row.id,
				haiType: row.haiType,
				status:
					statusByTagId.get(row.id) === "dismiss"
						? "dismissed"
						: statusByTagId.get(row.id) === "reclassify"
							? "reclassified"
							: statusByTagId.get(row.id) === "confirm"
								? "confirmed"
								: "pending",
				encounterId: row.encounterId,
				patientName: `${row.patientLastName}, ${row.patientFirstName}`,
				wardName: row.wardName ?? null,
				taggedByNurse: row.taggedByNurse ?? null,
				linkedIcd10Code: codeByEncounterId.get(row.encounterId) ?? null,
				detectedAt: row.detectedAt,
			})),
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	async decideHai(input: HaiDecisionInput) {
		const [tag] = await db.select().from(haiTags).where(eq(haiTags.id, input.haiTagId)).limit(1)
		if (!tag) throw new NotFoundException("HAI tag not found")
		const staffProfileId = await this.getStaffProfileId(input.staffId)

		const previousType = tag.haiType
		const newType = input.decision === "reclassify" ? input.newType ?? null : null

		// Idempotent: upsert on hai_tag_id (overwrites prior decision but preserves audit trail).
		const existing = await db.select().from(haiReconciliations).where(eq(haiReconciliations.haiTagId, input.haiTagId))
		let row
		if (existing.length > 0) {
			[row] = await db
				.update(haiReconciliations)
				.set({
					decision: input.decision,
					previousType,
					newType,
					reason: input.reason ?? null,
					decidedByStaffId: staffProfileId,
					decidedAt: new Date(),
				})
				.where(eq(haiReconciliations.haiTagId, input.haiTagId))
				.returning()
		} else {
			[row] = await db
				.insert(haiReconciliations)
				.values({
					facilityId: tag.facilityId,
					haiTagId: input.haiTagId,
					decision: input.decision,
					previousType,
					newType,
					reason: input.reason ?? null,
					decidedByStaffId: staffProfileId,
				})
				.returning()
		}
		if (!row) throw new NotFoundException("Failed to record HAI decision")

		// Update tag status based on decision
		if (input.decision === "confirm") {
			await db.update(haiTags).set({ status: "confirmed" }).where(eq(haiTags.id, input.haiTagId))
		} else if (input.decision === "reclassify" && input.newType) {
			await db.update(haiTags).set({ haiType: input.newType }).where(eq(haiTags.id, input.haiTagId))
		} else if (input.decision === "dismiss") {
			await db.update(haiTags).set({ status: "resolved" }).where(eq(haiTags.id, input.haiTagId))
		}

		await this.auditService.log({
			facilityId: tag.facilityId,
			userId: input.staffId,
			staffProfileId,
			action: "update",
			entityType: "hai_tag",
			entityId: input.haiTagId,
			beforeState: { haiType: previousType, status: tag.status },
			afterState: { decision: input.decision, newType, reason: input.reason ?? null },
			ipAddress: null,
			userAgent: null,
			metadata: { operation: "decideHai" },
		})

		return row
	}

	async haiReport(input: HaiReportInput) {
		const start = new Date(input.periodStart)
		const end = new Date(`${input.periodEnd}T23:59:59`)
		const conditions = [
			eq(haiTags.facilityId, input.facilityId),
			gte(haiTags.onsetDate, input.periodStart),
			lte(haiTags.onsetDate, input.periodEnd),
			sql`${haiTags.status} <> 'resolved'`,
		]
		if (input.wardId) {
			conditions.push(eq(beds.wardId, input.wardId))
		}
		const tags = await db
			.select({
				haiType: haiTags.haiType,
				encounterId: haiTags.encounterId,
				wardId: beds.wardId,
				wardName: wards.name,
			})
			.from(haiTags)
			.leftJoin(encounters, eq(encounters.id, haiTags.encounterId))
			.leftJoin(beds, eq(beds.id, encounters.bedId))
			.leftJoin(wards, eq(wards.id, beds.wardId))
			.where(and(...conditions))

		const totalTags = tags.length
		const byType: Record<string, number> = {}
		for (const t of tags) byType[t.haiType] = (byType[t.haiType] ?? 0) + 1
		const byWard: Record<string, number> = {}
		for (const t of tags) {
			const wardLabel = t.wardName ?? "Unassigned ward"
			byWard[wardLabel] = (byWard[wardLabel] ?? 0) + 1
		}

		// Patient days = count of distinct (encounterId, day) pairs in window. Approximation here
		// uses encounter window; production wires bed-census table.
		const encounterIds = Array.from(new Set(tags.map(t => t.encounterId)))
		const periodDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000))
		const patientDays = encounterIds.length * periodDays
		const incidence = patientDays > 0 ? (totalTags / patientDays) * 1000 : 0

		return {
			periodStart: input.periodStart,
			periodEnd: input.periodEnd,
			totalTags,
			patientDays,
			incidencePer1000PatientDays: Number(incidence.toFixed(2)),
			byType,
			byWard,
		}
	}

	async haiExport(input: HaiReportInput & { format: "pdf" | "csv" }) {
		const report = await this.haiReport(input)
		const csvLines = [
			"Ward,HAI Type,Cases,Patient Days,Incidence Per 1000 Patient Days,Period Start,Period End",
			...Object.entries(report.byWard).flatMap(([ward]) =>
				Object.entries(report.byType).map(([type, typeCases]) => {
					const safeWard = ward.replaceAll('"', '""')
					return `"${safeWard}",${type},${typeCases},${report.patientDays},${report.incidencePer1000PatientDays},${report.periodStart},${report.periodEnd}`
				})
			),
		]

		if (input.format === "csv") {
			const uri = `data:text/csv;charset=utf-8,${encodeURIComponent(csvLines.join("\n"))}`
			return { uri, format: input.format }
		}

		const pdf = await PDFDocument.create()
		const page = pdf.addPage([612, 792])
		const font = await pdf.embedFont(StandardFonts.Helvetica)
		let y = 740
		const lines = [
			"AHSR HAI Surveillance Report",
			`Period: ${report.periodStart} to ${report.periodEnd}`,
			`Total Tags: ${report.totalTags}`,
			`Patient Days: ${report.patientDays}`,
			`Incidence per 1000 patient days: ${report.incidencePer1000PatientDays}`,
			"",
			"By Ward:",
			...Object.entries(report.byWard).map(([ward, count]) => `${ward}: ${count}`),
			"",
			"By Type:",
			...Object.entries(report.byType).map(([type, count]) => `${type}: ${count}`),
		]
		for (const line of lines) {
			page.drawText(line, { x: 48, y, size: 11, font })
			y -= 18
		}
		const pdfBytes = await pdf.save()
		const uri = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString("base64")}`
		return { uri, format: input.format }
	}
}

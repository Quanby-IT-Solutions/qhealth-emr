import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common"
import { and, count, desc, eq, inArray } from "drizzle-orm"

import {
	allergies,
	clinicalNotes,
	consentRecords,
	encounters,
	labOrders,
	noteAddenda,
	noteTemplates,
	staffProfiles,
	users,
	vitalSigns,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"
import { AuditService } from "@/modules/v1/audit/audit.service"
import {
	type ChartAccessActor,
	type ChartAccessRecord,
	ChartAccessService,
} from "@/modules/v1/audit/chart-access.service"

type ListTemplatesInput = V1Inputs["clinicalDocs"]["listTemplates"]
type CreateTemplateInput = V1Inputs["clinicalDocs"]["createTemplate"]
type UpdateTemplateInput = V1Inputs["clinicalDocs"]["updateTemplate"]
type ListNotesInput = V1Inputs["clinicalDocs"]["listNotes"]
type CreateNoteInput = V1Inputs["clinicalDocs"]["createNote"]
type UpdateNoteInput = V1Inputs["clinicalDocs"]["updateNote"]
type SignNoteInput = V1Inputs["clinicalDocs"]["signNote"]
type CreateAddendumInput = V1Inputs["clinicalDocs"]["createAddendum"]
type SignAddendumInput = V1Inputs["clinicalDocs"]["signAddendum"]
type ListConsentsInput = V1Inputs["clinicalDocs"]["listConsents"]
type CreateConsentInput = V1Inputs["clinicalDocs"]["createConsent"]
type RevokeConsentInput = V1Inputs["clinicalDocs"]["revokeConsent"]
type NoteContextInput = V1Inputs["clinicalDocs"]["getNoteContext"]
type SignedNotesInput = V1Inputs["clinicalDocs"]["getSignedNotes"]
type ExtractCf4DataInput = V1Inputs["clinicalDocs"]["extractCf4Data"]
type SubmitFpeInput = V1Inputs["clinicalDocs"]["submitFpe"]

type NoteType = CreateNoteInput["noteType"]
type TemplateCategory = CreateTemplateInput["category"]

interface TemplateSection {
	key: string
	label: string
	type: "rich_text" | "structured"
	defaultContent?: string
}

interface TemplateForValidation {
	id: string
	facilityId: string
	category: TemplateCategory
	sections: TemplateSection[]
}

@Injectable()
export class ClinicalDocsService {
	private readonly logger = new Logger(ClinicalDocsService.name)

	constructor(
		private readonly auditService: AuditService,
		private readonly chartAccessService: ChartAccessService
	) {}

	private async getStaffProfileId(userId: string, facilityId?: string): Promise<string> {
		const conditions = [eq(staffProfiles.userId, userId), eq(staffProfiles.isActive, true)]
		if (facilityId) {
			conditions.push(eq(staffProfiles.facilityId, facilityId))
		}

		const [row] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(and(...conditions))
			.limit(1)

		if (!row) {
			throw new NotFoundException("Staff profile not found")
		}

		return row.id
	}

	private async ensureChartReadAccess(
		actor: ChartAccessActor | undefined,
		input: {
			encounterId?: string | null
			patientId?: string | null
			record: ChartAccessRecord
		}
	) {
		if (input.encounterId) {
			await this.chartAccessService.ensureEncounterChartReadAccess(actor, input.encounterId, input.record)
			return
		}

		if (input.patientId) {
			await this.chartAccessService.ensurePatientChartReadAccess(actor, input.patientId, input.record)
		}
	}

	private sectionKeyFromLabel(label: string) {
		const key = label
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "_")
			.replace(/^_+|_+$/g, "")
		return key || "section"
	}

	private normalizeTemplateSections(value: unknown): TemplateSection[] {
		if (!Array.isArray(value)) return []

		return value.flatMap((item, index): TemplateSection[] => {
			if (typeof item === "string") {
				const label = item.trim()
				if (!label) return []
				return [
					{
						key: this.sectionKeyFromLabel(label),
						label,
						type: "rich_text",
					},
				]
			}

			if (!item || typeof item !== "object") return []
			const section = item as Record<string, unknown>
			const label =
				typeof section.label === "string" && section.label.trim()
					? section.label.trim()
					: `Section ${index + 1}`
			const key =
				typeof section.key === "string" && section.key.trim()
					? section.key.trim()
					: this.sectionKeyFromLabel(label)
			const type = section.type === "structured" ? "structured" : "rich_text"
			const defaultContent =
				typeof section.defaultContent === "string" ? section.defaultContent : undefined

			return [{ key, label, type, defaultContent }]
		})
	}

	private async getTemplateForValidation(id: string): Promise<TemplateForValidation> {
		const [row] = await db
			.select({
				id: noteTemplates.id,
				facilityId: noteTemplates.facilityId,
				category: noteTemplates.category,
				sections: noteTemplates.sections,
			})
			.from(noteTemplates)
			.where(eq(noteTemplates.id, id))
			.limit(1)

		if (!row) throw new NotFoundException(`Template ${id} not found`)

		return {
			...row,
			sections: this.normalizeTemplateSections(row.sections),
		}
	}

	private isSoapSection(section: TemplateSection, target: "assessment" | "plan") {
		const key = section.key.toLowerCase()
		const label = section.label.toLowerCase()
		return key === target || key.startsWith(`${target}_`) || label === target
	}

	private readStructuredSection(data: unknown, names: string[]): string {
		if (!data || typeof data !== "object" || Array.isArray(data)) return ""
		const record = data as Record<string, unknown>

		for (const name of names) {
			const value = record[name]
			if (typeof value === "string") return value.trim()
			if (value && typeof value === "object" && !Array.isArray(value)) {
				const nested = value as Record<string, unknown>
				if (typeof nested.content === "string") return nested.content.trim()
				if (typeof nested.text === "string") return nested.text.trim()
			}
		}

		return ""
	}

	private readContentSection(content: string, heading: "Assessment" | "Plan"): string {
		const headingPattern = new RegExp(
			`(?:^|\\n)#{1,6}\\s*${heading}\\s*\\n+([\\s\\S]*?)(?=\\n#{1,6}\\s+|$)`,
			"i"
		)
		const headingMatch = content.match(headingPattern)
		if (headingMatch?.[1]?.trim()) return headingMatch[1].trim()

		const inlinePattern = new RegExp(`(?:^|\\n)${heading}\\s*:\\s*([^\\n]+)`, "i")
		return inlinePattern.exec(content)?.[1]?.trim() ?? ""
	}

	private assertNoteTypeMatchesTemplate(input: {
		facilityId: string
		noteType: NoteType
		template: TemplateForValidation | null
	}) {
		if (!input.template) return
		if (input.template.facilityId !== input.facilityId) {
			throw new BadRequestException("Selected template does not belong to this facility.")
		}
		if (input.template.category !== input.noteType) {
			throw new BadRequestException("Note type must match the selected template category.")
		}
	}

	private assertAssessmentAndPlanPresent(input: {
		content?: string | null
		structuredData?: unknown
		template: TemplateForValidation | null
	}) {
		const sections = input.template?.sections ?? []
		const requiresAssessment = sections.some(section => this.isSoapSection(section, "assessment"))
		const requiresPlan = sections.some(section => this.isSoapSection(section, "plan"))
		const hasStructuredSoapShape =
			!!input.structuredData &&
			typeof input.structuredData === "object" &&
			!Array.isArray(input.structuredData) &&
			("assessment" in input.structuredData || "plan" in input.structuredData)

		if (!requiresAssessment && !requiresPlan && !hasStructuredSoapShape) return

		const content = input.content ?? ""
		const assessment =
			this.readStructuredSection(input.structuredData, ["assessment", "Assessment"]) ||
			this.readContentSection(content, "Assessment")
		const plan =
			this.readStructuredSection(input.structuredData, ["plan", "Plan"]) ||
			this.readContentSection(content, "Plan")

		if (!assessment || !plan) {
			throw new BadRequestException(
				"Assessment and Plan sections are required before saving a clinical note."
			)
		}
	}

	private async assertNoteCanBeSaved(input: {
		facilityId: string
		noteType: NoteType
		templateId?: string | null
		content?: string | null
		structuredData?: unknown
	}) {
		const template = input.templateId ? await this.getTemplateForValidation(input.templateId) : null

		this.assertNoteTypeMatchesTemplate({
			facilityId: input.facilityId,
			noteType: input.noteType,
			template,
		})
		this.assertAssessmentAndPlanPresent({
			content: input.content,
			structuredData: input.structuredData,
			template,
		})
	}

	// ========================================================================
	// Note Templates
	// ========================================================================

	async listTemplates(input: ListTemplatesInput) {
		const page = Number(input.page ?? 1)
		const limit = Number(input.limit ?? 50)
		const offset = (page - 1) * limit

		const conditions = [eq(noteTemplates.facilityId, input.facilityId)]
		if (input.category) {
			conditions.push(eq(noteTemplates.category, input.category))
		}
		if (input.isActive !== undefined) {
			const isActive = input.isActive === true || input.isActive === "true"
			conditions.push(eq(noteTemplates.isActive, isActive))
		}

		const whereClause = and(...conditions)

		const [totalResult] = await db.select({ count: count() }).from(noteTemplates).where(whereClause)

		const rows = await db
			.select({
				id: noteTemplates.id,
				facilityId: noteTemplates.facilityId,
				name: noteTemplates.name,
				category: noteTemplates.category,
				sections: noteTemplates.sections,
				isActive: noteTemplates.isActive,
				createdByStaffId: noteTemplates.createdByStaffId,
				createdByStaffName: users.name,
				createdAt: noteTemplates.createdAt,
				updatedAt: noteTemplates.updatedAt,
			})
			.from(noteTemplates)
			.leftJoin(staffProfiles, eq(noteTemplates.createdByStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(whereClause)
			.orderBy(desc(noteTemplates.createdAt))
			.limit(limit)
			.offset(offset)

		const total = totalResult?.count ?? 0

		return {
			data: rows.map(r => ({
				...r,
				sections: this.normalizeTemplateSections(r.sections),
			})),
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	async getTemplate(id: string) {
		const [row] = await db
			.select({
				id: noteTemplates.id,
				facilityId: noteTemplates.facilityId,
				name: noteTemplates.name,
				category: noteTemplates.category,
				sections: noteTemplates.sections,
				isActive: noteTemplates.isActive,
				createdByStaffId: noteTemplates.createdByStaffId,
				createdByStaffName: users.name,
				createdAt: noteTemplates.createdAt,
				updatedAt: noteTemplates.updatedAt,
			})
			.from(noteTemplates)
			.leftJoin(staffProfiles, eq(noteTemplates.createdByStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(eq(noteTemplates.id, id))

		if (!row) throw new NotFoundException(`Template ${id} not found`)
		return { ...row, sections: this.normalizeTemplateSections(row.sections) }
	}

	async createTemplate(input: CreateTemplateInput, userId: string) {
		const resolvedStaffProfileId = await this.getStaffProfileId(userId, input.facilityId)
		const [row] = await db
			.insert(noteTemplates)
			.values({
				facilityId: input.facilityId,
				name: input.name,
				category: input.category,
				sections: this.normalizeTemplateSections(input.sections),
				createdByStaffId: resolvedStaffProfileId,
			})
			.returning()

		this.logger.log(`Created note template ${row!.id}`)
		return this.getTemplate(row!.id)
	}

	async updateTemplate(input: UpdateTemplateInput) {
		const updates: Record<string, unknown> = { updatedAt: new Date() }
		if (input.name !== undefined) updates.name = input.name
		if (input.category !== undefined) updates.category = input.category
		if (input.sections !== undefined)
			updates.sections = this.normalizeTemplateSections(input.sections)
		if (input.isActive !== undefined) updates.isActive = input.isActive

		const [row] = await db
			.update(noteTemplates)
			.set(updates)
			.where(eq(noteTemplates.id, input.id))
			.returning()

		if (!row) throw new NotFoundException(`Template ${input.id} not found`)

		this.logger.log(`Updated note template ${input.id}`)
		return this.getTemplate(input.id)
	}

	// ========================================================================
	// Clinical Notes
	// ========================================================================

	async listNotes(input: ListNotesInput, actor?: ChartAccessActor) {
		await this.ensureChartReadAccess(actor, {
			encounterId: input.encounterId ?? null,
			record: {
				entityType: "clinical_note_list",
				entityId: input.encounterId ?? input.preEncounterId ?? "clinical-notes",
			},
		})

		const page = Number(input.page ?? 1)
		const limit = Number(input.limit ?? 50)
		const offset = (page - 1) * limit

		const conditions = []
		if (input.encounterId) {
			conditions.push(eq(clinicalNotes.encounterId, input.encounterId))
		}
		if (input.preEncounterId) {
			conditions.push(eq(clinicalNotes.preEncounterId, input.preEncounterId))
		}
		if (input.noteType) {
			conditions.push(eq(clinicalNotes.noteType, input.noteType))
		}
		if (input.status) {
			conditions.push(eq(clinicalNotes.status, input.status))
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined

		const [totalResult] = await db.select({ count: count() }).from(clinicalNotes).where(whereClause)

		const rows = await db
			.select({
				id: clinicalNotes.id,
				facilityId: clinicalNotes.facilityId,
				encounterId: clinicalNotes.encounterId,
				preEncounterId: clinicalNotes.preEncounterId,
				templateId: clinicalNotes.templateId,
				templateName: noteTemplates.name,
				noteType: clinicalNotes.noteType,
				content: clinicalNotes.content,
				structuredData: clinicalNotes.structuredData,
				status: clinicalNotes.status,
				authorStaffId: clinicalNotes.authorStaffId,
				authorStaffName: users.name,
				signedAt: clinicalNotes.signedAt,
				signedIp: clinicalNotes.signedIp,
				createdAt: clinicalNotes.createdAt,
				updatedAt: clinicalNotes.updatedAt,
			})
			.from(clinicalNotes)
			.leftJoin(staffProfiles, eq(clinicalNotes.authorStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.leftJoin(noteTemplates, eq(clinicalNotes.templateId, noteTemplates.id))
			.where(whereClause)
			.orderBy(desc(clinicalNotes.createdAt))
			.limit(limit)
			.offset(offset)

		const total = totalResult?.count ?? 0

		return {
			data: rows,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	async getNote(id: string, actor?: ChartAccessActor) {
		const [row] = await db
			.select({
				id: clinicalNotes.id,
				facilityId: clinicalNotes.facilityId,
				encounterId: clinicalNotes.encounterId,
				preEncounterId: clinicalNotes.preEncounterId,
				templateId: clinicalNotes.templateId,
				templateName: noteTemplates.name,
				noteType: clinicalNotes.noteType,
				content: clinicalNotes.content,
				structuredData: clinicalNotes.structuredData,
				status: clinicalNotes.status,
				authorStaffId: clinicalNotes.authorStaffId,
				authorStaffName: users.name,
				signedAt: clinicalNotes.signedAt,
				signedIp: clinicalNotes.signedIp,
				createdAt: clinicalNotes.createdAt,
				updatedAt: clinicalNotes.updatedAt,
			})
			.from(clinicalNotes)
			.leftJoin(staffProfiles, eq(clinicalNotes.authorStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.leftJoin(noteTemplates, eq(clinicalNotes.templateId, noteTemplates.id))
			.where(eq(clinicalNotes.id, id))

		if (!row) throw new NotFoundException(`Clinical note ${id} not found`)
		await this.ensureChartReadAccess(actor, {
			encounterId: row.encounterId,
			record: { entityType: "clinical_note", entityId: row.id },
		})

		// Fetch addenda
		const addendaRows = await db
			.select({
				id: noteAddenda.id,
				noteId: noteAddenda.noteId,
				content: noteAddenda.content,
				reason: noteAddenda.reason,
				status: noteAddenda.status,
				authorStaffId: noteAddenda.authorStaffId,
				authorStaffName: users.name,
				signedAt: noteAddenda.signedAt,
				createdAt: noteAddenda.createdAt,
			})
			.from(noteAddenda)
			.leftJoin(staffProfiles, eq(noteAddenda.authorStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(eq(noteAddenda.noteId, id))
			.orderBy(noteAddenda.createdAt)

		return { ...row, addenda: addendaRows }
	}

	async createNote(input: CreateNoteInput, userId: string) {
		await this.assertNoteCanBeSaved({
			facilityId: input.facilityId,
			noteType: input.noteType,
			templateId: input.templateId,
			content: input.content ?? "",
			structuredData: input.structuredData,
		})

		const resolvedAuthorStaffId = await this.getStaffProfileId(userId, input.facilityId)
		const [row] = await db
			.insert(clinicalNotes)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId ?? null,
				preEncounterId: input.preEncounterId ?? null,
				templateId: input.templateId ?? null,
				noteType: input.noteType,
				content: input.content ?? "",
				structuredData: input.structuredData ?? null,
				authorStaffId: resolvedAuthorStaffId,
			})
			.returning()

		this.logger.log(`Created clinical note ${row!.id}`)
		return this.getNote(row!.id)
	}

	async updateNote(input: UpdateNoteInput) {
		// Verify note is still draft
		const [existing] = await db
			.select({
				id: clinicalNotes.id,
				facilityId: clinicalNotes.facilityId,
				templateId: clinicalNotes.templateId,
				noteType: clinicalNotes.noteType,
				content: clinicalNotes.content,
				structuredData: clinicalNotes.structuredData,
				status: clinicalNotes.status,
			})
			.from(clinicalNotes)
			.where(eq(clinicalNotes.id, input.id))

		if (!existing) throw new NotFoundException(`Clinical note ${input.id} not found`)
		if (existing.status === "signed") {
			throw new BadRequestException("Cannot edit a signed note. Add an addendum instead.")
		}

		await this.assertNoteCanBeSaved({
			facilityId: existing.facilityId,
			noteType: existing.noteType,
			templateId: existing.templateId,
			content: input.content ?? existing.content,
			structuredData:
				input.structuredData !== undefined ? input.structuredData : existing.structuredData,
		})

		const updates: Record<string, unknown> = { updatedAt: new Date() }
		if (input.content !== undefined) updates.content = input.content
		if (input.structuredData !== undefined) updates.structuredData = input.structuredData

		await db.update(clinicalNotes).set(updates).where(eq(clinicalNotes.id, input.id))

		this.logger.log(`Updated clinical note ${input.id}`)
		return this.getNote(input.id)
	}

	private validateKonsultaCompleteness(data: unknown): { valid: boolean; missingFields: string[] } {
		if (!data || typeof data !== "object" || Array.isArray(data)) {
			return { valid: false, missingFields: ["All required FPE fields"] }
		}
		const d = data as Record<string, unknown>
		const vs =
			d.vitalSigns && typeof d.vitalSigns === "object" && !Array.isArray(d.vitalSigns)
				? (d.vitalSigns as Record<string, unknown>)
				: {}
		const pd =
			d.primaryDiagnosis && typeof d.primaryDiagnosis === "object" && !Array.isArray(d.primaryDiagnosis)
				? (d.primaryDiagnosis as Record<string, unknown>)
				: {}

		const missing: string[] = []
		if (!d.chiefComplaint) missing.push("Chief Complaint")
		if (!vs.bloodPressure) missing.push("Blood Pressure")
		if (!vs.weight) missing.push("Weight")
		if (!vs.height) missing.push("Height")
		if (!pd.code) missing.push("Primary Diagnosis Code")
		if (!pd.description) missing.push("Primary Diagnosis Description")
		if (!d.historyOfPresentIllness) missing.push("History of Present Illness")
		if (!d.physicalExamGeneral) missing.push("Physical Exam (General)")

		return { valid: missing.length === 0, missingFields: missing }
	}

	async submitFpe(input: SubmitFpeInput, userId: string, signedIp: string) {
		const [existing] = await db
			.select({
				id: clinicalNotes.id,
				facilityId: clinicalNotes.facilityId,
				noteType: clinicalNotes.noteType,
				status: clinicalNotes.status,
				structuredData: clinicalNotes.structuredData,
			})
			.from(clinicalNotes)
			.where(eq(clinicalNotes.id, input.noteId))

		if (!existing) throw new NotFoundException(`Clinical note ${input.noteId} not found`)
		if (existing.noteType !== "fpe") {
			throw new BadRequestException("Note is not an FPE note.")
		}
		if (existing.status === "signed") {
			throw new BadRequestException("FPE note is already signed.")
		}

		const { valid, missingFields } = this.validateKonsultaCompleteness(existing.structuredData)
		if (!valid) {
			throw new BadRequestException(`Missing required FPE fields: ${missingFields.join(", ")}`)
		}

		return this.signNote({ id: input.noteId }, signedIp, userId)
	}

	async signNote(input: SignNoteInput, signedIp: string, userId: string) {
		const [existing] = await db
			.select({
				id: clinicalNotes.id,
				facilityId: clinicalNotes.facilityId,
				status: clinicalNotes.status,
				authorStaffId: clinicalNotes.authorStaffId,
			})
			.from(clinicalNotes)
			.where(eq(clinicalNotes.id, input.id))

		if (!existing) throw new NotFoundException(`Clinical note ${input.id} not found`)
		if (existing.status === "signed") {
			throw new BadRequestException("Note is already signed.")
		}

		const signerStaffId = await this.getStaffProfileId(userId, existing.facilityId)
		if (signerStaffId !== existing.authorStaffId) {
			throw new ForbiddenException("Only the original author can sign this note.")
		}

		const signedAt = new Date()
		await db
			.update(clinicalNotes)
			.set({
				status: "signed",
				signedAt,
				signedIp,
				updatedAt: signedAt,
			})
			.where(eq(clinicalNotes.id, input.id))

		await this.auditService.log({
			facilityId: existing.facilityId,
			userId,
			staffProfileId: signerStaffId,
			action: "sign",
			entityType: "clinical_note",
			entityId: existing.id,
			beforeState: { status: existing.status },
			afterState: { status: "signed", signedAt: signedAt.toISOString(), signedIp },
			ipAddress: signedIp,
			userAgent: null,
			metadata: null,
		})

		this.logger.log(`Signed clinical note ${input.id}`)
		return this.getNote(input.id)
	}

	async getNoteContext(input: NoteContextInput, actor?: ChartAccessActor) {
		await this.chartAccessService.ensureEncounterChartReadAccess(actor, input.encounterId, {
			entityType: "clinical_note_context",
			entityId: input.encounterId,
		})

		const [encounter] = await db
			.select({
				id: encounters.id,
				patientId: encounters.patientId,
			})
			.from(encounters)
			.where(eq(encounters.id, input.encounterId))
			.limit(1)

		if (!encounter) throw new NotFoundException("Encounter not found")

		const [latestVitals, activeAllergies, recentLabs] = await Promise.all([
			db
				.select({
					id: vitalSigns.id,
					temperature: vitalSigns.temperature,
					bpSystolic: vitalSigns.bpSystolic,
					bpDiastolic: vitalSigns.bpDiastolic,
					heartRate: vitalSigns.heartRate,
					respiratoryRate: vitalSigns.respiratoryRate,
					spo2: vitalSigns.spo2,
					painScore: vitalSigns.painScore,
					weight: vitalSigns.weight,
					height: vitalSigns.height,
					newsScore: vitalSigns.newsScore,
					newsRiskLevel: vitalSigns.newsRiskLevel,
					recordedAt: vitalSigns.recordedAt,
				})
				.from(vitalSigns)
				.where(eq(vitalSigns.encounterId, input.encounterId))
				.orderBy(desc(vitalSigns.recordedAt))
				.limit(1),
			db
				.select({
					id: allergies.id,
					allergenName: allergies.allergenName,
					allergenType: allergies.allergenType,
					reactionType: allergies.reactionType,
					severity: allergies.severity,
					onsetDate: allergies.onsetDate,
				})
				.from(allergies)
				.where(and(eq(allergies.patientId, encounter.patientId), eq(allergies.isActive, true)))
				.orderBy(desc(allergies.createdAt)),
			db
				.select({
					id: labOrders.id,
					testName: labOrders.testName,
					panelName: labOrders.panelName,
					status: labOrders.status,
					resultedDatetime: labOrders.resultedDatetime,
					results: labOrders.results,
				})
				.from(labOrders)
				.where(
					and(
						eq(labOrders.encounterId, input.encounterId),
						inArray(labOrders.status, ["resulted", "completed"])
					)
				)
				.orderBy(desc(labOrders.resultedDatetime), desc(labOrders.updatedAt))
				.limit(10),
		])

		return {
			encounterId: input.encounterId,
			patientId: encounter.patientId,
			latestVitals: latestVitals[0] ?? null,
			activeAllergies,
			recentLabs,
		}
	}

	// ========================================================================
	// Note Addenda
	// ========================================================================

	async createAddendum(input: CreateAddendumInput, userId: string) {
		// Verify the parent note is signed
		const [note] = await db
			.select({
				id: clinicalNotes.id,
				facilityId: clinicalNotes.facilityId,
				status: clinicalNotes.status,
			})
			.from(clinicalNotes)
			.where(eq(clinicalNotes.id, input.noteId))

		if (!note) throw new NotFoundException(`Clinical note ${input.noteId} not found`)
		if (note.status !== "signed") {
			throw new BadRequestException("Addenda can only be added to signed notes.")
		}

		const resolvedAuthorStaffId = await this.getStaffProfileId(userId, note.facilityId)

		const [row] = await db
			.insert(noteAddenda)
			.values({
				noteId: input.noteId,
				content: input.content,
				reason: input.reason,
				authorStaffId: resolvedAuthorStaffId,
			})
			.returning()

		await this.auditService.log({
			facilityId: note.facilityId,
			userId,
			staffProfileId: resolvedAuthorStaffId,
			action: "create",
			entityType: "note_addendum",
			entityId: row!.id,
			beforeState: null,
			afterState: { noteId: input.noteId, reason: input.reason },
			ipAddress: null,
			userAgent: null,
			metadata: { noteId: input.noteId },
		})

		this.logger.log(`Created addendum ${row!.id} for note ${input.noteId}`)
		return this.getAddendum(row!.id)
	}

	async signAddendum(input: SignAddendumInput, userId: string) {
		const [existing] = await db
			.select({
				id: noteAddenda.id,
				noteId: noteAddenda.noteId,
				status: noteAddenda.status,
				authorStaffId: noteAddenda.authorStaffId,
			})
			.from(noteAddenda)
			.where(eq(noteAddenda.id, input.id))

		if (!existing) throw new NotFoundException(`Addendum ${input.id} not found`)
		if (existing.status === "signed") {
			throw new BadRequestException("Addendum is already signed.")
		}

		const [parent] = await db
			.select({ facilityId: clinicalNotes.facilityId })
			.from(clinicalNotes)
			.where(eq(clinicalNotes.id, existing.noteId))

		if (!parent) throw new NotFoundException(`Parent note ${existing.noteId} not found`)

		const signerStaffId = await this.getStaffProfileId(userId, parent.facilityId)
		if (signerStaffId !== existing.authorStaffId) {
			throw new ForbiddenException("Only the original author can sign this addendum.")
		}

		const signedAt = new Date()
		await db
			.update(noteAddenda)
			.set({ status: "signed", signedAt })
			.where(eq(noteAddenda.id, input.id))

		await this.auditService.log({
			facilityId: parent.facilityId,
			userId,
			staffProfileId: signerStaffId,
			action: "sign",
			entityType: "note_addendum",
			entityId: existing.id,
			beforeState: { status: existing.status },
			afterState: { status: "signed", signedAt: signedAt.toISOString() },
			ipAddress: null,
			userAgent: null,
			metadata: { noteId: existing.noteId },
		})

		this.logger.log(`Signed addendum ${input.id}`)
		return this.getAddendum(input.id)
	}

	private async getAddendum(id: string) {
		const [row] = await db
			.select({
				id: noteAddenda.id,
				noteId: noteAddenda.noteId,
				content: noteAddenda.content,
				reason: noteAddenda.reason,
				status: noteAddenda.status,
				authorStaffId: noteAddenda.authorStaffId,
				authorStaffName: users.name,
				signedAt: noteAddenda.signedAt,
				createdAt: noteAddenda.createdAt,
			})
			.from(noteAddenda)
			.leftJoin(staffProfiles, eq(noteAddenda.authorStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(eq(noteAddenda.id, id))

		if (!row) throw new NotFoundException(`Addendum ${id} not found`)
		return row
	}

	// ========================================================================
	// Consent Records
	// ========================================================================

	async listConsents(input: ListConsentsInput, actor?: ChartAccessActor) {
		await this.ensureChartReadAccess(actor, {
			encounterId: input.encounterId ?? null,
			patientId: input.patientId ?? null,
			record: {
				entityType: "consent_list",
				entityId: input.encounterId ?? input.patientId ?? "consents",
			},
		})

		const page = Number(input.page ?? 1)
		const limit = Number(input.limit ?? 50)
		const offset = (page - 1) * limit

		const conditions = []
		if (input.encounterId) {
			conditions.push(eq(consentRecords.encounterId, input.encounterId))
		}
		if (input.patientId) {
			conditions.push(eq(consentRecords.patientId, input.patientId))
		}
		if (input.consentType) {
			conditions.push(eq(consentRecords.consentType, input.consentType))
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined

		const [totalResult] = await db
			.select({ count: count() })
			.from(consentRecords)
			.where(whereClause)

		const rows = await db
			.select({
				id: consentRecords.id,
				facilityId: consentRecords.facilityId,
				encounterId: consentRecords.encounterId,
				patientId: consentRecords.patientId,
				consentType: consentRecords.consentType,
				signedByName: consentRecords.signedByName,
				relationship: consentRecords.relationship,
				content: consentRecords.content,
				signatureData: consentRecords.signatureData,
				signedAt: consentRecords.signedAt,
				witnessStaffId: consentRecords.witnessStaffId,
				witnessStaffName: users.name,
				revokedAt: consentRecords.revokedAt,
				createdAt: consentRecords.createdAt,
				updatedAt: consentRecords.updatedAt,
			})
			.from(consentRecords)
			.leftJoin(staffProfiles, eq(consentRecords.witnessStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(whereClause)
			.orderBy(desc(consentRecords.createdAt))
			.limit(limit)
			.offset(offset)

		const total = totalResult?.count ?? 0

		return {
			data: rows,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	async getConsent(id: string, actor?: ChartAccessActor) {
		const [row] = await db
			.select({
				id: consentRecords.id,
				facilityId: consentRecords.facilityId,
				encounterId: consentRecords.encounterId,
				patientId: consentRecords.patientId,
				consentType: consentRecords.consentType,
				signedByName: consentRecords.signedByName,
				relationship: consentRecords.relationship,
				content: consentRecords.content,
				signatureData: consentRecords.signatureData,
				signedAt: consentRecords.signedAt,
				witnessStaffId: consentRecords.witnessStaffId,
				witnessStaffName: users.name,
				revokedAt: consentRecords.revokedAt,
				createdAt: consentRecords.createdAt,
				updatedAt: consentRecords.updatedAt,
			})
			.from(consentRecords)
			.leftJoin(staffProfiles, eq(consentRecords.witnessStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.where(eq(consentRecords.id, id))

		if (!row) throw new NotFoundException(`Consent record ${id} not found`)
		await this.ensureChartReadAccess(actor, {
			encounterId: row.encounterId,
			patientId: row.patientId,
			record: { entityType: "consent_record", entityId: row.id },
		})
		return row
	}

	async createConsent(input: CreateConsentInput, witnessStaffId: string) {
		// Witness is optional — if the acting user has no staff profile, store null rather than throwing
		let resolvedWitnessStaffId: string | null = null
		try {
			resolvedWitnessStaffId = await this.getStaffProfileId(witnessStaffId)
		} catch {
			this.logger.warn(`No staff profile for user ${witnessStaffId}; consent will have no witness`)
		}
		const [row] = await db
			.insert(consentRecords)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId ?? null,
				patientId: input.patientId,
				consentType: input.consentType,
				signedByName: input.signedByName,
				relationship: input.relationship,
				content: input.content ?? null,
				signatureData: input.signatureData ?? null,
				signedAt: new Date(),
				witnessStaffId: resolvedWitnessStaffId,
			})
			.returning()

		this.logger.log(`Created consent record ${row!.id}`)
		return this.getConsent(row!.id)
	}

	async revokeConsent(input: RevokeConsentInput) {
		const [existing] = await db
			.select({ revokedAt: consentRecords.revokedAt })
			.from(consentRecords)
			.where(eq(consentRecords.id, input.id))

		if (!existing) throw new NotFoundException(`Consent record ${input.id} not found`)
		if (existing.revokedAt) {
			throw new BadRequestException("Consent is already revoked.")
		}

		await db
			.update(consentRecords)
			.set({ revokedAt: new Date(), updatedAt: new Date() })
			.where(eq(consentRecords.id, input.id))

		this.logger.log(`Revoked consent record ${input.id}`)
		return this.getConsent(input.id)
	}

	// ========================================================================
	// Cross-module: Signed Notes for CF4 Extraction
	// ========================================================================

	async getSignedNotes(input: SignedNotesInput, actor?: ChartAccessActor) {
		await this.chartAccessService.ensureEncounterChartReadAccess(actor, input.encounterId, {
			entityType: "signed_clinical_notes",
			entityId: input.encounterId,
		})

		const rows = await db
			.select({
				id: clinicalNotes.id,
				facilityId: clinicalNotes.facilityId,
				encounterId: clinicalNotes.encounterId,
				preEncounterId: clinicalNotes.preEncounterId,
				templateId: clinicalNotes.templateId,
				templateName: noteTemplates.name,
				noteType: clinicalNotes.noteType,
				content: clinicalNotes.content,
				structuredData: clinicalNotes.structuredData,
				status: clinicalNotes.status,
				authorStaffId: clinicalNotes.authorStaffId,
				authorStaffName: users.name,
				signedAt: clinicalNotes.signedAt,
				signedIp: clinicalNotes.signedIp,
				createdAt: clinicalNotes.createdAt,
				updatedAt: clinicalNotes.updatedAt,
			})
			.from(clinicalNotes)
			.leftJoin(staffProfiles, eq(clinicalNotes.authorStaffId, staffProfiles.id))
			.leftJoin(users, eq(staffProfiles.userId, users.id))
			.leftJoin(noteTemplates, eq(clinicalNotes.templateId, noteTemplates.id))
			.where(
				and(eq(clinicalNotes.encounterId, input.encounterId), eq(clinicalNotes.status, "signed"))
			)
			.orderBy(desc(clinicalNotes.signedAt))

		return { notes: rows }
	}

	async extractCf4Data(input: ExtractCf4DataInput, actor?: ChartAccessActor) {
		const { notes } = await this.getSignedNotes({ encounterId: input.encounterId }, actor)
		const extractedAt = new Date().toISOString()

		const pickField = (
			field: string,
			noteTypes: string[],
			structuredKeys: string[],
			fallbackPatterns: RegExp[]
		) => {
			for (const note of notes) {
				if (!noteTypes.includes(note.noteType)) continue

				const structured = (note.structuredData ?? {}) as Record<string, unknown>
				for (const key of structuredKeys) {
					const value = structured[key]
					if (typeof value === "string" && value.trim().length > 0) {
						return {
							field,
							value,
							sourceNoteId: note.id,
							sourceNoteType: note.noteType,
							extractedAt,
							confidence: "high" as const,
						}
					}
				}

				const content = note.content ?? ""
				for (const pattern of fallbackPatterns) {
					const match = content.match(pattern)
					if (match?.[1]?.trim()) {
						return {
							field,
							value: match[1].trim(),
							sourceNoteId: note.id,
							sourceNoteType: note.noteType,
							extractedAt,
							confidence: "medium" as const,
						}
					}
				}
			}

			return null
		}

		const chiefComplaint = pickField(
			"chiefComplaint",
			["admission", "consultation"],
			["chiefComplaint", "chief_complaint"],
			[/chief complaint[:\s]+([^\n]+)/i]
		)
		const historyOfPresentIllness = pickField(
			"historyOfPresentIllness",
			["admission", "consultation", "progress"],
			["historyOfPresentIllness", "hpi", "history_present_illness"],
			[/history of present illness[:\s]+([\s\S]{1,400})/i, /hpi[:\s]+([\s\S]{1,400})/i]
		)
		const physicalExamination = pickField(
			"physicalExamination",
			["fpe", "admission", "progress"],
			["physicalExamination", "physical_exam", "findings"],
			[/physical examination[:\s]+([\s\S]{1,400})/i, /physical exam[:\s]+([\s\S]{1,400})/i]
		)
		const courseInWard = pickField(
			"courseInWard",
			["progress", "discharge_summary"],
			["courseInWard", "course_in_ward", "hospitalCourse"],
			[/course in ward[:\s]+([\s\S]{1,400})/i, /hospital course[:\s]+([\s\S]{1,400})/i]
		)

		let vitalSigns: {
			bloodPressure: string | null
			heartRate: string | null
			respiratoryRate: string | null
			temperature: string | null
			oxygenSaturation: string | null
			sourceNoteId: string | null
		} | null = null

		for (const note of notes) {
			const structured = (note.structuredData ?? {}) as Record<string, unknown>
			const sourceNoteId = note.id
			const bloodPressure =
				typeof structured.bloodPressure === "string" ? structured.bloodPressure : null
			const heartRate = typeof structured.heartRate === "string" ? structured.heartRate : null
			const respiratoryRate =
				typeof structured.respiratoryRate === "string" ? structured.respiratoryRate : null
			const temperature = typeof structured.temperature === "string" ? structured.temperature : null
			const oxygenSaturation =
				typeof structured.oxygenSaturation === "string" ? structured.oxygenSaturation : null

			if (bloodPressure || heartRate || respiratoryRate || temperature || oxygenSaturation) {
				vitalSigns = {
					bloodPressure,
					heartRate,
					respiratoryRate,
					temperature,
					oxygenSaturation,
					sourceNoteId,
				}
				break
			}
		}

		const procedures = notes
			.filter(note => note.noteType === "operative")
			.flatMap(note => {
				const structured = (note.structuredData ?? {}) as Record<string, unknown>
				const procedure =
					typeof structured.procedureName === "string"
						? structured.procedureName
						: (note.content?.match(/procedure(?: name)?[:\s]+([^\n]+)/i)?.[1] ?? "").trim()
				if (!procedure) return []
				return [
					{
						procedure,
						rvsCode:
							typeof structured.procedureRvsCode === "string" ? structured.procedureRvsCode : null,
						laterality: typeof structured.laterality === "string" ? structured.laterality : null,
						sourceNoteId: note.id,
					},
				]
			})

		const finalDiagnoses = notes
			.filter(note => note.noteType === "discharge_summary" || note.noteType === "admission")
			.flatMap(note => {
				const structured = (note.structuredData ?? {}) as Record<string, unknown>
				const diagnoses = Array.isArray(structured.finalDiagnoses)
					? structured.finalDiagnoses
					: Array.isArray(structured.diagnoses)
						? structured.diagnoses
						: []

				if (diagnoses.length > 0) {
					return diagnoses
						.filter(
							(item): item is Record<string, unknown> => typeof item === "object" && item !== null
						)
						.map((item, index) => ({
							diagnosis:
								typeof item.diagnosis === "string" ? item.diagnosis : String(item.name ?? ""),
							icdCode: typeof item.icdCode === "string" ? item.icdCode : null,
							isPrimary: index === 0,
							sourceNoteId: note.id,
						}))
						.filter(item => item.diagnosis)
				}

				const fallback = note.content?.match(/final diagnos(?:is|es)[:\s]+([^\n]+)/i)?.[1]?.trim()
				return fallback
					? [{ diagnosis: fallback, icdCode: null, isPrimary: true, sourceNoteId: note.id }]
					: []
			})

		const missingFields = [
			!chiefComplaint ? "chiefComplaint" : null,
			!historyOfPresentIllness ? "historyOfPresentIllness" : null,
			!physicalExamination ? "physicalExamination" : null,
			!courseInWard ? "courseInWard" : null,
			!vitalSigns ? "vitalSigns" : null,
			procedures.length === 0 ? "procedures" : null,
			finalDiagnoses.length === 0 ? "finalDiagnoses" : null,
		].filter((value): value is string => value !== null)

		const populatedFields = 7 - missingFields.length
		const status: "complete" | "partial" | "insufficient" =
			missingFields.length === 0 ? "complete" : populatedFields > 0 ? "partial" : "insufficient"

		return {
			encounterId: input.encounterId,
			chiefComplaint,
			historyOfPresentIllness,
			physicalExamination,
			courseInWard,
			vitalSigns,
			procedures,
			finalDiagnoses,
			missingFields,
			status,
		}
	}
}

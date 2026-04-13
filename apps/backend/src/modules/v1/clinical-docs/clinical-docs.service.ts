import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common"
import { and, count, desc, eq } from "drizzle-orm"

import {
	clinicalNotes,
	consentRecords,
	noteAddenda,
	noteTemplates,
	staffProfiles,
	users,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import type { V1Inputs } from "@/config/contract-types"

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
type SignedNotesInput = V1Inputs["clinicalDocs"]["getSignedNotes"]

interface TemplateSection {
	key: string
	label: string
	type: "rich_text" | "structured"
	defaultContent?: string
}

@Injectable()
export class ClinicalDocsService {
	private readonly logger = new Logger(ClinicalDocsService.name)

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

		const [totalResult] = await db
			.select({ count: count() })
			.from(noteTemplates)
			.where(whereClause)

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
			data: rows.map(r => ({ ...r, sections: r.sections as TemplateSection[] })),
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
		return { ...row, sections: row.sections as TemplateSection[] }
	}

	async createTemplate(input: CreateTemplateInput, staffProfileId: string) {
		const [row] = await db
			.insert(noteTemplates)
			.values({
				facilityId: input.facilityId,
				name: input.name,
				category: input.category,
				sections: input.sections,
				createdByStaffId: staffProfileId,
			})
			.returning()

		this.logger.log(`Created note template ${row!.id}`)
		return this.getTemplate(row!.id)
	}

	async updateTemplate(input: UpdateTemplateInput) {
		const updates: Record<string, unknown> = { updatedAt: new Date() }
		if (input.name !== undefined) updates.name = input.name
		if (input.category !== undefined) updates.category = input.category
		if (input.sections !== undefined) updates.sections = input.sections
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

	async listNotes(input: ListNotesInput) {
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

		const [totalResult] = await db
			.select({ count: count() })
			.from(clinicalNotes)
			.where(whereClause)

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

	async getNote(id: string) {
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

	async createNote(input: CreateNoteInput, authorStaffId: string) {
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
				authorStaffId,
			})
			.returning()

		this.logger.log(`Created clinical note ${row!.id}`)
		return this.getNote(row!.id)
	}

	async updateNote(input: UpdateNoteInput) {
		// Verify note is still draft
		const [existing] = await db
			.select({ status: clinicalNotes.status })
			.from(clinicalNotes)
			.where(eq(clinicalNotes.id, input.id))

		if (!existing) throw new NotFoundException(`Clinical note ${input.id} not found`)
		if (existing.status === "signed") {
			throw new BadRequestException("Cannot edit a signed note. Add an addendum instead.")
		}

		const updates: Record<string, unknown> = { updatedAt: new Date() }
		if (input.content !== undefined) updates.content = input.content
		if (input.structuredData !== undefined) updates.structuredData = input.structuredData

		await db
			.update(clinicalNotes)
			.set(updates)
			.where(eq(clinicalNotes.id, input.id))

		this.logger.log(`Updated clinical note ${input.id}`)
		return this.getNote(input.id)
	}

	async signNote(input: SignNoteInput, signedIp: string) {
		const [existing] = await db
			.select({ status: clinicalNotes.status })
			.from(clinicalNotes)
			.where(eq(clinicalNotes.id, input.id))

		if (!existing) throw new NotFoundException(`Clinical note ${input.id} not found`)
		if (existing.status === "signed") {
			throw new BadRequestException("Note is already signed.")
		}

		await db
			.update(clinicalNotes)
			.set({
				status: "signed",
				signedAt: new Date(),
				signedIp,
				updatedAt: new Date(),
			})
			.where(eq(clinicalNotes.id, input.id))

		this.logger.log(`Signed clinical note ${input.id}`)
		return this.getNote(input.id)
	}

	// ========================================================================
	// Note Addenda
	// ========================================================================

	async createAddendum(input: CreateAddendumInput, authorStaffId: string) {
		// Verify the parent note is signed
		const [note] = await db
			.select({ status: clinicalNotes.status })
			.from(clinicalNotes)
			.where(eq(clinicalNotes.id, input.noteId))

		if (!note) throw new NotFoundException(`Clinical note ${input.noteId} not found`)
		if (note.status !== "signed") {
			throw new BadRequestException("Addenda can only be added to signed notes.")
		}

		const [row] = await db
			.insert(noteAddenda)
			.values({
				noteId: input.noteId,
				content: input.content,
				reason: input.reason ?? null,
				authorStaffId,
			})
			.returning()

		this.logger.log(`Created addendum ${row!.id} for note ${input.noteId}`)
		return this.getAddendum(row!.id)
	}

	async signAddendum(input: SignAddendumInput) {
		const [existing] = await db
			.select({ status: noteAddenda.status })
			.from(noteAddenda)
			.where(eq(noteAddenda.id, input.id))

		if (!existing) throw new NotFoundException(`Addendum ${input.id} not found`)
		if (existing.status === "signed") {
			throw new BadRequestException("Addendum is already signed.")
		}

		await db
			.update(noteAddenda)
			.set({ status: "signed", signedAt: new Date() })
			.where(eq(noteAddenda.id, input.id))

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

	async listConsents(input: ListConsentsInput) {
		const page = Number(input.page ?? 1)
		const limit = Number(input.limit ?? 50)
		const offset = (page - 1) * limit

		const conditions = [eq(consentRecords.encounterId, input.encounterId)]
		if (input.consentType) {
			conditions.push(eq(consentRecords.consentType, input.consentType))
		}

		const whereClause = and(...conditions)

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

	async getConsent(id: string) {
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
		return row
	}

	async createConsent(input: CreateConsentInput, witnessStaffId: string) {
		const [row] = await db
			.insert(consentRecords)
			.values({
				facilityId: input.facilityId,
				encounterId: input.encounterId,
				patientId: input.patientId,
				consentType: input.consentType,
				signedByName: input.signedByName,
				relationship: input.relationship,
				content: input.content ?? null,
				signatureData: input.signatureData ?? null,
				signedAt: new Date(),
				witnessStaffId,
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

	async getSignedNotes(input: SignedNotesInput) {
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
				and(
					eq(clinicalNotes.encounterId, input.encounterId),
					eq(clinicalNotes.status, "signed")
				)
			)
			.orderBy(desc(clinicalNotes.signedAt))

		return { notes: rows }
	}
}

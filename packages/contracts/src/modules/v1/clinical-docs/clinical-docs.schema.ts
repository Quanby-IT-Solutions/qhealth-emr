import { z } from "zod"

// ============================================================================
// Helpers
// ============================================================================

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

const PaginationInputSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
})

const PaginatedResponseSchema = z.object({
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
})

// ============================================================================
// Enums
// ============================================================================

export const NoteTypeEnum = z.enum([
	"admission",
	"progress",
	"consultation",
	"discharge_summary",
	"fpe",
])

export const NoteStatusEnum = z.enum(["draft", "signed"])

export const TemplateCategoryEnum = z.enum([
	"admission",
	"progress",
	"consultation",
	"discharge_summary",
	"fpe",
])

export const ConsentTypeEnum = z.enum([
	"general",
	"procedure",
	"research",
	"blood_transfusion",
	"surgery",
])

export const ConsentRelationshipEnum = z.enum([
	"self",
	"parent",
	"guardian",
	"spouse",
	"other",
])

// ============================================================================
// Template Section Definition (JSONB structure)
// ============================================================================

export const TemplateSectionSchema = z.object({
	key: z.string(),
	label: z.string(),
	type: z.enum(["rich_text", "structured"]),
	defaultContent: z.string().optional(),
})

// ============================================================================
// Note Template Schemas
// ============================================================================

export const NoteTemplateSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	name: z.string(),
	category: TemplateCategoryEnum,
	sections: z.array(TemplateSectionSchema),
	isActive: z.boolean(),
	createdByStaffId: z.string().uuid().nullable(),
	createdByStaffName: z.string().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type NoteTemplate = z.infer<typeof NoteTemplateSchema>

export const CreateNoteTemplateSchema = z.object({
	facilityId: z.string().uuid(),
	name: z.string().min(1).max(255),
	category: TemplateCategoryEnum,
	sections: z.array(TemplateSectionSchema).min(1),
})

export const UpdateNoteTemplateSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).max(255).optional(),
	category: TemplateCategoryEnum.optional(),
	sections: z.array(TemplateSectionSchema).min(1).optional(),
	isActive: z.boolean().optional(),
})

export const NoteTemplateIdSchema = z.object({
	id: z.string().uuid(),
})

export const NoteTemplateListSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid(),
	category: TemplateCategoryEnum.optional(),
	isActive: z
		.union([z.boolean(), z.string().transform(v => v === "true")])
		.optional(),
})

export const NoteTemplateListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(NoteTemplateSchema),
})

// ============================================================================
// Clinical Note Schemas
// ============================================================================

export const AddendumSchema = z.object({
	id: z.string().uuid(),
	noteId: z.string().uuid(),
	content: z.string(),
	reason: z.string().nullable(),
	status: NoteStatusEnum,
	authorStaffId: z.string().uuid(),
	authorStaffName: z.string().nullable(),
	signedAt: dateOrString.nullable(),
	createdAt: dateOrString,
})

export type Addendum = z.infer<typeof AddendumSchema>

export const ClinicalNoteSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	preEncounterId: z.string().uuid().nullable(),
	templateId: z.string().uuid().nullable(),
	templateName: z.string().nullable(),
	noteType: NoteTypeEnum,
	content: z.string(),
	structuredData: z.any().nullable(),
	status: NoteStatusEnum,
	authorStaffId: z.string().uuid(),
	authorStaffName: z.string().nullable(),
	signedAt: dateOrString.nullable(),
	signedIp: z.string().nullable(),
	addenda: z.array(AddendumSchema).optional(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type ClinicalNote = z.infer<typeof ClinicalNoteSchema>

export const CreateClinicalNoteSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().optional(),
	preEncounterId: z.string().uuid().optional(),
	templateId: z.string().uuid().optional(),
	noteType: NoteTypeEnum,
	content: z.string().default(""),
	structuredData: z.any().optional(),
})

export const UpdateClinicalNoteSchema = z.object({
	id: z.string().uuid(),
	content: z.string().optional(),
	structuredData: z.any().optional(),
})

export const SignClinicalNoteSchema = z.object({
	id: z.string().uuid(),
})

export const ClinicalNoteIdSchema = z.object({
	id: z.string().uuid(),
})

export const ClinicalNoteListSchema = PaginationInputSchema.extend({
	encounterId: z.string().uuid().optional(),
	preEncounterId: z.string().uuid().optional(),
	noteType: NoteTypeEnum.optional(),
	status: NoteStatusEnum.optional(),
})

export const ClinicalNoteListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(ClinicalNoteSchema),
})

// ============================================================================
// Note Addenda Schemas
// ============================================================================

export const CreateAddendumSchema = z.object({
	noteId: z.string().uuid(),
	content: z.string().min(1).max(10000),
	reason: z.string().max(1000).optional(),
})

export const SignAddendumSchema = z.object({
	id: z.string().uuid(),
})

export const AddendumIdSchema = z.object({
	id: z.string().uuid(),
})

// ============================================================================
// Consent Record Schemas
// ============================================================================

export const ConsentRecordSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	consentType: ConsentTypeEnum,
	signedByName: z.string(),
	relationship: ConsentRelationshipEnum,
	content: z.string().nullable(),
	signatureData: z.any().nullable(),
	signedAt: dateOrString.nullable(),
	witnessStaffId: z.string().uuid().nullable(),
	witnessStaffName: z.string().nullable(),
	revokedAt: dateOrString.nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type ConsentRecord = z.infer<typeof ConsentRecordSchema>

export const CreateConsentRecordSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	consentType: ConsentTypeEnum,
	signedByName: z.string().min(1).max(255),
	relationship: ConsentRelationshipEnum,
	content: z.string().optional(),
	signatureData: z.any().optional(),
})

export const RevokeConsentSchema = z.object({
	id: z.string().uuid(),
})

export const ConsentRecordIdSchema = z.object({
	id: z.string().uuid(),
})

export const ConsentRecordListSchema = PaginationInputSchema.extend({
	encounterId: z.string().uuid(),
	consentType: ConsentTypeEnum.optional(),
})

export const ConsentRecordListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(ConsentRecordSchema),
})

// ============================================================================
// Signed Notes (Cross-module — for Billing/CF4)
// ============================================================================

export const SignedNotesSchema = z.object({
	encounterId: z.string().uuid(),
})

export const SignedNotesResponseSchema = z.object({
	notes: z.array(ClinicalNoteSchema),
})

import { z } from "zod"

// ============================================================================
// Helpers
// ============================================================================

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

const PaginationInputSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(500).default(50),
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
	"operative",
	"anesthesia",
])

export const NoteStatusEnum = z.enum(["draft", "signed"])

export const TemplateCategoryEnum = z.enum([
	"admission",
	"progress",
	"consultation",
	"discharge_summary",
	"fpe",
	"operative",
	"anesthesia",
])

export const ConsentTypeEnum = z.enum([
	"general",
	"procedure",
	"research",
	"blood_transfusion",
	"surgery",
	"nbs",
	"dpa",
])

export const ConsentRelationshipEnum = z.enum(["self", "parent", "guardian", "spouse", "other"])

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
	isActive: z.union([z.boolean(), z.string().transform(v => v === "true")]).optional(),
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
	signedIp: z.string().nullable(),
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

/**
 * Filters accepted by `clinicalDocs.listNotes`.
 *
 * Facility isolation is enforced server-side: the backend derives the target
 * `facilityId` from the supplied `encounterId` / `preEncounterId` via an
 * encounter join, and additionally requires the caller to hold an active staff
 * profile at that facility. Clients neither pass nor need to pass a
 * `facilityId` here — adding one would have no effect.
 */
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
// Note Authoring Context
// ============================================================================

export const NoteContextInputSchema = z.object({
	encounterId: z.string().uuid(),
})

export const NoteContextSchema = z.object({
	encounterId: z.string().uuid(),
	patientId: z.string().uuid().nullable(),
	latestVitals: z
		.object({
			id: z.string().uuid(),
			temperature: z.string().nullable(),
			bpSystolic: z.number().nullable(),
			bpDiastolic: z.number().nullable(),
			heartRate: z.number().nullable(),
			respiratoryRate: z.number().nullable(),
			spo2: z.string().nullable(),
			painScore: z.number().nullable(),
			weight: z.string().nullable(),
			height: z.string().nullable(),
			newsScore: z.number().nullable(),
			newsRiskLevel: z.enum(["low", "medium", "high"]).nullable(),
			recordedAt: dateOrString,
		})
		.nullable(),
	activeAllergies: z.array(
		z.object({
			id: z.string().uuid(),
			allergenName: z.string(),
			allergenType: z.enum(["medication", "food", "environmental"]),
			reactionType: z.string().nullable(),
			severity: z.enum(["mild", "moderate", "severe"]),
			onsetDate: z.string().nullable(),
		})
	),
	recentLabs: z.array(
		z.object({
			id: z.string().uuid(),
			testName: z.string(),
			panelName: z.string().nullable(),
			status: z.enum([
				"pending",
				"ordered",
				"collected",
				"in_progress",
				"resulted",
				"completed",
				"cancelled",
			]),
			resultedDatetime: dateOrString.nullable(),
			results: z.any().nullable(),
		})
	),
})

export type NoteContext = z.infer<typeof NoteContextSchema>

// ============================================================================
// Note Addenda Schemas
// ============================================================================

export const CreateAddendumSchema = z.object({
	noteId: z.string().uuid(),
	content: z.string().min(1).max(10000),
	reason: z.string().min(1).max(1000),
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
	encounterId: z.string().uuid().nullable(),
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
	revocationReason: z.string().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type ConsentRecord = z.infer<typeof ConsentRecordSchema>

export const CreateConsentRecordSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().optional(),
	patientId: z.string().uuid(),
	consentType: ConsentTypeEnum,
	signedByName: z.string().min(1).max(255),
	relationship: ConsentRelationshipEnum,
	content: z.string().optional(),
	signatureData: z.any().optional(),
})

export const RevokeConsentSchema = z.object({
	id: z.string().uuid(),
	reason: z.string().min(1).max(500).optional(),
})

export const ConsentRecordIdSchema = z.object({
	id: z.string().uuid(),
})

export const ConsentRecordListSchema = PaginationInputSchema.extend({
	encounterId: z.string().uuid().optional(),
	patientId: z.string().uuid().optional(),
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

// ============================================================================
// CF4 Auto-Extraction (link clinical notes to CF4 claim fields)
// ============================================================================

export const Cf4FieldSourceSchema = z.object({
	field: z.string(),
	value: z.string(),
	sourceNoteId: z.string().uuid(),
	sourceNoteType: NoteTypeEnum,
	extractedAt: dateOrString,
	confidence: z.enum(["high", "medium", "low"]),
})

export const Cf4ExtractionResultSchema = z.object({
	encounterId: z.string().uuid(),

	// Chief complaint from admission note
	chiefComplaint: Cf4FieldSourceSchema.nullable(),

	// History of present illness
	historyOfPresentIllness: Cf4FieldSourceSchema.nullable(),

	// Physical examination findings
	physicalExamination: Cf4FieldSourceSchema.nullable(),

	// Course in the ward (from progress notes)
	courseInWard: Cf4FieldSourceSchema.nullable(),

	// Vital signs on admission
	vitalSigns: z
		.object({
			bloodPressure: z.string().nullable(),
			heartRate: z.string().nullable(),
			respiratoryRate: z.string().nullable(),
			temperature: z.string().nullable(),
			oxygenSaturation: z.string().nullable(),
			sourceNoteId: z.string().uuid().nullable(),
		})
		.nullable(),

	// Procedures performed (from operative notes)
	procedures: z.array(
		z.object({
			procedure: z.string(),
			rvsCode: z.string().nullable(),
			laterality: z.string().nullable(),
			sourceNoteId: z.string().uuid(),
		})
	),

	// Final diagnoses (from discharge summary)
	finalDiagnoses: z.array(
		z.object({
			diagnosis: z.string(),
			icdCode: z.string().nullable(),
			isPrimary: z.boolean(),
			sourceNoteId: z.string().uuid(),
		})
	),

	// Missing required fields for CF4 submission
	missingFields: z.array(z.string()),

	// Overall extraction status
	status: z.enum(["complete", "partial", "insufficient"]),
})

export const ExtractCf4DataInputSchema = z.object({
	encounterId: z.string().uuid(),
})

// ============================================================================
// Operative Note Structured Data
// ============================================================================

export const OperativeNoteDataSchema = z.object({
	// Pre-operative
	preOpDiagnosis: z.string(),
	postOpDiagnosis: z.string(),
	procedureName: z.string(),
	procedureRvsCode: z.string().nullable(),

	// Surgical team
	surgeonId: z.string().uuid(),
	assistants: z.array(z.string().uuid()),
	anesthesiologistId: z.string().uuid().nullable(),
	anesthesiaType: z.string().nullable(),

	// Timing
	operationStartTime: z.string(),
	operationEndTime: z.string(),

	// Findings
	findings: z.string(),
	complications: z.string().nullable(),
	bloodLoss: z.string().nullable(),
	specimenSent: z.boolean(),
	specimenDescription: z.string().nullable(),

	// Post-op
	postOpInstructions: z.string(),
})

// ============================================================================
// Anesthesia Note Structured Data
// ============================================================================

export const AnesthesiaNoteDataSchema = z.object({
	// Pre-anesthesia
	asaClass: z.enum(["I", "II", "III", "IV", "V", "VI"]),
	mallampatiScore: z.enum(["I", "II", "III", "IV"]).nullable(),
	npoStatus: z.boolean(),
	npoHours: z.number().nullable(),

	// Anesthesia details
	anesthesiaType: z.enum(["general", "regional", "local", "sedation", "combined"]),
	airwayManagement: z.string().nullable(),
	agents: z.array(
		z.object({
			name: z.string(),
			dose: z.string(),
			route: z.string(),
			time: z.string(),
		})
	),

	// Monitoring
	monitors: z.array(z.string()),
	fluidsGiven: z.string().nullable(),
	bloodProducts: z.string().nullable(),

	// Vitals during procedure
	intraOpVitals: z
		.array(
			z.object({
				time: z.string(),
				bp: z.string().nullable(),
				hr: z.number().nullable(),
				spo2: z.number().nullable(),
				etco2: z.number().nullable(),
			})
		)
		.nullable(),

	// Recovery
	pacuArrivalTime: z.string().nullable(),
	aldrete: z.number().nullable(),
	complications: z.string().nullable(),
})

// ============================================================================
// FPE Submit
// ============================================================================

export const SubmitFpeInputSchema = z.object({
	noteId: z.string().uuid(),
	facilityId: z.string().uuid(),
	signedIp: z.string().optional(),
})

// ============================================================================
// Type exports for new schemas
// ============================================================================

export type Cf4ExtractionResult = z.infer<typeof Cf4ExtractionResultSchema>
export type OperativeNoteData = z.infer<typeof OperativeNoteDataSchema>
export type AnesthesiaNoteData = z.infer<typeof AnesthesiaNoteDataSchema>
export type SubmitFpeInput = z.infer<typeof SubmitFpeInputSchema>

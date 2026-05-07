import { z } from "zod"

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

const Pagination = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
})

const PaginatedResponse = z.object({
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
})

// ============================================================================
// Deficiencies (HIM-BE-02)
// ============================================================================

export const DeficiencyTypeEnum = z.enum([
	"missing_discharge_summary",
	"missing_signature",
	"undocumented_procedure",
])

export const DeficiencyStatusEnum = z.enum(["open", "notified", "resolved", "dismissed"])

export const DeficiencySchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	deficiencyType: DeficiencyTypeEnum,
	sourceKind: z.enum(["encounter", "clinical_note", "operation_record"]).nullable().optional(),
	sourceId: z.string().uuid().nullable().optional(),
	ownerStaffId: z.string().uuid().nullable(),
	status: DeficiencyStatusEnum,
	detectedAt: dateOrString,
	resolvedAt: dateOrString.nullable(),
	resolvedByStaffId: z.string().uuid().nullable(),
	notes: z.string().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export const ListDeficienciesInputSchema = Pagination.extend({
	facilityId: z.string().uuid(),
	deficiencyType: DeficiencyTypeEnum.optional(),
	status: DeficiencyStatusEnum.optional(),
	ownerStaffId: z.string().uuid().optional(),
	ownerQuery: z.string().optional(),
	ageBucket: z.enum(["lt_7", "d7_14", "d14_30", "gt_30"]).optional(),
	sortBy: z
		.enum(["dischargeDatetime", "ageDays", "status", "deficiencyType", "patientName"])
		.optional(),
	sortDirection: z.enum(["asc", "desc"]).optional(),
})

export const DeficiencyNotificationHistoryItemSchema = z.object({
	id: z.string().uuid(),
	channel: z.enum(["email", "in_app", "sms"]),
	sentAt: dateOrString,
	sentByDisplayName: z.string().nullable().optional(),
})

export const DeficiencyWorklistItemSchema = DeficiencySchema.extend({
	patientName: z.string(),
	patientMrn: z.string(),
	dischargeDatetime: dateOrString.nullable(),
	ownerDisplayName: z.string().nullable(),
	ageDays: z.number().int().nonnegative(),
})

export const DeficiencyDetailSchema = DeficiencyWorklistItemSchema.extend({
	description: z.string(),
	notifications: z.array(DeficiencyNotificationHistoryItemSchema),
	canMarkResolved: z.boolean(),
	resolutionBlockedReason: z.string().nullable().optional(),
})

export const ListDeficienciesResponseSchema = PaginatedResponse.extend({
	deficiencies: z.array(DeficiencyWorklistItemSchema),
})

export const GetDeficiencyInputSchema = z.object({ id: z.string().uuid() })

export const NotifyDeficiencyInputSchema = z.object({
	id: z.string().uuid(),
	channel: z.enum(["email", "in_app", "sms"]),
})

export const MarkDeficiencyResolvedInputSchema = z.object({
	id: z.string().uuid(),
	notes: z.string().optional(),
})

export const ScanDeficienciesInputSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().optional(),
})

export const ScanDeficienciesResponseSchema = z.object({
	scanned: z.number(),
	created: z.number(),
})

// ============================================================================
// ICD-10 Coding (HIM-BE-03)
// ============================================================================

export const EncounterCodeSchema = z.object({
	id: z.string().uuid(),
	encounterId: z.string().uuid(),
	codeSystem: z.enum(["ICD-10", "RVS", "SNOMED"]),
	code: z.string(),
	display: z.string().nullable(),
	isPrimary: z.boolean(),
	linkedDiagnosisRef: z.string().nullable(),
	notes: z.string().nullable(),
	version: z.number().int(),
	signedByStaffId: z.string().uuid().nullable(),
	signedAt: dateOrString.nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export const DocumentedDiagnosisSchema = z.object({
	id: z.string(),
	sourceType: z.enum(["problem_list", "clinical_note"]),
	sourceId: z.string().uuid(),
	sourceLabel: z.string(),
	noteType: z.string().nullable(),
	diagnosis: z.string(),
	icdCode: z.string().nullable(),
	isPrimary: z.boolean(),
	noteExcerpt: z.string().nullable(),
	createdAt: dateOrString.nullable(),
})

export const CodeVersionHistoryItemSchema = z.object({
	id: z.string().uuid(),
	version: z.number().int(),
	amendmentReason: z.string().nullable(),
	createdByStaffId: z.string().uuid().nullable(),
	createdAt: dateOrString,
	replacedAt: dateOrString.nullable(),
})

export const ListCodesInputSchema = z.object({
	encounterId: z.string().uuid(),
})

export const ListCodesResponseSchema = z.object({
	codes: z.array(EncounterCodeSchema),
	signedAt: dateOrString.nullable(),
	currentVersion: z.number().int(),
	documentedDiagnoses: z.array(DocumentedDiagnosisSchema),
	versionHistory: z.array(CodeVersionHistoryItemSchema),
})

export const UpsertCodesInputSchema = z.object({
	encounterId: z.string().uuid(),
	codes: z.array(
		z.object({
			id: z.string().uuid().optional(),
			code: z.string().min(1).max(20),
			display: z.string().optional(),
			isPrimary: z.boolean().default(false),
			linkedDiagnosisRef: z.string().optional(),
			notes: z.string().optional(),
		})
	),
})

export const SignCodesInputSchema = z.object({
	encounterId: z.string().uuid(),
})

export const AmendCodesInputSchema = z.object({
	encounterId: z.string().uuid(),
	reason: z.string().min(1).max(500),
	codes: z.array(
		z.object({
			code: z.string().min(1).max(20),
			display: z.string().optional(),
			isPrimary: z.boolean().default(false),
			linkedDiagnosisRef: z.string().optional(),
			notes: z.string().optional(),
		})
	),
})

export const ValidateCodesInputSchema = z.object({
	encounterId: z.string().uuid(),
})

export const ValidateCodesResponseSchema = z.object({
	violations: z.array(
		z.object({
			path: z.string(),
			code: z.string().optional(),
			message: z.string(),
			suggestedReplacement: z.string().nullable().optional(),
		})
	),
	hasPrimary: z.boolean(),
	hasDeprecated: z.boolean(),
})

// ============================================================================
// Records Issuance Audit (HIM-BE-04)
// ============================================================================

export const RecordsAuditEntrySchema = z.object({
	id: z.string().uuid(),
	requestId: z.string().uuid(),
	patientId: z.string().uuid(),
	facilityId: z.string().uuid(),
	actorStaffId: z.string().uuid().nullable(),
	action: z.enum([
		"create",
		"dpa_consent",
		"identity_proof",
		"physician_signature",
		"payment_cleared",
		"release",
	]),
	recipient: z.string().nullable(),
	documentTypes: z.array(z.string()).nullable(),
	contentHashes: z.array(z.string()).nullable(),
	occurredAt: dateOrString,
})

export const ListRecordsAuditInputSchema = Pagination.extend({
	facilityId: z.string().uuid(),
	requestId: z.string().uuid().optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
	documentType: z.string().optional(),
	recipient: z.string().optional(),
})

export const ListRecordsAuditResponseSchema = PaginatedResponse.extend({
	entries: z.array(RecordsAuditEntrySchema),
})

export const CaptureDpaConsentInputSchema = z.object({
	requestId: z.string().uuid(),
	signatureUri: z.string().url(),
})

export const AttachIdentityProofInputSchema = z.object({
	requestId: z.string().uuid(),
	uri: z.string().url(),
	documentType: z.string().min(1),
	contentHash: z.string().min(1),
})

export const AttachPhysicianSignatureInputSchema = z.object({
	requestId: z.string().uuid(),
	uri: z.string().url(),
	contentHash: z.string().min(1),
})

export const MarkPaymentClearedInputSchema = z.object({
	requestId: z.string().uuid(),
	invoiceId: z.string().uuid(),
})

export const ReleaseRecordsInputSchema = z.object({
	requestId: z.string().uuid(),
	recipient: z.string().min(1),
	documentTypes: z.array(z.string()).min(1),
	contentHashes: z.array(z.string()).min(1),
})

// ============================================================================
// HAI Reconciliation (HIM-BE-05)
// ============================================================================

export const HaiTagTypeEnum = z.enum(["clabsi", "cauti", "vap", "ssi", "cdiff"])
export const HaiDecisionEnum = z.enum(["confirm", "reclassify", "dismiss"])

export const HaiReconciliationSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	haiTagId: z.string().uuid(),
	decision: HaiDecisionEnum,
	previousType: z.string().nullable(),
	newType: z.string().nullable(),
	reason: z.string().nullable(),
	decidedByStaffId: z.string().uuid().nullable(),
	decidedAt: dateOrString,
})

export const ListHaiInputSchema = Pagination.extend({
	facilityId: z.string().uuid(),
	haiType: HaiTagTypeEnum.optional(),
	wardId: z.string().uuid().optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
})

export const ListHaiResponseSchema = PaginatedResponse.extend({
	tags: z.array(
		z.object({
			id: z.string().uuid(),
			haiType: z.string(),
			status: z.string(),
			encounterId: z.string().uuid(),
			patientName: z.string(),
			wardName: z.string().nullable(),
			taggedByNurse: z.string().nullable(),
			linkedIcd10Code: z.string().nullable(),
			detectedAt: dateOrString,
		})
	),
})

export const ConfirmHaiInputSchema = z.object({
	haiTagId: z.string().uuid(),
	reason: z.string().optional(),
})
export const ReclassifyHaiInputSchema = z.object({
	haiTagId: z.string().uuid(),
	newType: HaiTagTypeEnum,
	reason: z.string().min(1),
})
export const DismissHaiInputSchema = z.object({
	haiTagId: z.string().uuid(),
	reason: z.string().min(1),
})

export const HaiReportInputSchema = z.object({
	facilityId: z.string().uuid(),
	periodStart: z.string(),
	periodEnd: z.string(),
	wardId: z.string().uuid().optional(),
})

export const HaiReportResponseSchema = z.object({
	periodStart: z.string(),
	periodEnd: z.string(),
	totalTags: z.number(),
	patientDays: z.number(),
	incidencePer1000PatientDays: z.number(),
	byType: z.record(z.string(), z.number()),
	byWard: z.record(z.string(), z.number()),
})

export const HaiExportInputSchema = HaiReportInputSchema.extend({
	format: z.enum(["pdf", "csv"]).default("pdf"),
})

export const HaiExportResponseSchema = z.object({
	uri: z.string(),
	format: z.enum(["pdf", "csv"]),
})

// Inferred types
export type Deficiency = z.infer<typeof DeficiencySchema>
export type EncounterCode = z.infer<typeof EncounterCodeSchema>
export type RecordsAuditEntry = z.infer<typeof RecordsAuditEntrySchema>
export type HaiReconciliation = z.infer<typeof HaiReconciliationSchema>

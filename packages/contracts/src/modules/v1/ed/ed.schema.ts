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

export const TriageAcuityScaleEnum = z.enum(["esi", "ats", "ctas"])
export const PreEncounterStatusEnum = z.enum(["active", "merged", "cancelled"])
export const EdQueueStatusEnum = z.enum(["waiting", "triage", "being_seen", "disposition"])
export const EdDispositionEnum = z.enum(["admit", "discharge", "transfer", "deceased"])

export const InboundTriageChannelEnum = z.enum(["phone", "video"])
export const InboundTriageTransportEnum = z.enum([
	"ambulance",
	"private_vehicle",
	"walk_in",
	"motorcycle_ambulance",
])
export const InboundTriageStatusEnum = z.enum(["queued", "arrived", "cancelled"])

export const ResourceNeedsSchema = z.object({
	bed: z.boolean().default(false),
	codeTeam: z.boolean().default(false),
	equipment: z.array(z.string()).default([]),
})

// ============================================================================
// Pre-Encounter Schema — full resource
// ============================================================================

export const PreEncounterSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	traumaAlias: z.string(),
	chiefComplaint: z.string().nullable(),
	triageAcuityScale: TriageAcuityScaleEnum.nullable(),
	triageAcuityLevel: z.number().int().min(1).max(5).nullable(),
	triageDatetime: dateOrString.nullable(),
	triageStaffId: z.string().uuid().nullable(),
	status: PreEncounterStatusEnum,
	mergedToEncounterId: z.string().uuid().nullable(),
	mergedAt: dateOrString.nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type PreEncounter = z.infer<typeof PreEncounterSchema>

// ============================================================================
// Pre-Encounter Detail (with triage staff name)
// ============================================================================

export const PreEncounterDetailSchema = PreEncounterSchema.extend({
	triageStaffName: z.string().nullable(),
})

export type PreEncounterDetail = z.infer<typeof PreEncounterDetailSchema>

// ============================================================================
// Create Pre-Encounter (Triage)
// ============================================================================

export const CreatePreEncounterSchema = z.object({
	facilityId: z.string().uuid(),
	chiefComplaint: z.string().max(2000).optional(),
	triageAcuityScale: TriageAcuityScaleEnum,
	triageAcuityLevel: z.number().int().min(1).max(5),
	triageStaffId: z.string().uuid(),
	temperature: z.number().min(30).max(45).optional(),
	bpSystolic: z.number().int().positive().optional(),
	bpDiastolic: z.number().int().positive().optional(),
	heartRate: z.number().int().positive().optional(),
	respiratoryRate: z.number().int().positive().optional(),
	spo2: z.number().min(0).max(100).optional(),
	painScore: z.number().int().min(0).max(10).optional(),
	weight: z.number().positive().optional(),
	height: z.number().positive().optional(),
})

export type CreatePreEncounterInput = z.infer<typeof CreatePreEncounterSchema>

// ============================================================================
// Update Pre-Encounter (update triage info)
// ============================================================================

export const UpdatePreEncounterSchema = z.object({
	id: z.string().uuid(),
	chiefComplaint: z.string().max(2000).optional(),
	triageAcuityScale: TriageAcuityScaleEnum.optional(),
	triageAcuityLevel: z.number().int().min(1).max(5).optional(),
})

export type UpdatePreEncounterInput = z.infer<typeof UpdatePreEncounterSchema>

// ============================================================================
// Pre-Encounter ID
// ============================================================================

export const PreEncounterIdSchema = z.object({
	id: z.string().uuid(),
})

// ============================================================================
// Chart Merge
// ============================================================================

export const MergePreEncounterSchema = z.object({
	preEncounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	encounterType: z.enum(["inpatient", "outpatient", "emergency"]).default("emergency"),
	admittingStaffId: z.string().uuid(),
	attendingStaffId: z.string().uuid().optional(),
	bedId: z.string().uuid().optional(),
})

export type MergePreEncounterInput = z.infer<typeof MergePreEncounterSchema>

export const MergePreviewSchema = z.object({
	preEncounter: PreEncounterDetailSchema,
	patientName: z.string(),
	patientMrn: z.string(),
	clinicalRecordCounts: z.object({
		vitalSigns: z.number(),
		clinicalNotes: z.number(),
		medicationOrders: z.number(),
		marEntries: z.number(),
		labOrders: z.number(),
		imagingOrders: z.number(),
		tarEntries: z.number(),
		ioEntries: z.number(),
	}),
})

export type MergePreview = z.infer<typeof MergePreviewSchema>

export const MergeResultSchema = z.object({
	encounterId: z.string().uuid(),
	preEncounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	mergedRecordCounts: z.object({
		vitalSigns: z.number(),
		clinicalNotes: z.number(),
		medicationOrders: z.number(),
		marEntries: z.number(),
		labOrders: z.number(),
		imagingOrders: z.number(),
		tarEntries: z.number(),
		ioEntries: z.number(),
	}),
})

export type MergeResult = z.infer<typeof MergeResultSchema>

// ============================================================================
// ED Queue Item
// ============================================================================

export const EdInboundHandoffSchema = z.object({
	id: z.string().uuid(),
	callerName: z.string(),
	patientLocation: z.string(),
	transportMode: InboundTriageTransportEnum,
	channelType: InboundTriageChannelEnum,
	etaMinutes: z.number().int(),
	etaAt: dateOrString,
	arrivedAt: dateOrString.nullable(),
	assessmentNotes: z.string(),
	resourceNeeds: ResourceNeedsSchema,
})

export const EdQueueItemSchema = z.object({
	id: z.string().uuid(),
	type: z.enum(["pre_encounter", "encounter"]),
	patientName: z.string(),
	patientMrn: z.string().nullable(),
	traumaAlias: z.string().nullable(),
	acuityLevel: z.number().int().min(1).max(5).nullable(),
	acuityScale: TriageAcuityScaleEnum.nullable(),
	chiefComplaint: z.string().nullable(),
	arrivalTime: dateOrString,
	waitMinutes: z.number(),
	queueStatus: EdQueueStatusEnum,
	assignedProvider: z.string().nullable(),
	bedNumber: z.string().nullable(),
	wardName: z.string().nullable(),
	oecbEligible: z.boolean().default(false),
	inboundHandoff: EdInboundHandoffSchema.nullable(),
})

export type EdQueueItem = z.infer<typeof EdQueueItemSchema>

// ============================================================================
// ED Queue List
// ============================================================================

export const EdQueueListSchema = z.object({
	facilityId: z.string().uuid(),
})

export const EdQueueResponseSchema = z.object({
	items: z.array(EdQueueItemSchema),
	summary: z.object({
		total: z.number(),
		waiting: z.number(),
		triage: z.number(),
		beingSeen: z.number(),
		disposition: z.number(),
		acuity1: z.number(),
		acuity2: z.number(),
	}),
})

export type EdQueueResponse = z.infer<typeof EdQueueResponseSchema>

// ============================================================================
// Pre-Encounter List (for facility)
// ============================================================================

export const PreEncounterListSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid(),
	status: PreEncounterStatusEnum.optional(),
})

export const PreEncounterListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(PreEncounterDetailSchema),
})

// ============================================================================
// ED Disposition
// ============================================================================

export const EdDispositionSchema = z.object({
	encounterId: z.string().uuid(),
	disposition: EdDispositionEnum,
	oecbEligible: z.boolean().default(false),
	admitBedId: z.string().uuid().optional(),
	admitWardId: z.string().uuid().optional(),
})

export type EdDispositionInput = z.infer<typeof EdDispositionSchema>

export const EdDispositionResultSchema = z.object({
	encounterId: z.string().uuid(),
	disposition: EdDispositionEnum,
	oecbEligible: z.boolean(),
	inpatientEncounterId: z.string().uuid().nullable(),
})

// ============================================================================
// Update Queue Status (drag card on tracking board)
// ============================================================================

export const UpdateQueueStatusSchema = z.object({
	id: z.string().uuid(),
	type: z.enum(["pre_encounter", "encounter"]),
	queueStatus: EdQueueStatusEnum,
})

// ============================================================================
// Inbound Triage Record — full resource
// ============================================================================

export const InboundTriageRecordSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	callerName: z.string(),
	patientLocation: z.string(),
	transportMode: InboundTriageTransportEnum,
	channelType: InboundTriageChannelEnum,
	etaMinutes: z.number().int(),
	etaAt: dateOrString,
	provisionalAcuityLevel: z.number().int().min(1).max(5),
	acuityScale: TriageAcuityScaleEnum,
	assessmentNotes: z.string(),
	resourceNeeds: ResourceNeedsSchema,
	status: InboundTriageStatusEnum,
	arrivedAt: dateOrString.nullable(),
	preEncounterId: z.string().uuid().nullable(),
	triageStaffId: z.string().uuid().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type InboundTriageRecord = z.infer<typeof InboundTriageRecordSchema>

// ============================================================================
// Create Inbound Triage
// ============================================================================

export const CreateInboundTriageSchema = z.object({
	facilityId: z.string().uuid(),
	callerName: z.string().min(1).max(500),
	patientLocation: z.string().min(1).max(1000),
	transportMode: InboundTriageTransportEnum,
	channelType: InboundTriageChannelEnum,
	etaMinutes: z.number().int().min(0).max(480),
	provisionalAcuityLevel: z.number().int().min(1).max(5),
	acuityScale: TriageAcuityScaleEnum,
	assessmentNotes: z.string().max(5000).optional(),
	resourceNeeds: ResourceNeedsSchema.optional(),
	triageStaffId: z.string().uuid(),
})

export type CreateInboundTriageInput = z.infer<typeof CreateInboundTriageSchema>

// ============================================================================
// List Inbound Triage
// ============================================================================

export const InboundTriageListSchema = z.object({
	facilityId: z.string().uuid(),
	status: InboundTriageStatusEnum.optional(),
})

export const InboundTriageListResponseSchema = z.array(InboundTriageRecordSchema)

// ============================================================================
// Mark Arrived / Cancel
// ============================================================================

export const InboundTriageIdSchema = z.object({
	id: z.string().uuid(),
})

export const MarkArrivedResultSchema = z.object({
	id: z.string().uuid(),
	preEncounterId: z.string().uuid(),
})

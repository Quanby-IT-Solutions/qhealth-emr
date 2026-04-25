import { z } from "zod"

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

// ============================================================================
// Medical Records Request Schemas (SLA-017)
// ============================================================================

export const MedicalRecordsRequestTypeEnum = z.enum([
	"chart_release",
	"medical_certificate",
	"discharge_summary_copy",
	"laboratory_results",
])

export const MedicalRecordsRequestStatusEnum = z.enum([
	"pending",
	"processing",
	"completed",
	"rejected",
])

export const RequestedByRelationshipEnum = z.enum([
	"self",
	"parent",
	"guardian",
	"legal_representative",
	"other",
])

export const MedicalRecordsRequestSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	requestType: MedicalRecordsRequestTypeEnum,
	requestedByName: z.string(),
	requestedByRelationship: RequestedByRelationshipEnum.nullable(),
	purpose: z.string().nullable(),
	status: MedicalRecordsRequestStatusEnum,
	processedByStaffId: z.string().uuid().nullable(),
	completedAt: dateOrString.nullable(),
	/** SLA-017 (SLA-012): set when payment is received for the medical records */
	paidAt: dateOrString.nullable().optional(),
	/** SLA-020: Flow 7 Step 1 — identity was verified at point of request receipt */
	identityVerified: z.boolean().default(false),
	/** SLA-020: Flow 7 Step 1 — DPA consent was captured at receipt */
	dpaConsentObtained: z.boolean().default(false),
	/** SLA-020: Flow 7 Step 3 — staff member who released the records */
	releasedByStaffId: z.string().uuid().nullable().optional(),
	/** SLA-020: Flow 7 Step 3 — when records were released to requestor */
	releasedAt: dateOrString.nullable().optional(),
	rejectionReason: z.string().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export const MedicalRecordsRequestIdSchema = z.object({ id: z.string().uuid() })

export const CreateMedicalRecordsRequestSchema = z.object({
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	encounterId: z.string().uuid().optional(),
	requestType: MedicalRecordsRequestTypeEnum,
	requestedByName: z.string().min(1),
	requestedByRelationship: RequestedByRelationshipEnum.optional(),
	purpose: z.string().optional(),
	/** SLA-020: Flow 7 Step 1 evidence captured at receipt */
	identityVerified: z.boolean().optional(),
	dpaConsentObtained: z.boolean().optional(),
})

export const UpdateMedicalRecordsRequestSchema = z.object({
	id: z.string().uuid(),
	status: MedicalRecordsRequestStatusEnum.optional(),
	processedByStaffId: z.string().uuid().optional(),
	rejectionReason: z.string().optional(),
})

// SLA-017: mark a medical records request as paid
export const MarkMedicalRecordsPaidInputSchema = z.object({
	id: z.string().uuid(),
	/** ISO datetime of payment; defaults to now if omitted */
	paidAt: z.string().datetime().optional(),
})

export const MarkMedicalRecordsPaidResponseSchema = z.object({
	id: z.string().uuid(),
	paidAt: z.string().nullable(),
})

// SLA-020: mark medical records as released (Flow 7 Step 3 authoritative evidence)
export const MarkMedicalRecordsReleasedInputSchema = z.object({
	id: z.string().uuid(),
	/** UUID of the staff member who physically released the records */
	releasedByStaffId: z.string().uuid(),
	/** ISO datetime of release; defaults to now if omitted */
	releasedAt: z.string().datetime().optional(),
})

export const MarkMedicalRecordsReleasedResponseSchema = z.object({
	id: z.string().uuid(),
	releasedByStaffId: z.string().uuid().nullable(),
	releasedAt: z.string().nullable(),
})

export const ListMedicalRecordsRequestsSchema = z.object({
	facilityId: z.string().uuid(),
	patientId: z.string().uuid().optional(),
	encounterId: z.string().uuid().optional(),
	requestType: MedicalRecordsRequestTypeEnum.optional(),
	status: MedicalRecordsRequestStatusEnum.optional(),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
})

export const ListMedicalRecordsRequestsResponseSchema = z.object({
	data: z.array(MedicalRecordsRequestSchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
})

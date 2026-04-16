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
// Encounter types & status
// ============================================================================

export const EncounterTypeEnum = z.enum(["inpatient", "outpatient", "emergency", "telemedicine"])
export const EncounterStatusEnum = z.enum(["active", "discharged", "closed", "cancelled"])
export const DispositionEnum = z.enum(["home", "transfer", "deceased", "ama"])

// ============================================================================
// Encounter Schema — full encounter resource
// ============================================================================

export const EncounterSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	encounterType: EncounterTypeEnum,
	status: EncounterStatusEnum,
	chiefComplaint: z.string().nullable(),
	admittingStaffId: z.string().uuid().nullable(),
	attendingStaffId: z.string().uuid().nullable(),
	bedId: z.string().uuid().nullable(),
	admissionDatetime: dateOrString,
	dischargeDatetime: dateOrString.nullable(),
	disposition: DispositionEnum.nullable(),
	oecbEligible: z.boolean(),
	mergedFromPreEncounterId: z.string().uuid().nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export type Encounter = z.infer<typeof EncounterSchema>

// ============================================================================
// Encounter with relations (for detail view)
// ============================================================================

export const EncounterTransferSchema = z.object({
	id: z.string().uuid(),
	fromWardId: z.string().uuid().nullable(),
	fromBedId: z.string().uuid().nullable(),
	toWardId: z.string().uuid().nullable(),
	toBedId: z.string().uuid().nullable(),
	transferReason: z.string().nullable(),
	orderingStaffId: z.string().uuid().nullable(),
	transferredAt: dateOrString,
	fromWardName: z.string().nullable(),
	fromBedNumber: z.string().nullable(),
	toWardName: z.string().nullable(),
	toBedNumber: z.string().nullable(),
	orderingStaffName: z.string().nullable(),
})

export const EncounterDetailSchema = EncounterSchema.extend({
	patientName: z.string(),
	patientMrn: z.string(),
	patientDateOfBirth: z.string(),
	patientSex: z.enum(["male", "female", "other"]),
	admittingStaffName: z.string().nullable(),
	attendingStaffName: z.string().nullable(),
	wardName: z.string().nullable(),
	bedNumber: z.string().nullable(),
	transfers: z.array(EncounterTransferSchema),
})

export type EncounterDetail = z.infer<typeof EncounterDetailSchema>

// ============================================================================
// Create Encounter
// ============================================================================

export const CreateEncounterSchema = z.object({
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	encounterType: EncounterTypeEnum,
	chiefComplaint: z.string().max(2000).optional(),
	admittingStaffId: z.string().uuid(),
	attendingStaffId: z.string().uuid().optional(),
	bedId: z.string().uuid().optional(),
	admissionDatetime: z.string().optional(),
})

export type CreateEncounterInput = z.infer<typeof CreateEncounterSchema>

// ============================================================================
// List Encounters for Patient
// ============================================================================

export const EncounterListSchema = PaginationInputSchema.extend({
	patientId: z.string().uuid(),
	facilityId: z.string().uuid(),
	status: EncounterStatusEnum.optional(),
})

export const EncounterListItemSchema = z.object({
	id: z.string().uuid(),
	encounterType: EncounterTypeEnum,
	status: EncounterStatusEnum,
	chiefComplaint: z.string().nullable(),
	admissionDatetime: dateOrString,
	dischargeDatetime: dateOrString.nullable(),
	attendingStaffName: z.string().nullable(),
	wardName: z.string().nullable(),
	bedNumber: z.string().nullable(),
})

export const EncounterListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(EncounterListItemSchema),
})

// ============================================================================
// Get Encounter by ID
// ============================================================================

export const EncounterIdSchema = z.object({
	id: z.string().uuid(),
})

// ============================================================================
// Transfer Encounter
// ============================================================================

export const TransferEncounterSchema = z.object({
	encounterId: z.string().uuid(),
	toWardId: z.string().uuid(),
	toBedId: z.string().uuid(),
	transferReason: z.string().max(2000).optional(),
	orderingStaffId: z.string().uuid(),
})

export type TransferEncounterInput = z.infer<typeof TransferEncounterSchema>

// ============================================================================
// Discharge Encounter (Inpatient)
// ============================================================================

export const DischargeEncounterSchema = z.object({
	encounterId: z.string().uuid(),
	disposition: DispositionEnum,
	dischargeDatetime: z.string().optional(),
})

export type DischargeEncounterInput = z.infer<typeof DischargeEncounterSchema>

// ============================================================================
// Close Encounter (Outpatient)
// ============================================================================

export const CloseEncounterSchema = z.object({
	encounterId: z.string().uuid(),
})

// ============================================================================
// Discharge Checklist (computed on read)
// ============================================================================

export const DischargeChecklistItemSchema = z.object({
	key: z.string(),
	label: z.string(),
	category: z.enum(["clinical", "billing"]),
	status: z.enum(["complete", "incomplete", "not_applicable"]),
	responsibleRole: z.string(),
})

export const DischargeChecklistSchema = z.object({
	encounterId: z.string().uuid(),
	encounterType: EncounterTypeEnum,
	items: z.array(DischargeChecklistItemSchema),
	allComplete: z.boolean(),
})

export type DischargeChecklist = z.infer<typeof DischargeChecklistSchema>

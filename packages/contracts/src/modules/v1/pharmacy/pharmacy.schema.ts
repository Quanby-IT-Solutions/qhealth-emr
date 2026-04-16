import { z } from "zod"

// ============================================================================
// Helpers
// ============================================================================

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

const PaginationInputSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(25),
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

export const DispensingStatusEnum = z.enum([
	"pending",
	"in_progress",
	"dispensed",
	"partially_dispensed",
	"on_hold",
	"cancelled",
])
export type DispensingStatus = z.infer<typeof DispensingStatusEnum>

export const DispensingTypeEnum = z.enum(["inpatient", "opd", "er", "discharge"])
export type DispensingType = z.infer<typeof DispensingTypeEnum>

export const PharmacyLocationEnum = z.enum(["main", "satellite", "opd", "er", "icu"])
export type PharmacyLocation = z.infer<typeof PharmacyLocationEnum>

// ============================================================================
// Dispensing Queue Item Schema
// ============================================================================

export const DispensingQueueItemSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	medOrderId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	preEncounterId: z.string().uuid().nullable(),
	patientId: z.string().uuid(),

	// Patient info
	patientName: z.string(),
	patientMrn: z.string(),

	// Medication info
	genericName: z.string(),
	brandName: z.string().nullable(),
	dose: z.string(),
	doseUnit: z.string(),
	doseForm: z.string(),
	route: z.string(),
	frequency: z.string(),
	quantity: z.number().int().positive(),

	// Order info
	isControlledSubstance: z.boolean(),
	pdeaSchedule: z.string().nullable(),
	isPrn: z.boolean(),
	specialInstructions: z.string().nullable(),
	orderingPhysicianName: z.string().nullable(),

	// Dispensing info
	dispensingType: DispensingTypeEnum,
	pharmacyLocation: PharmacyLocationEnum,
	status: DispensingStatusEnum,
	priority: z.enum(["routine", "urgent", "stat"]),

	// Staff info
	assignedPharmacistId: z.string().uuid().nullable(),
	assignedPharmacistName: z.string().nullable(),

	// Timestamps
	queuedAt: dateOrString,
	startedAt: dateOrString.nullable(),
	completedAt: dateOrString.nullable(),

	// Waiting time (computed)
	waitMinutes: z.number().int().nonnegative().nullable(),
})

export type DispensingQueueItem = z.infer<typeof DispensingQueueItemSchema>

// ============================================================================
// Dispensing Queue Query
// ============================================================================

export const DispensingQueueQuerySchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid().optional(),
	pharmacyLocation: PharmacyLocationEnum.optional(),
	dispensingType: DispensingTypeEnum.optional(),
	status: DispensingStatusEnum.optional(),
	priority: z.enum(["routine", "urgent", "stat"]).optional(),
	assignedPharmacistId: z.string().uuid().optional(),
	isControlledSubstance: z.coerce.boolean().optional(),
})

export type DispensingQueueQuery = z.infer<typeof DispensingQueueQuerySchema>

export const DispensingQueueResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(DispensingQueueItemSchema),
	stats: z.object({
		pending: z.number(),
		inProgress: z.number(),
		urgent: z.number(),
		stat: z.number(),
		controlled: z.number(),
	}),
})

export type DispensingQueueResponse = z.infer<typeof DispensingQueueResponseSchema>

// ============================================================================
// Start Dispensing
// ============================================================================

export const StartDispensingSchema = z.object({
	queueItemId: z.string().uuid(),
})

export type StartDispensing = z.infer<typeof StartDispensingSchema>

// ============================================================================
// Complete Dispensing
// ============================================================================

export const CompleteDispensingSchema = z.object({
	queueItemId: z.string().uuid(),
	quantityDispensed: z.number().int().positive(),
	batchNumber: z.string().optional(),
	expiryDate: z.string().optional(),
	notes: z.string().optional(),
})

export type CompleteDispensing = z.infer<typeof CompleteDispensingSchema>

// ============================================================================
// Partial Dispensing
// ============================================================================

export const PartialDispensingSchema = z.object({
	queueItemId: z.string().uuid(),
	quantityDispensed: z.number().int().positive(),
	reason: z.string(),
	batchNumber: z.string().optional(),
	expiryDate: z.string().optional(),
})

export type PartialDispensing = z.infer<typeof PartialDispensingSchema>

// ============================================================================
// Hold/Cancel Dispensing
// ============================================================================

export const HoldDispensingSchema = z.object({
	queueItemId: z.string().uuid(),
	reason: z.string().min(1),
})

export type HoldDispensing = z.infer<typeof HoldDispensingSchema>

export const CancelDispensingSchema = z.object({
	queueItemId: z.string().uuid(),
	reason: z.string().min(1),
})

export type CancelDispensing = z.infer<typeof CancelDispensingSchema>

// ============================================================================
// Dispensing Record Schema (completed dispensing)
// ============================================================================

export const DispensingRecordSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	queueItemId: z.string().uuid(),
	medOrderId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	patientId: z.string().uuid(),

	// Medication info
	genericName: z.string(),
	brandName: z.string().nullable(),
	dose: z.string(),
	quantityOrdered: z.number().int().positive(),
	quantityDispensed: z.number().int().positive(),

	// Batch info
	batchNumber: z.string().nullable(),
	expiryDate: z.string().nullable(),

	// Status
	isPartial: z.boolean(),
	isControlledSubstance: z.boolean(),

	// Staff
	dispensedByStaffId: z.string().uuid(),
	dispensedByStaffName: z.string(),
	verifiedByStaffId: z.string().uuid().nullable(),
	verifiedByStaffName: z.string().nullable(),

	// Timestamps
	dispensedAt: dateOrString,
	notes: z.string().nullable(),
})

export type DispensingRecord = z.infer<typeof DispensingRecordSchema>

// ============================================================================
// List Dispensing Records
// ============================================================================

export const DispensingRecordListSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid().optional(),
	encounterId: z.string().uuid().optional(),
	patientId: z.string().uuid().optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
	isControlledSubstance: z.coerce.boolean().optional(),
})

export type DispensingRecordListInput = z.infer<typeof DispensingRecordListSchema>

export const DispensingRecordListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(DispensingRecordSchema),
})

export type DispensingRecordListResponse = z.infer<typeof DispensingRecordListResponseSchema>

// ============================================================================
// OPD Pickup Confirmation
// ============================================================================

export const OpdPickupSchema = z.object({
	dispensingRecordId: z.string().uuid(),
	pickedUpByName: z.string(),
	pickedUpByRelation: z.string().optional(),
	signatureData: z.string().optional(),
	idPresented: z.string().optional(),
})

export type OpdPickup = z.infer<typeof OpdPickupSchema>

export const OpdPickupResultSchema = z.object({
	success: z.boolean(),
	pickupRecordId: z.string().uuid(),
	pickedUpAt: z.string(),
})

export type OpdPickupResult = z.infer<typeof OpdPickupResultSchema>

// ============================================================================
// Get Queue Item by ID
// ============================================================================

export const QueueItemIdSchema = z.object({
	id: z.string().uuid(),
})

export type QueueItemId = z.infer<typeof QueueItemIdSchema>

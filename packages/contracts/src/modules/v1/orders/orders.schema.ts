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

export const MedOrderStatusEnum = z.enum([
	"pending_verification",
	"verified",
	"rejected",
	"modified",
	"active",
	"completed",
	"discontinued",
	"cancelled",
])

export const LabOrderStatusEnum = z.enum([
	"pending",
	"ordered",
	"collected",
	"in_progress",
	"resulted",
	"completed",
	"cancelled",
])

export const ImagingOrderStatusEnum = z.enum([
	"ordered",
	"scheduled",
	"in_progress",
	"completed",
	"cancelled",
])

export const OrderPriorityEnum = z.enum(["routine", "urgent", "stat"])

export const ImagingModalityEnum = z.enum(["xray", "ct", "mri", "ultrasound", "other"])

export const VerificationActionEnum = z.enum(["approved", "rejected", "modified"])

export const PrescriptionStatusEnum = z.enum(["draft", "signed", "issued"])

export const CdsAlertTypeEnum = z.enum([
	"allergy_hard_block",
	"allergy_soft_block",
	"formulary_warning",
	"high_alert",
	"s2_license_block",
])

// ============================================================================
// CDS Alert Schema
// ============================================================================

export const CdsAlertSchema = z.object({
	type: CdsAlertTypeEnum,
	severity: z.enum(["hard_block", "soft_block", "warning", "info"]),
	message: z.string(),
	details: z.record(z.string(), z.unknown()).optional(),
})

export const CdsEvaluateInputSchema = z.object({
	patientId: z.string().uuid(),
	genericName: z.string(),
	formularyItemId: z.string().uuid().optional(),
	isControlledSubstance: z.boolean().optional(),
	orderingStaffId: z.string().uuid(),
	facilityId: z.string().uuid(),
})

export const CdsEvaluateResponseSchema = z.object({
	alerts: z.array(CdsAlertSchema),
	canProceed: z.boolean(),
	requiresOverride: z.boolean(),
	requiresDoubleVerification: z.boolean(),
})

// ============================================================================
// Medication Order Schemas
// ============================================================================

export const MedOrderSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	preEncounterId: z.string().uuid().nullable(),
	formularyItemId: z.string().uuid().nullable(),
	genericName: z.string(),
	brandName: z.string().nullable(),
	rxnormCode: z.string().nullable(),
	dose: z.string(),
	doseUnit: z.string(),
	doseForm: z.string(),
	route: z.string(),
	frequency: z.string(),
	durationDays: z.number().nullable(),
	specialInstructions: z.string().nullable(),
	isPrn: z.boolean(),
	prnReason: z.string().nullable(),
	isControlledSubstance: z.boolean(),
	pdeaSchedule: z.string().nullable(),
	pdeaTrancheNumber: z.number().nullable(),
	pdeaTrancheTotal: z.number().nullable(),
	status: MedOrderStatusEnum,
	orderingStaffId: z.string().uuid(),
	orderingStaffName: z.string().nullable(),
	cdsAlerts: z.unknown(),
	cdsOverrides: z.unknown(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export const MedOrderIdSchema = z.object({ id: z.string().uuid() })

export const CreateMedOrderSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().optional(),
	preEncounterId: z.string().uuid().optional(),
	formularyItemId: z.string().uuid().optional(),
	genericName: z.string().min(1),
	brandName: z.string().optional(),
	rxnormCode: z.string().optional(),
	dose: z.string().min(1),
	doseUnit: z.string().min(1),
	doseForm: z.string().min(1),
	route: z.string().min(1),
	frequency: z.string().min(1),
	durationDays: z.number().int().positive().optional(),
	specialInstructions: z.string().optional(),
	isPrn: z.boolean().optional(),
	prnReason: z.string().optional(),
	isControlledSubstance: z.boolean().optional(),
	pdeaSchedule: z.string().optional(),
	pdeaTrancheNumber: z.number().int().positive().optional(),
	pdeaTrancheTotal: z.number().int().positive().optional(),
	cdsAlerts: z.unknown().optional(),
	cdsOverrides: z.unknown().optional(),
})

export const UpdateMedOrderSchema = z.object({
	id: z.string().uuid(),
	dose: z.string().optional(),
	doseUnit: z.string().optional(),
	doseForm: z.string().optional(),
	route: z.string().optional(),
	frequency: z.string().optional(),
	durationDays: z.number().int().positive().optional(),
	specialInstructions: z.string().optional(),
	isPrn: z.boolean().optional(),
	prnReason: z.string().optional(),
	status: MedOrderStatusEnum.optional(),
})

export const DiscontinueMedOrderSchema = z.object({
	id: z.string().uuid(),
})

export const MedOrderListSchema = PaginationInputSchema.extend({
	encounterId: z.string().uuid().optional(),
	preEncounterId: z.string().uuid().optional(),
	status: MedOrderStatusEnum.optional(),
})

export const MedOrderListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(MedOrderSchema),
})

// ============================================================================
// Lab Order Schemas
// ============================================================================

export const LabOrderSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	preEncounterId: z.string().uuid().nullable(),
	loincCode: z.string().nullable(),
	panelCode: z.string().nullable(),
	testName: z.string(),
	panelName: z.string().nullable(),
	priority: OrderPriorityEnum,
	status: LabOrderStatusEnum,
	specimenType: z.string().nullable(),
	orderingStaffId: z.string().uuid(),
	orderingStaffName: z.string().nullable(),
	collectionDatetime: dateOrString.nullable(),
	resultedDatetime: dateOrString.nullable(),
	results: z.unknown(),
	cdsAlerts: z.unknown(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export const LabOrderIdSchema = z.object({ id: z.string().uuid() })

export const CreateLabOrderSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().optional(),
	preEncounterId: z.string().uuid().optional(),
	loincCode: z.string().optional(),
	panelCode: z.string().optional(),
	testName: z.string().min(1),
	panelName: z.string().optional(),
	priority: OrderPriorityEnum.optional(),
	specimenType: z.string().optional(),
	clinicalIndication: z.string().optional(),
})

export const LabOrderListSchema = PaginationInputSchema.extend({
	encounterId: z.string().uuid().optional(),
	preEncounterId: z.string().uuid().optional(),
	status: LabOrderStatusEnum.optional(),
})

export const LabOrderListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(LabOrderSchema),
})

// ============================================================================
// Imaging Order Schemas
// ============================================================================

export const ImagingOrderSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	preEncounterId: z.string().uuid().nullable(),
	modality: ImagingModalityEnum,
	bodyPart: z.string(),
	clinicalIndication: z.string().nullable(),
	priority: OrderPriorityEnum,
	status: ImagingOrderStatusEnum,
	orderingStaffId: z.string().uuid(),
	orderingStaffName: z.string().nullable(),
	scheduledDatetime: dateOrString.nullable(),
	completedDatetime: dateOrString.nullable(),
	report: z.string().nullable(),
	structuredResults: z.unknown(),
	cdsAlerts: z.unknown(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export const ImagingOrderIdSchema = z.object({ id: z.string().uuid() })

export const CreateImagingOrderSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().optional(),
	preEncounterId: z.string().uuid().optional(),
	modality: ImagingModalityEnum,
	bodyPart: z.string().min(1),
	clinicalIndication: z.string().optional(),
	priority: OrderPriorityEnum.optional(),
})

export const ImagingOrderListSchema = PaginationInputSchema.extend({
	encounterId: z.string().uuid().optional(),
	preEncounterId: z.string().uuid().optional(),
	status: ImagingOrderStatusEnum.optional(),
})

export const ImagingOrderListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(ImagingOrderSchema),
})

// ============================================================================
// Verification Schemas
// ============================================================================

export const VerificationSchema = z.object({
	id: z.string().uuid(),
	medicationOrderId: z.string().uuid(),
	action: VerificationActionEnum,
	pharmacistStaffId: z.string().uuid(),
	pharmacistStaffName: z.string().nullable(),
	rejectionReason: z.string().nullable(),
	modificationNotes: z.string().nullable(),
	verifiedAt: dateOrString,
	createdAt: dateOrString,
})

export const VerifyOrderSchema = z.object({
	medicationOrderId: z.string().uuid(),
	action: VerificationActionEnum,
	rejectionReason: z.string().optional(),
	modificationNotes: z.string().optional(),
})

export const VerificationQueueSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid(),
	status: MedOrderStatusEnum.optional(),
	priority: OrderPriorityEnum.optional(),
	search: z.string().optional(),
	isControlledSubstance: z.coerce.boolean().optional(),
})

export const VerificationQueueResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(MedOrderSchema),
})

// ============================================================================
// Prescription Schemas
// ============================================================================

export const PrescriptionSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	medicationOrderId: z.string().uuid(),
	patientId: z.string().uuid(),
	prescriberStaffId: z.string().uuid(),
	prescriberStaffName: z.string().nullable(),
	prcLicenseNumber: z.string(),
	ptrNumber: z.string(),
	pdeaS2License: z.string().nullable(),
	prescriptionContent: z.unknown(),
	status: PrescriptionStatusEnum,
	signedAt: dateOrString.nullable(),
	createdAt: dateOrString,
})

export const PrescriptionIdSchema = z.object({ id: z.string().uuid() })

export const CreatePrescriptionSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	medicationOrderId: z.string().uuid(),
	patientId: z.string().uuid(),
})

export const SignPrescriptionSchema = z.object({
	id: z.string().uuid(),
})

export const PrescriptionListSchema = PaginationInputSchema.extend({
	encounterId: z.string().uuid().optional(),
	patientId: z.string().uuid().optional(),
})

export const PrescriptionListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(PrescriptionSchema),
})

// ============================================================================
// Active Orders (cross-module)
// ============================================================================

export const ActiveOrdersSchema = z.object({
	encounterId: z.string().uuid(),
})

export const ActiveOrdersResponseSchema = z.object({
	medicationOrders: z.array(MedOrderSchema),
	labOrders: z.array(LabOrderSchema),
	imagingOrders: z.array(ImagingOrderSchema),
})

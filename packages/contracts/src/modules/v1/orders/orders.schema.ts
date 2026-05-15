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

export const MedOrderFrequencyEnum = z.enum([
	"stat",
	"once",
	"q4h",
	"q6h",
	"q8h",
	"q12h",
	"daily",
	"bid",
	"tid",
	"qid",
	"prn",
])

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
	"formulary_restricted",
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
	genericName: z.string().trim().min(1),
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

export const MedOrderSafetyTypeEnum = z.enum([
	"drug_interaction",
	"dose_range",
	"weight_based",
	"renal_adjustment",
	"hepatic_adjustment",
	"allergy_cross_reactivity",
	"black_box_warning",
	"duplicate_therapy",
	"pregnancy_category",
])

export const MedOrderSafetySeverityEnum = z.enum(["critical", "major", "moderate", "minor", "info"])

export const MedOrderSafetyCheckSchema = z.object({
	id: z.string(),
	type: MedOrderSafetyTypeEnum,
	severity: MedOrderSafetySeverityEnum,
	title: z.string(),
	message: z.string(),
	details: z
		.object({
			interactingDrug: z.string().optional(),
			recommendedDose: z.string().optional(),
			actualDose: z.string().optional(),
			adjustedDose: z.string().optional(),
			allergen: z.string().optional(),
			category: z.string().optional(),
		})
		.optional(),
	isHardBlock: z.boolean(),
	requiresOverride: z.boolean(),
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
	firstDoseAt: dateOrString.nullable(),
	durationDays: z.number().nullable(),
	specialInstructions: z.string().nullable(),
	isPrn: z.boolean(),
	prnReason: z.string().nullable(),
	isControlledSubstance: z.boolean(),
	pdeaSchedule: z.string().nullable(),
	pdeaTrancheNumber: z.number().nullable(),
	pdeaTrancheTotal: z.number().nullable(),
	parentOrderId: z.string().uuid().nullable(), // For PDEA tranching parent-child relationship
	isTranche: z.boolean(),
	status: MedOrderStatusEnum,
	orderingStaffId: z.string().uuid(),
	orderingStaffName: z.string().nullable(),
	patientId: z.string().uuid().nullable().optional(),
	patientName: z.string().nullable().optional(),
	patientMrn: z.string().nullable().optional(),
	patientDateOfBirth: dateOrString.nullable().optional(),
	patientWeight: z.number().nullable().optional(),
	patientCreatinine: z.number().nullable().optional(),
	priority: OrderPriorityEnum.optional(),
	alertCount: z.number().int().nonnegative().optional(),
	criticalAlertCount: z.number().int().nonnegative().optional(),
	receivedAt: dateOrString.optional(),
	safetyChecks: z.array(MedOrderSafetyCheckSchema).optional(),
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
	patientId: z.string().uuid().optional(),
	formularyItemId: z.string().uuid().optional(),
	genericName: z.string().trim().min(1),
	brandName: z.string().optional(),
	rxnormCode: z.string().optional(),
	dose: z.string().min(1),
	doseUnit: z.string().min(1),
	doseForm: z.string().min(1),
	route: z.string().min(1),
	frequency: MedOrderFrequencyEnum,
	firstDoseAt: z.string().datetime().optional(),
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
	frequency: MedOrderFrequencyEnum.optional(),
	firstDoseAt: z.string().datetime().optional(),
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
	patientId: z.string().uuid().nullable().optional(),
	patientName: z.string().nullable().optional(),
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
	hasCriticalValues: z.boolean().default(false),
	/** SLA-016: set when lab acknowledges specimen receipt */
	specimenReceivedAt: dateOrString.nullable().optional(),
	/** SLA-016: set when billing clears payment for the lab order */
	billingClearedAt: dateOrString.nullable().optional(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export const LabOrderIdSchema = z.object({ id: z.string().uuid() })

// SLA-016: update lab order — status transitions auto-set specimenReceivedAt;
// billingClearedAt is provided explicitly when billing clears the order.
export const UpdateLabOrderSchema = z.object({
	id: z.string().uuid(),
	status: LabOrderStatusEnum.optional(),
	collectionDatetime: dateOrString.optional(),
	resultedDatetime: dateOrString.optional(),
	results: z.unknown().optional(),
	/** Explicit billing-clearance timestamp (Flow 3 Step 2). Set by billing staff when payment clears. */
	billingClearedAt: dateOrString.optional(),
})

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
	facilityId: z.string().uuid().optional(),
	encounterId: z.string().uuid().optional(),
	preEncounterId: z.string().uuid().optional(),
	status: LabOrderStatusEnum.optional(),
	priority: OrderPriorityEnum.optional(),
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
	patientId: z.string().uuid().nullable().optional(),
	patientName: z.string().nullable().optional(),
	patientMrn: z.string().nullable().optional(),
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
	/** SLA-016: set when radiology begins the study */
	studyStartedAt: dateOrString.nullable().optional(),
	/** SLA-019: set when radiology acknowledges receipt of the imaging order (Flow 3 Step 1 authoritative checkpoint) */
	imagingOrderReceivedAt: dateOrString.nullable().optional(),
	/** SLA-016: set when billing clears payment for the imaging order */
	billingClearedAt: dateOrString.nullable().optional(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export const ImagingOrderIdSchema = z.object({ id: z.string().uuid() })

// SLA-016/SLA-019: update imaging order — status transition to "in_progress" auto-sets studyStartedAt;
// imagingOrderReceivedAt is provided explicitly when radiology acknowledges receipt (Flow 3 Step 1);
// billingClearedAt is provided explicitly when billing clears the order (Flow 3 Step 2).
export const UpdateImagingOrderSchema = z.object({
	id: z.string().uuid(),
	status: ImagingOrderStatusEnum.optional(),
	scheduledDatetime: dateOrString.optional(),
	completedDatetime: dateOrString.optional(),
	report: z.string().optional(),
	structuredResults: z.unknown().optional(),
	/** SLA-019: explicit receipt timestamp — set when radiology acknowledges order receipt (Flow 3 Step 1). */
	imagingOrderReceivedAt: dateOrString.optional(),
	/** Explicit billing-clearance timestamp (Flow 3 Step 2). Set by billing staff when payment clears. */
	billingClearedAt: dateOrString.optional(),
})

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
	facilityId: z.string().uuid().optional(),
	encounterId: z.string().uuid().optional(),
	preEncounterId: z.string().uuid().optional(),
	status: ImagingOrderStatusEnum.optional(),
	priority: OrderPriorityEnum.optional(),
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

export const HighAlertVerificationSchema = z.object({
	id: z.string().uuid(),
	medicationOrderId: z.string().uuid(),
	requestingStaffId: z.string().uuid(),
	verifyingStaffId: z.string().uuid(),
	verifiedAt: dateOrString,
	notes: z.string().nullable(),
	createdAt: dateOrString,
})

export const CreateHighAlertVerificationSchema = z.object({
	medicationOrderId: z.string().uuid(),
	verifyingStaffId: z.string().uuid(),
	notes: z.string().optional(),
})

export const GetHighAlertVerificationSchema = z.object({
	medicationOrderId: z.string().uuid(),
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

// ============================================================================
// PDEA License Check
// ============================================================================

export const PdeaLicenseCheckSchema = z.object({
	staffId: z.string().uuid(),
	facilityId: z.string().uuid(),
})

export type PdeaLicenseCheck = z.infer<typeof PdeaLicenseCheckSchema>

export const PdeaLicenseStatusSchema = z.object({
	staffId: z.string().uuid(),
	staffName: z.string(),
	hasLicense: z.boolean(),
	licenseNumber: z.string().nullable(),
	expiryDate: z.string().nullable(),
	isExpired: z.boolean(),
	daysUntilExpiry: z.number().nullable(),
	canPrescribeControlled: z.boolean(),
	errorMessage: z.string().nullable(),
})

export type PdeaLicenseStatus = z.infer<typeof PdeaLicenseStatusSchema>

// ============================================================================
// Tranching Preview (for controlled substances > 90 days)
// ============================================================================

export const TranchePreviewItemSchema = z.object({
	trancheNumber: z.number().int().positive(),
	startDate: z.string(),
	endDate: z.string(),
	durationDays: z.number().int().positive(),
	quantityPerTranche: z.number().int().positive().nullable(),
	noRefill: z.boolean(),
})

export type TranchePreviewItem = z.infer<typeof TranchePreviewItemSchema>

export const TranchePreviewInputSchema = z.object({
	facilityId: z.string().uuid(),
	genericName: z.string(),
	dose: z.string(),
	frequency: z.string(),
	durationDays: z.number().int().positive(),
	pdeaSchedule: z.string(),
	startDate: z.string().optional(), // Defaults to today
})

export type TranchePreviewInput = z.infer<typeof TranchePreviewInputSchema>

export const TranchePreviewResponseSchema = z.object({
	requiresTranching: z.boolean(),
	reason: z.string().nullable(),
	totalDays: z.number().int().positive(),
	maxDaysPerTranche: z.number().int().positive(),
	tranches: z.array(TranchePreviewItemSchema),
})

export type TranchePreviewResponse = z.infer<typeof TranchePreviewResponseSchema>

// ============================================================================
// Create Tranched Orders (after preview confirmation)
// ============================================================================

export const CreateTranchedOrdersSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().optional(),
	preEncounterId: z.string().uuid().optional(),
	patientId: z.string().uuid().optional(),
	formularyItemId: z.string().uuid().optional(),
	genericName: z.string().trim().min(1),
	brandName: z.string().optional(),
	rxnormCode: z.string().optional(),
	dose: z.string().min(1),
	doseUnit: z.string().min(1),
	doseForm: z.string().min(1),
	route: z.string().min(1),
	frequency: MedOrderFrequencyEnum,
	firstDoseAt: z.string().datetime().optional(),
	durationDays: z.number().int().positive(),
	specialInstructions: z.string().optional(),
	isPrn: z.boolean().optional(),
	prnReason: z.string().optional(),
	pdeaSchedule: z.string(),
	startDate: z.string().optional(),
	cdsAlerts: z.unknown().optional(),
	cdsOverrides: z.unknown().optional(),
})

export type CreateTranchedOrders = z.infer<typeof CreateTranchedOrdersSchema>

export const TranchedOrdersResponseSchema = z.object({
	parentOrder: MedOrderSchema,
	childOrders: z.array(MedOrderSchema),
	totalTranches: z.number().int().positive(),
})

export type TranchedOrdersResponse = z.infer<typeof TranchedOrdersResponseSchema>

// ============================================================================
// Get Child Orders (for a parent order)
// ============================================================================

export const ParentOrderIdSchema = z.object({
	parentOrderId: z.string().uuid(),
})

export type ParentOrderId = z.infer<typeof ParentOrderIdSchema>

// ============================================================================
// Dispense Log Schemas
// ============================================================================

export const DispenseLogSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	medicationOrderId: z.string().uuid(),
	patientId: z.string().uuid().nullable(),
	dispensedQuantity: z.string(),
	quantityUnit: z.string(),
	lotNumber: z.string().nullable(),
	expiryDate: z.string().nullable(),
	counselingNotes: z.string().nullable(),
	patientEducation: z.unknown(),
	pharmacistStaffId: z.string().uuid(),
	dispensedAt: dateOrString,
	createdAt: dateOrString,
})

export const DispenseOrderInputSchema = z.object({
	medicationOrderId: z.string().uuid(),
	dispensedQuantity: z.coerce.number().positive(),
	quantityUnit: z.string().min(1),
	lotNumber: z.string().optional(),
	expiryDate: z.string().optional(),
	counselingNotes: z.string().optional(),
	patientEducation: z.array(z.string()).optional(),
})

export const DispenseLogListSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid().optional(),
	medicationOrderId: z.string().uuid().optional(),
	patientId: z.string().uuid().optional(),
	date: z.string().optional(),
})

export const DispenseLogListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(DispenseLogSchema),
})

export const DispenseLogIdSchema = z.object({ id: z.string().uuid() })

// ============================================================================
// OPD Prescription Search Schemas
// ============================================================================

export const OpdPrescriptionItemSchema = z.object({
	id: z.string().uuid(),
	genericName: z.string(),
	brandName: z.string().nullable(),
	dose: z.string(),
	doseUnit: z.string(),
	doseForm: z.string(),
	route: z.string(),
	frequency: z.string(),
	quantity: z.number(),
	durationDays: z.number().nullable(),
	isControlledSubstance: z.boolean(),
	pdeaSchedule: z.string().nullable(),
	status: z.string(),
	unitPrice: z.number(),
	totalPrice: z.number(),
	dispensed: z.boolean(),
})

export const OpdPrescriptionSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	patientName: z.string(),
	patientMrn: z.string(),
	patientDateOfBirth: z.string().nullable(),
	prescriberName: z.string().nullable(),
	prescriberPrc: z.string(),
	prescriptionNumber: z.string(),
	prescribedAt: dateOrString,
	status: PrescriptionStatusEnum,
	items: z.array(OpdPrescriptionItemSchema),
	estimatedTotal: z.number(),
	philhealthPin: z.string().nullable(),
	philhealthCoverage: z.number(),
	outOfPocket: z.number(),
})

export const OpdPrescriptionSearchSchema = z.object({
	q: z.string().min(1),
	facilityId: z.string().uuid().optional(),
})

export const OpdPrescriptionQueueItemSchema = z.object({
	id: z.string().uuid(),
	prescriptionNumber: z.string(),
	patientName: z.string(),
	patientMrn: z.string(),
	patientDateOfBirth: z.string().nullable(),
	prescriberName: z.string().nullable(),
	prescribedAt: dateOrString,
	status: PrescriptionStatusEnum,
	medicationSummary: z.string(),
})

export const OpdPrescriptionListInputSchema = z.object({
	facilityId: z.string().uuid().optional(),
	status: z.enum(["signed", "issued", "all"]).optional().default("signed"),
	page: z.coerce.number().int().positive().optional().default(1),
	limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

export const OpdPrescriptionListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(OpdPrescriptionQueueItemSchema),
})

// ============================================================================
// OPD Dispense Schemas
// ============================================================================

export const OpdDispenseItemInputSchema = z.object({
	medicationOrderId: z.string().uuid(),
	dispensedQuantity: z.coerce.number().positive(),
	lotNumber: z.string().optional(),
})

export const OpdDispenseInputSchema = z.object({
	prescriptionId: z.string().uuid(),
	facilityId: z.string().uuid(),
	items: z.array(OpdDispenseItemInputSchema).min(1),
	counselingNotes: z.string().optional(),
	patientEducation: z.array(z.string()).optional(),
})

export const OpdDispenseRecordSchema = z.object({
	id: z.string().uuid(),
	prescriptionId: z.string().uuid(),
	facilityId: z.string().uuid(),
	patientId: z.string().uuid().nullable(),
	patientName: z.string().nullable(),
	items: z.array(
		z.object({
			medicationOrderId: z.string().uuid(),
			genericName: z.string(),
			dispensedQuantity: z.string(),
			lotNumber: z.string().nullable(),
		})
	),
	counselingNotes: z.string().nullable(),
	pharmacistStaffId: z.string().uuid(),
	dispensedAt: dateOrString,
})

export const OpdDispenseHistorySchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid(),
	date: z.string().optional(),
})

export const OpdDispenseHistoryResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(OpdDispenseRecordSchema),
})

// ============================================================================
// Counseling Log Schemas
// ============================================================================

export const CounselingChecklistItemSchema = z.object({
	item: z.string(),
	checked: z.boolean(),
})

export const CounselingLogSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().nullable(),
	patientId: z.string().uuid().nullable(),
	medicationOrderId: z.string().uuid().nullable(),
	checklistItems: z.array(CounselingChecklistItemSchema),
	patientSignature: z.string().nullable(),
	pharmacistStaffId: z.string().uuid(),
	counseledAt: dateOrString,
	createdAt: dateOrString,
})

export const SaveCounselingLogInputSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().optional(),
	patientId: z.string().uuid().optional(),
	medicationOrderId: z.string().uuid().optional(),
	checklistItems: z.array(CounselingChecklistItemSchema).min(1),
	patientSignature: z.string().optional(),
})

export const CounselingLogListSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid().optional(),
	encounterId: z.string().uuid().optional(),
	patientId: z.string().uuid().optional(),
})

export const CounselingLogListResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(CounselingLogSchema),
})

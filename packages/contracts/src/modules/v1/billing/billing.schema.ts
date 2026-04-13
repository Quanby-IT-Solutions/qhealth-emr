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

export const ChargeSourceTypeEnum = z.enum([
	"auto_medication",
	"auto_lab",
	"auto_imaging",
	"manual",
])

export const ChargeMasterCategoryEnum = z.enum([
	"laboratory",
	"imaging",
	"medication",
	"procedure",
	"room",
	"other",
])

export const InvoiceStatusEnum = z.enum([
	"draft",
	"finalized",
	"paid",
	"partially_paid",
])

export const PaymentMethodEnum = z.enum([
	"cash",
	"philhealth",
	"hmo",
	"credit_card",
	"bank_transfer",
	"other",
])

export const Cf4StatusEnum = z.enum([
	"draft",
	"submitted",
	"approved",
	"rejected",
	"resubmitted",
])

export const EligibilityCheckStatusEnum = z.enum([
	"pending",
	"eligible",
	"ineligible",
	"error",
])

// ============================================================================
// Charge Master Items
// ============================================================================

export const ChargeMasterItemSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	itemCode: z.string(),
	description: z.string(),
	category: ChargeMasterCategoryEnum,
	unitPrice: z.string(),
	rvsCode: z.string().nullable(),
	isActive: z.boolean(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export const ListChargeMasterInputSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid(),
	category: ChargeMasterCategoryEnum.optional(),
	search: z.string().optional(),
	isActive: z.coerce.boolean().optional(),
})

export const ListChargeMasterResponseSchema = PaginatedResponseSchema.extend({
	items: z.array(ChargeMasterItemSchema),
})

// ============================================================================
// Charges
// ============================================================================

export const ChargeSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	chargeMasterItemId: z.string().uuid().nullable(),
	description: z.string(),
	quantity: z.string(),
	unitPrice: z.string(),
	totalAmount: z.string(),
	sourceType: ChargeSourceTypeEnum,
	sourceOrderId: z.string().uuid().nullable(),
	createdByStaffId: z.string().uuid(),
	createdAt: dateOrString,
})

export const ListChargesInputSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	sourceType: ChargeSourceTypeEnum.optional(),
})

export const ListChargesResponseSchema = PaginatedResponseSchema.extend({
	charges: z.array(ChargeSchema),
})

export const CreateChargeInputSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	chargeMasterItemId: z.string().uuid().optional(),
	description: z.string().min(1).max(500),
	quantity: z.coerce.number().positive().default(1),
	unitPrice: z.coerce.number().positive(),
})

export const UpdateChargeInputSchema = z.object({
	id: z.string().uuid(),
	quantity: z.coerce.number().positive().optional(),
	description: z.string().min(1).max(500).optional(),
})

export const DeleteChargeInputSchema = z.object({
	id: z.string().uuid(),
})

// ============================================================================
// Invoices
// ============================================================================

export const InvoiceLineItemSchema = z.object({
	id: z.string().uuid(),
	invoiceId: z.string().uuid(),
	chargeId: z.string().uuid().nullable(),
	description: z.string(),
	quantity: z.string(),
	unitPrice: z.string(),
	totalAmount: z.string(),
	createdAt: dateOrString,
})

export const InvoiceSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	invoiceNumber: z.string(),
	subtotal: z.string(),
	philhealthCoverage: z.string(),
	patientResponsibility: z.string(),
	status: InvoiceStatusEnum,
	finalizedAt: dateOrString.nullable(),
	createdByStaffId: z.string().uuid(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
	lineItems: z.array(InvoiceLineItemSchema).optional(),
})

export const ListInvoicesInputSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid().optional(),
	patientId: z.string().uuid().optional(),
	status: InvoiceStatusEnum.optional(),
})

export const ListInvoicesResponseSchema = PaginatedResponseSchema.extend({
	invoices: z.array(InvoiceSchema),
})

export const GetInvoiceInputSchema = z.object({
	id: z.string().uuid(),
})

export const GenerateInvoiceInputSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	philhealthCoverage: z.coerce.number().min(0).default(0),
})

export const FinalizeInvoiceInputSchema = z.object({
	id: z.string().uuid(),
})

// ============================================================================
// Payments
// ============================================================================

export const PaymentSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	invoiceId: z.string().uuid(),
	amount: z.string(),
	paymentMethod: PaymentMethodEnum,
	referenceNumber: z.string().nullable(),
	receivedByStaffId: z.string().uuid(),
	paymentDate: z.string(),
	notes: z.string().nullable(),
	createdAt: dateOrString,
})

export const ListPaymentsInputSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid(),
	invoiceId: z.string().uuid(),
})

export const ListPaymentsResponseSchema = PaginatedResponseSchema.extend({
	payments: z.array(PaymentSchema),
})

export const RecordPaymentInputSchema = z.object({
	facilityId: z.string().uuid(),
	invoiceId: z.string().uuid(),
	amount: z.coerce.number().positive(),
	paymentMethod: PaymentMethodEnum,
	referenceNumber: z.string().optional(),
	paymentDate: z.string(),
	notes: z.string().optional(),
})

// ============================================================================
// CF4 Claims
// ============================================================================

export const Cf4ClaimSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	invoiceId: z.string().uuid().nullable(),
	claimNumber: z.string().nullable(),
	status: Cf4StatusEnum,
	submissionData: z.record(z.string(), z.unknown()).nullable(),
	responseData: z.record(z.string(), z.unknown()).nullable(),
	submittedAt: dateOrString.nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export const GetCf4InputSchema = z.object({
	id: z.string().uuid(),
})

export const GenerateCf4InputSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
})

export const Cf4PreviewSchema = z.object({
	cf4: Cf4ClaimSchema,
	extractedData: z.object({
		chiefComplaint: z.string().nullable(),
		briefHistory: z.string().nullable(),
		vitalSigns: z.record(z.string(), z.unknown()).nullable(),
		diagnoses: z.array(z.object({
			code: z.string(),
			displayName: z.string(),
		})),
		procedures: z.array(z.object({
			rvsCode: z.string().nullable(),
			description: z.string(),
		})),
		managementPlan: z.string().nullable(),
	}),
	missingFields: z.array(z.string()),
})

export const FinalizeCf4InputSchema = z.object({
	id: z.string().uuid(),
	submissionData: z.record(z.string(), z.unknown()).optional(),
})

// ============================================================================
// Eligibility Checks (CEWS)
// ============================================================================

export const EligibilityCheckSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	philhealthMemberId: z.string(),
	checkStatus: EligibilityCheckStatusEnum,
	checkResponse: z.record(z.string(), z.unknown()).nullable(),
	checkedAt: dateOrString,
	createdAt: dateOrString,
})

export const CheckEligibilityInputSchema = z.object({
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	philhealthMemberId: z.string().min(1),
})

export const EligibilityResponseSchema = z.object({
	eligibilityCheck: EligibilityCheckSchema,
	result: z.object({
		isEligible: z.boolean(),
		benefitType: z.string().nullable(),
		remainingCoverage: z.number().nullable(),
		message: z.string(),
	}),
})

// ============================================================================
// Billing Status (for discharge checklist)
// ============================================================================

export const BillingStatusInputSchema = z.object({
	encounterId: z.string().uuid(),
})

export const BillingStatusResponseSchema = z.object({
	areChargesCaptured: z.boolean(),
	isInvoiceGenerated: z.boolean(),
	totalCharges: z.number(),
	invoiceStatus: InvoiceStatusEnum.nullable(),
})

// ============================================================================
// Unbilled Encounters
// ============================================================================

export const UnbilledEncountersInputSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid(),
})

export const UnbilledEncounterSchema = z.object({
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	patientName: z.string(),
	mrn: z.string(),
	encounterType: z.string(),
	admittedAt: dateOrString,
	totalCharges: z.number(),
	chargeCount: z.number(),
})

export const UnbilledEncountersResponseSchema = PaginatedResponseSchema.extend({
	encounters: z.array(UnbilledEncounterSchema),
})

// ============================================================================
// Inferred Types
// ============================================================================

export type ChargeMasterItem = z.infer<typeof ChargeMasterItemSchema>
export type Charge = z.infer<typeof ChargeSchema>
export type Invoice = z.infer<typeof InvoiceSchema>
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>
export type Payment = z.infer<typeof PaymentSchema>
export type Cf4Claim = z.infer<typeof Cf4ClaimSchema>
export type EligibilityCheck = z.infer<typeof EligibilityCheckSchema>

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

// BIL-BE-03: PhilHealth ticket spec — replaces legacy credit_card / bank_transfer / other.
// Frontend payment-entry radio renders these exact methods (Cash, Card, GCash, HMO, Malasakit,
// PhilHealth, COE — Certificate of Eligibility).
export const PaymentMethodEnum = z.enum([
	"cash",
	"card",
	"gcash",
	"hmo",
	"malasakit",
	"philhealth",
	"coe",
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
	facilityId: z.string().uuid().optional(),
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
	facilityId: z.string().uuid().optional(),
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
	unitPrice: z.coerce.number().nonnegative().optional(),
	description: z.string().min(1).max(500).optional(),
	overrideReason: z.string().min(1).max(500).optional(),
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
	discount: z.string().optional(),
	discountType: z.enum(["NONE", "SENIOR", "PWD", "SOLO_PARENT", "MANUAL"]).optional(),
	discountReason: z.string().nullable().optional(),
	vatAmount: z.string().optional(),
	totalAmount: z.string().optional(),
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
	hmoProvider: z.string().nullable().optional(),
	hmoClaimNumber: z.string().nullable().optional(),
	hmoPercentageCovered: z.string().nullable().optional(),
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
	hmoProvider: z.string().optional(),
	hmoClaimNumber: z.string().optional(),
	hmoPercentageCovered: z.coerce.number().min(0).max(100).optional(),
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
	resubmitCount: z.number().int().default(0).optional(),
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
// CF5 / DRG Shadow Billing
// ============================================================================

export const Cf5StatusEnum = z.enum(["draft", "submitted", "approved", "rejected"])

export const DrgCodeSchema = z.object({
	code: z.string(),
	description: z.string(),
	mdrg: z.string(),
	weight: z.number(),
	baseRate: z.number(),
})

export const Cf5AssignmentSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	drgCode: z.string(),
	drgDescription: z.string(),
	mdrg: z.string(),
	drgWeight: z.number(),
	computedRate: z.number(),
	status: Cf5StatusEnum,
	approvedBy: z.string().uuid().nullable(),
	approvedAt: dateOrString.nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export const GetCf5InputSchema = z.object({
	encounterId: z.string().uuid(),
})

export const SearchDrgInputSchema = z.object({
	search: z.string().min(1),
})

export const AssignDrgInputSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	drgCode: z.string().min(1),
})

export const ApproveCf5InputSchema = z.object({
	id: z.string().uuid(),
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
// Statement of Account (SOA)
// ============================================================================

export const SoaStatusEnum = z.enum(["draft", "final"])

export const SoaLineSchema = z.object({
	id: z.string().uuid(),
	category: z.string(),
	description: z.string(),
	quantity: z.number(),
	unitPrice: z.number(),
	totalAmount: z.number(),
})

export const StatementOfAccountSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	patientName: z.string(),
	patientMrn: z.string(),
	soaNumber: z.string(),
	lines: z.array(SoaLineSchema),
	subtotal: z.number(),
	philhealthDeduction: z.number(),
	seniorPwdDiscount: z.number(),
	malasakitDeduction: z.number(),
	otherDeductions: z.number(),
	netAmount: z.number(),
	status: SoaStatusEnum,
	generatedAt: dateOrString,
})

export const GetSoaInputSchema = z.object({
	encounterId: z.string().uuid(),
})

export const GenerateSoaInputSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
})

export const FinalizeSoaInputSchema = z.object({
	id: z.string().uuid(),
})

// ============================================================================
// Konsulta Capitation
// ============================================================================

export const KonsultaStatusEnum = z.enum(["active", "exhausted", "inactive"])

export const KonsultaBenefitSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	philhealthMemberId: z.string(),
	benefitYear: z.number().int(),
	benefitPeriodStart: z.string(),
	benefitPeriodEnd: z.string(),
	consultationsAllowed: z.number().int(),
	consultationsUsed: z.number().int(),
	medicationsAllowed: z.number().int(),
	medicationsUsed: z.number().int(),
	labAllowed: z.number().int(),
	labUsed: z.number().int(),
	status: KonsultaStatusEnum,
})

export const GetKonsultaBenefitInputSchema = z.object({
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
})

export const RecordKonsultaVisitInputSchema = z.object({
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	encounterId: z.string().uuid(),
	visitType: z.enum(["consultation", "medication", "laboratory"]),
})

// ============================================================================
// Malasakit Center
// ============================================================================

export const MalasakitSourceEnum = z.enum([
	"doh_medisure",
	"hospital_fund",
	"lgu",
	"pcso",
	"dswd",
	"private_donation",
	"other",
])

export const MalasakitStatusEnum = z.enum(["pending", "approved", "disbursed", "denied"])

export const MalasakitAssistanceSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	source: MalasakitSourceEnum,
	amount: z.number(),
	purpose: z.string(),
	status: MalasakitStatusEnum,
	approvedBy: z.string().uuid().nullable(),
	approvedAt: dateOrString.nullable(),
	notes: z.string().nullable(),
	createdAt: dateOrString,
})

export const MalasakitSummarySchema = z.object({
	items: z.array(MalasakitAssistanceSchema),
	totalRequested: z.number(),
	totalApproved: z.number(),
	totalDisbursed: z.number(),
})

export const GetMalasakitInputSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
})

export const AddMalasakitInputSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	source: MalasakitSourceEnum,
	amount: z.number().positive(),
	purpose: z.string().min(1),
	notes: z.string().optional(),
})

export const UpdateMalasakitStatusInputSchema = z.object({
	id: z.string().uuid(),
	status: z.enum(["approved", "disbursed", "denied"]),
})

// ============================================================================
// eSOA (Electronic Statement of Account) - PDF/XML export
// ============================================================================

export const EsoaFormatEnum = z.enum(["pdf", "xml", "json"])
export type EsoaFormat = z.infer<typeof EsoaFormatEnum>

export const GenerateEsoaInputSchema = z.object({
	encounterId: z.string().uuid(),
	format: EsoaFormatEnum.default("pdf"),
	includeItemizedBreakdown: z.boolean().default(true),
	includePhilhealthDetails: z.boolean().default(true),
})

export const EsoaResponseSchema = z.object({
	format: EsoaFormatEnum,
	fileName: z.string(),
	contentType: z.string(),
	// Base64-encoded file content (for PDF/XML) or raw JSON
	data: z.string(),
	generatedAt: dateOrString,
	// Metadata for verification
	soaNumber: z.string(),
	encounterId: z.string().uuid(),
	netAmount: z.number(),
})

// ============================================================================
// CF5 with Billing Items - link billing charges to CF5 claim lines
// ============================================================================

export const Cf5BillingItemSchema = z.object({
	chargeId: z.string().uuid(),
	description: z.string(),
	quantity: z.number(),
	unitPrice: z.number(),
	totalAmount: z.number(),
	rvsCode: z.string().nullable(),
	icdCode: z.string().nullable(),
	isPhilhealthCovered: z.boolean(),
})

export const Cf5SurgicalProcedureReadinessSchema = z.object({
	operationRecordId: z.string().uuid(),
	procedureLabel: z.string(),
	operationRecordSigned: z.boolean(),
	primaryCodeCount: z.number().int(),
	adjunctCodeCount: z.number().int(),
	isReady: z.boolean(),
})

export const Cf5SurgicalReadinessSchema = z.object({
	isReady: z.boolean(),
	missingProcedureLabels: z.array(z.string()),
	procedures: z.array(Cf5SurgicalProcedureReadinessSchema),
})

export const Cf5WithBillingSchema = z.object({
	cf5: Cf5AssignmentSchema,
	billingItems: z.array(Cf5BillingItemSchema),
	totalCharges: z.number(),
	philhealthCoverage: z.number(),
	patientResponsibility: z.number(),
	approvalRequired: z.boolean(),
	surgicalReadiness: Cf5SurgicalReadinessSchema,
})

export const GetCf5WithBillingInputSchema = z.object({
	encounterId: z.string().uuid(),
})

export const LinkChargeToIcdInputSchema = z.object({
	chargeId: z.string().uuid(),
	icdCode: z.string(),
})

// ============================================================================
// CEWS Real-Time Check (Community Employment and Welfare System)
// ============================================================================

export const CewsCheckInputSchema = z.object({
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	// Alternative lookup by ID
	philhealthMemberId: z.string().optional(),
	nationalId: z.string().optional(),
})

export const CewsStatusEnum = z.enum(["active", "inactive", "pending", "not_found"])
export type CewsStatus = z.infer<typeof CewsStatusEnum>

export const CewsBenefitSchema = z.object({
	benefitType: z.string(),
	benefitAmount: z.number().nullable(),
	startDate: z.string().nullable(),
	endDate: z.string().nullable(),
	status: z.string(),
})

export const CewsResponseSchema = z.object({
	status: CewsStatusEnum,
	// Whether patient qualifies for indigency benefits
	isIndigent: z.boolean(),
	// Listahanan score (poverty database)
	listahananStatus: z.string().nullable(),
	listahananScore: z.number().nullable(),
	// Active benefits from various sources
	activeBenefits: z.array(CewsBenefitSchema),
	// When the check was performed
	checkedAt: dateOrString,
	// Message/notes from the CEWS system
	message: z.string().nullable(),
})

// ============================================================================
// BIL-BE-02: Mark Ready for Invoicing & Service Catalog Search
// ============================================================================

export const MarkReadyForInvoicingInputSchema = z.object({
	encounterId: z.string().uuid(),
	facilityId: z.string().uuid(),
})

export const MarkReadyForInvoicingResponseSchema = z.object({
	success: z.boolean(),
	encounterId: z.string().uuid(),
	chargeCount: z.number().int(),
})

export const ServiceCatalogItemSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	code: z.string(),
	description: z.string(),
	category: ChargeMasterCategoryEnum,
	unitPrice: z.number(),
	rvsCode: z.string().optional(),
	isActive: z.boolean(),
})

export const ServiceCatalogSearchInputSchema = PaginationInputSchema.extend({
	query: z.string().optional(),
	category: ChargeMasterCategoryEnum.optional(),
	facilityId: z.string().uuid(),
})

export const ServiceCatalogSearchResponseSchema = PaginatedResponseSchema.extend({
	items: z.array(ServiceCatalogItemSchema),
})

// ============================================================================
// BIL-BE-03: Apply Discount, Issue Receipt, Malasakit Payment
// ============================================================================

export const DiscountTypeEnum = z.enum(["NONE", "SENIOR", "PWD", "SOLO_PARENT", "MANUAL"])
export type DiscountType = z.infer<typeof DiscountTypeEnum>

export const PaymentSourceEnum = z.enum([
	"CASH",
	"CARD",
	"GCASH",
	"HMO",
	"MALASAKIT",
	"PHILHEALTH",
	"COE",
])
export type PaymentSource = z.infer<typeof PaymentSourceEnum>

export const ApplyDiscountInputSchema = z.object({
	invoiceId: z.string().uuid(),
	type: DiscountTypeEnum,
	reason: z.string().optional(),
	amount: z.coerce.number().nonnegative().optional(),
})

export const ReceiptSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	paymentId: z.string().uuid(),
	receiptNumber: z.string(),
	fiscalYear: z.number().int(),
	pdfUri: z.string().nullable(),
	issuedAt: dateOrString,
	issuedByStaffId: z.string().uuid(),
})

export const IssueReceiptInputSchema = z.object({
	paymentId: z.string().uuid(),
})

export const RecordMalasakitPaymentInputSchema = z.object({
	invoiceId: z.string().uuid(),
	malasakitCaseId: z.string(),
	amount: z.coerce.number().positive(),
	reference: z.string().optional(),
})

// ============================================================================
// BIL-BE-04: CF4 Preview, Status Poll, Resubmit
// ============================================================================

export const Cf4PreviewXmlSchema = z.object({
	id: z.string().uuid(),
	xml: z.string(),
	status: Cf4StatusEnum,
})

export const PollCf4StatusInputSchema = z.object({
	id: z.string().uuid(),
})

export const Cf4StatusLogEntrySchema = z.object({
	id: z.string().uuid(),
	claimId: z.string().uuid(),
	status: Cf4StatusEnum,
	philhealthRef: z.string().nullable().optional(),
	changedAt: dateOrString,
})

export const PollCf4StatusResponseSchema = z.object({
	id: z.string().uuid(),
	status: Cf4StatusEnum,
	statusLog: z.array(Cf4StatusLogEntrySchema),
})

export const ResubmitCf4InputSchema = z.object({
	id: z.string().uuid(),
	reason: z.string().min(1),
})

// ============================================================================
// BIL-BE-07: CEWS Verify, Snapshot, List Snapshots
// ============================================================================

export const CewsVerifyInputSchema = z.object({
	memberPin: z.string().regex(/^\d{12}$/, "Member PIN must be exactly 12 digits"),
	encounterId: z.string().uuid().optional(),
})

export const CewsMembershipSchema = z.object({
	memberPin: z.string(),
	memberName: z.string().nullable(),
	status: z.enum(["active", "lapsed", "suspended", "service_unavailable"]),
	benefitBalance: z.string().nullable(),
	dependents: z.array(
		z.object({
			name: z.string(),
			relationship: z.string(),
			pin: z.string().nullable(),
		})
	),
	verifiedAt: dateOrString,
	serviceUnavailable: z.boolean().default(false),
})

export const CewsSnapshotInputSchema = z.object({
	encounterId: z.string().uuid(),
	memberPin: z.string(),
	memberName: z.string().nullable().optional(),
	status: z.enum(["active", "lapsed", "suspended", "service_unavailable"]),
	benefitBalance: z.coerce.number().nullable().optional(),
	dependentsJson: z.any().optional(),
	rawResponse: z.any().optional(),
})

export const CewsSnapshotSchema = z.object({
	id: z.string().uuid(),
	encounterId: z.string().uuid(),
	memberPin: z.string(),
	memberName: z.string().nullable(),
	status: z.string(),
	benefitBalance: z.string().nullable(),
	capturedAt: dateOrString,
})

export const ListCewsSnapshotsInputSchema = z.object({
	encounterId: z.string().uuid(),
})

export const ListCewsSnapshotsResponseSchema = z.object({
	snapshots: z.array(CewsSnapshotSchema),
})

// ============================================================================
// BIL-BE-08: Konsulta Activities, Record Event, Report
// ============================================================================

export const KonsultaActivityTypeEnum = z.enum(["FPE", "Follow-up", "Lab"])
export type KonsultaActivityType = z.infer<typeof KonsultaActivityTypeEnum>

export const KonsultaActivitySchema = z.object({
	id: z.string().uuid(),
	patientId: z.string().uuid(),
	facilityId: z.string().uuid(),
	activityType: KonsultaActivityTypeEnum,
	activityDate: z.string(),
	sourceRef: z.string().nullable(),
	createdAt: dateOrString,
})

export const ListKonsultaActivitiesInputSchema = PaginationInputSchema.extend({
	patientId: z.string().uuid(),
	facilityId: z.string().uuid(),
	activityType: KonsultaActivityTypeEnum.optional(),
	periodStart: z.string().optional(),
	periodEnd: z.string().optional(),
})

export const ListKonsultaActivitiesResponseSchema = PaginatedResponseSchema.extend({
	activities: z.array(KonsultaActivitySchema),
})

export const RecordKonsultaEventInputSchema = z.object({
	patientId: z.string().uuid(),
	facilityId: z.string().uuid(),
	activityType: KonsultaActivityTypeEnum,
	activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
	sourceRef: z.string().optional(),
})

export const KonsultaReportPeriodEnum = z.enum(["monthly", "quarterly"])

export const GenerateKonsultaReportInputSchema = z.object({
	facilityId: z.string().uuid(),
	period: KonsultaReportPeriodEnum,
	periodStart: z.string(),
	periodEnd: z.string(),
})

export const KonsultaReportSchema = z.object({
	facilityId: z.string().uuid(),
	period: KonsultaReportPeriodEnum,
	periodStart: z.string(),
	periodEnd: z.string(),
	totalFpe: z.number().int(),
	totalFollowUp: z.number().int(),
	totalLab: z.number().int(),
	totalPatients: z.number().int(),
	xmlUri: z.string().nullable(),
	csvUri: z.string().nullable(),
	memberBreakdown: z.array(
		z.object({
			patientId: z.string().uuid(),
			patientName: z.string(),
			memberPin: z.string().nullable(),
			fpeCount: z.number().int(),
			followUpCount: z.number().int(),
			labCount: z.number().int(),
		})
	),
})

// BIL-FE-09: Per-patient aggregate view for the Konsulta tracker table
export const KonsultaTrackerRowSchema = z.object({
	patientId: z.string().uuid(),
	patientName: z.string(),
	memberPin: z.string().nullable(),
	fpeDate: z.string().nullable(),
	lastFollowUp: z.string().nullable(),
	labsCount: z.number().int(),
	capitationTag: z.string(),
})

export const ListKonsultaTrackerRowsInputSchema = PaginationInputSchema.extend({
	facilityId: z.string().uuid(),
	periodStart: z.string().optional(),
	periodEnd: z.string().optional(),
	memberStatus: z.enum(["all", "active", "exhausted", "inactive"]).optional(),
})

export const ListKonsultaTrackerRowsResponseSchema = PaginatedResponseSchema.extend({
	rows: z.array(KonsultaTrackerRowSchema),
})

// ============================================================================
// BIL-BE-05: DRG Suggest, Confirm, CF5 Lifecycle
// ============================================================================

export const DrgCandidateSchema = z.object({
	rank: z.number().int().min(1).max(3),
	code: z.string(),
	description: z.string(),
	mdrg: z.string(),
	weight: z.number(),
	baseRate: z.number(),
	confidence: z.number().min(0).max(1),
	rationale: z.string(),
})

export const SuggestDrgInputSchema = z.object({
	encounterId: z.string().uuid(),
})

export const SuggestDrgResponseSchema = z.object({
	candidates: z.array(DrgCandidateSchema).max(3),
	encounterId: z.string().uuid(),
})

export const ConfirmDrgInputSchema = z.object({
	encounterId: z.string().uuid(),
	drgCode: z.string().min(1),
	overrideReason: z.string().optional(),
	chosenRank: z.number().int().min(1).max(3).optional(),
})

export const ConfirmDrgResponseSchema = z.object({
	success: z.boolean(),
	drgMappingId: z.string().uuid(),
	drgCode: z.string(),
	isManualOverride: z.boolean(),
})

export const Cf5ClaimSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	cf4ClaimId: z.string().uuid().nullable(),
	drgCode: z.string().nullable(),
	drgDescription: z.string().nullable(),
	drgWeight: z.string().nullable(),
	status: z.enum(["draft", "validated", "submitted", "approved", "rejected"]),
	submissionData: z.record(z.string(), z.unknown()).nullable(),
	responseData: z.record(z.string(), z.unknown()).nullable(),
	resubmitCount: z.number().int().default(0),
	validatedAt: dateOrString.nullable(),
	submittedAt: dateOrString.nullable(),
	createdAt: dateOrString,
	updatedAt: dateOrString,
})

export const GenerateCf5InputSchema = z.object({
	facilityId: z.string().uuid(),
	encounterId: z.string().uuid(),
	drgCode: z.string().min(1),
})

export const Cf5XmlPreviewSchema = z.object({
	id: z.string().uuid(),
	xml: z.string(),
	status: z.string(),
})

export const GetCf5ClaimInputSchema = z.object({
	id: z.string().uuid(),
})

export const ListCf5ClaimsInputSchema = z.object({
	encounterId: z.string().uuid(),
})

export const ListCf5ClaimsResponseSchema = z.object({
	claims: z.array(Cf5ClaimSchema),
})

export const SubmitCf5InputSchema = z.object({
	id: z.string().uuid(),
})

export const PollCf5StatusInputSchema = z.object({
	id: z.string().uuid(),
})

export const PollCf5StatusResponseSchema = z.object({
	id: z.string().uuid(),
	status: z.string(),
	philhealthRef: z.string().nullable(),
})

export const ResubmitCf5InputSchema = z.object({
	id: z.string().uuid(),
	reason: z.string().min(1),
})

// ============================================================================
// BIL-BE-06: eSOA list/send
// ============================================================================

export const EsoaStatementSchema = z.object({
	id: z.string().uuid(),
	invoiceId: z.string().uuid(),
	version: z.number().int(),
	xmlUri: z.string().nullable(),
	pdfUri: z.string().nullable(),
	sentVia: z.enum(["patient_portal", "email", "print"]).nullable(),
	sentAt: dateOrString.nullable(),
	sentToRecipient: z.string().nullable(),
	deliveryStatus: z.enum(["pending", "delivered", "failed"]).nullable(),
	generatedAt: dateOrString,
	createdAt: dateOrString,
})

export const ListEsoaStatementsInputSchema = z.object({
	invoiceId: z.string().uuid(),
})

export const ListEsoaStatementsResponseSchema = z.object({
	statements: z.array(EsoaStatementSchema),
	total: z.number().int(),
})

export const SendEsoaInputSchema = z.object({
	id: z.string().uuid(),
	channel: z.enum(["patient_portal", "email", "print"]),
	recipient: z.string().optional(),
})

export const SendEsoaResponseSchema = z.object({
	success: z.boolean(),
	statementId: z.string().uuid(),
	deliveryStatus: z.string(),
})

export const GenerateEsoaFromInvoiceInputSchema = z.object({
	invoiceId: z.string().uuid(),
	allowDraft: z.boolean().optional(),
	allowDraftReason: z.string().optional(),
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
export type Cf5Assignment = z.infer<typeof Cf5AssignmentSchema>
export type Cf5BillingItem = z.infer<typeof Cf5BillingItemSchema>
export type DrgCode = z.infer<typeof DrgCodeSchema>
export type EligibilityCheck = z.infer<typeof EligibilityCheckSchema>
export type StatementOfAccount = z.infer<typeof StatementOfAccountSchema>
export type SoaLine = z.infer<typeof SoaLineSchema>
export type KonsultaBenefit = z.infer<typeof KonsultaBenefitSchema>
export type MalasakitAssistance = z.infer<typeof MalasakitAssistanceSchema>
export type MalasakitSummary = z.infer<typeof MalasakitSummarySchema>
export type CewsResponse = z.infer<typeof CewsResponseSchema>
export type EsoaResponse = z.infer<typeof EsoaResponseSchema>
export type Receipt = z.infer<typeof ReceiptSchema>
export type CewsMembership = z.infer<typeof CewsMembershipSchema>
export type CewsSnapshot = z.infer<typeof CewsSnapshotSchema>
export type KonsultaActivity = z.infer<typeof KonsultaActivitySchema>
export type KonsultaReport = z.infer<typeof KonsultaReportSchema>
export type DrgCandidate = z.infer<typeof DrgCandidateSchema>
export type SuggestDrgResponse = z.infer<typeof SuggestDrgResponseSchema>
export type ConfirmDrgResponse = z.infer<typeof ConfirmDrgResponseSchema>
export type Cf5Claim = z.infer<typeof Cf5ClaimSchema>
export type EsoaStatement = z.infer<typeof EsoaStatementSchema>

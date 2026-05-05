import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	AddMalasakitInputSchema,
	ApplyDiscountInputSchema,
	ApproveCf5InputSchema,
	AssignDrgInputSchema,
	BillingStatusInputSchema,
	BillingStatusResponseSchema,
	CewsCheckInputSchema,
	CewsMembershipSchema,
	CewsResponseSchema,
	CewsSnapshotInputSchema,
	CewsSnapshotSchema,
	CewsVerifyInputSchema,
	Cf4ClaimSchema,
	Cf4PreviewSchema,
	Cf4PreviewXmlSchema,
	Cf5AssignmentSchema,
	Cf5ClaimSchema,
	Cf5WithBillingSchema,
	Cf5XmlPreviewSchema,
	ChargeSchema,
	CheckEligibilityInputSchema,
	ConfirmDrgInputSchema,
	ConfirmDrgResponseSchema,
	CreateChargeInputSchema,
	DeleteChargeInputSchema,
	DrgCodeSchema,
	EligibilityResponseSchema,
	EsoaResponseSchema,
	EsoaStatementSchema,
	FinalizeCf4InputSchema,
	FinalizeInvoiceInputSchema,
	FinalizeSoaInputSchema,
	GenerateCf4InputSchema,
	GenerateCf5InputSchema,
	GenerateEsoaFromInvoiceInputSchema,
	GenerateEsoaInputSchema,
	GenerateInvoiceInputSchema,
	GenerateKonsultaReportInputSchema,
	GenerateSoaInputSchema,
	GetCf4InputSchema,
	GetCf5ClaimInputSchema,
	GetCf5InputSchema,
	GetCf5WithBillingInputSchema,
	GetInvoiceInputSchema,
	GetKonsultaBenefitInputSchema,
	GetMalasakitInputSchema,
	GetSoaInputSchema,
	InvoiceSchema,
	IssueReceiptInputSchema,
	KonsultaBenefitSchema,
	KonsultaReportSchema,
	LinkChargeToIcdInputSchema,
	ListCewsSnapshotsInputSchema,
	ListCewsSnapshotsResponseSchema,
	ListCf5ClaimsInputSchema,
	ListCf5ClaimsResponseSchema,
	ListChargeMasterInputSchema,
	ListChargeMasterResponseSchema,
	ListChargesInputSchema,
	ListChargesResponseSchema,
	ListEsoaStatementsInputSchema,
	ListEsoaStatementsResponseSchema,
	ListInvoicesInputSchema,
	ListInvoicesResponseSchema,
	ListKonsultaActivitiesInputSchema,
	ListKonsultaActivitiesResponseSchema,
	ListPaymentsInputSchema,
	ListPaymentsResponseSchema,
	MalasakitAssistanceSchema,
	MalasakitSummarySchema,
	MarkReadyForInvoicingInputSchema,
	MarkReadyForInvoicingResponseSchema,
	PaymentSchema,
	PollCf4StatusInputSchema,
	PollCf4StatusResponseSchema,
	PollCf5StatusInputSchema,
	PollCf5StatusResponseSchema,
	ReceiptSchema,
	RecordKonsultaEventInputSchema,
	RecordKonsultaVisitInputSchema,
	RecordMalasakitPaymentInputSchema,
	RecordPaymentInputSchema,
	ResubmitCf4InputSchema,
	ResubmitCf5InputSchema,
	SearchDrgInputSchema,
	SendEsoaInputSchema,
	SendEsoaResponseSchema,
	ServiceCatalogSearchInputSchema,
	ServiceCatalogSearchResponseSchema,
	StatementOfAccountSchema,
	SubmitCf5InputSchema,
	SuggestDrgInputSchema,
	SuggestDrgResponseSchema,
	UnbilledEncountersInputSchema,
	UnbilledEncountersResponseSchema,
	UpdateChargeInputSchema,
	UpdateMalasakitStatusInputSchema,
} from "./billing.schema.js"

export const billingContract = {
	// ========================================================================
	// Charge Master
	// ========================================================================

	listChargeMasterItems: oc
		.route({
			method: "GET",
			path: "/charge-master",
			summary: "List charge master items",
			tags: ["Billing"],
		})
		.input(ListChargeMasterInputSchema)
		.output(ListChargeMasterResponseSchema),

	// ========================================================================
	// Charges
	// ========================================================================

	listCharges: oc
		.route({
			method: "GET",
			path: "/charges",
			summary: "List charges for an encounter",
			tags: ["Billing"],
		})
		.input(ListChargesInputSchema)
		.output(ListChargesResponseSchema),

	createCharge: oc
		.route({
			method: "POST",
			path: "/charges",
			summary: "Create a manual charge",
			tags: ["Billing"],
		})
		.input(CreateChargeInputSchema)
		.output(ChargeSchema),

	updateCharge: oc
		.route({ method: "PUT", path: "/charges/{id}", summary: "Update a charge", tags: ["Billing"] })
		.input(UpdateChargeInputSchema)
		.output(ChargeSchema),

	deleteCharge: oc
		.route({
			method: "DELETE",
			path: "/charges/{id}",
			summary: "Delete a charge",
			tags: ["Billing"],
		})
		.input(DeleteChargeInputSchema)
		.output(z.object({ success: z.boolean() })),

	markReadyForInvoicing: oc
		.route({
			method: "POST",
			path: "/charges/mark-ready",
			summary: "Mark encounter charges ready for invoicing",
			tags: ["Billing"],
		})
		.input(MarkReadyForInvoicingInputSchema)
		.output(MarkReadyForInvoicingResponseSchema),

	searchServiceCatalog: oc
		.route({
			method: "GET",
			path: "/service-catalog",
			summary: "Search service catalog",
			tags: ["Billing"],
		})
		.input(ServiceCatalogSearchInputSchema)
		.output(ServiceCatalogSearchResponseSchema),

	// ========================================================================
	// Invoices
	// ========================================================================

	listInvoices: oc
		.route({ method: "GET", path: "/invoices", summary: "List invoices", tags: ["Billing"] })
		.input(ListInvoicesInputSchema)
		.output(ListInvoicesResponseSchema),

	getInvoice: oc
		.route({
			method: "GET",
			path: "/invoices/{id}",
			summary: "Get invoice with line items",
			tags: ["Billing"],
		})
		.input(GetInvoiceInputSchema)
		.output(InvoiceSchema),

	generateInvoice: oc
		.route({
			method: "POST",
			path: "/invoices/generate",
			summary: "Generate a draft invoice from charges",
			tags: ["Billing"],
		})
		.input(GenerateInvoiceInputSchema)
		.output(InvoiceSchema),

	finalizeInvoice: oc
		.route({
			method: "POST",
			path: "/invoices/{id}/finalize",
			summary: "Finalize a draft invoice",
			tags: ["Billing"],
		})
		.input(FinalizeInvoiceInputSchema)
		.output(InvoiceSchema),

	// ========================================================================
	// Payments
	// ========================================================================

	listPayments: oc
		.route({
			method: "GET",
			path: "/payments",
			summary: "List payments for an invoice",
			tags: ["Billing"],
		})
		.input(ListPaymentsInputSchema)
		.output(ListPaymentsResponseSchema),

	recordPayment: oc
		.route({ method: "POST", path: "/payments", summary: "Record a payment", tags: ["Billing"] })
		.input(RecordPaymentInputSchema)
		.output(PaymentSchema),

	applyDiscount: oc
		.route({
			method: "POST",
			path: "/invoices/{invoiceId}/apply-discount",
			summary: "Apply discount to an invoice",
			tags: ["Billing"],
		})
		.input(ApplyDiscountInputSchema)
		.output(InvoiceSchema),

	issueReceipt: oc
		.route({
			method: "POST",
			path: "/receipts/issue",
			summary: "Issue an official receipt for a payment",
			tags: ["Billing"],
		})
		.input(IssueReceiptInputSchema)
		.output(ReceiptSchema),

	recordMalasakitPayment: oc
		.route({
			method: "POST",
			path: "/payments/malasakit",
			summary: "Record a Malasakit-sourced payment",
			tags: ["Billing"],
		})
		.input(RecordMalasakitPaymentInputSchema)
		.output(PaymentSchema),

	// ========================================================================
	// CF4 Claims
	// ========================================================================

	getCf4: oc
		.route({ method: "GET", path: "/cf4/{id}", summary: "Get a CF4 claim", tags: ["Billing"] })
		.input(GetCf4InputSchema)
		.output(Cf4ClaimSchema),

	generateCf4: oc
		.route({
			method: "POST",
			path: "/cf4/generate",
			summary: "Auto-generate CF4 from encounter data",
			tags: ["Billing"],
		})
		.input(GenerateCf4InputSchema)
		.output(Cf4PreviewSchema),

	finalizeCf4: oc
		.route({
			method: "POST",
			path: "/cf4/{id}/finalize",
			summary: "Finalize a CF4 claim",
			tags: ["Billing"],
		})
		.input(FinalizeCf4InputSchema)
		.output(Cf4ClaimSchema),

	previewCf4Xml: oc
		.route({
			method: "GET",
			path: "/cf4/{id}/xml",
			summary: "Get CF4 XML payload for preview",
			tags: ["Billing"],
		})
		.input(GetCf4InputSchema)
		.output(Cf4PreviewXmlSchema),

	pollCf4Status: oc
		.route({
			method: "POST",
			path: "/cf4/{id}/status-poll",
			summary: "Poll PhilHealth for CF4 status update",
			tags: ["Billing"],
		})
		.input(PollCf4StatusInputSchema)
		.output(PollCf4StatusResponseSchema),

	resubmitCf4: oc
		.route({
			method: "POST",
			path: "/cf4/{id}/resubmit",
			summary: "Resubmit a returned CF4 claim",
			tags: ["Billing"],
		})
		.input(ResubmitCf4InputSchema)
		.output(Cf4ClaimSchema),

	// ========================================================================
	// CF5 / DRG Shadow Billing
	// ========================================================================

	getCf5: oc
		.route({
			method: "GET",
			path: "/cf5",
			summary: "Get CF5 assignment for an encounter",
			tags: ["Billing"],
		})
		.input(GetCf5InputSchema)
		.output(Cf5AssignmentSchema.nullable()),

	searchDrgCodes: oc
		.route({
			method: "GET",
			path: "/cf5/drg-codes",
			summary: "Search DRG codes",
			tags: ["Billing"],
		})
		.input(SearchDrgInputSchema)
		.output(z.array(DrgCodeSchema)),

	assignDrg: oc
		.route({
			method: "POST",
			path: "/cf5/assign",
			summary: "Assign a DRG code to an encounter",
			tags: ["Billing"],
		})
		.input(AssignDrgInputSchema)
		.output(Cf5AssignmentSchema),

	approveCf5: oc
		.route({
			method: "POST",
			path: "/cf5/{id}/approve",
			summary: "Approve a CF5 assignment",
			tags: ["Billing"],
		})
		.input(ApproveCf5InputSchema)
		.output(Cf5AssignmentSchema),

	// BIL-BE-05: DRG suggest/confirm + CF5 lifecycle
	suggestDrg: oc
		.route({
			method: "POST",
			path: "/drg/suggest",
			summary: "Suggest top-3 DRG candidates with confidence scores",
			tags: ["Billing"],
		})
		.input(SuggestDrgInputSchema)
		.output(SuggestDrgResponseSchema),

	confirmDrg: oc
		.route({
			method: "POST",
			path: "/drg/confirm",
			summary: "Confirm DRG mapping for an encounter",
			tags: ["Billing"],
		})
		.input(ConfirmDrgInputSchema)
		.output(ConfirmDrgResponseSchema),

	generateCf5: oc
		.route({
			method: "POST",
			path: "/cf5/generate",
			summary: "Generate CF5 claim from DRG mapping",
			tags: ["Billing"],
		})
		.input(GenerateCf5InputSchema)
		.output(Cf5ClaimSchema),

	getCf5Claim: oc
		.route({
			method: "GET",
			path: "/cf5/{id}/claim",
			summary: "Get a specific CF5 claim by ID",
			tags: ["Billing"],
		})
		.input(GetCf5ClaimInputSchema)
		.output(Cf5ClaimSchema),

	listCf5Claims: oc
		.route({
			method: "GET",
			path: "/cf5/claims",
			summary: "List CF5 claims for an encounter",
			tags: ["Billing"],
		})
		.input(ListCf5ClaimsInputSchema)
		.output(ListCf5ClaimsResponseSchema),

	previewCf5Xml: oc
		.route({
			method: "GET",
			path: "/cf5/{id}/xml",
			summary: "Get CF5 XML for preview",
			tags: ["Billing"],
		})
		.input(GetCf5ClaimInputSchema)
		.output(Cf5XmlPreviewSchema),

	submitCf5: oc
		.route({
			method: "POST",
			path: "/cf5/{id}/submit",
			summary: "Submit CF5 to PhilHealth",
			tags: ["Billing"],
		})
		.input(SubmitCf5InputSchema)
		.output(Cf5ClaimSchema),

	pollCf5Status: oc
		.route({
			method: "POST",
			path: "/cf5/{id}/status-poll",
			summary: "Poll PhilHealth for CF5 status update",
			tags: ["Billing"],
		})
		.input(PollCf5StatusInputSchema)
		.output(PollCf5StatusResponseSchema),

	resubmitCf5: oc
		.route({
			method: "POST",
			path: "/cf5/{id}/resubmit",
			summary: "Resubmit a returned CF5 claim",
			tags: ["Billing"],
		})
		.input(ResubmitCf5InputSchema)
		.output(Cf5ClaimSchema),

	// ========================================================================
	// Eligibility Check (CEWS — stubbed)
	// ========================================================================

	checkEligibility: oc
		.route({
			method: "POST",
			path: "/eligibility/check",
			summary: "Check PhilHealth eligibility (CEWS)",
			tags: ["Billing"],
		})
		.input(CheckEligibilityInputSchema)
		.output(EligibilityResponseSchema),

	verifyCewsMembership: oc
		.route({
			method: "POST",
			path: "/cews/verify",
			summary: "Verify PhilHealth membership via CEWS (12-digit PIN)",
			tags: ["Billing"],
		})
		.input(CewsVerifyInputSchema)
		.output(CewsMembershipSchema),

	saveCewsSnapshot: oc
		.route({
			method: "POST",
			path: "/cews/snapshot",
			summary: "Save CEWS eligibility snapshot to encounter",
			tags: ["Billing"],
		})
		.input(CewsSnapshotInputSchema)
		.output(CewsSnapshotSchema),

	listCewsSnapshots: oc
		.route({
			method: "GET",
			path: "/cews/snapshots",
			summary: "List CEWS snapshots for an encounter",
			tags: ["Billing"],
		})
		.input(ListCewsSnapshotsInputSchema)
		.output(ListCewsSnapshotsResponseSchema),

	listKonsultaActivities: oc
		.route({
			method: "GET",
			path: "/konsulta/activities",
			summary: "List Konsulta activities for a patient",
			tags: ["Billing"],
		})
		.input(ListKonsultaActivitiesInputSchema)
		.output(ListKonsultaActivitiesResponseSchema),

	recordKonsultaEvent: oc
		.route({
			method: "POST",
			path: "/konsulta/activities",
			summary: "Record a Konsulta-eligible activity (idempotent)",
			tags: ["Billing"],
		})
		.input(RecordKonsultaEventInputSchema)
		.output(z.object({ success: z.boolean(), id: z.string().uuid() })),

	generateKonsultaReport: oc
		.route({
			method: "POST",
			path: "/konsulta/report",
			summary: "Generate Konsulta capitation report (XML + CSV)",
			tags: ["Billing"],
		})
		.input(GenerateKonsultaReportInputSchema)
		.output(KonsultaReportSchema),

	// ========================================================================
	// Billing Status (for discharge checklist)
	// ========================================================================

	getBillingStatus: oc
		.route({
			method: "GET",
			path: "/status",
			summary: "Get billing status for discharge checklist",
			tags: ["Billing"],
		})
		.input(BillingStatusInputSchema)
		.output(BillingStatusResponseSchema),

	// ========================================================================
	// Unbilled Encounters (dashboard widget)
	// ========================================================================

	listUnbilledEncounters: oc
		.route({
			method: "GET",
			path: "/unbilled",
			summary: "List encounters with charges but no invoice",
			tags: ["Billing"],
		})
		.input(UnbilledEncountersInputSchema)
		.output(UnbilledEncountersResponseSchema),

	// ========================================================================
	// Statement of Account (SOA)
	// ========================================================================

	getSoa: oc
		.route({ method: "GET", path: "/soa", summary: "Get SOA for an encounter", tags: ["Billing"] })
		.input(GetSoaInputSchema)
		.output(StatementOfAccountSchema.nullable()),

	generateSoa: oc
		.route({
			method: "POST",
			path: "/soa/generate",
			summary: "Generate a draft SOA",
			tags: ["Billing"],
		})
		.input(GenerateSoaInputSchema)
		.output(StatementOfAccountSchema),

	finalizeSoa: oc
		.route({
			method: "POST",
			path: "/soa/{id}/finalize",
			summary: "Finalize an SOA",
			tags: ["Billing"],
		})
		.input(FinalizeSoaInputSchema)
		.output(StatementOfAccountSchema),

	// ========================================================================
	// Konsulta Capitation
	// ========================================================================

	getKonsultaBenefit: oc
		.route({
			method: "GET",
			path: "/konsulta",
			summary: "Get Konsulta benefit status for a patient",
			tags: ["Billing"],
		})
		.input(GetKonsultaBenefitInputSchema)
		.output(KonsultaBenefitSchema.nullable()),

	recordKonsultaVisit: oc
		.route({
			method: "POST",
			path: "/konsulta/record-visit",
			summary: "Record a Konsulta visit",
			tags: ["Billing"],
		})
		.input(RecordKonsultaVisitInputSchema)
		.output(KonsultaBenefitSchema),

	// ========================================================================
	// Malasakit Center
	// ========================================================================

	getMalasakit: oc
		.route({
			method: "GET",
			path: "/malasakit",
			summary: "Get Malasakit assistance for an encounter",
			tags: ["Billing"],
		})
		.input(GetMalasakitInputSchema)
		.output(MalasakitSummarySchema),

	addMalasakit: oc
		.route({
			method: "POST",
			path: "/malasakit",
			summary: "Add Malasakit assistance request",
			tags: ["Billing"],
		})
		.input(AddMalasakitInputSchema)
		.output(MalasakitAssistanceSchema),

	updateMalasakitStatus: oc
		.route({
			method: "PUT",
			path: "/malasakit/{id}/status",
			summary: "Update Malasakit assistance status",
			tags: ["Billing"],
		})
		.input(UpdateMalasakitStatusInputSchema)
		.output(MalasakitAssistanceSchema),

	// ========================================================================
	// eSOA (Electronic Statement of Account)
	// ========================================================================

	generateEsoa: oc
		.route({
			method: "POST",
			path: "/esoa/generate",
			summary: "Generate eSOA in PDF/XML/JSON format",
			tags: ["Billing"],
		})
		.input(GenerateEsoaInputSchema)
		.output(EsoaResponseSchema),

	// BIL-BE-06: eSOA from invoice + list + send
	generateEsoaFromInvoice: oc
		.route({
			method: "POST",
			path: "/esoa/generate-invoice",
			summary: "Generate PhilHealth-compliant eSOA from invoice",
			tags: ["Billing"],
		})
		.input(GenerateEsoaFromInvoiceInputSchema)
		.output(EsoaStatementSchema),

	listEsoaStatements: oc
		.route({
			method: "GET",
			path: "/esoa/statements",
			summary: "List eSOA statement versions for an invoice",
			tags: ["Billing"],
		})
		.input(ListEsoaStatementsInputSchema)
		.output(ListEsoaStatementsResponseSchema),

	sendEsoa: oc
		.route({
			method: "POST",
			path: "/esoa/{id}/send",
			summary: "Send eSOA via chosen delivery channel",
			tags: ["Billing"],
		})
		.input(SendEsoaInputSchema)
		.output(SendEsoaResponseSchema),

	// ========================================================================
	// CF5 with Billing Items
	// ========================================================================

	getCf5WithBilling: oc
		.route({
			method: "GET",
			path: "/cf5/billing",
			summary: "Get CF5 with linked billing items",
			tags: ["Billing"],
		})
		.input(GetCf5WithBillingInputSchema)
		.output(Cf5WithBillingSchema.nullable()),

	linkChargeToIcd: oc
		.route({
			method: "POST",
			path: "/charges/link-icd",
			summary: "Link a charge to an ICD code for CF5",
			tags: ["Billing"],
		})
		.input(LinkChargeToIcdInputSchema)
		.output(z.object({ success: z.boolean() })),

	// ========================================================================
	// CEWS Real-Time Check
	// ========================================================================

	checkCews: oc
		.route({
			method: "POST",
			path: "/cews/check",
			summary: "Real-time CEWS (indigency/Listahanan) check",
			tags: ["Billing"],
		})
		.input(CewsCheckInputSchema)
		.output(CewsResponseSchema),
}

// Force TypeScript to eagerly evaluate the billing contract type
// This resolves TS7056 when the contract is composed into v1Contract
export type BillingContractType = typeof billingContract

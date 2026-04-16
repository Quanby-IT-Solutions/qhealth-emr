import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	AddMalasakitInputSchema,
	ApproveCf5InputSchema,
	AssignDrgInputSchema,
	BillingStatusInputSchema,
	BillingStatusResponseSchema,
	CewsCheckInputSchema,
	CewsResponseSchema,
	Cf4PreviewSchema,
	Cf4ClaimSchema,
	Cf5AssignmentSchema,
	Cf5WithBillingSchema,
	ChargeSchema,
	CheckEligibilityInputSchema,
	CreateChargeInputSchema,
	DeleteChargeInputSchema,
	DrgCodeSchema,
	EligibilityResponseSchema,
	EsoaResponseSchema,
	FinalizeCf4InputSchema,
	FinalizeInvoiceInputSchema,
	FinalizeSoaInputSchema,
	GenerateCf4InputSchema,
	GenerateEsoaInputSchema,
	GenerateInvoiceInputSchema,
	GenerateSoaInputSchema,
	GetCf4InputSchema,
	GetCf5InputSchema,
	GetCf5WithBillingInputSchema,
	GetInvoiceInputSchema,
	GetKonsultaBenefitInputSchema,
	GetMalasakitInputSchema,
	GetSoaInputSchema,
	InvoiceSchema,
	KonsultaBenefitSchema,
	LinkChargeToIcdInputSchema,
	ListChargeMasterInputSchema,
	ListChargeMasterResponseSchema,
	ListChargesInputSchema,
	ListChargesResponseSchema,
	ListInvoicesInputSchema,
	ListInvoicesResponseSchema,
	ListPaymentsInputSchema,
	ListPaymentsResponseSchema,
	MalasakitAssistanceSchema,
	MalasakitSummarySchema,
	RecordKonsultaVisitInputSchema,
	RecordPaymentInputSchema,
	PaymentSchema,
	SearchDrgInputSchema,
	StatementOfAccountSchema,
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
		.route({ method: "GET", path: "/charge-master", summary: "List charge master items", tags: ["Billing"] })
		.input(ListChargeMasterInputSchema)
		.output(ListChargeMasterResponseSchema),

	// ========================================================================
	// Charges
	// ========================================================================

	listCharges: oc
		.route({ method: "GET", path: "/charges", summary: "List charges for an encounter", tags: ["Billing"] })
		.input(ListChargesInputSchema)
		.output(ListChargesResponseSchema),

	createCharge: oc
		.route({ method: "POST", path: "/charges", summary: "Create a manual charge", tags: ["Billing"] })
		.input(CreateChargeInputSchema)
		.output(ChargeSchema),

	updateCharge: oc
		.route({ method: "PUT", path: "/charges/{id}", summary: "Update a charge", tags: ["Billing"] })
		.input(UpdateChargeInputSchema)
		.output(ChargeSchema),

	deleteCharge: oc
		.route({ method: "DELETE", path: "/charges/{id}", summary: "Delete a charge", tags: ["Billing"] })
		.input(DeleteChargeInputSchema)
		.output(z.object({ success: z.boolean() })),

	// ========================================================================
	// Invoices
	// ========================================================================

	listInvoices: oc
		.route({ method: "GET", path: "/invoices", summary: "List invoices", tags: ["Billing"] })
		.input(ListInvoicesInputSchema)
		.output(ListInvoicesResponseSchema),

	getInvoice: oc
		.route({ method: "GET", path: "/invoices/{id}", summary: "Get invoice with line items", tags: ["Billing"] })
		.input(GetInvoiceInputSchema)
		.output(InvoiceSchema),

	generateInvoice: oc
		.route({ method: "POST", path: "/invoices/generate", summary: "Generate a draft invoice from charges", tags: ["Billing"] })
		.input(GenerateInvoiceInputSchema)
		.output(InvoiceSchema),

	finalizeInvoice: oc
		.route({ method: "POST", path: "/invoices/{id}/finalize", summary: "Finalize a draft invoice", tags: ["Billing"] })
		.input(FinalizeInvoiceInputSchema)
		.output(InvoiceSchema),

	// ========================================================================
	// Payments
	// ========================================================================

	listPayments: oc
		.route({ method: "GET", path: "/payments", summary: "List payments for an invoice", tags: ["Billing"] })
		.input(ListPaymentsInputSchema)
		.output(ListPaymentsResponseSchema),

	recordPayment: oc
		.route({ method: "POST", path: "/payments", summary: "Record a payment", tags: ["Billing"] })
		.input(RecordPaymentInputSchema)
		.output(PaymentSchema),

	// ========================================================================
	// CF4 Claims
	// ========================================================================

	getCf4: oc
		.route({ method: "GET", path: "/cf4/{id}", summary: "Get a CF4 claim", tags: ["Billing"] })
		.input(GetCf4InputSchema)
		.output(Cf4ClaimSchema),

	generateCf4: oc
		.route({ method: "POST", path: "/cf4/generate", summary: "Auto-generate CF4 from encounter data", tags: ["Billing"] })
		.input(GenerateCf4InputSchema)
		.output(Cf4PreviewSchema),

	finalizeCf4: oc
		.route({ method: "POST", path: "/cf4/{id}/finalize", summary: "Finalize a CF4 claim", tags: ["Billing"] })
		.input(FinalizeCf4InputSchema)
		.output(Cf4ClaimSchema),

	// ========================================================================
	// CF5 / DRG Shadow Billing
	// ========================================================================

	getCf5: oc
		.route({ method: "GET", path: "/cf5", summary: "Get CF5 assignment for an encounter", tags: ["Billing"] })
		.input(GetCf5InputSchema)
		.output(Cf5AssignmentSchema.nullable()),

	searchDrgCodes: oc
		.route({ method: "GET", path: "/cf5/drg-codes", summary: "Search DRG codes", tags: ["Billing"] })
		.input(SearchDrgInputSchema)
		.output(z.array(DrgCodeSchema)),

	assignDrg: oc
		.route({ method: "POST", path: "/cf5/assign", summary: "Assign a DRG code to an encounter", tags: ["Billing"] })
		.input(AssignDrgInputSchema)
		.output(Cf5AssignmentSchema),

	approveCf5: oc
		.route({ method: "POST", path: "/cf5/{id}/approve", summary: "Approve a CF5 assignment", tags: ["Billing"] })
		.input(ApproveCf5InputSchema)
		.output(Cf5AssignmentSchema),

	// ========================================================================
	// Eligibility Check (CEWS — stubbed)
	// ========================================================================

	checkEligibility: oc
		.route({ method: "POST", path: "/eligibility/check", summary: "Check PhilHealth eligibility (CEWS)", tags: ["Billing"] })
		.input(CheckEligibilityInputSchema)
		.output(EligibilityResponseSchema),

	// ========================================================================
	// Billing Status (for discharge checklist)
	// ========================================================================

	getBillingStatus: oc
		.route({ method: "GET", path: "/status", summary: "Get billing status for discharge checklist", tags: ["Billing"] })
		.input(BillingStatusInputSchema)
		.output(BillingStatusResponseSchema),

	// ========================================================================
	// Unbilled Encounters (dashboard widget)
	// ========================================================================

	listUnbilledEncounters: oc
		.route({ method: "GET", path: "/unbilled", summary: "List encounters with charges but no invoice", tags: ["Billing"] })
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
		.route({ method: "POST", path: "/soa/generate", summary: "Generate a draft SOA", tags: ["Billing"] })
		.input(GenerateSoaInputSchema)
		.output(StatementOfAccountSchema),

	finalizeSoa: oc
		.route({ method: "POST", path: "/soa/{id}/finalize", summary: "Finalize an SOA", tags: ["Billing"] })
		.input(FinalizeSoaInputSchema)
		.output(StatementOfAccountSchema),

	// ========================================================================
	// Konsulta Capitation
	// ========================================================================

	getKonsultaBenefit: oc
		.route({ method: "GET", path: "/konsulta", summary: "Get Konsulta benefit status for a patient", tags: ["Billing"] })
		.input(GetKonsultaBenefitInputSchema)
		.output(KonsultaBenefitSchema.nullable()),

	recordKonsultaVisit: oc
		.route({ method: "POST", path: "/konsulta/record-visit", summary: "Record a Konsulta visit", tags: ["Billing"] })
		.input(RecordKonsultaVisitInputSchema)
		.output(KonsultaBenefitSchema),

	// ========================================================================
	// Malasakit Center
	// ========================================================================

	getMalasakit: oc
		.route({ method: "GET", path: "/malasakit", summary: "Get Malasakit assistance for an encounter", tags: ["Billing"] })
		.input(GetMalasakitInputSchema)
		.output(MalasakitSummarySchema),

	addMalasakit: oc
		.route({ method: "POST", path: "/malasakit", summary: "Add Malasakit assistance request", tags: ["Billing"] })
		.input(AddMalasakitInputSchema)
		.output(MalasakitAssistanceSchema),

	updateMalasakitStatus: oc
		.route({ method: "PUT", path: "/malasakit/{id}/status", summary: "Update Malasakit assistance status", tags: ["Billing"] })
		.input(UpdateMalasakitStatusInputSchema)
		.output(MalasakitAssistanceSchema),

	// ========================================================================
	// eSOA (Electronic Statement of Account)
	// ========================================================================

	generateEsoa: oc
		.route({ method: "POST", path: "/esoa/generate", summary: "Generate eSOA in PDF/XML/JSON format", tags: ["Billing"] })
		.input(GenerateEsoaInputSchema)
		.output(EsoaResponseSchema),

	// ========================================================================
	// CF5 with Billing Items
	// ========================================================================

	getCf5WithBilling: oc
		.route({ method: "GET", path: "/cf5/billing", summary: "Get CF5 with linked billing items", tags: ["Billing"] })
		.input(GetCf5WithBillingInputSchema)
		.output(Cf5WithBillingSchema.nullable()),

	linkChargeToIcd: oc
		.route({ method: "POST", path: "/charges/link-icd", summary: "Link a charge to an ICD code for CF5", tags: ["Billing"] })
		.input(LinkChargeToIcdInputSchema)
		.output(z.object({ success: z.boolean() })),

	// ========================================================================
	// CEWS Real-Time Check
	// ========================================================================

	checkCews: oc
		.route({ method: "POST", path: "/cews/check", summary: "Real-time CEWS (indigency/Listahanan) check", tags: ["Billing"] })
		.input(CewsCheckInputSchema)
		.output(CewsResponseSchema),
}

import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	BillingStatusInputSchema,
	BillingStatusResponseSchema,
	Cf4PreviewSchema,
	Cf4ClaimSchema,
	ChargeSchema,
	CheckEligibilityInputSchema,
	CreateChargeInputSchema,
	DeleteChargeInputSchema,
	EligibilityResponseSchema,
	FinalizeCf4InputSchema,
	FinalizeInvoiceInputSchema,
	GenerateCf4InputSchema,
	GenerateInvoiceInputSchema,
	GetCf4InputSchema,
	GetInvoiceInputSchema,
	InvoiceSchema,
	ListChargeMasterInputSchema,
	ListChargeMasterResponseSchema,
	ListChargesInputSchema,
	ListChargesResponseSchema,
	ListInvoicesInputSchema,
	ListInvoicesResponseSchema,
	ListPaymentsInputSchema,
	ListPaymentsResponseSchema,
	RecordPaymentInputSchema,
	PaymentSchema,
	UnbilledEncountersInputSchema,
	UnbilledEncountersResponseSchema,
	UpdateChargeInputSchema,
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
}

import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	ActiveOrdersResponseSchema,
	ActiveOrdersSchema,
	CdsEvaluateInputSchema,
	CdsEvaluateResponseSchema,
	CreateImagingOrderSchema,
	CreateLabOrderSchema,
	CreateMedOrderSchema,
	CreatePrescriptionSchema,
	CreateTranchedOrdersSchema,
	DiscontinueMedOrderSchema,
	ImagingOrderIdSchema,
	ImagingOrderListResponseSchema,
	ImagingOrderListSchema,
	ImagingOrderSchema,
	LabOrderIdSchema,
	LabOrderListResponseSchema,
	LabOrderListSchema,
	LabOrderSchema,
	MedOrderIdSchema,
	MedOrderListResponseSchema,
	MedOrderListSchema,
	MedOrderSchema,
	ParentOrderIdSchema,
	PdeaLicenseCheckSchema,
	PdeaLicenseStatusSchema,
	PrescriptionIdSchema,
	PrescriptionListResponseSchema,
	PrescriptionListSchema,
	PrescriptionSchema,
	SignPrescriptionSchema,
	TranchedOrdersResponseSchema,
	TranchePreviewInputSchema,
	TranchePreviewResponseSchema,
	UpdateMedOrderSchema,
	VerificationQueueResponseSchema,
	VerificationQueueSchema,
	VerificationSchema,
	VerifyOrderSchema,
} from "./orders.schema.js"

export const ordersContract = {
	// ========================================================================
	// CDS Evaluation
	// ========================================================================

	evaluateCds: oc
		.route({
			method: "POST",
			path: "/cds/evaluate",
			summary: "Run CDS evaluation pipeline for a medication order",
			tags: ["Orders — CDS"],
		})
		.input(CdsEvaluateInputSchema)
		.output(CdsEvaluateResponseSchema),

	// ========================================================================
	// Medication Orders
	// ========================================================================

	listMedOrders: oc
		.route({
			method: "GET",
			path: "/medications",
			summary: "List medication orders",
			tags: ["Orders — Medications"],
		})
		.input(MedOrderListSchema)
		.output(MedOrderListResponseSchema),

	getMedOrder: oc
		.route({
			method: "GET",
			path: "/medications/{id}",
			summary: "Get a medication order by ID",
			tags: ["Orders — Medications"],
		})
		.input(MedOrderIdSchema)
		.output(MedOrderSchema),

	createMedOrder: oc
		.route({
			method: "POST",
			path: "/medications",
			summary: "Create a new medication order",
			tags: ["Orders — Medications"],
		})
		.input(CreateMedOrderSchema)
		.output(MedOrderSchema),

	updateMedOrder: oc
		.route({
			method: "PUT",
			path: "/medications/{id}",
			summary: "Update a medication order",
			tags: ["Orders — Medications"],
		})
		.input(UpdateMedOrderSchema)
		.output(MedOrderSchema),

	discontinueMedOrder: oc
		.route({
			method: "PUT",
			path: "/medications/{id}/discontinue",
			summary: "Discontinue a medication order",
			tags: ["Orders — Medications"],
		})
		.input(DiscontinueMedOrderSchema)
		.output(MedOrderSchema),

	// ========================================================================
	// Lab Orders
	// ========================================================================

	listLabOrders: oc
		.route({
			method: "GET",
			path: "/labs",
			summary: "List lab orders",
			tags: ["Orders — Labs"],
		})
		.input(LabOrderListSchema)
		.output(LabOrderListResponseSchema),

	getLabOrder: oc
		.route({
			method: "GET",
			path: "/labs/{id}",
			summary: "Get a lab order by ID",
			tags: ["Orders — Labs"],
		})
		.input(LabOrderIdSchema)
		.output(LabOrderSchema),

	createLabOrder: oc
		.route({
			method: "POST",
			path: "/labs",
			summary: "Create a new lab order",
			tags: ["Orders — Labs"],
		})
		.input(CreateLabOrderSchema)
		.output(LabOrderSchema),

	// ========================================================================
	// Imaging Orders
	// ========================================================================

	listImagingOrders: oc
		.route({
			method: "GET",
			path: "/imaging",
			summary: "List imaging orders",
			tags: ["Orders — Imaging"],
		})
		.input(ImagingOrderListSchema)
		.output(ImagingOrderListResponseSchema),

	getImagingOrder: oc
		.route({
			method: "GET",
			path: "/imaging/{id}",
			summary: "Get an imaging order by ID",
			tags: ["Orders — Imaging"],
		})
		.input(ImagingOrderIdSchema)
		.output(ImagingOrderSchema),

	createImagingOrder: oc
		.route({
			method: "POST",
			path: "/imaging",
			summary: "Create a new imaging order",
			tags: ["Orders — Imaging"],
		})
		.input(CreateImagingOrderSchema)
		.output(ImagingOrderSchema),

	// ========================================================================
	// Pharmacy Verification
	// ========================================================================

	getVerificationQueue: oc
		.route({
			method: "GET",
			path: "/pharmacy/queue",
			summary: "Get pharmacy verification queue",
			tags: ["Orders — Pharmacy"],
		})
		.input(VerificationQueueSchema)
		.output(VerificationQueueResponseSchema),

	verifyOrder: oc
		.route({
			method: "POST",
			path: "/pharmacy/verify",
			summary: "Verify (approve/reject/modify) a medication order",
			tags: ["Orders — Pharmacy"],
		})
		.input(VerifyOrderSchema)
		.output(VerificationSchema),

	// ========================================================================
	// Prescriptions
	// ========================================================================

	listPrescriptions: oc
		.route({
			method: "GET",
			path: "/prescriptions",
			summary: "List e-prescriptions",
			tags: ["Orders — Prescriptions"],
		})
		.input(PrescriptionListSchema)
		.output(PrescriptionListResponseSchema),

	getPrescription: oc
		.route({
			method: "GET",
			path: "/prescriptions/{id}",
			summary: "Get a prescription by ID",
			tags: ["Orders — Prescriptions"],
		})
		.input(PrescriptionIdSchema)
		.output(PrescriptionSchema),

	createPrescription: oc
		.route({
			method: "POST",
			path: "/prescriptions",
			summary: "Generate an e-prescription from a medication order",
			tags: ["Orders — Prescriptions"],
		})
		.input(CreatePrescriptionSchema)
		.output(PrescriptionSchema),

	signPrescription: oc
		.route({
			method: "PUT",
			path: "/prescriptions/{id}/sign",
			summary: "Sign an e-prescription",
			tags: ["Orders — Prescriptions"],
		})
		.input(SignPrescriptionSchema)
		.output(PrescriptionSchema),

	// ========================================================================
	// Active Orders (cross-module)
	// ========================================================================

	getActiveOrders: oc
		.route({
			method: "GET",
			path: "/active",
			summary: "Get all active orders for an encounter (used by NursingModule MAR)",
			tags: ["Orders"],
		})
		.input(ActiveOrdersSchema)
		.output(ActiveOrdersResponseSchema),

	// ========================================================================
	// PDEA License Check
	// ========================================================================

	checkPdeaLicense: oc
		.route({
			method: "GET",
			path: "/pdea/check-license",
			summary: "Check if staff has valid PDEA S-2 license for controlled substances",
			tags: ["Orders — PDEA"],
		})
		.input(PdeaLicenseCheckSchema)
		.output(PdeaLicenseStatusSchema),

	// ========================================================================
	// PDEA Tranching (for controlled substances > 90 days)
	// ========================================================================

	previewTranches: oc
		.route({
			method: "POST",
			path: "/pdea/preview-tranches",
			summary: "Preview how an order will be split into tranches (controlled substances > 90 days)",
			tags: ["Orders — PDEA"],
		})
		.input(TranchePreviewInputSchema)
		.output(TranchePreviewResponseSchema),

	createTranchedOrders: oc
		.route({
			method: "POST",
			path: "/pdea/create-tranched",
			summary: "Create parent order with child tranche orders",
			tags: ["Orders — PDEA"],
		})
		.input(CreateTranchedOrdersSchema)
		.output(TranchedOrdersResponseSchema),

	getChildOrders: oc
		.route({
			method: "GET",
			path: "/medications/{parentOrderId}/tranches",
			summary: "Get child tranche orders for a parent order",
			tags: ["Orders — PDEA"],
		})
		.input(ParentOrderIdSchema)
		.output(z.array(MedOrderSchema)),
}

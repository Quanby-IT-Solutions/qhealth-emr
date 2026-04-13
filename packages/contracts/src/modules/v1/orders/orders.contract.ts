import { oc } from "@orpc/contract"

import {
	ActiveOrdersResponseSchema,
	ActiveOrdersSchema,
	CdsEvaluateInputSchema,
	CdsEvaluateResponseSchema,
	CreateImagingOrderSchema,
	CreateLabOrderSchema,
	CreateMedOrderSchema,
	CreatePrescriptionSchema,
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
	PrescriptionIdSchema,
	PrescriptionListResponseSchema,
	PrescriptionListSchema,
	PrescriptionSchema,
	SignPrescriptionSchema,
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
			path: "/orders/cds/evaluate",
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
			path: "/orders/medications",
			summary: "List medication orders",
			tags: ["Orders — Medications"],
		})
		.input(MedOrderListSchema)
		.output(MedOrderListResponseSchema),

	getMedOrder: oc
		.route({
			method: "GET",
			path: "/orders/medications/{id}",
			summary: "Get a medication order by ID",
			tags: ["Orders — Medications"],
		})
		.input(MedOrderIdSchema)
		.output(MedOrderSchema),

	createMedOrder: oc
		.route({
			method: "POST",
			path: "/orders/medications",
			summary: "Create a new medication order",
			tags: ["Orders — Medications"],
		})
		.input(CreateMedOrderSchema)
		.output(MedOrderSchema),

	updateMedOrder: oc
		.route({
			method: "PUT",
			path: "/orders/medications/{id}",
			summary: "Update a medication order",
			tags: ["Orders — Medications"],
		})
		.input(UpdateMedOrderSchema)
		.output(MedOrderSchema),

	discontinueMedOrder: oc
		.route({
			method: "PUT",
			path: "/orders/medications/{id}/discontinue",
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
			path: "/orders/labs",
			summary: "List lab orders",
			tags: ["Orders — Labs"],
		})
		.input(LabOrderListSchema)
		.output(LabOrderListResponseSchema),

	getLabOrder: oc
		.route({
			method: "GET",
			path: "/orders/labs/{id}",
			summary: "Get a lab order by ID",
			tags: ["Orders — Labs"],
		})
		.input(LabOrderIdSchema)
		.output(LabOrderSchema),

	createLabOrder: oc
		.route({
			method: "POST",
			path: "/orders/labs",
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
			path: "/orders/imaging",
			summary: "List imaging orders",
			tags: ["Orders — Imaging"],
		})
		.input(ImagingOrderListSchema)
		.output(ImagingOrderListResponseSchema),

	getImagingOrder: oc
		.route({
			method: "GET",
			path: "/orders/imaging/{id}",
			summary: "Get an imaging order by ID",
			tags: ["Orders — Imaging"],
		})
		.input(ImagingOrderIdSchema)
		.output(ImagingOrderSchema),

	createImagingOrder: oc
		.route({
			method: "POST",
			path: "/orders/imaging",
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
			path: "/orders/pharmacy/queue",
			summary: "Get pharmacy verification queue",
			tags: ["Orders — Pharmacy"],
		})
		.input(VerificationQueueSchema)
		.output(VerificationQueueResponseSchema),

	verifyOrder: oc
		.route({
			method: "POST",
			path: "/orders/pharmacy/verify",
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
			path: "/orders/prescriptions",
			summary: "List e-prescriptions",
			tags: ["Orders — Prescriptions"],
		})
		.input(PrescriptionListSchema)
		.output(PrescriptionListResponseSchema),

	getPrescription: oc
		.route({
			method: "GET",
			path: "/orders/prescriptions/{id}",
			summary: "Get a prescription by ID",
			tags: ["Orders — Prescriptions"],
		})
		.input(PrescriptionIdSchema)
		.output(PrescriptionSchema),

	createPrescription: oc
		.route({
			method: "POST",
			path: "/orders/prescriptions",
			summary: "Generate an e-prescription from a medication order",
			tags: ["Orders — Prescriptions"],
		})
		.input(CreatePrescriptionSchema)
		.output(PrescriptionSchema),

	signPrescription: oc
		.route({
			method: "PUT",
			path: "/orders/prescriptions/{id}/sign",
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
			path: "/orders/active",
			summary: "Get all active orders for an encounter (used by NursingModule MAR)",
			tags: ["Orders"],
		})
		.input(ActiveOrdersSchema)
		.output(ActiveOrdersResponseSchema),
}

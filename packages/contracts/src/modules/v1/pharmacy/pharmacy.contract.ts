import { oc } from "@orpc/contract"

import {
	CancelDispensingSchema,
	CompleteDispensingSchema,
	DispensingQueueItemSchema,
	DispensingQueueQuerySchema,
	DispensingQueueResponseSchema,
	DispensingRecordListResponseSchema,
	DispensingRecordListSchema,
	DispensingRecordSchema,
	HoldDispensingSchema,
	OpdPickupResultSchema,
	OpdPickupSchema,
	PartialDispensingSchema,
	QueueItemIdSchema,
	StartDispensingSchema,
} from "./pharmacy.schema.js"

export const pharmacyContract = {
	// ========================================================================
	// Dispensing Queue
	// ========================================================================

	getQueue: oc
		.route({
			method: "GET",
			path: "/queue",
			summary: "Get pharmacy dispensing queue",
			tags: ["Pharmacy — Queue"],
		})
		.input(DispensingQueueQuerySchema)
		.output(DispensingQueueResponseSchema),

	getQueueItem: oc
		.route({
			method: "GET",
			path: "/queue/{id}",
			summary: "Get dispensing queue item by ID",
			tags: ["Pharmacy — Queue"],
		})
		.input(QueueItemIdSchema)
		.output(DispensingQueueItemSchema),

	startDispensing: oc
		.route({
			method: "POST",
			path: "/queue/{queueItemId}/start",
			summary: "Start dispensing (assign to pharmacist)",
			tags: ["Pharmacy — Queue"],
		})
		.input(StartDispensingSchema)
		.output(DispensingQueueItemSchema),

	completeDispensing: oc
		.route({
			method: "POST",
			path: "/queue/{queueItemId}/complete",
			summary: "Complete dispensing",
			tags: ["Pharmacy — Queue"],
		})
		.input(CompleteDispensingSchema)
		.output(DispensingRecordSchema),

	partialDispensing: oc
		.route({
			method: "POST",
			path: "/queue/{queueItemId}/partial",
			summary: "Partial dispensing (not fully available)",
			tags: ["Pharmacy — Queue"],
		})
		.input(PartialDispensingSchema)
		.output(DispensingRecordSchema),

	holdDispensing: oc
		.route({
			method: "POST",
			path: "/queue/{queueItemId}/hold",
			summary: "Put dispensing on hold",
			tags: ["Pharmacy — Queue"],
		})
		.input(HoldDispensingSchema)
		.output(DispensingQueueItemSchema),

	cancelDispensing: oc
		.route({
			method: "POST",
			path: "/queue/{queueItemId}/cancel",
			summary: "Cancel dispensing",
			tags: ["Pharmacy — Queue"],
		})
		.input(CancelDispensingSchema)
		.output(DispensingQueueItemSchema),

	// ========================================================================
	// Dispensing Records
	// ========================================================================

	listRecords: oc
		.route({
			method: "GET",
			path: "/records",
			summary: "List dispensing records",
			tags: ["Pharmacy — Records"],
		})
		.input(DispensingRecordListSchema)
		.output(DispensingRecordListResponseSchema),

	// ========================================================================
	// OPD Pickup
	// ========================================================================

	confirmOpdPickup: oc
		.route({
			method: "POST",
			path: "/records/{dispensingRecordId}/pickup",
			summary: "Confirm OPD medication pickup",
			tags: ["Pharmacy — OPD"],
		})
		.input(OpdPickupSchema)
		.output(OpdPickupResultSchema),
}

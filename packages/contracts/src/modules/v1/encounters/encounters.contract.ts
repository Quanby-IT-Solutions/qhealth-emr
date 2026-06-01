import { oc } from "@orpc/contract"

import {
	CloseEncounterSchema,
	CreateEncounterSchema,
	DischargeChecklistSchema,
	DischargeEncounterSchema,
	EncounterDetailSchema,
	EncounterIdSchema,
	EncounterListResponseSchema,
	EncounterListSchema,
	EncounterSchema,
	LinkedEncounterListSchema,
	ListPendingTransfersSchema,
	PendingTransferListResponseSchema,
	ReceiveTransferSchema,
	SignMayGoHomeOrderSchema,
	TransferEncounterSchema,
} from "./encounters.schema.js"

export const encounterContract = {
	list: oc
		.route({
			method: "GET",
			path: "/encounters",
			summary: "List encounters for a patient or facility",
			tags: ["Encounters"],
		})
		.input(EncounterListSchema)
		.output(EncounterListResponseSchema),

	get: oc
		.route({
			method: "GET",
			path: "/encounters/{id}",
			summary: "Get encounter detail with transfers and patient info",
			tags: ["Encounters"],
		})
		.input(EncounterIdSchema)
		.output(EncounterDetailSchema),

	getLinked: oc
		.route({
			method: "GET",
			path: "/encounters/{id}/linked",
			summary: "Get linked encounters (telemedicine follow-ups referencing this encounter)",
			tags: ["Encounters"],
		})
		.input(EncounterIdSchema)
		.output(LinkedEncounterListSchema),

	create: oc
		.route({
			method: "POST",
			path: "/encounters",
			summary: "Create a new encounter (IP/OP/ED)",
			tags: ["Encounters"],
		})
		.input(CreateEncounterSchema)
		.output(EncounterSchema),

	initiateTransfer: oc
		.route({
			method: "POST",
			path: "/encounters/{encounterId}/transfer",
			summary: "Initiate transfer — source bed → pending_transfer, dest bed → reserved",
			tags: ["Encounters"],
		})
		.input(TransferEncounterSchema)
		.output(EncounterSchema),

	receiveTransfer: oc
		.route({
			method: "POST",
			path: "/encounters/transfers/{transferId}/receive",
			summary: "Ward nurse confirms patient arrival — source bed → dirty, dest bed → occupied",
			tags: ["Encounters"],
		})
		.input(ReceiveTransferSchema)
		.output(EncounterSchema),

	listPendingTransfers: oc
		.route({
			method: "GET",
			path: "/encounters/transfers/pending",
			summary: "List pending transfers destined for a facility (optionally filtered by ward)",
			tags: ["Encounters"],
		})
		.input(ListPendingTransfersSchema)
		.output(PendingTransferListResponseSchema),

	discharge: oc
		.route({
			method: "POST",
			path: "/encounters/{encounterId}/discharge",
			summary: "Discharge an inpatient encounter",
			tags: ["Encounters"],
		})
		.input(DischargeEncounterSchema)
		.output(EncounterSchema),

	signMayGoHomeOrder: oc
		.route({
			method: "POST",
			path: "/encounters/{encounterId}/may-go-home",
			summary: "Sign May Go Home order and notify discharge queues",
			tags: ["Encounters"],
		})
		.input(SignMayGoHomeOrderSchema)
		.output(EncounterSchema),

	close: oc
		.route({
			method: "POST",
			path: "/encounters/{encounterId}/close",
			summary: "Close an outpatient encounter",
			tags: ["Encounters"],
		})
		.input(CloseEncounterSchema)
		.output(EncounterSchema),

	checklist: oc
		.route({
			method: "GET",
			path: "/encounters/{id}/checklist",
			summary: "Get discharge/close checklist (computed on read)",
			tags: ["Encounters"],
		})
		.input(EncounterIdSchema)
		.output(DischargeChecklistSchema),
}

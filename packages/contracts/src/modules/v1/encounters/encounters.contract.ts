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
	TransferEncounterSchema,
} from "./encounters.schema.js"

export const encounterContract = {
	list: oc
		.route({
			method: "GET",
			path: "/encounters",
			summary: "List encounters for a patient",
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

	create: oc
		.route({
			method: "POST",
			path: "/encounters",
			summary: "Create a new encounter (IP/OP/ED)",
			tags: ["Encounters"],
		})
		.input(CreateEncounterSchema)
		.output(EncounterSchema),

	transfer: oc
		.route({
			method: "POST",
			path: "/encounters/{encounterId}/transfer",
			summary: "Transfer inpatient to a different ward/bed",
			tags: ["Encounters"],
		})
		.input(TransferEncounterSchema)
		.output(EncounterSchema),

	discharge: oc
		.route({
			method: "POST",
			path: "/encounters/{encounterId}/discharge",
			summary: "Discharge an inpatient encounter",
			tags: ["Encounters"],
		})
		.input(DischargeEncounterSchema)
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

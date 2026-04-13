import { oc } from "@orpc/contract"

import { z } from "zod"

import {
	CreatePreEncounterSchema,
	EdDispositionResultSchema,
	EdDispositionSchema,
	EdQueueListSchema,
	EdQueueResponseSchema,
	MergePreEncounterSchema,
	MergePreviewSchema,
	MergeResultSchema,
	PreEncounterDetailSchema,
	PreEncounterIdSchema,
	PreEncounterListResponseSchema,
	PreEncounterListSchema,
	PreEncounterSchema,
	UpdatePreEncounterSchema,
	UpdateQueueStatusSchema,
} from "./ed.schema.js"

const MergePreviewInputSchema = z.object({
	preEncounterId: z.string().uuid(),
	patientId: z.string().uuid(),
})

export const edContract = {
	// Pre-Encounter CRUD
	createPreEncounter: oc
		.route({
			method: "POST",
			path: "/pre-encounters",
			summary: "Create a pre-encounter with triage and auto-generated trauma alias",
			tags: ["Emergency Department"],
		})
		.input(CreatePreEncounterSchema)
		.output(PreEncounterSchema),

	getPreEncounter: oc
		.route({
			method: "GET",
			path: "/pre-encounters/{id}",
			summary: "Get pre-encounter detail",
			tags: ["Emergency Department"],
		})
		.input(PreEncounterIdSchema)
		.output(PreEncounterDetailSchema),

	updatePreEncounter: oc
		.route({
			method: "PUT",
			path: "/pre-encounters/{id}",
			summary: "Update triage info on a pre-encounter",
			tags: ["Emergency Department"],
		})
		.input(UpdatePreEncounterSchema)
		.output(PreEncounterSchema),

	listPreEncounters: oc
		.route({
			method: "GET",
			path: "/pre-encounters",
			summary: "List pre-encounters for a facility",
			tags: ["Emergency Department"],
		})
		.input(PreEncounterListSchema)
		.output(PreEncounterListResponseSchema),

	// Chart Merge
	mergePreview: oc
		.route({
			method: "GET",
			path: "/pre-encounters/{preEncounterId}/merge-preview",
			summary: "Preview merge: shows pre-encounter data and record counts",
			tags: ["Emergency Department"],
		})
		.input(MergePreviewInputSchema)
		.output(MergePreviewSchema),

	merge: oc
		.route({
			method: "POST",
			path: "/pre-encounters/{preEncounterId}/merge",
			summary: "Atomically merge pre-encounter into a permanent patient chart",
			tags: ["Emergency Department"],
		})
		.input(MergePreEncounterSchema)
		.output(MergeResultSchema),

	// ED Queue
	getQueue: oc
		.route({
			method: "GET",
			path: "/queue",
			summary: "Get the ED queue (table view + tracking board data)",
			tags: ["Emergency Department"],
		})
		.input(EdQueueListSchema)
		.output(EdQueueResponseSchema),

	updateQueueStatus: oc
		.route({
			method: "PUT",
			path: "/queue/status",
			summary: "Update queue status for a patient (tracking board drag)",
			tags: ["Emergency Department"],
		})
		.input(UpdateQueueStatusSchema)
		.output(UpdateQueueStatusSchema),

	// ED Disposition
	dispose: oc
		.route({
			method: "POST",
			path: "/disposition",
			summary: "Set ED disposition — Admit creates inpatient encounter, Discharge tags OECB",
			tags: ["Emergency Department"],
		})
		.input(EdDispositionSchema)
		.output(EdDispositionResultSchema),
}

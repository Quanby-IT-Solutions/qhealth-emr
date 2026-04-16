import { oc } from "@orpc/contract"

import {
	ApproveCrossMatchSchema,
	BedsideVerifyInputSchema,
	BedsideVerifyResultSchema,
	CreateCrossMatchSchema,
	CrossMatchIdSchema,
	CrossMatchListQuerySchema,
	CrossMatchListResponseSchema,
	CrossMatchRequestSchema,
} from "./lab.schema.js"

export const labContract = {
	// ========================================================================
	// Blood Bank — Cross-Match Requests
	// ========================================================================

	listCrossMatches: oc
		.route({
			method: "GET",
			path: "/blood-bank/cross-matches",
			summary: "List cross-match requests for a facility",
			tags: ["Lab — Blood Bank"],
		})
		.input(CrossMatchListQuerySchema)
		.output(CrossMatchListResponseSchema),

	getCrossMatch: oc
		.route({
			method: "GET",
			path: "/blood-bank/cross-matches/{id}",
			summary: "Get a cross-match request by ID",
			tags: ["Lab — Blood Bank"],
		})
		.input(CrossMatchIdSchema)
		.output(CrossMatchRequestSchema),

	createCrossMatch: oc
		.route({
			method: "POST",
			path: "/blood-bank/cross-matches",
			summary: "Create a new cross-match request",
			tags: ["Lab — Blood Bank"],
		})
		.input(CreateCrossMatchSchema)
		.output(CrossMatchRequestSchema),

	approveCrossMatch: oc
		.route({
			method: "PUT",
			path: "/blood-bank/cross-matches/{id}/approve",
			summary: "Approve a cross-match and assign blood units",
			tags: ["Lab — Blood Bank"],
		})
		.input(ApproveCrossMatchSchema)
		.output(CrossMatchRequestSchema),

	// ========================================================================
	// Blood Bank — Bedside Verification
	// ========================================================================

	bedsideVerify: oc
		.route({
			method: "POST",
			path: "/blood-bank/bedside-verify",
			summary: "Verify patient and blood unit at bedside before transfusion",
			tags: ["Lab — Blood Bank"],
		})
		.input(BedsideVerifyInputSchema)
		.output(BedsideVerifyResultSchema),
}

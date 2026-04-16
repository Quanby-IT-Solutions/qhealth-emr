import { oc } from "@orpc/contract"

import {
	AddMalasakitSchema,
	CaptureAnnexSignatureSchema,
	CreateMswEvaluationSchema,
	IssueCoeSchema,
	MswByEncounterSchema,
	MswEvaluationIdSchema,
	MswEvaluationListResponseSchema,
	MswEvaluationListSchema,
	MswEvaluationSchema,
	TagBenefitsSchema,
	UpdateMswEvaluationSchema,
} from "./msw.schema.js"

export const mswContract = {
	// ========================================================================
	// MSW Evaluations
	// ========================================================================

	list: oc
		.route({
			method: "GET",
			path: "/evaluations",
			summary: "List MSW financial evaluations",
			tags: ["MSW"],
		})
		.input(MswEvaluationListSchema)
		.output(MswEvaluationListResponseSchema),

	get: oc
		.route({
			method: "GET",
			path: "/evaluations/{id}",
			summary: "Get MSW evaluation by ID",
			tags: ["MSW"],
		})
		.input(MswEvaluationIdSchema)
		.output(MswEvaluationSchema),

	getByEncounter: oc
		.route({
			method: "GET",
			path: "/evaluations/by-encounter/{encounterId}",
			summary: "Get MSW evaluation by encounter ID",
			tags: ["MSW"],
		})
		.input(MswByEncounterSchema)
		.output(MswEvaluationSchema.nullable()),

	create: oc
		.route({
			method: "POST",
			path: "/evaluations",
			summary: "Create MSW evaluation",
			tags: ["MSW"],
		})
		.input(CreateMswEvaluationSchema)
		.output(MswEvaluationSchema),

	update: oc
		.route({
			method: "PUT",
			path: "/evaluations/{id}",
			summary: "Update MSW evaluation findings",
			tags: ["MSW"],
		})
		.input(UpdateMswEvaluationSchema)
		.output(MswEvaluationSchema),

	// ========================================================================
	// CoE Issuance
	// ========================================================================

	issueCoe: oc
		.route({
			method: "POST",
			path: "/evaluations/{evaluationId}/coe",
			summary: "Issue Certificate of Eligibility",
			tags: ["MSW"],
		})
		.input(IssueCoeSchema)
		.output(MswEvaluationSchema),

	// ========================================================================
	// Malasakit Assistance
	// ========================================================================

	addMalasakit: oc
		.route({
			method: "POST",
			path: "/evaluations/{evaluationId}/malasakit",
			summary: "Add Malasakit assistance sources",
			tags: ["MSW"],
		})
		.input(AddMalasakitSchema)
		.output(MswEvaluationSchema),

	// ========================================================================
	// Annex Signature Capture
	// ========================================================================

	captureAnnexSignature: oc
		.route({
			method: "POST",
			path: "/evaluations/{evaluationId}/annex-signature",
			summary: "Capture PhilHealth Annex A/B signature",
			tags: ["MSW"],
		})
		.input(CaptureAnnexSignatureSchema)
		.output(MswEvaluationSchema),

	// ========================================================================
	// Benefit Tagging
	// ========================================================================

	tagBenefits: oc
		.route({
			method: "PUT",
			path: "/evaluations/{evaluationId}/benefits",
			summary: "Tag Konsulta/Z-Benefits on evaluation",
			tags: ["MSW"],
		})
		.input(TagBenefitsSchema)
		.output(MswEvaluationSchema),
}

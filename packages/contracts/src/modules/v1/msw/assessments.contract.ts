import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	EvaluationFindingsSchema,
	MswEvaluationListResponseSchema,
	MswEvaluationListSchema,
	MswEvaluationSchema,
} from "./msw.schema.js"

const EligibilityDecisionEnum = z.enum(["malasakit", "z_benefits", "indigent", "not_eligible"])

const DocumentCategoryEnum = z.enum(["brgy_indigency", "id", "income_proof", "other"])

const MswDocumentSchema = z.object({
	id: z.string().uuid(),
	evaluationId: z.string().uuid(),
	category: DocumentCategoryEnum,
	uri: z.string(),
	contentHash: z.string().nullable(),
	createdAt: z.union([z.date(), z.string()]),
})

const UpsertAssessmentSchema = z.object({
	encounterId: z.string().uuid(),
	patientId: z.string().uuid(),
	facilityId: z.string().uuid(),
	evaluationFindings: EvaluationFindingsSchema.optional(),
	eligibilityDecision: EligibilityDecisionEnum.optional(),
	recommendationNotes: z.string().optional(),
})

const AttachDocumentSchema = z.object({
	evaluationId: z.string().uuid(),
	category: DocumentCategoryEnum,
	uri: z.string(),
})

export const assessmentsContract = {
	upsert: oc
		.route({
			method: "POST",
			path: "/assessments/upsert",
			summary: "Create or update MSW assessment",
			tags: ["MSW Assessments"],
		})
		.input(UpsertAssessmentSchema)
		.output(MswEvaluationSchema),

	attachDocument: oc
		.route({
			method: "POST",
			path: "/assessments/{evaluationId}/documents",
			summary: "Attach document to assessment",
			tags: ["MSW Assessments"],
		})
		.input(AttachDocumentSchema)
		.output(MswDocumentSchema),

	get: oc
		.route({
			method: "GET",
			path: "/assessments/{id}",
			summary: "Get MSW assessment by ID",
			tags: ["MSW Assessments"],
		})
		.input(z.object({ id: z.string().uuid() }))
		.output(MswEvaluationSchema),

	list: oc
		.route({
			method: "GET",
			path: "/assessments",
			summary: "List MSW assessments",
			tags: ["MSW Assessments"],
		})
		.input(MswEvaluationListSchema)
		.output(MswEvaluationListResponseSchema),
}

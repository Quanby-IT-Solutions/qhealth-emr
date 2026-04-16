import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	CewsEligibilityQuerySchema,
	CewsEligibilityResultSchema,
	Cf5ClaimSchema,
	Cf5IdSchema,
	Cf5ListResponseSchema,
	Cf5ListSchema,
	CreateCf5Schema,
	CreateKonsultaSchema,
	KonsultaIdSchema,
	KonsultaListResponseSchema,
	KonsultaListSchema,
	KonsultaServiceSchema,
	SubmitCf5Schema,
	SubmitKonsultaSchema,
	ValidateCf5Schema,
	ZBenefitStatusSchema,
	ZBenefitTagSchema,
} from "./philhealth.schema.js"

export const philhealthContract = {
	// ========================================================================
	// CEWS Eligibility
	// ========================================================================

	checkEligibility: oc
		.route({
			method: "GET",
			path: "/cews/eligibility",
			summary: "Check PhilHealth CEWS eligibility",
			tags: ["PhilHealth — CEWS"],
		})
		.input(CewsEligibilityQuerySchema)
		.output(CewsEligibilityResultSchema),

	// ========================================================================
	// CF5 Claims (DRG Shadow Billing)
	// ========================================================================

	listCf5: oc
		.route({
			method: "GET",
			path: "/cf5",
			summary: "List CF5 claims",
			tags: ["PhilHealth — CF5"],
		})
		.input(Cf5ListSchema)
		.output(Cf5ListResponseSchema),

	getCf5: oc
		.route({
			method: "GET",
			path: "/cf5/{id}",
			summary: "Get CF5 claim by ID",
			tags: ["PhilHealth — CF5"],
		})
		.input(Cf5IdSchema)
		.output(Cf5ClaimSchema),

	createCf5: oc
		.route({
			method: "POST",
			path: "/cf5",
			summary: "Create CF5 claim",
			tags: ["PhilHealth — CF5"],
		})
		.input(CreateCf5Schema)
		.output(Cf5ClaimSchema),

	validateCf5: oc
		.route({
			method: "PUT",
			path: "/cf5/{id}/validate",
			summary: "Validate CF5 claim with DRG codes",
			tags: ["PhilHealth — CF5"],
		})
		.input(ValidateCf5Schema)
		.output(Cf5ClaimSchema),

	submitCf5: oc
		.route({
			method: "POST",
			path: "/cf5/{id}/submit",
			summary: "Submit CF5 claim to PhilHealth",
			tags: ["PhilHealth — CF5"],
		})
		.input(SubmitCf5Schema)
		.output(Cf5ClaimSchema),

	// ========================================================================
	// Konsulta
	// ========================================================================

	listKonsulta: oc
		.route({
			method: "GET",
			path: "/konsulta",
			summary: "List Konsulta service records",
			tags: ["PhilHealth — Konsulta"],
		})
		.input(KonsultaListSchema)
		.output(KonsultaListResponseSchema),

	getKonsulta: oc
		.route({
			method: "GET",
			path: "/konsulta/{id}",
			summary: "Get Konsulta service by ID",
			tags: ["PhilHealth — Konsulta"],
		})
		.input(KonsultaIdSchema)
		.output(KonsultaServiceSchema),

	createKonsulta: oc
		.route({
			method: "POST",
			path: "/konsulta",
			summary: "Create Konsulta service record",
			tags: ["PhilHealth — Konsulta"],
		})
		.input(CreateKonsultaSchema)
		.output(KonsultaServiceSchema),

	submitKonsulta: oc
		.route({
			method: "POST",
			path: "/konsulta/{id}/submit",
			summary: "Submit Konsulta service to PhilHealth",
			tags: ["PhilHealth — Konsulta"],
		})
		.input(SubmitKonsultaSchema)
		.output(KonsultaServiceSchema),

	// ========================================================================
	// Z-Benefit Tagging
	// ========================================================================

	tagZBenefit: oc
		.route({
			method: "POST",
			path: "/z-benefit/tag",
			summary: "Tag encounter with Z-Benefit package",
			tags: ["PhilHealth — Z-Benefit"],
		})
		.input(ZBenefitTagSchema)
		.output(ZBenefitStatusSchema),

	getZBenefitStatus: oc
		.route({
			method: "GET",
			path: "/z-benefit/status/{encounterId}",
			summary: "Get Z-Benefit status for encounter",
			tags: ["PhilHealth — Z-Benefit"],
		})
		.input(z.object({ encounterId: z.string().uuid() }))
		.output(ZBenefitStatusSchema),
}

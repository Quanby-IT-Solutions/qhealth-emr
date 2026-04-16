import { oc } from "@orpc/contract"

import {
	ActiveAllergiesResponseSchema,
	ActiveAllergiesSchema,
	AllergyIdSchema,
	AllergyListResponseSchema,
	AllergyListSchema,
	AllergySchema,
	CreateAllergySchema,
	CreateProblemSchema,
	DeactivateAllergySchema,
	PatientSummaryResponseSchema,
	PatientSummarySchema,
	ProblemIdSchema,
	ProblemListResponseSchema,
	ProblemListSchema,
	ProblemSchema,
	ResolveProblemSchema,
	UpdateAllergySchema,
	UpdateProblemSchema,
} from "./problems-allergies.schema.js"

export const problemsAllergiesContract = {
	// ========================================================================
	// Problems
	// ========================================================================

	listProblems: oc
		.route({
			method: "GET",
			path: "/problems",
			summary: "List problems for a patient",
			tags: ["Problems & Allergies"],
		})
		.input(ProblemListSchema)
		.output(ProblemListResponseSchema),

	getProblem: oc
		.route({
			method: "GET",
			path: "/problems/{id}",
			summary: "Get a single problem by ID",
			tags: ["Problems & Allergies"],
		})
		.input(ProblemIdSchema)
		.output(ProblemSchema),

	createProblem: oc
		.route({
			method: "POST",
			path: "/problems",
			summary: "Add a problem to the patient problem list",
			tags: ["Problems & Allergies"],
		})
		.input(CreateProblemSchema)
		.output(ProblemSchema),

	updateProblem: oc
		.route({
			method: "PUT",
			path: "/problems/{id}",
			summary: "Update a problem",
			tags: ["Problems & Allergies"],
		})
		.input(UpdateProblemSchema)
		.output(ProblemSchema),

	resolveProblem: oc
		.route({
			method: "PUT",
			path: "/problems/{id}/resolve",
			summary: "Mark a problem as resolved",
			tags: ["Problems & Allergies"],
		})
		.input(ResolveProblemSchema)
		.output(ProblemSchema),

	// ========================================================================
	// Allergies
	// ========================================================================

	listAllergies: oc
		.route({
			method: "GET",
			path: "/allergies",
			summary: "List allergies for a patient",
			tags: ["Problems & Allergies"],
		})
		.input(AllergyListSchema)
		.output(AllergyListResponseSchema),

	getAllergy: oc
		.route({
			method: "GET",
			path: "/allergies/{id}",
			summary: "Get a single allergy by ID",
			tags: ["Problems & Allergies"],
		})
		.input(AllergyIdSchema)
		.output(AllergySchema),

	createAllergy: oc
		.route({
			method: "POST",
			path: "/allergies",
			summary: "Add a new allergy to the patient record",
			tags: ["Problems & Allergies"],
		})
		.input(CreateAllergySchema)
		.output(AllergySchema),

	updateAllergy: oc
		.route({
			method: "PUT",
			path: "/allergies/{id}",
			summary: "Update an allergy record",
			tags: ["Problems & Allergies"],
		})
		.input(UpdateAllergySchema)
		.output(AllergySchema),

	deactivateAllergy: oc
		.route({
			method: "PUT",
			path: "/allergies/{id}/deactivate",
			summary: "Deactivate an allergy record",
			tags: ["Problems & Allergies"],
		})
		.input(DeactivateAllergySchema)
		.output(AllergySchema),

	// ========================================================================
	// CDS / Cross-module
	// ========================================================================

	getActiveAllergies: oc
		.route({
			method: "GET",
			path: "/active-allergies",
			summary: "Get active allergies for a patient (used by CDS module)",
			tags: ["Problems & Allergies"],
		})
		.input(ActiveAllergiesSchema)
		.output(ActiveAllergiesResponseSchema),

	getPatientSummary: oc
		.route({
			method: "GET",
			path: "/summary",
			summary: "Get combined problems & allergies summary for a patient",
			tags: ["Problems & Allergies"],
		})
		.input(PatientSummarySchema)
		.output(PatientSummaryResponseSchema),
}

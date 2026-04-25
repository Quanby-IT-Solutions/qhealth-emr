import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	CreateFhirExportSchema,
	FhirExportByIdParamsSchema,
	FhirExportSchema,
	FhirExportsQuerySchema,
	FhirExportsResponseSchema,
	FhirSystemStatusSchema,
	FhirValidationReportSchema,
	NhdrSubmissionSchema,
	NhdrSubmissionsQuerySchema,
	SubmitToNhdrParamsSchema,
} from "./fhir.schema.js"

export const fhirContract = {
	// ========================================================================
	// Exports
	// ========================================================================

	listExports: oc
		.route({
			method: "GET",
			path: "/exports",
			summary: "List FHIR exports with pagination",
			tags: ["FHIR"],
		})
		.input(FhirExportsQuerySchema)
		.output(FhirExportsResponseSchema),

	getExport: oc
		.route({
			method: "GET",
			path: "/exports/{exportId}",
			summary: "Get FHIR export details by ID",
			tags: ["FHIR"],
		})
		.input(FhirExportByIdParamsSchema)
		.output(FhirExportSchema),

	createExport: oc
		.route({
			method: "POST",
			path: "/exports",
			summary: "Create a new FHIR export",
			tags: ["FHIR"],
		})
		.input(CreateFhirExportSchema)
		.output(FhirExportSchema),

	getValidationReport: oc
		.route({
			method: "GET",
			path: "/exports/{exportId}/validation",
			summary: "Get validation report for an export",
			tags: ["FHIR"],
		})
		.input(FhirExportByIdParamsSchema)
		.output(FhirValidationReportSchema),

	submitToNhdr: oc
		.route({
			method: "POST",
			path: "/exports/{exportId}/submit-nhdr",
			summary: "Submit an export to NHDR",
			tags: ["FHIR"],
		})
		.input(SubmitToNhdrParamsSchema)
		.output(NhdrSubmissionSchema),

	// ========================================================================
	// NHDR Submissions
	// ========================================================================

	listNhdrSubmissions: oc
		.route({
			method: "GET",
			path: "/nhdr-submissions",
			summary: "List NHDR submissions for a facility",
			tags: ["FHIR"],
		})
		.input(NhdrSubmissionsQuerySchema)
		.output(z.array(NhdrSubmissionSchema)),

	// ========================================================================
	// Bundle download
	// ========================================================================

	downloadBundle: oc
		.route({
			method: "GET",
			path: "/exports/{exportId}/bundle",
			summary: "Download the FHIR NDJSON bundle for an export",
			tags: ["FHIR"],
		})
		.input(FhirExportByIdParamsSchema)
		.output(z.object({ ndjson: z.string(), filename: z.string() })),

	// ========================================================================
	// System status
	// ========================================================================

	getSystemStatus: oc
		.route({
			method: "GET",
			path: "/system-status",
			summary: "Get FHIR/NHDR integration system status",
			tags: ["FHIR"],
		})
		.input(z.object({}))
		.output(FhirSystemStatusSchema),
}

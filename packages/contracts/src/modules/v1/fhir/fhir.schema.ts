import { z } from "zod"

// ============================================================================
// Helpers
// ============================================================================

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

const PaginationInputSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
})

const PaginatedResponseSchema = z.object({
	total: z.number(),
	page: z.number(),
	totalPages: z.number(),
})

// Helper to handle empty string as undefined for optional UUID fields
const optionalUuid = z
	.string()
	.optional()
	.transform(v => (v === "" ? undefined : v))
	.pipe(z.string().uuid().optional())

// ============================================================================
// Enums
// ============================================================================

export const FhirResourceTypeEnum = z.enum([
	"Patient",
	"Encounter",
	"Observation",
	"DiagnosticReport",
	"MedicationRequest",
	"Procedure",
	"Condition",
	"Immunization",
	"AllergyIntolerance",
	"Coverage",
	"ClaimResponse",
	"Practitioner",
	"Organization",
	"Location",
])

export const FhirExportStatusEnum = z.enum([
	"pending",
	"processing",
	"completed",
	"failed",
	"submitted",
	"accepted",
	"rejected",
])

export const NhdrSubmissionStatusEnum = z.enum([
	"pending",
	"submitted",
	"accepted",
	"rejected",
	"error",
])

export const ValidationIssueSeverityEnum = z.enum(["error", "warning", "information"])

export type FhirResourceType = z.infer<typeof FhirResourceTypeEnum>
export type FhirExportStatus = z.infer<typeof FhirExportStatusEnum>
export type NhdrSubmissionStatus = z.infer<typeof NhdrSubmissionStatusEnum>

// ============================================================================
// FHIR Export Schema
// ============================================================================

export const FhirExportSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	status: FhirExportStatusEnum,
	dateRangeStart: z.string(),
	dateRangeEnd: z.string(),
	resourceTypes: z.array(FhirResourceTypeEnum),
	validateOnExport: z.boolean(),
	totalResources: z.number().int().nonnegative(),
	exportedResources: z.number().int().nonnegative(),
	exportUrl: z.string().nullable(),
	errorMessage: z.string().nullable(),
	createdAt: dateOrString,
	completedAt: dateOrString.nullable(),
	createdByName: z.string(),
	nhdrSubmissionId: z.string().uuid().nullable(),
})

export type FhirExport = z.infer<typeof FhirExportSchema>

// ============================================================================
// NHDR Submission Schema
// ============================================================================

export const NhdrSubmissionSchema = z.object({
	id: z.string().uuid(),
	exportId: z.string().uuid(),
	facilityId: z.string().uuid(),
	status: NhdrSubmissionStatusEnum,
	submittedAt: dateOrString.nullable(),
	acknowledgementId: z.string().nullable(),
	responseMessage: z.string().nullable(),
	responseReceivedAt: dateOrString.nullable(),
	submittedByName: z.string(),
	periodStart: z.string(),
	periodEnd: z.string(),
})

export type NhdrSubmission = z.infer<typeof NhdrSubmissionSchema>

// ============================================================================
// Validation Report Schemas
// ============================================================================

export const ValidationIssueSchema = z.object({
	severity: ValidationIssueSeverityEnum,
	code: z.string(),
	message: z.string(),
	count: z.number().int().nonnegative(),
})

export const ValidationResourceSummarySchema = z.object({
	resourceType: FhirResourceTypeEnum,
	total: z.number().int().nonnegative(),
	valid: z.number().int().nonnegative(),
	errorCount: z.number().int().nonnegative(),
	warningCount: z.number().int().nonnegative(),
	issues: z.array(ValidationIssueSchema),
})

export const FhirValidationReportSchema = z.object({
	exportId: z.string().uuid(),
	validatedAt: dateOrString,
	totalResources: z.number().int().nonnegative(),
	totalValid: z.number().int().nonnegative(),
	totalErrors: z.number().int().nonnegative(),
	totalWarnings: z.number().int().nonnegative(),
	isValid: z.boolean(),
	resources: z.array(ValidationResourceSummarySchema),
})

export type FhirValidationReport = z.infer<typeof FhirValidationReportSchema>

// ============================================================================
// Query Schemas
// ============================================================================

export const FhirExportsQuerySchema = PaginationInputSchema.extend({
	facilityId: optionalUuid,
})

export type FhirExportsQuery = z.infer<typeof FhirExportsQuerySchema>

export const FhirExportsResponseSchema = PaginatedResponseSchema.extend({
	data: z.array(FhirExportSchema),
})

export type FhirExportsResponse = z.infer<typeof FhirExportsResponseSchema>

export const FhirExportByIdParamsSchema = z.object({
	exportId: z.string().uuid(),
})

export const NhdrSubmissionsQuerySchema = z.object({
	facilityId: optionalUuid,
})

export type NhdrSubmissionsQuery = z.infer<typeof NhdrSubmissionsQuerySchema>

// ============================================================================
// Create/Update Schemas
// ============================================================================

export const CreateFhirExportSchema = z.object({
	facilityId: z.string().uuid(),
	dateRangeStart: z.string(), // ISO date string
	dateRangeEnd: z.string(), // ISO date string
	resourceTypes: z.array(FhirResourceTypeEnum).min(1),
	validateOnExport: z.boolean().default(true),
})

export type CreateFhirExport = z.infer<typeof CreateFhirExportSchema>

export const SubmitToNhdrParamsSchema = z.object({
	exportId: z.string().uuid(),
})

import { z } from "zod"

// ============================================================================
// Enums
// ============================================================================

export const IntegrationKindEnum = z.enum([
	"fhir",
	"civil_registry",
	"hai",
	"philhealth",
	"erp",
	"lis",
	"pacs",
	"telemedicine",
	"nhdr",
	"pidsr",
	"custom",
])

export type IntegrationKind = z.infer<typeof IntegrationKindEnum>

/**
 * Computed server-side — reflects both whitelist membership and env-var presence.
 *
 * - "ok"               — ref is whitelisted AND env var is set
 * - "missing_in_env"   — ref is whitelisted but env var is empty/unset
 * - "not_in_whitelist" — ref is not in the current whitelist
 * - "unset"            — credentialsRef is null (no credential configured)
 */
export const CredentialStatusEnum = z.enum([
	"ok",
	"missing_in_env",
	"not_in_whitelist",
	"unset",
])

export type CredentialStatus = z.infer<typeof CredentialStatusEnum>

// ============================================================================
// Integration (full response — DB row + computed credentialStatus)
// ============================================================================

export const IntegrationSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	kind: IntegrationKindEnum,
	name: z.string(),
	endpointUrl: z.string().url(),
	credentialsRef: z.string().nullable(),
	webhookUrl: z.string().url().nullable(),
	enabled: z.boolean(),
	notes: z.string().nullable(),
	lastSyncAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v))
		.nullable(),
	lastSyncStatus: z.enum(["ok", "error"]).nullable(),
	lastTestedAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v))
		.nullable(),
	lastTestStatus: z.enum(["ok", "error"]).nullable(),
	lastTestReadinessLevel: z.enum(["activation", "transport", "none"]).nullable(),
	createdAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v)),
	updatedAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v)),

	// Computed server-side — never stored in DB
	credentialStatus: CredentialStatusEnum,
})

export type Integration = z.infer<typeof IntegrationSchema>

// ============================================================================
// Input schemas
// ============================================================================

export const CreateIntegrationSchema = z.object({
	kind: IntegrationKindEnum,
	name: z.string().min(1, "Name is required").max(200),
	endpointUrl: z.string().url("Must be a valid URL"),
	credentialsRef: z.string().nullable().optional(),
	webhookUrl: z.string().url().nullable().optional(),
	enabled: z.boolean().optional().default(false),
	notes: z.string().nullable().optional(),
})

export type CreateIntegrationInput = z.infer<typeof CreateIntegrationSchema>

export const UpdateIntegrationSchema = z.object({
	id: z.string().uuid(),
	kind: IntegrationKindEnum.optional(),
	name: z.string().min(1).max(200).optional(),
	endpointUrl: z.string().url().optional(),
	credentialsRef: z.string().nullable().optional(),
	webhookUrl: z.string().url().nullable().optional(),
	enabled: z.boolean().optional(),
	notes: z.string().nullable().optional(),
})

export type UpdateIntegrationInput = z.infer<typeof UpdateIntegrationSchema>

export const IntegrationIdSchema = z.object({
	id: z.string().uuid(),
})

// ============================================================================
// Credential whitelist response (names only — no values)
// ============================================================================

export const CredentialRefsSchema = z.array(z.string())

// ============================================================================
// Connectivity test response
// ============================================================================

export const ProbeCheckResultSchema = z.object({
	name: z.string(),
	status: z.enum(["pass", "fail", "skipped"]),
	detail: z.string(),
})

export type ProbeCheckResult = z.infer<typeof ProbeCheckResultSchema>

export const ConnectivityTestResultSchema = z.object({
	status: z.enum(["ok", "error"]),
	readinessLevel: z.enum(["activation", "transport", "none"]),
	latencyMs: z.number().nullable(),
	detail: z.string(),
	credentialProbed: z.boolean(),
	checks: z.array(ProbeCheckResultSchema),
})

export type ConnectivityTestResult = z.infer<typeof ConnectivityTestResultSchema>

export type CredentialRefs = z.infer<typeof CredentialRefsSchema>

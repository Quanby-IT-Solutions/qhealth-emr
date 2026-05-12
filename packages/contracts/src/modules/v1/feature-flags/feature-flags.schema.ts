import { z } from "zod"

// ============================================================================
// Shared enums
// ============================================================================

export const FeatureFlagGroupEnum = z.enum([
	"platform-control",
	"financial",
	"compliance",
	"integration",
])
export const FeatureFlagRiskLevelEnum = z.enum(["low", "moderate", "high"])
export const FeatureFlagEnvironmentEnum = z.enum(["dev", "staging", "prod"])

// ============================================================================
// Feature Flag definition
// ============================================================================

export const FeatureFlagSchema = z.object({
	id: z.string().uuid(),
	key: z.string().min(1).max(100),
	name: z.string().min(1).max(255),
	description: z.string().nullable(),
	group: FeatureFlagGroupEnum,
	riskLevel: FeatureFlagRiskLevelEnum,
	ownerTeam: z.string().nullable(),
	defaultEnabled: z.boolean(),
	createdAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v)),
	updatedAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v)),
})

export const CreateFeatureFlagSchema = z.object({
	key: z
		.string()
		.min(1)
		.max(100)
		.regex(/^[a-z0-9-]+$/, "Key must be lowercase letters, digits, and hyphens only"),
	name: z.string().min(1).max(255),
	description: z.string().optional(),
	group: FeatureFlagGroupEnum,
	riskLevel: FeatureFlagRiskLevelEnum,
	ownerTeam: z.string().optional(),
	defaultEnabled: z.boolean().default(false),
})

export const FeatureFlagIdSchema = z.object({ id: z.string().uuid() })
export const FeatureFlagKeySchema = z.object({ key: z.string().min(1) })

export const UpdateFeatureFlagSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).max(255).optional(),
	description: z.string().nullable().optional(),
	group: FeatureFlagGroupEnum.optional(),
	riskLevel: FeatureFlagRiskLevelEnum.optional(),
	ownerTeam: z.string().nullable().optional(),
	defaultEnabled: z.boolean().optional(),
})

// ============================================================================
// Feature Flag Target (per-dimension override)
// ============================================================================

export const FeatureFlagTargetSchema = z.object({
	id: z.string().uuid(),
	flagId: z.string().uuid(),
	// null = wildcard for that dimension
	environment: FeatureFlagEnvironmentEnum.nullable(),
	facilityId: z.string().uuid().nullable(),
	roleId: z.string().uuid().nullable(),
	enabled: z.boolean(),
	createdAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v)),
})

export const FeatureFlagTargetInputSchema = z.object({
	environment: FeatureFlagEnvironmentEnum.nullable().default(null),
	facilityId: z.string().uuid().nullable().default(null),
	roleId: z.string().uuid().nullable().default(null),
	enabled: z.boolean(),
})

/**
 * Input schema for the updateTargeting endpoint.
 * Sends the full intended targeting state for one flag;
 * the backend computes the diff vs. persisted state.
 * NOTE: `environment` must NOT be accepted from the client for targeting writes —
 * only for reads via evaluate/resolve which the server infers from APP_ENVIRONMENT.
 */
export const UpdateFeatureFlagTargetingSchema = z.object({
	flagId: z.string().uuid(),
	targets: z.array(FeatureFlagTargetInputSchema),
})

// ============================================================================
// Resolved flags (bulk session evaluation)
// ============================================================================

export const ResolvedFlagSchema = z.object({
	key: z.string(),
	enabled: z.boolean(),
})

export const ResolvedFlagsSchema = z.object({
	resolvedAt: z.string().datetime(),
	flags: z.array(ResolvedFlagSchema),
})

// ============================================================================
// Feature flag with targets (detail response)
// ============================================================================

export const FeatureFlagDetailSchema = FeatureFlagSchema.extend({
	targets: z.array(FeatureFlagTargetSchema),
})

// ============================================================================
// List response
// ============================================================================

export const FeatureFlagListResponseSchema = z.object({
	data: z.array(FeatureFlagDetailSchema),
	total: z.number().int(),
})

// ============================================================================
// Inferred types
// ============================================================================

export type FeatureFlag = z.infer<typeof FeatureFlagSchema>
export type FeatureFlagDetail = z.infer<typeof FeatureFlagDetailSchema>
export type FeatureFlagTarget = z.infer<typeof FeatureFlagTargetSchema>
export type CreateFeatureFlagInput = z.infer<typeof CreateFeatureFlagSchema>
export type UpdateFeatureFlagTargetingInput = z.infer<typeof UpdateFeatureFlagTargetingSchema>
export type ResolvedFlags = z.infer<typeof ResolvedFlagsSchema>

import { z } from "zod"

// ============================================================================
// Policy section sub-schemas
// ============================================================================

export const ArtaSlaSchema = z.object({
	targetMinutes: z.number().int().positive().optional(),
	enableBanner: z.boolean().optional(),
})

export const ExportDefaultsSchema = z.object({
	scheduleWindow: z.string().optional(),
	defaultFormat: z.enum(["ndjson", "json_bundle", "csv"]).optional(),
})

export const OfflineModeSchema = z.object({
	// TOR §2 mandates offline capability — caching cannot be disabled
	cacheActivePatients: z
		.boolean()
		.refine(v => v !== false, {
			message: "TOR §2: Offline patient caching is mandatory and cannot be disabled.",
		})
		.optional(),
	maxOfflineDays: z.number().int().min(1).max(30).optional(),
})

export const PrivacyConsentSchema = z.object({
	consentVersion: z.string().optional(),
	enforceOnLogin: z.boolean().optional(),
})

/**
 * The discriminated-by-key policy sections object.
 * Update endpoint rejects unknown top-level keys.
 */
export const PolicySectionsSchema = z
	.object({
		artaSla: ArtaSlaSchema.optional(),
		exportDefaults: ExportDefaultsSchema.optional(),
		offlineMode: OfflineModeSchema.optional(),
		privacyConsent: PrivacyConsentSchema.optional(),
	})
	.strict() // Zod .strict() rejects unknown keys

export type PolicySections = z.infer<typeof PolicySectionsSchema>

// ============================================================================
// System settings (full response shape)
// ============================================================================

export const SystemSettingsSchema = z.object({
	facilityId: z.string().uuid(),
	timezone: z.string().min(1),
	chartRetentionYears: z.number().int().positive(),
	supportMailbox: z.string().email().nullable(),
	serviceDeskHotline: z.string().nullable(),
	breakGlassRequiresReason: z.boolean(),
	autoFreezeChargesOnDischarge: z.boolean(),
	requireDpaConsentBeforeExport: z.boolean(),
	enableOfflineSummaryCache: z.boolean(),
	policySections: PolicySectionsSchema,
	updatedAt: z
		.union([z.date(), z.string()])
		.transform(v => (typeof v === "string" ? new Date(v) : v))
		.nullable(),
})

export type SystemSettings = z.infer<typeof SystemSettingsSchema>

// ============================================================================
// Update input schema
// ============================================================================

export const UpdateSystemSettingsSchema = z.object({
	// Typed columns (all optional for partial updates)
	timezone: z.string().min(1).optional(),
	chartRetentionYears: z.number().int().positive().optional(),
	supportMailbox: z.string().email().nullable().optional(),
	serviceDeskHotline: z.string().nullable().optional(),
	// TOR §4.3: break-glass reason enforcement is mandatory — reject false
	breakGlassRequiresReason: z
		.boolean()
		.refine(v => v !== false, {
			message: "TOR §4.3: Break-glass reason enforcement is mandatory and cannot be disabled.",
		})
		.optional(),
	// TOR Flow 5: charge freeze on discharge is mandatory — reject false
	autoFreezeChargesOnDischarge: z
		.boolean()
		.refine(v => v !== false, {
			message: "TOR Flow 5: Automatic charge freeze on discharge is mandatory and cannot be disabled.",
		})
		.optional(),
	// TOR §6: DPA consent before export is mandatory — reject false
	requireDpaConsentBeforeExport: z
		.boolean()
		.refine(v => v !== false, {
			message: "TOR §6: DPA consent enforcement before export is mandatory and cannot be disabled.",
		})
		.optional(),
	// TOR §2: offline summary cache is mandatory — reject false
	enableOfflineSummaryCache: z
		.boolean()
		.refine(v => v !== false, {
			message: "TOR §2: Offline summary cache is mandatory and cannot be disabled.",
		})
		.optional(),
	// JSONB policy sections — strict schema rejects unknown keys
	policySections: PolicySectionsSchema.optional(),
})

export type UpdateSystemSettingsInput = z.infer<typeof UpdateSystemSettingsSchema>

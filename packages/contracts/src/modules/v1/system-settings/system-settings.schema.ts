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
			message:
				"TOR Flow 5: Automatic charge freeze on discharge is mandatory and cannot be disabled.",
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

// ============================================================================
// Offline patient summary snapshots
// ============================================================================

const OfflineDateStringSchema = z.union([z.date(), z.string()]).transform(v =>
	typeof v === "string" ? v : v.toISOString()
)

export const OfflinePatientDemographicsSchema = z.object({
	id: z.string().uuid(),
	mrn: z.string(),
	firstName: z.string(),
	middleName: z.string().nullable(),
	lastName: z.string(),
	dateOfBirth: z.string(),
	sex: z.enum(["male", "female", "other"]),
	isActive: z.boolean(),
})

export const OfflineVitalSummarySchema = z.object({
	id: z.string().uuid(),
	temperature: z.union([z.string(), z.number()]).nullable(),
	bpSystolic: z.number().int().nullable(),
	bpDiastolic: z.number().int().nullable(),
	heartRate: z.number().int().nullable(),
	respiratoryRate: z.number().int().nullable(),
	spo2: z.union([z.string(), z.number()]).nullable(),
	newsScore: z.number().int().nullable().optional(),
	newsRiskLevel: z.enum(["low", "medium", "high"]).nullable().optional(),
	recordedAt: OfflineDateStringSchema,
})

export const OfflineProblemSummarySchema = z.object({
	id: z.string().uuid(),
	description: z.string(),
	icd10Code: z.string().nullable(),
	icd10Display: z.string().nullable().optional(),
	snomedCode: z.string().nullable().optional(),
	snomedDisplay: z.string().nullable().optional(),
	onsetDate: z.string().nullable().optional(),
	status: z.enum(["active", "resolved"]),
})

export const OfflineAllergySummarySchema = z.object({
	id: z.string().uuid(),
	allergenName: z.string(),
	allergenType: z.enum(["medication", "food", "environmental"]),
	reactionType: z.string().nullable(),
	severity: z.enum(["mild", "moderate", "severe"]),
	onsetDate: z.string().nullable(),
	isActive: z.boolean(),
	isVerified: z.boolean(),
})

export const OfflineMedicationSummarySchema = z.object({
	id: z.string().uuid(),
	genericName: z.string(),
	dose: z.string(),
	doseUnit: z.string(),
	route: z.string(),
	frequency: z.string(),
	status: z.string(),
})

export const OfflineEncounterHeaderSchema = z.object({
	id: z.string().uuid(),
	facilityId: z.string().uuid(),
	patientId: z.string().uuid(),
	patientName: z.string(),
	patientMrn: z.string(),
	patientDateOfBirth: z.string(),
	patientSex: z.enum(["male", "female", "other"]),
	encounterType: z.enum(["inpatient", "outpatient", "emergency", "telemedicine"]),
	status: z.enum(["active", "pending_discharge", "discharged", "closed", "cancelled"]),
	chiefComplaint: z.string().nullable(),
	admissionDatetime: OfflineDateStringSchema,
	dischargeDatetime: OfflineDateStringSchema.nullable(),
	disposition: z.enum(["home", "transfer", "deceased", "ama"]).nullable(),
	admittingStaffName: z.string().nullable(),
	attendingStaffName: z.string().nullable(),
	wardName: z.string().nullable(),
	bedNumber: z.string().nullable(),
	oecbEligible: z.boolean(),
	transfers: z.array(z.unknown()),
})

export const OfflineEncounterSummarySchema = z.object({
	encounter: OfflineEncounterHeaderSchema,
	latestVitals: OfflineVitalSummarySchema.nullable(),
	activeProblems: z.array(OfflineProblemSummarySchema),
	activeAllergies: z.array(OfflineAllergySummarySchema),
	activeMedications: z.array(OfflineMedicationSummarySchema),
	activeProblemCount: z.number().int(),
	activeAllergyCount: z.number().int(),
	hasSevereAllergies: z.boolean(),
})

export const OfflinePreparedPatientSummarySchema = z.object({
	schemaVersion: z.literal(1),
	facilityId: z.string().uuid(),
	patient: OfflinePatientDemographicsSchema,
	encounterSummary: OfflineEncounterSummarySchema.nullable(),
	preparedAt: OfflineDateStringSchema,
	sourceJobId: z.string().uuid().nullable(),
})

export type OfflinePreparedPatientSummary = z.infer<typeof OfflinePreparedPatientSummarySchema>

export const OfflineSummarySnapshotSchema = z.object({
	schemaVersion: z.literal(1),
	facilityId: z.string().uuid(),
	preparedAt: OfflineDateStringSchema.nullable(),
	patientCount: z.number().int(),
	summaries: z.array(OfflinePreparedPatientSummarySchema),
})

export type OfflineSummarySnapshot = z.infer<typeof OfflineSummarySnapshotSchema>

export const OfflinePatientSummaryParamsSchema = z.object({
	patientId: z.string().uuid(),
})

export type OfflinePatientSummaryParams = z.infer<typeof OfflinePatientSummaryParamsSchema>

// ============================================================================
// Offline cache job trigger result
// ============================================================================

export const TriggerOfflineCacheJobResultSchema = z.object({
	jobId: z.string().uuid(),
	status: z.enum(["running", "completed", "failed"]),
	cachedPatientCount: z.number().int().nullable(),
	errorMessage: z.string().nullable(),
})

export type TriggerOfflineCacheJobResult = z.infer<typeof TriggerOfflineCacheJobResultSchema>

import { index, uniqueIndex } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { patients } from "./core.js"
import { facilities } from "./rbac.js"

export const systemSettings = createTable("system_settings", t => ({
	facilityId: t
		.uuid("facility_id")
		.primaryKey()
		.references(() => facilities.id, { onDelete: "cascade" }),

	// ── Typed critical settings ───────────────────────────────────────────────
	timezone: t.text("timezone").notNull().default("Asia/Manila"),
	chartRetentionYears: t.integer("chart_retention_years").notNull().default(10),
	supportMailbox: t.text("support_mailbox"),
	serviceDeskHotline: t.text("service_desk_hotline"),
	breakGlassRequiresReason: t.boolean("break_glass_requires_reason").notNull().default(true),
	autoFreezeChargesOnDischarge: t
		.boolean("auto_freeze_charges_on_discharge")
		.notNull()
		.default(true),
	requireDpaConsentBeforeExport: t
		.boolean("require_dpa_consent_before_export")
		.notNull()
		.default(true),
	// TOR §4.2: offline capability is mandatory — default must be true so new rows are provisioned compliantly
	enableOfflineSummaryCache: t.boolean("enable_offline_summary_cache").notNull().default(true),

	// ── JSONB policy sections ─────────────────────────────────────────────────
	// Shape: { artaSla: {...}, exportDefaults: {...}, offlineMode: {...}, privacyConsent: {...} }
	policySections: t.jsonb("policy_sections").$type<PolicySections>().notNull().default({}),

	updatedAt: t.timestamp("updated_at"),
}))

// ── Policy section shapes (mirrors contracts) ─────────────────────────────────

interface ArtaSlaSection {
	targetMinutes?: number
	enableBanner?: boolean
}

interface ExportDefaultsSection {
	scheduleWindow?: string
	defaultFormat?: "ndjson" | "json_bundle" | "csv"
}

interface OfflineModeSection {
	cacheActivePatients?: boolean
	maxOfflineDays?: number
}

interface PrivacyConsentSection {
	consentVersion?: string
	enforceOnLogin?: boolean
}

export interface PolicySections {
	artaSla?: ArtaSlaSection
	exportDefaults?: ExportDefaultsSection
	offlineMode?: OfflineModeSection
	privacyConsent?: PrivacyConsentSection
}

export type SystemSettingsRow = typeof systemSettings.$inferSelect

// ============================================================================
// OFFLINE CACHE JOBS — Tracks background cache preparation for offline mode
// ============================================================================

export const offlineCacheJobs = createTable(
	"offline_cache_jobs",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		status: t.text("status").notNull().$type<"running" | "completed" | "failed">(),
		startedAt: t.timestamp("started_at").notNull().defaultNow(),
		completedAt: t.timestamp("completed_at"),
		cachedPatientCount: t.integer("cached_patient_count"),
		errorMessage: t.text("error_message"),
		triggeredBy: t.text("triggered_by").notNull().default("scheduler"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		index("offline_cache_jobs_facility_id_idx").on(t.facilityId),
		index("offline_cache_jobs_status_idx").on(t.status),
		index("offline_cache_jobs_started_at_idx").on(t.startedAt),
	]
)

export type OfflineCacheJobRow = typeof offlineCacheJobs.$inferSelect

// ============================================================================
// OFFLINE PATIENT SUMMARIES — Prepared read-only summaries for browser download
// ============================================================================

export const offlinePatientSummaries = createTable(
	"offline_patient_summaries",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		patientId: t
			.uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		summaryPayload: t.jsonb("summary_payload").$type<Record<string, unknown>>().notNull(),
		preparedAt: t.timestamp("prepared_at").notNull().defaultNow(),
		sourceJobId: t.uuid("source_job_id").references(() => offlineCacheJobs.id, {
			onDelete: "set null",
		}),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("offline_patient_summaries_facility_id_idx").on(t.facilityId),
		index("offline_patient_summaries_patient_id_idx").on(t.patientId),
		index("offline_patient_summaries_prepared_at_idx").on(t.preparedAt),
		uniqueIndex("offline_patient_summaries_facility_patient_uniq").on(t.facilityId, t.patientId),
	]
)

export type OfflinePatientSummaryRow = typeof offlinePatientSummaries.$inferSelect

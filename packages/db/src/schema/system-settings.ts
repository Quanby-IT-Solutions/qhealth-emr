import { createTable } from "../utils/table.js"
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
	autoFreezeChargesOnDischarge: t.boolean("auto_freeze_charges_on_discharge").notNull().default(true),
	requireDpaConsentBeforeExport: t.boolean("require_dpa_consent_before_export").notNull().default(true),
	enableOfflineSummaryCache: t.boolean("enable_offline_summary_cache").notNull().default(false),

	// ── JSONB policy sections ─────────────────────────────────────────────────
	// Shape: { artaSla: {...}, exportDefaults: {...}, offlineMode: {...}, privacyConsent: {...} }
	policySections: t
		.jsonb("policy_sections")
		.$type<PolicySections>()
		.notNull()
		.default({}),

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

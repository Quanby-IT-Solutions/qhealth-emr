import { z } from "zod"

// ── Shared primitives ─────────────────────────────────────────────────────────

const dateOrString = z
	.union([z.date(), z.string()])
	.transform(v => (typeof v === "string" ? new Date(v) : v))

// ── Alerts ────────────────────────────────────────────────────────────────────

export const AdminAlertSeverityEnum = z.enum(["info", "warning", "critical"])
export const AdminAlertCategoryEnum = z.enum([
	"access",
	"platform",
	"integration",
	"audit",
	"arta",
])

export const AdminDashboardAlertSchema = z.object({
	id: z.string(),
	severity: AdminAlertSeverityEnum,
	category: AdminAlertCategoryEnum,
	title: z.string(),
	description: z.string(),
	link: z.string().optional(),
})

export type AdminDashboardAlert = z.infer<typeof AdminDashboardAlertSchema>

// ── Summary cards ─────────────────────────────────────────────────────────────

export const AdminSummaryCardSchema = z.object({
	id: z.string(),
	label: z.string(),
	value: z.number(),
	severity: z.enum(["ok", "warning", "critical"]).optional(),
	link: z.string().optional(),
})

export type AdminSummaryCard = z.infer<typeof AdminSummaryCardSchema>

// ── Recent changes ────────────────────────────────────────────────────────────

export const RecentChangeSchema = z.object({
	id: z.string(),
	category: z.string(),
	description: z.string(),
	actor: z.string(),
	at: dateOrString,
})

export type RecentChange = z.infer<typeof RecentChangeSchema>

// ── Access governance ─────────────────────────────────────────────────────────

export const AccessGovernanceSectionSchema = z.object({
	activeUsers: z.number(),
	inactiveUsers: z.number(),
	usersWithoutRole: z.number(),
	multiFacilityUsers: z.number(),
	recentRoleChanges: z.array(RecentChangeSchema),
})

export type AccessGovernanceSection = z.infer<typeof AccessGovernanceSectionSchema>

// ── Platform control ──────────────────────────────────────────────────────────

export const PlatformControlSectionSchema = z.object({
	highRiskFlagsEnabled: z.number(),
	recentFlagChanges: z.array(RecentChangeSchema),
	missingCriticalSettings: z.array(z.string()),
	facilityProfileCompleteness: z.number(), // 0–100 percentage
	lastConfigUpdatedAt: dateOrString.nullable(),
})

export type PlatformControlSection = z.infer<typeof PlatformControlSectionSchema>

// ── Integration health ────────────────────────────────────────────────────────

export const IntegrationHealthSectionSchema = z.object({
	failedCount: z.number(),
	disabledCount: z.number(),
	missingCredentialsCount: z.number(),
	staleCount: z.number(), // last_sync_at older than 24 h and enabled
	fhirFailures: z.number(),
})

export type IntegrationHealthSection = z.infer<typeof IntegrationHealthSectionSchema>

// ── Audit summary ─────────────────────────────────────────────────────────────

export const AuditSummarySectionSchema = z.object({
	recentPrivilegedChanges: z.array(RecentChangeSchema),
	breakGlassEventCount: z.number(),
	highSeverityEventCount: z.number(),
})

export type AuditSummarySection = z.infer<typeof AuditSummarySectionSchema>

// ── ARTA / SLA ────────────────────────────────────────────────────────────────

export const ArtaSlaSectionSchema = z.object({
	activeBreaches: z.number(),
	overdueQueues: z.number(),
	topBreachedWorkflows: z.array(
		z.object({
			workflow: z.string(),
			count: z.number(),
		})
	),
	dataAvailable: z.boolean(), // false when event instrumentation is incomplete
})

export type ArtaSlaSection = z.infer<typeof ArtaSlaSectionSchema>

// ── Full summary ──────────────────────────────────────────────────────────────

export const AdminDashboardSummarySchema = z.object({
	summaryCards: z.array(AdminSummaryCardSchema),
	alerts: z.array(AdminDashboardAlertSchema),
	recentChanges: z.array(RecentChangeSchema),
	accessGovernance: AccessGovernanceSectionSchema,
	platformControl: PlatformControlSectionSchema,
	integrations: IntegrationHealthSectionSchema,
	audit: AuditSummarySectionSchema,
	artaSla: ArtaSlaSectionSchema,
})

export type AdminDashboardSummary = z.infer<typeof AdminDashboardSummarySchema>

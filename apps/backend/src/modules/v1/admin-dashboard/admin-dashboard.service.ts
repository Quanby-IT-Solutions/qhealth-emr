import { Injectable, Logger } from "@nestjs/common"
import { and, count, eq, gte, isNull, lt, or } from "drizzle-orm"

import {
	auditLogs,
	breakGlassEvents,
	facilityProfiles,
	featureFlags,
	featureFlagTargets,
	integrations,
	rolePermissions,
	staffProfiles,
	systemSettings,
	userRoles,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"

import type {
	AdminDashboardSummary,
	AdminDashboardAlert,
	AdminSummaryCard,
	RecentChange,
	AccessGovernanceSection,
	PlatformControlSection,
	IntegrationHealthSection,
	AuditSummarySection,
	ArtaSlaSection,
} from "@repo/contracts"

@Injectable()
export class AdminDashboardService {
	private readonly logger = new Logger(AdminDashboardService.name)

	async getSummary(facilityId: string): Promise<AdminDashboardSummary> {
		const [governance, platform, integrationHealth, audit, artaSla] = await Promise.all([
			this.getAccessGovernance(facilityId),
			this.getPlatformControl(facilityId),
			this.getIntegrationHealth(facilityId),
			this.getAuditSummary(facilityId),
			this.getArtaSla(),
		])

		const alerts = this.buildAlerts(governance, platform, integrationHealth, audit, artaSla)
		const summaryCards = this.buildSummaryCards(governance, integrationHealth, audit, artaSla)
		const recentChanges = [
			...governance.recentRoleChanges,
			...platform.recentFlagChanges,
			...audit.recentPrivilegedChanges,
		]
			.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
			.slice(0, 10)

		return {
			summaryCards,
			alerts,
			recentChanges,
			accessGovernance: governance,
			platformControl: platform,
			integrations: integrationHealth,
			audit,
			artaSla,
		}
	}

	// ── Access Governance ──────────────────────────────────────────────────────

	private async getAccessGovernance(facilityId: string): Promise<AccessGovernanceSection> {
		const now = new Date()
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

		// Active staff count
		const [activeRow] = await db
			.select({ activeCount: count() })
			.from(staffProfiles)
			.where(and(eq(staffProfiles.facilityId, facilityId), eq(staffProfiles.isActive, true)))
		const activeCount = activeRow?.activeCount ?? 0

		// Inactive staff count
		const [inactiveRow] = await db
			.select({ inactiveCount: count() })
			.from(staffProfiles)
			.where(and(eq(staffProfiles.facilityId, facilityId), eq(staffProfiles.isActive, false)))
		const inactiveCount = inactiveRow?.inactiveCount ?? 0

		// Staff without any role assignment
		const allStaffIds = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(eq(staffProfiles.facilityId, facilityId))

		const assignedStaffIds = await db
			.select({ staffProfileId: userRoles.staffProfileId })
			.from(userRoles)

		const assignedSet = new Set(assignedStaffIds.map(r => r.staffProfileId))
		const usersWithoutRole = allStaffIds.filter(s => !assignedSet.has(s.id)).length

		// Recent audit entries for role/permission changes (last 30 days)
		const recentRoleAuditLogs = await db
			.select()
			.from(auditLogs)
			.where(
				and(
					eq(auditLogs.facilityId, facilityId),
					gte(auditLogs.createdAt, thirtyDaysAgo),
					or(
						eq(auditLogs.entityType, "role_permission"),
						eq(auditLogs.entityType, "user_role"),
						eq(auditLogs.entityType, "role")
					)
				)
			)
			.orderBy(auditLogs.createdAt)
			.limit(5)

		const recentRoleChanges: RecentChange[] = recentRoleAuditLogs.map(log => ({
			id: log.id,
			category: "access",
			description: `${log.action} on ${log.entityType}`,
			actor: log.userId,
			at: log.createdAt,
		}))

		return {
			activeUsers: activeCount,
			inactiveUsers: inactiveCount,
			usersWithoutRole,
			multiFacilityUsers: 0, // Multi-facility feature not yet instrumented
			recentRoleChanges,
		}
	}

	// ── Platform Control ───────────────────────────────────────────────────────

	private async getPlatformControl(facilityId: string): Promise<PlatformControlSection> {
		// High-risk feature flags that are enabled (defaultEnabled = true, riskLevel = 'high')
		const highRiskFlags = await db
			.select({ id: featureFlags.id, name: featureFlags.name, updatedAt: featureFlags.updatedAt })
			.from(featureFlags)
			.where(and(eq(featureFlags.riskLevel, "high"), eq(featureFlags.defaultEnabled, true)))

		// Recent flag changes from audit logs (last 30 days)
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
		const recentFlagAuditLogs = await db
			.select()
			.from(auditLogs)
			.where(
				and(
					eq(auditLogs.facilityId, facilityId),
					gte(auditLogs.createdAt, thirtyDaysAgo),
					eq(auditLogs.entityType, "feature_flag")
				)
			)
			.orderBy(auditLogs.createdAt)
			.limit(5)

		const recentFlagChanges: RecentChange[] = recentFlagAuditLogs.map(log => ({
			id: log.id,
			category: "platform",
			description: `Feature flag ${log.action}`,
			actor: log.userId,
			at: log.createdAt,
		}))

		// Missing critical system settings
		const [settings] = await db
			.select()
			.from(systemSettings)
			.where(eq(systemSettings.facilityId, facilityId))

		const missingCriticalSettings: string[] = []
		if (!settings) {
			missingCriticalSettings.push("System settings not configured")
		} else {
			if (!settings.supportMailbox) missingCriticalSettings.push("Support mailbox")
			if (!settings.serviceDeskHotline) missingCriticalSettings.push("Service desk hotline")
		}

		// Facility profile completeness (0–100%)
		const [profile] = await db
			.select()
			.from(facilityProfiles)
			.where(eq(facilityProfiles.facilityId, facilityId))

		const completenessFields = [
			"facilityCode",
			"governingAuthority",
			"addressLine1",
			"city",
			"province",
			"zipCode",
			"telephone",
			"email",
			"adminContactName",
			"adminContactEmail",
		] as const

		let filledFields = 0
		if (profile) {
			for (const field of completenessFields) {
				if (profile[field]) filledFields++
			}
		}
		const facilityProfileCompleteness = profile
			? Math.round((filledFields / completenessFields.length) * 100)
			: 0

		const lastConfigUpdatedAt = settings?.updatedAt ?? profile?.updatedAt ?? null

		return {
			highRiskFlagsEnabled: highRiskFlags.length,
			recentFlagChanges,
			missingCriticalSettings,
			facilityProfileCompleteness,
			lastConfigUpdatedAt,
		}
	}

	// ── Integration Health ─────────────────────────────────────────────────────

	private async getIntegrationHealth(facilityId: string): Promise<IntegrationHealthSection> {
		const allIntegrations = await db
			.select()
			.from(integrations)
			.where(eq(integrations.facilityId, facilityId))

		const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago

		const failedCount = allIntegrations.filter(
			i => i.enabled && i.lastSyncStatus === "error"
		).length

		const disabledCount = allIntegrations.filter(i => !i.enabled).length

		const missingCredentialsCount = allIntegrations.filter(
			i => i.enabled && !i.credentialsRef
		).length

		const staleCount = allIntegrations.filter(
			i =>
				i.enabled &&
				i.lastSyncStatus !== "error" &&
				(!i.lastSyncAt || i.lastSyncAt < staleThreshold)
		).length

		const fhirFailures = allIntegrations.filter(
			i => i.kind === "fhir" && i.lastSyncStatus === "error"
		).length

		return {
			failedCount,
			disabledCount,
			missingCredentialsCount,
			staleCount,
			fhirFailures,
		}
	}

	// ── Audit Summary ──────────────────────────────────────────────────────────

	private async getAuditSummary(facilityId: string): Promise<AuditSummarySection> {
		const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

		// Recent privileged configuration changes
		const privilegedLogs = await db
			.select()
			.from(auditLogs)
			.where(
				and(
					eq(auditLogs.facilityId, facilityId),
					gte(auditLogs.createdAt, sevenDaysAgo),
					or(
						eq(auditLogs.entityType, "feature_flag"),
						eq(auditLogs.entityType, "system_settings"),
						eq(auditLogs.entityType, "role_permission"),
						eq(auditLogs.entityType, "user_role"),
						eq(auditLogs.entityType, "integration")
					)
				)
			)
			.orderBy(auditLogs.createdAt)
			.limit(5)

		const recentPrivilegedChanges: RecentChange[] = privilegedLogs.map(log => ({
			id: log.id,
			category: "audit",
			description: `${log.action} on ${log.entityType}`,
			actor: log.userId,
			at: log.createdAt,
		}))

		// Break-glass event count (last 7 days)
		const [bgRow] = await db
			.select({ breakGlassCount: count() })
			.from(breakGlassEvents)
			.where(
				and(
					eq(breakGlassEvents.facilityId, facilityId),
					gte(breakGlassEvents.accessGrantedAt, sevenDaysAgo)
				)
			)
		const breakGlassCount = bgRow?.breakGlassCount ?? 0

		// Total audit events (last 7 days) as a proxy for "high severity"
		const [eventsRow] = await db
			.select({ totalRecentEvents: count() })
			.from(auditLogs)
			.where(
				and(
					eq(auditLogs.facilityId, facilityId),
					gte(auditLogs.createdAt, sevenDaysAgo)
				)
			)

		return {
			recentPrivilegedChanges,
			breakGlassEventCount: breakGlassCount,
			highSeverityEventCount: eventsRow?.totalRecentEvents ?? 0,
		}
	}

	// ── ARTA / SLA ─────────────────────────────────────────────────────────────

	private async getArtaSla(): Promise<ArtaSlaSection> {
		// SLA event instrumentation is not yet fully implemented.
		// Return explicit "data unavailable" state so the UI can show a clear message.
		return {
			activeBreaches: 0,
			overdueQueues: 0,
			topBreachedWorkflows: [],
			dataAvailable: false,
		}
	}

	// ── Alerts ─────────────────────────────────────────────────────────────────

	private buildAlerts(
		governance: AccessGovernanceSection,
		platform: PlatformControlSection,
		integrationHealth: IntegrationHealthSection,
		audit: AuditSummarySection,
		artaSla: ArtaSlaSection
	): AdminDashboardAlert[] {
		const alerts: AdminDashboardAlert[] = []

		if (governance.usersWithoutRole > 0) {
			alerts.push({
				id: "no-role-users",
				severity: "warning",
				category: "access",
				title: `${governance.usersWithoutRole} user(s) have no role assigned`,
				description: "Users without roles cannot access clinical features.",
				link: "/admin/users",
			})
		}

		if (platform.highRiskFlagsEnabled > 0) {
			alerts.push({
				id: "high-risk-flags",
				severity: "warning",
				category: "platform",
				title: `${platform.highRiskFlagsEnabled} high-risk feature flag(s) enabled`,
				description: "High-risk flags are active. Confirm they are intentionally enabled.",
				link: "/admin/feature-flags",
			})
		}

		if (platform.missingCriticalSettings.length > 0) {
			alerts.push({
				id: "missing-settings",
				severity: "warning",
				category: "platform",
				title: "Critical system settings incomplete",
				description: `Missing: ${platform.missingCriticalSettings.join(", ")}`,
				link: "/admin/settings",
			})
		}

		if (platform.facilityProfileCompleteness < 80) {
			alerts.push({
				id: "facility-profile-incomplete",
				severity: "warning",
				category: "platform",
				title: `Facility profile is ${platform.facilityProfileCompleteness}% complete`,
				description: "An incomplete profile may affect reports and external submissions.",
				link: "/admin/facility-profile",
			})
		}

		if (integrationHealth.failedCount > 0) {
			alerts.push({
				id: "failed-integrations",
				severity: "critical",
				category: "integration",
				title: `${integrationHealth.failedCount} integration(s) failed`,
				description: "Failing integrations may block data exchange.",
				link: "/admin/integration-registry",
			})
		}

		if (integrationHealth.missingCredentialsCount > 0) {
			alerts.push({
				id: "missing-credentials",
				severity: "warning",
				category: "integration",
				title: `${integrationHealth.missingCredentialsCount} integration(s) missing credentials`,
				description: "Integrations without credential references will fail at runtime.",
				link: "/admin/integration-registry",
			})
		}

		if (audit.breakGlassEventCount > 0) {
			alerts.push({
				id: "break-glass-events",
				severity: "warning",
				category: "audit",
				title: `${audit.breakGlassEventCount} break-glass event(s) in the last 7 days`,
				description: "Emergency access events require review.",
				link: "/audit/break-glass",
			})
		}

		return alerts.sort((a, b) => {
			const order = { critical: 0, warning: 1, info: 2 }
			return order[a.severity] - order[b.severity]
		})
	}

	// ── Summary cards ──────────────────────────────────────────────────────────

	private buildSummaryCards(
		governance: AccessGovernanceSection,
		integrationHealth: IntegrationHealthSection,
		audit: AuditSummarySection,
		artaSla: ArtaSlaSection
	): AdminSummaryCard[] {
		return [
			{
				id: "active-users",
				label: "Active Users",
				value: governance.activeUsers,
				severity: "ok",
				link: "/admin/users",
			},
			{
				id: "failed-integrations",
				label: "Failed Integrations",
				value: integrationHealth.failedCount,
				severity: integrationHealth.failedCount > 0 ? "critical" : "ok",
				link: "/admin/integration-registry",
			},
			{
				id: "break-glass-events",
				label: "Break-Glass Events (7d)",
				value: audit.breakGlassEventCount,
				severity: audit.breakGlassEventCount > 0 ? "warning" : "ok",
				link: "/audit/break-glass",
			},
			{
				id: "sla-breaches",
				label: "Active SLA Breaches",
				value: artaSla.activeBreaches,
				severity: artaSla.activeBreaches > 0 ? "critical" : "ok",
				link: "/sla",
			},
		]
	}
}

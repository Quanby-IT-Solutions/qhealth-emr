import { Injectable, Logger } from "@nestjs/common"
import {
	and,
	count,
	countDistinct,
	desc,
	eq,
	gt,
	gte,
	inArray,
	isNotNull,
	isNull,
	lt,
	or,
	sql,
} from "drizzle-orm"

import type {
	AccessGovernanceSection,
	AdminDashboardAlert,
	AdminDashboardSummary,
	AdminSummaryCard,
	ArtaSlaSection,
	AuditSummarySection,
	CivilRegistryOpsSection,
	ExportComplianceList,
	ExportComplianceQuery,
	HimOpsSection,
	IntegrationHealthSection,
	MedicationComplianceSection,
	OfflineReadinessSection,
	PlatformControlSection,
	RecentChange,
} from "@repo/contracts"
import {
	ahsrSnapshots,
	auditLogs,
	birthRegistrations,
	breakGlassEvents,
	cf4Claims,
	clinicalNotes,
	dataExports,
	deathReports,
	encounters,
	encounterStatusEvents,
	facilityProfiles,
	featureFlags,
	featureFlagTargets,
	formularyItems,
	integrations,
	medicalRecordsRequests,
	medicationOrders,
	nbsLogEntries,
	offlineCacheJobs,
	operationRecords,
	pidsrCases,
	prescriptions,
	problems,
	rolePermissions,
	slaConfigs,
	staffProfiles,
	surgicalRvsAssignments,
	surveillanceFlags,
	systemSettings,
	userRoles,
} from "@repo/db/schema"

import { db } from "@/common/database/database.client"

import { ReportingService } from "../reporting/reporting.service"
import { SlaService } from "../sla/sla.service"

function isMissingDatabaseObjectError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false

	const maybeError = error as { code?: string; cause?: unknown }
	if (maybeError.code === "42P01" || maybeError.code === "42703") return true

	if (!maybeError.cause || typeof maybeError.cause !== "object") return false

	const cause = maybeError.cause as { code?: string }
	return cause.code === "42P01" || cause.code === "42703"
}

const EMPTY_ARTA_SLA: ArtaSlaSection = {
	activeBreaches: 0,
	overdueQueues: 0,
	topBreachedWorkflows: [],
	queueBreakdown: [],
	dataAvailable: false,
}

const EMPTY_OFFLINE_READINESS: OfflineReadinessSection = {
	enabled: false,
	status: "disabled",
	lastCachePreparedAt: null,
	activePatientsCount: 0,
	maxOfflineDays: null,
	recentJobs: [],
	lastFailedAt: null,
	lastFailureMessage: null,
}

@Injectable()
export class AdminDashboardService {
	private readonly logger = new Logger(AdminDashboardService.name)

	constructor(
		private readonly slaService: SlaService,
		private readonly reportingService: ReportingService
	) {}

	private async withMissingSchemaFallback<T>(
		sectionName: string,
		facilityId: string,
		action: () => Promise<T>,
		fallback: T
	): Promise<T> {
		try {
			return await action()
		} catch (error) {
			if (isMissingDatabaseObjectError(error)) {
				this.logger.warn(
					`${sectionName} data unavailable for facility ${facilityId}: database schema is behind the current code`
				)
				return fallback
			}

			throw error
		}
	}

	async getSummary(
		facilityId: string,
		options: { canViewFhir: boolean } = { canViewFhir: true }
	): Promise<AdminDashboardSummary> {
		const [governance, platform, integrationHealth, audit] = await Promise.all([
			this.getAccessGovernance(facilityId),
			this.getPlatformControl(facilityId),
			this.getIntegrationHealth(facilityId),
			this.getAuditSummary(facilityId),
		])

		const [artaSla, offlineReadiness] = await Promise.all([
			this.withMissingSchemaFallback(
				"ARTA/SLA",
				facilityId,
				() => this.getArtaSla(facilityId),
				EMPTY_ARTA_SLA
			),
			this.withMissingSchemaFallback(
				"offline readiness",
				facilityId,
				() => this.getOfflineReadiness(facilityId),
				EMPTY_OFFLINE_READINESS
			),
		])

		// Strip FHIR-specific telemetry when the caller lacks fhir:view — TOR §4.2 least-privilege
		const effectiveIntegrationHealth = options.canViewFhir
			? integrationHealth
			: { ...integrationHealth, fhirFailures: 0 }

		const alerts = this.buildAlerts(
			governance,
			platform,
			effectiveIntegrationHealth,
			audit,
			artaSla,
			offlineReadiness
		)
		const summaryCards = this.buildSummaryCards(
			governance,
			effectiveIntegrationHealth,
			audit,
			artaSla
		)
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
			integrations: effectiveIntegrationHealth,
			audit,
			artaSla,
			offlineReadiness,
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

		// Users with staff profiles in more than one facility (multi-facility members)
		// Sub-query: count distinct facilityId per userId, then count users with > 1
		const multiFacilityCounts = await db
			.select({
				userId: staffProfiles.userId,
				facilityCount: countDistinct(staffProfiles.facilityId).as("facility_count"),
			})
			.from(staffProfiles)
			.where(eq(staffProfiles.isActive, true))
			.groupBy(staffProfiles.userId)

		const multiFacilityUsers = multiFacilityCounts.filter(r => (r.facilityCount ?? 0) > 1).length

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
			multiFacilityUsers,
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
						eq(auditLogs.entityType, "system_setting"),
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

		// Pending break-glass reviews (all-time unreviewed)
		const [pendingBgRow] = await db
			.select({ pendingCount: count() })
			.from(breakGlassEvents)
			.where(
				and(
					eq(breakGlassEvents.facilityId, facilityId),
					eq(breakGlassEvents.reviewStatus, "pending")
				)
			)
		const pendingBreakGlassReviews = pendingBgRow?.pendingCount ?? 0

		// Flagged break-glass events (last 7 days)
		const [flaggedBgRow] = await db
			.select({ flaggedCount: count() })
			.from(breakGlassEvents)
			.where(
				and(
					eq(breakGlassEvents.facilityId, facilityId),
					eq(breakGlassEvents.reviewStatus, "flagged"),
					gte(breakGlassEvents.accessGrantedAt, sevenDaysAgo)
				)
			)
		const flaggedBreakGlassEvents = flaggedBgRow?.flaggedCount ?? 0

		// Total audit events (last 7 days) as a proxy for "high severity"
		const [eventsRow] = await db
			.select({ totalRecentEvents: count() })
			.from(auditLogs)
			.where(and(eq(auditLogs.facilityId, facilityId), gte(auditLogs.createdAt, sevenDaysAgo)))

		// Total count of all privileged changes in last 7d (for anomaly detection, AD-006)
		const [privilegedCountRow] = await db
			.select({ n: count() })
			.from(auditLogs)
			.where(
				and(
					eq(auditLogs.facilityId, facilityId),
					gte(auditLogs.createdAt, sevenDaysAgo),
					or(
						eq(auditLogs.entityType, "feature_flag"),
						eq(auditLogs.entityType, "system_setting"),
						eq(auditLogs.entityType, "role_permission"),
						eq(auditLogs.entityType, "user_role"),
						eq(auditLogs.entityType, "integration")
					)
				)
			)

		// DPA consent enforcement setting
		const [settingsRow] = await db
			.select({ requireDpaConsentBeforeExport: systemSettings.requireDpaConsentBeforeExport })
			.from(systemSettings)
			.where(eq(systemSettings.facilityId, facilityId))
			.limit(1)
		const consentEnforced = settingsRow?.requireDpaConsentBeforeExport ?? true

		return {
			recentPrivilegedChanges,
			breakGlassEventCount: breakGlassCount,
			highSeverityEventCount: eventsRow?.totalRecentEvents ?? 0,
			pendingBreakGlassReviews,
			flaggedBreakGlassEvents,
			consentEnforced,
			privilegedChangeCount7d: privilegedCountRow?.n ?? 0,
		}
	}

	// ── ARTA / SLA ─────────────────────────────────────────────────────────────

	private async getArtaSla(facilityId: string): Promise<ArtaSlaSection> {
		try {
			// Check if any SLA configs exist for this facility
			const activeConfigs = await db
				.select()
				.from(slaConfigs)
				.where(and(eq(slaConfigs.facilityId, facilityId), eq(slaConfigs.isActive, true)))

			if (activeConfigs.length === 0) {
				// No SLA targets configured yet — keep the "data unavailable" state
				return {
					activeBreaches: 0,
					overdueQueues: 0,
					topBreachedWorkflows: [],
					queueBreakdown: [],
					dataAvailable: false,
				}
			}

			// Use full status breakdown (AD-004: populate real onTime/approaching counts)
			const result = await this.slaService.getActiveSlaStatusBreakdown(facilityId)

			// AD-014: Query open steps (encounters in-flight, actualMinutes IS NULL) and
			// recent activity (last 30 days) grouped by workflowType + toStatus.
			const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

			// Open steps: transitions that have started (occurredAt set) but no completion time yet
			const openStepRows = await db
				.select({
					workflowType: encounterStatusEvents.workflowType,
					toStatus: encounterStatusEvents.toStatus,
					n: count(),
				})
				.from(encounterStatusEvents)
				.where(
					and(
						eq(encounterStatusEvents.facilityId, facilityId),
						isNull(encounterStatusEvents.actualMinutes)
					)
				)
				.groupBy(encounterStatusEvents.workflowType, encounterStatusEvents.toStatus)

			// Recent activity: at least one event in the last 30 days per workflow — signals pipeline is wired
			const recentActivityRows = await db
				.select({
					workflowType: encounterStatusEvents.workflowType,
					n: count(),
				})
				.from(encounterStatusEvents)
				.where(
					and(
						eq(encounterStatusEvents.facilityId, facilityId),
						gte(encounterStatusEvents.occurredAt, thirtyDaysAgo)
					)
				)
				.groupBy(encounterStatusEvents.workflowType)

			const recentActivitySet = new Set<string>(recentActivityRows.map(r => r.workflowType))

			// Build a map: workflowType → open steps array
			const openStepsByWorkflow = new Map<string, Array<{ step: string; count: number }>>()
			for (const row of openStepRows) {
				if (!openStepsByWorkflow.has(row.workflowType)) {
					openStepsByWorkflow.set(row.workflowType, [])
				}
				openStepsByWorkflow
					.get(row.workflowType)!
					.push({ step: row.toStatus, count: Number(row.n) })
			}

			// AD-001 + AD-014: Build per-queue breakdown for ALL configured workflows.
			// A workflow is instrumented if active items exist OR recent event history exists.
			const queueBreakdown = activeConfigs.map(cfg => {
				const breakdown = result.workflowBreakdown.find(b => b.workflow === cfg.workflowType)
				const openSteps = openStepsByWorkflow.get(cfg.workflowType) ?? []
				const hasRecentActivity = recentActivitySet.has(cfg.workflowType)

				if (breakdown) {
					return {
						workflow: breakdown.workflow,
						label: cfg.description || breakdown.workflow.replaceAll("_", " "),
						onTime: breakdown.onTime,
						approaching: breakdown.approaching,
						exceeded: breakdown.exceeded,
						targetMinutes: breakdown.targetMinutes,
						instrumented: breakdown.instrumented || hasRecentActivity,
						openSteps,
					}
				}

				return {
					workflow: cfg.workflowType,
					label: cfg.description || cfg.workflowType.replaceAll("_", " "),
					onTime: 0,
					approaching: 0,
					exceeded: 0,
					targetMinutes: cfg.targetMinutes,
					instrumented: hasRecentActivity,
					openSteps,
				}
			})

			return {
				activeBreaches: result.activeBreaches,
				overdueQueues: result.overdueQueues,
				topBreachedWorkflows: result.topBreachedWorkflows,
				queueBreakdown,
				dataAvailable: true,
			}
		} catch (error) {
			if (isMissingDatabaseObjectError(error)) {
				this.logger.warn(
					`SLA dashboard data unavailable for facility ${facilityId}: database schema is behind the current code`
				)
				return {
					activeBreaches: 0,
					overdueQueues: 0,
					topBreachedWorkflows: [],
					queueBreakdown: [],
					dataAvailable: false,
				}
			}

			throw error
		}
	}

	// ── Alerts ─────────────────────────────────────────────────────────────────

	private buildAlerts(
		governance: AccessGovernanceSection,
		platform: PlatformControlSection,
		integrationHealth: IntegrationHealthSection,
		audit: AuditSummarySection,
		artaSla: ArtaSlaSection,
		offlineReadiness: OfflineReadinessSection
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

		if (audit.pendingBreakGlassReviews > 0) {
			alerts.push({
				id: "pending-break-glass-reviews",
				severity: "warning",
				category: "audit",
				title: `${audit.pendingBreakGlassReviews} break-glass event(s) pending review`,
				description: "Unreviewed emergency access events require privacy officer action.",
				link: "/audit/break-glass",
			})
		}

		if (audit.flaggedBreakGlassEvents > 0) {
			alerts.push({
				id: "flagged-break-glass-events",
				severity: "critical",
				category: "audit",
				title: `${audit.flaggedBreakGlassEvents} break-glass event(s) flagged in the last 7 days`,
				description:
					"Flagged emergency access may indicate a policy violation. Immediate review required.",
				link: "/audit/break-glass",
			})
		}

		if (!audit.consentEnforced) {
			alerts.push({
				id: "consent-not-enforced",
				severity: "warning",
				category: "audit",
				title: "DPA consent enforcement is disabled",
				description:
					"Patient data exports are not gated by consent. Review your privacy policy settings.",
				link: "/admin/settings",
			})
		}

		if (offlineReadiness.status === "disabled") {
			alerts.push({
				id: "offline-disabled",
				severity: "warning",
				category: "platform",
				title: "Offline continuity mode is disabled",
				description:
					"Patients cannot be served without network connectivity. Enable offline summary cache in System Settings.",
				link: "/admin/offline",
			})
		}

		if (offlineReadiness.status === "stale") {
			alerts.push({
				id: "offline-stale",
				severity: "warning",
				category: "platform",
				title: "Offline summary cache is stale",
				description:
					"The offline readiness cache has not been refreshed recently. Continuity may be impaired.",
				link: "/admin/offline",
			})
		}

		if (offlineReadiness.status === "degraded") {
			alerts.push({
				id: "offline-degraded",
				severity: "critical",
				category: "platform",
				title: "Offline cache preparation has failed",
				description: offlineReadiness.lastFailureMessage
					? `Last failure: ${offlineReadiness.lastFailureMessage}`
					: "Cache preparation failed. Offline continuity is not available.",
				link: "/admin/offline",
			})
		}

		// ── Governance anomaly detection (AD-006) ─────────────────────────────

		if (audit.privilegedChangeCount7d > 20) {
			alerts.push({
				id: "privileged-change-spike",
				severity: "warning",
				category: "anomaly",
				title: `Unusual privileged change volume: ${audit.privilegedChangeCount7d} changes in 7 days`,
				description:
					"A high number of role, flag, settings, or integration changes were made this week. Review for unauthorized activity.",
				link: "/audit",
			})
		}

		if (audit.breakGlassEventCount > 10) {
			alerts.push({
				id: "break-glass-spike",
				severity: "critical",
				category: "anomaly",
				title: `Break-glass volume spike: ${audit.breakGlassEventCount} events in 7 days`,
				description:
					"Unusually high emergency access volume may indicate a privacy or security incident. Immediate review required.",
				link: "/audit/break-glass",
			})
		}

		if (integrationHealth.fhirFailures > 0 && !audit.consentEnforced) {
			alerts.push({
				id: "fhir-failure-no-consent",
				severity: "critical",
				category: "anomaly",
				title: "FHIR export failures with consent enforcement disabled",
				description:
					"Export failures are occurring while DPA consent is not enforced. Data governance risk is elevated.",
				link: "/admin/fhir",
			})
		}

		if (governance.multiFacilityUsers > 5) {
			alerts.push({
				id: "multi-facility-anomaly",
				severity: "warning",
				category: "anomaly",
				title: `${governance.multiFacilityUsers} users have cross-facility access`,
				description:
					"A large number of users are active across multiple facilities. Verify these assignments are intentional.",
				link: "/admin/users",
			})
		}

		return alerts.sort((a, b) => {
			const order = { critical: 0, warning: 1, info: 2 }
			return order[a.severity] - order[b.severity]
		})
	}

	// ── Offline Readiness ─────────────────────────────────────────────────────

	private async getOfflineReadiness(facilityId: string): Promise<OfflineReadinessSection> {
		const [settingsRow] = await db
			.select({
				enableOfflineSummaryCache: systemSettings.enableOfflineSummaryCache,
				policySections: systemSettings.policySections,
			})
			.from(systemSettings)
			.where(eq(systemSettings.facilityId, facilityId))
			.limit(1)

		const enabled = settingsRow?.enableOfflineSummaryCache ?? false
		const offlineMode = settingsRow?.policySections?.offlineMode
		const maxOfflineDays = offlineMode?.maxOfflineDays ?? null

		// Read from the offline_cache_jobs table for real runtime telemetry
		const [lastJob] = await db
			.select()
			.from(offlineCacheJobs)
			.where(
				and(
					eq(offlineCacheJobs.facilityId, facilityId),
					or(eq(offlineCacheJobs.status, "completed"), eq(offlineCacheJobs.status, "failed"))
				)
			)
			.orderBy(desc(offlineCacheJobs.startedAt))
			.limit(1)

		const lastCachePreparedAt =
			lastJob?.status === "completed" ? (lastJob.completedAt ?? lastJob.startedAt) : null
		const activePatientsCount =
			lastJob?.status === "completed" ? (lastJob.cachedPatientCount ?? 0) : 0

		let status: OfflineReadinessSection["status"]
		if (!enabled) {
			status = "disabled"
		} else if (!lastJob || lastJob.status === "failed") {
			status = lastCachePreparedAt === null ? "degraded" : "stale"
		} else {
			// Check if last successful job was within 24 hours
			const staleCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
			status = lastCachePreparedAt && lastCachePreparedAt > staleCutoff ? "healthy" : "stale"
		}

		// AD-005: Retrieve recent job history for the offline operations detail page
		const recentJobRows = await db
			.select()
			.from(offlineCacheJobs)
			.where(eq(offlineCacheJobs.facilityId, facilityId))
			.orderBy(desc(offlineCacheJobs.startedAt))
			.limit(10)

		const recentJobs = recentJobRows.map(j => ({
			id: j.id,
			status: j.status,
			startedAt: j.startedAt,
			completedAt: j.completedAt ?? null,
			cachedPatientCount: j.cachedPatientCount ?? null,
			errorMessage: j.errorMessage ?? null,
			triggeredBy: j.triggeredBy,
		}))

		const lastFailedJob = recentJobRows.find(j => j.status === "failed") ?? null

		return {
			enabled,
			status,
			lastCachePreparedAt,
			activePatientsCount,
			maxOfflineDays,
			recentJobs,
			lastFailedAt: lastFailedJob?.startedAt ?? null,
			lastFailureMessage: lastFailedJob?.errorMessage ?? null,
		}
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
				link: "/admin/sla",
			},
		]
	}

	// ── HIM Operations (AD-004) ────────────────────────────────────────────────

	async getHimOps(facilityId: string): Promise<HimOpsSection> {
		// Discharge summaries still in draft for already-discharged encounters
		const [pendingDsRow] = await db
			.select({ n: count() })
			.from(clinicalNotes)
			.innerJoin(encounters, eq(clinicalNotes.encounterId, encounters.id))
			.where(
				and(
					eq(clinicalNotes.facilityId, facilityId),
					eq(clinicalNotes.noteType, "discharge_summary"),
					eq(clinicalNotes.status, "draft"),
					isNotNull(encounters.dischargeDatetime)
				)
			)

		// AD-007: count distinct encounters (not problem rows) — one encounter may have many uncoded diagnoses
		const [pendingCodingRow] = await db
			.select({ n: countDistinct(problems.encounterId) })
			.from(problems)
			.innerJoin(encounters, eq(problems.encounterId, encounters.id))
			.where(
				and(
					eq(problems.facilityId, facilityId),
					eq(problems.status, "resolved"),
					isNull(problems.icd10Code),
					isNotNull(encounters.dischargeDatetime)
				)
			)

		// Pending medical records release requests (chart release + copies)
		const [pendingReleaseRow] = await db
			.select({ n: count() })
			.from(medicalRecordsRequests)
			.where(
				and(
					eq(medicalRecordsRequests.facilityId, facilityId),
					eq(medicalRecordsRequests.status, "pending"),
					or(
						eq(medicalRecordsRequests.requestType, "chart_release"),
						eq(medicalRecordsRequests.requestType, "discharge_summary_copy"),
						eq(medicalRecordsRequests.requestType, "laboratory_results")
					)
				)
			)

		// Pending medical certificate requests
		const [pendingMedCertRow] = await db
			.select({ n: count() })
			.from(medicalRecordsRequests)
			.where(
				and(
					eq(medicalRecordsRequests.facilityId, facilityId),
					eq(medicalRecordsRequests.status, "pending"),
					eq(medicalRecordsRequests.requestType, "medical_certificate")
				)
			)

		return {
			pendingDischargeSummaryCount: pendingDsRow?.n ?? 0,
			pendingCodingCount: pendingCodingRow?.n ?? 0,
			pendingRecordsReleaseCount: pendingReleaseRow?.n ?? 0,
			pendingMedCertCount: pendingMedCertRow?.n ?? 0,
		}
	}

	// ── Export Compliance (AD-002) ─────────────────────────────────────────────

	async getExportCompliance(
		facilityId: string,
		query: ExportComplianceQuery
	): Promise<ExportComplianceList> {
		const page = query.page ?? 1
		const limit = query.limit ?? 50
		const offset = (page - 1) * limit

		const [totalRow] = await db
			.select({ n: count() })
			.from(dataExports)
			.where(eq(dataExports.facilityId, facilityId))

		const rows = await db
			.select()
			.from(dataExports)
			.where(eq(dataExports.facilityId, facilityId))
			.orderBy(desc(dataExports.exportedAt))
			.limit(limit)
			.offset(offset)

		const items = rows.map(r => ({
			id: r.id,
			exportedAt: r.exportedAt,
			entityType: r.entityType,
			actor: r.actorUserId,
			actorStaffId: r.actorStaffId ?? null,
			entityId: r.entityId ?? null,
			ipAddress: r.ipAddress ?? null,
			consentGated: r.consentGated,
			consentOutcome: r.consentOutcome ?? null,
			destination: r.destination ?? null,
			transmissionScope: r.transmissionScope ?? null,
			status: r.status,
			rejectionReason: r.rejectionReason ?? null,
		}))

		const total = totalRow?.n ?? 0
		return {
			items,
			total,
			page,
			limit,
		}
	}

	// ── Civil Registry Operations (AD-003) ────────────────────────────────────

	async getCivilRegistryOps(facilityId: string): Promise<CivilRegistryOpsSection> {
		const rows = await db
			.select({
				reportType: deathReports.reportType,
				status: deathReports.status,
				submittedAt: deathReports.submittedAt,
			})
			.from(deathReports)
			.where(eq(deathReports.facilityId, facilityId))

		const fmdrfRows = rows.filter(r => r.reportType === "fmdrf")
		const fndrfRows = rows.filter(r => r.reportType === "fndrf")

		const pendingCertificateCount = rows.filter(r => r.status === "draft").length
		const completedNotSubmittedCount = rows.filter(r => r.status === "completed").length
		const submittedCount = rows.filter(r => r.status === "submitted").length

		const submittedDates = rows
			.filter(r => r.status === "submitted" && r.submittedAt)
			.map(r => r.submittedAt!)
			.sort((a, b) => b.getTime() - a.getTime())
		const lastSubmittedAt = submittedDates[0] ?? null

		// AD-005: Birth certificate tracking from civil registry registration records.
		// birthRegistrations is the authoritative source for birth certificate status.
		const birthCertRows = await db
			.select({ status: birthRegistrations.status, submittedAt: birthRegistrations.submittedAt })
			.from(birthRegistrations)
			.where(eq(birthRegistrations.facilityId, facilityId))

		const bcDraftCount = birthCertRows.filter(r => r.status === "draft").length
		const bcCompletedCount = birthCertRows.filter(r => r.status === "completed").length
		const bcSubmittedCount = birthCertRows.filter(r => r.status === "submitted").length
		const bcLastSubmittedAt =
			birthCertRows
				.filter(r => r.status === "submitted" && r.submittedAt)
				.map(r => r.submittedAt!)
				.sort((a, b) => b.getTime() - a.getTime())[0] ?? null

		// AD-005 / AD-012: NBS data is retained separately as newborn screening metrics only.
		// It is NOT used as a proxy for birth certificate status.
		const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

		const nbsRows = await db
			.select({
				status: nbsLogEntries.status,
				birthDatetime: nbsLogEntries.birthDatetime,
				hoursElapsed: nbsLogEntries.hoursElapsed,
				consentStatus: nbsLogEntries.consentStatus,
				referralStatus: nbsLogEntries.referralStatus,
				screeningResult: nbsLogEntries.screeningResult,
			})
			.from(nbsLogEntries)
			.where(eq(nbsLogEntries.facilityId, facilityId))

		const totalLiveBirths = nbsRows.length
		const pendingScreeningCount = nbsRows.filter(r => r.status === "pending").length
		const screenedCount = nbsRows.filter(r => r.status !== "pending").length
		const lastScreeningAt =
			nbsRows.map(r => r.birthDatetime).sort((a, b) => b.getTime() - a.getTime())[0] ?? null

		// AD-012: Timing-window compliance — RA 9288 mandates screening within 24–48h post-birth.
		const screenedRows = nbsRows.filter(r => r.status !== "pending" && r.hoursElapsed !== null)
		const onTimeCount = screenedRows.filter(
			r => r.hoursElapsed! >= 24 && r.hoursElapsed! <= 48
		).length
		const earlyCount = screenedRows.filter(r => r.hoursElapsed! < 24).length
		const lateScreenedCount = screenedRows.filter(r => r.hoursElapsed! > 48).length
		const overdueCount = nbsRows.filter(
			r => r.status === "pending" && r.birthDatetime < fortyEightHoursAgo
		).length

		// AD-012: Consent / waiver breakdown.
		const consentedCount = nbsRows.filter(r => r.consentStatus === "consented").length
		const waivedCount = nbsRows.filter(r => r.consentStatus === "waived").length
		const pendingConsentCount = nbsRows.filter(r => r.consentStatus === "pending").length

		// AD-012: Positive / abnormal result count and referral follow-through.
		const positiveOrBorderlineCount = nbsRows.filter(r => {
			const result = r.screeningResult
			if (!result || !result.conditions) return false
			return result.conditions.some(c => c.result === "abnormal")
		}).length
		const referralPendingCount = nbsRows.filter(r => r.referralStatus === "referred").length
		const referralCompletedCount = nbsRows.filter(r => r.referralStatus === "completed").length

		return {
			fmdrf: {
				draft: fmdrfRows.filter(r => r.status === "draft").length,
				completed: fmdrfRows.filter(r => r.status === "completed").length,
				submitted: fmdrfRows.filter(r => r.status === "submitted").length,
			},
			fndrf: {
				draft: fndrfRows.filter(r => r.status === "draft").length,
				completed: fndrfRows.filter(r => r.status === "completed").length,
				submitted: fndrfRows.filter(r => r.status === "submitted").length,
			},
			pendingCertificateCount,
			completedNotSubmittedCount,
			submittedCount,
			lastSubmittedAt,
			birthCertificate: {
				draftCount: bcDraftCount,
				completedCount: bcCompletedCount,
				submittedCount: bcSubmittedCount,
				lastSubmittedAt: bcLastSubmittedAt,
			},
			nbsScreening: {
				totalLiveBirths,
				pendingScreeningCount,
				screenedCount,
				lastScreeningAt,
				onTimeCount,
				earlyCount,
				lateScreenedCount,
				overdueCount,
				consentedCount,
				waivedCount,
				pendingConsentCount,
				positiveOrBorderlineCount,
				referralPendingCount,
				referralCompletedCount,
			},
		}
	}

	// ── Medication Compliance (AD-005) ─────────────────────────────────────────

	async getMedicationCompliance(facilityId: string): Promise<MedicationComplianceSection> {
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

		const orders = await db
			.select({
				brandName: medicationOrders.brandName,
				isControlledSubstance: medicationOrders.isControlledSubstance,
				pdeaSchedule: medicationOrders.pdeaSchedule,
				pdeaTrancheNumber: medicationOrders.pdeaTrancheNumber,
				pdeaTrancheTotal: medicationOrders.pdeaTrancheTotal,
				noRefillInscribed: medicationOrders.noRefillInscribed,
				durationDays: medicationOrders.durationDays,
				specialInstructions: medicationOrders.specialInstructions,
				cdsAlerts: medicationOrders.cdsAlerts,
				status: medicationOrders.status,
			})
			.from(medicationOrders)
			.where(
				and(
					eq(medicationOrders.facilityId, facilityId),
					gte(medicationOrders.createdAt, thirtyDaysAgo)
				)
			)

		const total = orders.length

		// Generics Act compliance: orders prescribed without a brand name (generic-only)
		const genericsPrescribedCount = orders.filter(o => !o.brandName).length
		const brandsPrescribedCount = orders.filter(o => !!o.brandName).length
		const genericsPrescribedPct =
			total > 0 ? Math.round((genericsPrescribedCount / total) * 100) : 100

		// PDEA S-2 (controlled substance) tranche compliance
		const controlledSubstancesCount = orders.filter(o => o.isControlledSubstance).length
		const pdeaS2Count = orders.filter(o => o.pdeaSchedule === "S-2").length
		const pdeaS2WithTrancheCount = orders.filter(
			o => o.pdeaSchedule === "S-2" && o.pdeaTrancheNumber !== null && o.pdeaTrancheTotal !== null
		).length
		const pdeaS2TrancheCompliancePct =
			pdeaS2Count > 0 ? Math.round((pdeaS2WithTrancheCount / pdeaS2Count) * 100) : 100

		// CDS alert verification rate
		const ordersWithCdsAlerts = orders.filter(
			o =>
				o.cdsAlerts !== null && Array.isArray(o.cdsAlerts) && (o.cdsAlerts as unknown[]).length > 0
		).length
		const cdsAlertsVerifiedCount = orders.filter(
			o =>
				o.cdsAlerts !== null &&
				Array.isArray(o.cdsAlerts) &&
				(o.cdsAlerts as unknown[]).length > 0 &&
				o.status === "verified"
		).length
		const cdsVerificationPct =
			ordersWithCdsAlerts > 0
				? Math.round((cdsAlertsVerifiedCount / ordersWithCdsAlerts) * 100)
				: 100

		// AD-003: PRC/PTR prescribing credential compliance.
		// Prescriptions must carry both prcLicenseNumber and ptrNumber per TOR requirements.
		const prescriptionRows = await db
			.select({
				prcLicenseNumber: prescriptions.prcLicenseNumber,
				ptrNumber: prescriptions.ptrNumber,
			})
			.from(prescriptions)
			.where(
				and(eq(prescriptions.facilityId, facilityId), gte(prescriptions.createdAt, thirtyDaysAgo))
			)

		const prescriptionsLast30d = prescriptionRows.length
		const prescriptionsWithPrcAndPtr = prescriptionRows.filter(
			p => p.prcLicenseNumber?.trim() && p.ptrNumber?.trim()
		).length
		const prcPtrCompliancePct =
			prescriptionsLast30d > 0
				? Math.round((prescriptionsWithPrcAndPtr / prescriptionsLast30d) * 100)
				: 100

		// AD-003: PDEA S-2 license validation.
		// S-2 prescriptions must record the prescriber's PDEA S-2 license number.
		const s2PrescriptionRows = await db
			.select({ pdeaS2License: prescriptions.pdeaS2License })
			.from(prescriptions)
			.innerJoin(medicationOrders, eq(prescriptions.medicationOrderId, medicationOrders.id))
			.where(
				and(
					eq(prescriptions.facilityId, facilityId),
					gte(prescriptions.createdAt, thirtyDaysAgo),
					eq(medicationOrders.pdeaSchedule, "S-2")
				)
			)

		const pdeaS2OrdersWithLicense = s2PrescriptionRows.filter(r => !!r.pdeaS2License?.trim()).length
		const pdeaS2LicensePct =
			s2PrescriptionRows.length > 0
				? Math.round((pdeaS2OrdersWithLicense / s2PrescriptionRows.length) * 100)
				: 100

		// AD-015: Active-validity credential checks.
		// Join prescriptions with the prescriber's staff profile to compare expiry dates
		// against the prescription creation timestamp. A credential is "active" if either
		// the expiry date is null (no expiry recorded — conservative assumption: present)
		// or the expiry date is after the prescription was created (signed).
		const validityRows = await db
			.select({
				createdAt: prescriptions.createdAt,
				prcExpiry: staffProfiles.prcExpiry,
				ptrExpiry: staffProfiles.ptrExpiry,
				pdeaS2Expiry: staffProfiles.pdeaS2Expiry,
				pdeaS2License: prescriptions.pdeaS2License,
				medicationOrderId: prescriptions.medicationOrderId,
			})
			.from(prescriptions)
			.innerJoin(staffProfiles, eq(prescriptions.prescriberStaffId, staffProfiles.id))
			.where(
				and(eq(prescriptions.facilityId, facilityId), gte(prescriptions.createdAt, thirtyDaysAgo))
			)

		// Helper: check if a date string (or null) represents an active credential at given time
		const isActive = (expiry: string | null, atTime: Date): boolean => {
			if (!expiry) return true // no expiry recorded: assume valid (conservative)
			return new Date(expiry) > atTime
		}

		const prescriptionsWithActivePrc = validityRows.filter(r =>
			isActive(r.prcExpiry, r.createdAt)
		).length

		const prescriptionsWithActivePtr = validityRows.filter(r =>
			isActive(r.ptrExpiry, r.createdAt)
		).length

		const validityTotal = validityRows.length

		const prcActiveValidityPct =
			validityTotal > 0 ? Math.round((prescriptionsWithActivePrc / validityTotal) * 100) : 100

		const ptrActiveValidityPct =
			validityTotal > 0 ? Math.round((prescriptionsWithActivePtr / validityTotal) * 100) : 100

		// S-2 active license at time of signing: only rows that have a pdeaS2License recorded
		// and the prescriber's pdeaS2Expiry was not past at signing time.
		const s2ValidityRows = validityRows.filter(r => !!r.pdeaS2License?.trim())
		const pdeaS2OrdersWithActiveS2 = s2ValidityRows.filter(r =>
			isActive(r.pdeaS2Expiry, r.createdAt)
		).length
		const pdeaS2ActiveLicensePct =
			s2ValidityRows.length > 0
				? Math.round((pdeaS2OrdersWithActiveS2 / s2ValidityRows.length) * 100)
				: 100

		// Count prescriptions where any credential was expired at time of signing
		const expiredCredentialPrescriptionCount = validityRows.filter(
			r =>
				!isActive(r.prcExpiry, r.createdAt) ||
				!isActive(r.ptrExpiry, r.createdAt) ||
				(!!r.pdeaS2License?.trim() && !isActive(r.pdeaS2Expiry, r.createdAt))
		).length

		// AD-003: High-alert medication safeguards.
		// Orders for formulary items flagged as high-alert must be explicitly verified by a pharmacist.
		const highAlertRows = await db
			.select({ status: medicationOrders.status })
			.from(medicationOrders)
			.innerJoin(formularyItems, eq(medicationOrders.formularyItemId, formularyItems.id))
			.where(
				and(
					eq(medicationOrders.facilityId, facilityId),
					gte(medicationOrders.createdAt, thirtyDaysAgo),
					eq(formularyItems.isHighAlert, true)
				)
			)

		const highAlertOrderCount = highAlertRows.length
		const highAlertVerifiedCount = highAlertRows.filter(r => r.status === "verified").length
		const highAlertVerificationPct =
			highAlertOrderCount > 0
				? Math.round((highAlertVerifiedCount / highAlertOrderCount) * 100)
				: 100

		// AD-016: 90-day supply cap compliance for Schedule IV dangerous drugs.
		// PDEA rules cap Schedule IV prescriptions at 90 days per issuance.
		const scheduleIvOrders = orders.filter(o => o.pdeaSchedule === "S-4")
		const scheduleIv90DayCompliantCount = scheduleIvOrders.filter(
			o => o.durationDays === null || o.durationDays <= 90
		).length
		const scheduleIv90DayLimitCompliancePct =
			scheduleIvOrders.length > 0
				? Math.round((scheduleIv90DayCompliantCount / scheduleIvOrders.length) * 100)
				: 100

		// AD-016: 30-day tranche-splitting compliance for Schedule II (S-2) dangerous drugs.
		// PDEA rules prohibit dispensing more than 30 days of S-2 supply per prescription.
		const s2Orders = orders.filter(o => o.pdeaSchedule === "S-2")
		const scheduleIv30DayTrancheSplitCompliantCount = s2Orders.filter(
			o => o.durationDays === null || o.durationDays <= 30
		).length
		const scheduleIv30DayTrancheSplitCompliancePct =
			s2Orders.length > 0
				? Math.round((scheduleIv30DayTrancheSplitCompliantCount / s2Orders.length) * 100)
				: 100

		// AD-016: Temporal dispensing instruction coverage for dangerous drug orders.
		// TOR requires temporally-scoped dispensing instructions on all dangerous-drug prescriptions.
		const dangerousDrugOrders = orders.filter(
			o => o.pdeaSchedule === "S-2" || o.pdeaSchedule === "S-4"
		)
		const temporalInstructionCount = dangerousDrugOrders.filter(
			o => o.specialInstructions !== null && o.specialInstructions.trim().length > 0
		).length
		const temporalDispensingInstructionPct =
			dangerousDrugOrders.length > 0
				? Math.round((temporalInstructionCount / dangerousDrugOrders.length) * 100)
				: 100

		// AD-016: "No Refill" inscription coverage for S-2 and S-4 dangerous-drug orders.
		// PDEA requires the "No Refill" notation on all dangerous-drug prescriptions.
		const noRefillCompliantCount = dangerousDrugOrders.filter(o => o.noRefillInscribed).length
		const noRefillInscriptionPct =
			dangerousDrugOrders.length > 0
				? Math.round((noRefillCompliantCount / dangerousDrugOrders.length) * 100)
				: 100

		return {
			totalOrdersLast30d: total,
			genericsPrescribedCount,
			brandsPrescribedCount,
			genericsPrescribedPct,
			controlledSubstancesCount,
			pdeaS2Count,
			pdeaS2WithTrancheCount,
			pdeaS2TrancheCompliancePct,
			ordersWithCdsAlerts,
			cdsAlertsVerifiedCount,
			cdsVerificationPct,
			prescriptionsLast30d,
			prescriptionsWithPrcAndPtr,
			prcPtrCompliancePct,
			pdeaS2OrdersWithLicense,
			pdeaS2LicensePct,
			highAlertOrderCount,
			highAlertVerifiedCount,
			highAlertVerificationPct,
			scheduleIv90DayLimitCompliancePct,
			scheduleIv30DayTrancheSplitCompliancePct,
			temporalDispensingInstructionPct,
			noRefillInscriptionPct,
			prescriptionsWithActivePrc,
			prescriptionsWithActivePtr,
			prcActiveValidityPct,
			ptrActiveValidityPct,
			pdeaS2OrdersWithActiveS2,
			pdeaS2ActiveLicensePct,
			expiredCredentialPrescriptionCount,
		}
	}
}

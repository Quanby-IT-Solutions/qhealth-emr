import { z } from "zod"
import { MorbidityMortalityItemSchema } from "../reporting/reporting.schema.js"

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
	"anomaly",
	"statutory",
	"data_quality",
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
	breakGlassEventCount: z.number(),         // all break-glass events in last 7d
	highSeverityEventCount: z.number(),       // high-severity audit events in last 7d
	pendingBreakGlassReviews: z.number(),     // events awaiting review
	flaggedBreakGlassEvents: z.number(),      // events marked flagged (policy concern)
	consentEnforced: z.boolean(),             // whether DPA consent is enforced before export
	privilegedChangeCount7d: z.number(),      // total count of privileged changes in last 7d (AD-006)
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
	queueBreakdown: z.array(
		z.object({
			workflow: z.string(),
			label: z.string(),
			onTime: z.number(),
			approaching: z.number(),
			exceeded: z.number(),
			targetMinutes: z.number(),
			instrumented: z.boolean(), // AD-001: true = real data, false = SLA configured but no event pipeline
			// AD-014: Step-level charter reporting — open steps from encounterStatusEvents
			openSteps: z.array(
				z.object({
					step: z.string(),   // toStatus value (current step)
					count: z.number(),  // number of open transitions at this step
				})
			).optional(),
		})
	),
	dataAvailable: z.boolean(), // false when event instrumentation is incomplete
})

export type ArtaSlaSection = z.infer<typeof ArtaSlaSectionSchema>

// ── Offline readiness ─────────────────────────────────────────────────────────

export const OfflineCacheJobSchema = z.object({
	id: z.string(),
	status: z.enum(["running", "completed", "failed"]),
	startedAt: z.coerce.date(),
	completedAt: z.coerce.date().nullable(),
	cachedPatientCount: z.number().int().nullable(),
	errorMessage: z.string().nullable(),
	triggeredBy: z.string(),
})

export type OfflineCacheJob = z.infer<typeof OfflineCacheJobSchema>

export const OfflineReadinessSectionSchema = z.object({
	enabled: z.boolean(),
	status: z.enum(["healthy", "disabled", "stale", "degraded"]),
	lastCachePreparedAt: z.coerce.date().nullable(),
	activePatientsCount: z.number().int(),
	maxOfflineDays: z.number().int().nullable(),
	recentJobs: z.array(OfflineCacheJobSchema),    // last N cache job history (AD-005)
	lastFailedAt: z.coerce.date().nullable(),       // timestamp of last failed job (AD-005)
	lastFailureMessage: z.string().nullable(),      // error message from last failed job (AD-005)
})

export type OfflineReadinessSection = z.infer<typeof OfflineReadinessSectionSchema>

// ── Statutory reporting readiness ─────────────────────────────────────────────

const StatutoryDomainStatusEnum = z.enum(["ready", "warning", "blocked", "degraded", "not_configured"])

export const StatutoryDomainSchema = z.object({
	name: z.string(),
	status: StatutoryDomainStatusEnum,
	detail: z.string().nullable(),
	link: z.string().nullable(),
})

export const StatutoryReadinessSectionSchema = z.object({
	fhirNhdr: StatutoryDomainSchema,
	philhealth: StatutoryDomainSchema,
	hai: StatutoryDomainSchema,
	pidsr: StatutoryDomainSchema,
	civilRegistry: StatutoryDomainSchema,  // AD-002: separated from pidsr
})

export type StatutoryReadinessSection = z.infer<typeof StatutoryReadinessSectionSchema>

// ── Statutory reporting operations (AD-001) ───────────────────────────────────

export const StatutoryOpsSectionSchema = z.object({
	pidsr: z.object({
		category1Count: z.number(),
		category2Count: z.number(),
		draftCount: z.number(),
		submittedCount: z.number(),
		rejectedCount: z.number(),          // AD-004: reports rejected by DOH
		blockedCount: z.number(),           // AD-004: reports blocked before submission
		lastSubmittedAt: z.coerce.date().nullable(),
		blockedOrRejected: z.boolean(),
	}),
	hai: z.object({
		openSurveillanceCount: z.number(),
		reviewedCount: z.number(),
		pendingCount: z.number(),
		byType: z.array(z.object({ type: z.string(), count: z.number() })),
	}),
	ahsr: z.object({                          // AD-002: AHSR as first-class operational concern
		snapshotCount: z.number(),
		lastSnapshotMonth: z.string().nullable(), // "YYYY-MM"
		currentMonthReady: z.boolean(),
		// AD-003: Current-year statutory metrics surfaced for admin oversight
		currentYearBor: z.number().nullable(),
		currentYearGrossDeathRate: z.number().nullable(),
		currentYearNetDeathRate: z.number().nullable(),
		topMorbidities: z.array(MorbidityMortalityItemSchema).default([]),
		topMortalities: z.array(MorbidityMortalityItemSchema).default([]),
	}),
})

export type StatutoryOpsSection = z.infer<typeof StatutoryOpsSectionSchema>

// ── Data quality oversight (AD-002, AD-016) ──────────────────────────────────

export const Cf4SectionCompletenessItemSchema = z.object({
	section: z.string(),         // human-readable CF4 clinical section name
	missingCount: z.number(),    // number of non-draft CF4 claims missing this section
})

export const DataQualitySectionSchema = z.object({
	cf4DraftCount: z.number(),           // CF4 claims in draft/incomplete state
	cf4SubmittedThisMonth: z.number(),   // CF4 claims submitted this calendar month
	missingIcd10Count: z.number(),       // discharge-type encounters with no ICD-10 on any problem
	missingRvsCount: z.number(),         // surgical operations with no RVS assignment
	ahsrLastSnapshotMonth: z.string().nullable(), // "YYYY-MM" of latest AHSR snapshot
	ahsrCurrentMonthReady: z.boolean(),  // whether current month snapshot exists
	// AD-016: CF4 extraction completeness (non-draft claims with extractedData populated)
	cf4WithExtractedData: z.number(),           // non-draft CF4 claims with extractedData populated
	cf4MissingExtractedData: z.number(),        // non-draft CF4 claims with null extractedData
	cf4ExtractionCompletePct: z.number(),       // 0–100 completeness rate across non-draft claims
	cf4SectionCompleteness: z.array(Cf4SectionCompletenessItemSchema), // per-section missing counts
})

export type DataQualitySection = z.infer<typeof DataQualitySectionSchema>
export type Cf4SectionCompletenessItem = z.infer<typeof Cf4SectionCompletenessItemSchema>

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
	offlineReadiness: OfflineReadinessSectionSchema,
	statutoryReadiness: StatutoryReadinessSectionSchema,
	statutoryOps: StatutoryOpsSectionSchema,
	dataQuality: DataQualitySectionSchema,
})

export type AdminDashboardSummary = z.infer<typeof AdminDashboardSummarySchema>

// ── HIM Operations (AD-004) ───────────────────────────────────────────────────

export const HimOpsSectionSchema = z.object({
	pendingDischargeSummaryCount: z.number(),   // discharge summaries still in draft after discharge
	pendingCodingCount: z.number(),             // discharged encounters with no ICD-10 code
	pendingRecordsReleaseCount: z.number(),     // pending chart-release / records-copy requests
	pendingMedCertCount: z.number(),            // pending medical certificate requests
})

export type HimOpsSection = z.infer<typeof HimOpsSectionSchema>

// ── Export Compliance (AD-002) ────────────────────────────────────────────────

export const ExportAuditRecordSchema = z.object({
	id: z.string(),
	exportedAt: z.coerce.date(),
	entityType: z.string(),
	actor: z.string(),
	actorStaffId: z.string().uuid().nullable(),   // staff profile ID of the exporting actor (AD-011)
	entityId: z.string().uuid().nullable(),        // specific record exported (AD-011)
	ipAddress: z.string().nullable(),             // source IP at export time (AD-011)
	consentGated: z.boolean(),
	consentOutcome: z.string().nullable(),   // "granted" | "denied" | "bypassed" | null
	destination: z.string().nullable(),
	transmissionScope: z.string().nullable(),
	status: z.string(),
	rejectionReason: z.string().nullable(),
})

export type ExportAuditRecord = z.infer<typeof ExportAuditRecordSchema>

export const ExportComplianceListSchema = z.object({
	items: z.array(ExportAuditRecordSchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
})

export type ExportComplianceList = z.infer<typeof ExportComplianceListSchema>

export const ExportComplianceQuerySchema = z.object({
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
	facilityId: z.string().uuid().optional(),
})

export type ExportComplianceQuery = z.infer<typeof ExportComplianceQuerySchema>

// ── Civil Registry Operations (AD-003) ───────────────────────────────────────

export const CivilRegistryOpsSectionSchema = z.object({
	fmdrf: z.object({
		draft: z.number(),
		completed: z.number(),
		submitted: z.number(),
	}),
	fndrf: z.object({
		draft: z.number(),
		completed: z.number(),
		submitted: z.number(),
	}),
	pendingCertificateCount: z.number(),         // draft reports needing completion
	completedNotSubmittedCount: z.number(),      // completed but pending PSA transmission
	submittedCount: z.number(),
	lastSubmittedAt: z.coerce.date().nullable(),
	// AD-005: Birth certificate tracking from true civil registry records
	birthCertificate: z.object({
		draftCount: z.number(),                  // birth registrations in draft (pending completion)
		completedCount: z.number(),              // completed but not yet submitted to civil registrar / PSA
		submittedCount: z.number(),              // submitted to civil registrar / PSA
		lastSubmittedAt: z.coerce.date().nullable(), // most recent certificate submission datetime
	}),
	// AD-005 / AD-012: Newborn screening progress and compliance metrics
	nbsScreening: z.object({
		totalLiveBirths: z.number(),             // total NBS entries at this facility
		pendingScreeningCount: z.number(),       // NBS entries with status = pending
		screenedCount: z.number(),               // NBS entries progressed past pending
		lastScreeningAt: z.coerce.date().nullable(), // most recent NBS birth datetime
		// AD-012: Timing-window compliance (24–48h post-birth window per DOH RA 9288)
		onTimeCount: z.number(),                 // screened within the 24–48h window
		earlyCount: z.number(),                  // screened before 24h (early / may need repeat)
		lateScreenedCount: z.number(),           // screened after 48h but still done
		overdueCount: z.number(),                // still pending AND birth > 48h ago (urgently overdue)
		// AD-012: Consent / waiver status
		consentedCount: z.number(),              // consentStatus = "consented"
		waivedCount: z.number(),                 // consentStatus = "waived"
		pendingConsentCount: z.number(),         // consentStatus = "pending"
		// AD-012: Referral follow-through for positive/abnormal results
		positiveOrBorderlineCount: z.number(),   // entries with at least one "abnormal" screening result
		referralPendingCount: z.number(),        // referralStatus = "referred" (pending follow-up)
		referralCompletedCount: z.number(),      // referralStatus = "completed"
	}),
})

export type CivilRegistryOpsSection = z.infer<typeof CivilRegistryOpsSectionSchema>

// ── Medication Compliance (AD-005) ────────────────────────────────────────────

export const MedicationComplianceSectionSchema = z.object({
	totalOrdersLast30d: z.number(),
	genericsPrescribedCount: z.number(),         // orders without brandName (generic-only)
	brandsPrescribedCount: z.number(),           // orders with brandName set
	genericsPrescribedPct: z.number(),           // 0–100
	controlledSubstancesCount: z.number(),       // isControlledSubstance = true
	pdeaS2Count: z.number(),                     // pdeaSchedule = 'S-2'
	pdeaS2WithTrancheCount: z.number(),          // S-2 orders with proper tranche tracking
	pdeaS2TrancheCompliancePct: z.number(),      // 0–100
	ordersWithCdsAlerts: z.number(),             // orders that triggered CDS alerts
	cdsAlertsVerifiedCount: z.number(),          // CDS-alerted orders with status='verified'
	cdsVerificationPct: z.number(),              // 0–100
	// AD-003: PRC/PTR prescribing credential compliance (presence-based)
	prescriptionsLast30d: z.number(),            // total prescriptions issued in last 30 days
	prescriptionsWithPrcAndPtr: z.number(),      // prescriptions with both PRC license and PTR on record
	prcPtrCompliancePct: z.number(),             // 0–100 — prescriptions missing either credential are non-compliant
	// AD-003: PDEA S-2 license validation on S-2 prescriptions
	pdeaS2OrdersWithLicense: z.number(),         // S-2 orders where the prescription records a valid pdeaS2License
	pdeaS2LicensePct: z.number(),               // 0–100 — S-2 orders without an S-2 license on the prescription
	// AD-003: High-alert medication safeguards
	highAlertOrderCount: z.number(),             // orders for formulary items flagged isHighAlert = true
	highAlertVerifiedCount: z.number(),          // high-alert orders with status = 'verified'
	highAlertVerificationPct: z.number(),        // 0–100
	// AD-016: TOR dangerous-drug dispensing rule coverage
	scheduleIv90DayLimitCompliancePct: z.number(),        // 0–100: Schedule IV orders within 90-day supply cap
	scheduleIv30DayTrancheSplitCompliancePct: z.number(), // 0–100: S-2 orders split into ≤30-day tranches
	temporalDispensingInstructionPct: z.number(),         // 0–100: dangerous-drug orders with temporal dispensing instructions
	noRefillInscriptionPct: z.number(),                   // 0–100: S-2/S-4 orders with "No Refill" inscription
	// AD-015: Active-validity credential checks (expiry-based, not just presence)
	prescriptionsWithActivePrc: z.number(),      // prescriptions where PRC was not expired at time of signing
	prescriptionsWithActivePtr: z.number(),      // prescriptions where PTR was not expired at time of signing
	prcActiveValidityPct: z.number(),            // 0–100 — prescriptions with active PRC at time of signing
	ptrActiveValidityPct: z.number(),            // 0–100 — prescriptions with active PTR at time of signing
	pdeaS2OrdersWithActiveS2: z.number(),        // S-2 orders where prescriber's PDEA S-2 was not expired at signing
	pdeaS2ActiveLicensePct: z.number(),          // 0–100 — S-2 orders with active S-2 at signing
	expiredCredentialPrescriptionCount: z.number(), // prescriptions issued under any expired credential
})

export type MedicationComplianceSection = z.infer<typeof MedicationComplianceSectionSchema>

type RbacModule =
	| "adt"
	| "clinical_docs"
	| "orders"
	| "nursing"
	| "billing"
	| "formulary"
	| "reporting"
	| "audit"
	| "admin"
	| "feature_flags" // Admin governance — feature flag management
	| "system_settings" // Admin governance — system configuration
	| "facility_profile" // Admin governance — canonical facility identity
	| "surgical" // Seeded for Surgeon/Anesthesiologist roles
	| "opd" // Seeded for roles that access OPD (not Anesthesiologist)
	| "patients" // Explicit patient-record access (search, profile) — NOT granted to Administrator
	| "integration_registry" // Admin-only integration oversight
	// Future modules — permissions not yet seeded
	| "scheduling"
	| "him"
	| "msw"
	| "telemedicine"
	| "nutrition"
	| "blood_bank"
	| "laboratory"
	| "radiology"
	| "ed"
	| "nbs"
	| "death_reporting"
	| "fhir"
	| "civil_registry"
	| "medical_records"

// Lazy-loaded icon references — these are tree-shakeable free icons
// We import them dynamically in the component to keep this config file light
export type NavIconName =
	| "dashboard"
	| "patient"
	| "bed"
	| "emergency"
	| "stethoscope"
	| "pill"
	| "nursing"
	| "billing"
	| "report"
	| "audit"
	| "settings"
	| "formulary"
	| "calendar"
	| "surgical"
	| "records"
	| "social-work"
	| "video"
	| "nutrition"
	| "blood-bank"
	| "laboratory"
	| "radiology"
	| "nbs"
	| "sla"

interface RequiredPermission {
	module: RbacModule
	action: string
}

export type AdminNavGroup =
	| "Identity & Access"
	| "Clinical Configuration"
	| "Reporting & Compliance"
	| "System Settings"

interface NavItemConfig {
	title: string
	href: string
	iconName: NavIconName
	/**
	 * Always-show when empty. Otherwise the item is visible if the user holds
	 * ANY of the listed module+action pairs. Use this instead of requiredModules
	 * to distinguish between roles that share the same module but have different
	 * levels of access (e.g. adt/view vs adt/edit).
	 */
	requiredPermissions: RequiredPermission[]
	/**
	 * If any of these permissions are present, hide the item regardless of
	 * requiredPermissions. Use this to exclude clinical roles from administrative
	 * functions, etc.
	 */
	excludePermissions?: RequiredPermission[]
	/**
	 * Hide the item only when the user holds every listed permission. This is
	 * used to identify role bundles without blocking unrelated roles that share
	 * one broad module permission.
	 */
	excludeAllPermissions?: RequiredPermission[]
	/**
	 * All permissions in this list must be present for the item to show.
	 * Applied after requiredPermissions. Use this to enforce AND logic across
	 * multiple distinct permission requirements (e.g. admin:view + fhir:view).
	 */
	requireAllPermissions?: RequiredPermission[]
	isSecondary?: boolean
	/** Groups admin-only items into the 4 TOR admin sidebar categories. */
	adminGroup?: AdminNavGroup
}

const TRIAGE_ROLE_BUNDLE: RequiredPermission[] = [
	{ module: "adt", action: "create" },
	{ module: "nursing", action: "create" },
	{ module: "ed", action: "create" },
]

const REGISTRAR_ROLE_BUNDLE: RequiredPermission[] = [
	{ module: "adt", action: "create" },
	{ module: "adt", action: "edit" },
	{ module: "patients", action: "edit" },
]

/**
 * Primary navigation items visible in the sidebar.
 *
 * Visibility rules (per TOR role bundles in seed-dev.ts):
 *
 * Dashboard          — always visible
 * Patient Management — registrar unified page: dedup search + patient list + MRN registration dialog
 * Bed Management     — registrar bed assignment and post-discharge bed status
 * Chart Merge        — registrar trauma-alias merge into permanent MRN
 * Civil Registry     — registrar birth/death certificate generation and tracking
 * Triage             — triage-only intake, acuity scoring, trauma alias, tele-triage workflows
 * Scheduler          — clinic templates, slots, appointments, check-in, OPD queue, OR schedule
 * Emergency          — ED tracker/disposition workspace for nurse/physician roles
 * Pharmacy           — roles with order-verify authority (orders/verify → Pharmacist)
 */
export const PRIMARY_NAV_ITEMS: NavItemConfig[] = [
	{
		title: "Dashboard",
		href: "/dashboard",
		iconName: "dashboard",
		requiredPermissions: [],
	},
	{
		title: "Patient Management",
		href: "/patients/register",
		iconName: "patient",
		requiredPermissions: [{ module: "adt", action: "create" }],
		// Full patient registration is registrar/admin-owned. Triage creates
		// pre-encounters/trauma aliases from the dedicated triage workspace.
		excludePermissions: [
			{ module: "clinical_docs", action: "sign" },
			{ module: "scheduling", action: "view" },
		],
		excludeAllPermissions: TRIAGE_ROLE_BUNDLE,
	},
	{
		title: "Triage Queue",
		href: "/triage",
		iconName: "emergency",
		requiredPermissions: [{ module: "adt", action: "create" }],
		requireAllPermissions: [
			{ module: "nursing", action: "create" },
			{ module: "ed", action: "create" },
		],
	},
	{
		title: "Trauma Alias",
		href: "/triage/trauma-alias",
		iconName: "records",
		requiredPermissions: [{ module: "adt", action: "create" }],
		requireAllPermissions: [
			{ module: "nursing", action: "create" },
			{ module: "ed", action: "create" },
		],
	},
	{
		title: "Tele-Triage",
		href: "/triage/tele",
		iconName: "video",
		requiredPermissions: [{ module: "adt", action: "create" }],
		requireAllPermissions: [
			{ module: "nursing", action: "create" },
			{ module: "ed", action: "create" },
		],
	},
	{
		title: "OPD Tele-Triage",
		href: "/triage/opd-tele",
		iconName: "video",
		requiredPermissions: [{ module: "opd", action: "view" }],
		requireAllPermissions: [{ module: "nursing", action: "create" }],
	},
	{
		// Nurse-specific patient list: browse & filter all active patients without
		// the strict Name+DOB dedup requirement of the registrar workflow.
		title: "Patients",
		href: "/patients/search",
		iconName: "patient",
		requiredPermissions: [{ module: "nursing", action: "create" }],
		// Triage Officers also have nursing:create but they use "Register Patient"
		excludePermissions: [{ module: "adt", action: "create" }],
	},
	{
		// Dietitian patient list: browse active patients to access nutrition tabs
		title: "Patients",
		href: "/patients/search",
		iconName: "patient",
		requiredPermissions: [{ module: "nutrition", action: "view" }],
	},
	{
		title: "Patients",
		href: "/patients/search",
		iconName: "patient",
		requiredPermissions: [{ module: "patients", action: "view" }],
		requireAllPermissions: [{ module: "clinical_docs", action: "sign" }],
		// Physicians and other chart-authoring clinicians should land on the
		// chart-first patient list, not the registrar dedup workflow.
	},
	{
		title: "Patients",
		href: "/patients/register",
		iconName: "patient",
		requiredPermissions: [{ module: "patients", action: "view" }],
		// Pharmacists, Lab Techs, Radiologists, PIDSR Officers access patient data
		// via their primary workflow nav, not the global Patients list.
		// Registrars already use "Register Patient" for the same destination, so
		// hide this duplicate entry for the registrar role bundle.
		// Nurses get their own /patients/search list above.
		excludePermissions: [
			{ module: "patients", action: "edit" }, // Registrar
			{ module: "orders", action: "verify" }, // Pharmacist
			{ module: "laboratory", action: "view" }, // Lab Technologist, Blood Bank Technician
			{ module: "radiology", action: "view" }, // Radiologist
			{ module: "reporting", action: "edit" }, // PIDSR Officer
			{ module: "nursing", action: "create" }, // Nurse — uses /patients/search instead
			{ module: "nutrition", action: "view" }, // Dietitian — uses /patients/search instead
			{ module: "clinical_docs", action: "sign" }, // Physicians — use /patients/search instead
			{ module: "scheduling", action: "view" }, // Scheduler — uses /patients/search above
		],
	},
	{
		title: "Clinic Templates",
		href: "/scheduling/templates",
		iconName: "records",
		// Scheduler Story 13.1 — define provider clinic templates.
		requiredPermissions: [{ module: "scheduling", action: "view" }],
		requireAllPermissions: [{ module: "scheduling", action: "edit" }],
		excludePermissions: [
			{ module: "nursing", action: "create" },
			{ module: "audit", action: "view" },
		],
	},
	{
		title: "Slot Management",
		href: "/scheduling/slots",
		iconName: "calendar",
		// Scheduler Story 13.1 — manage bookable slots, holidays, and leaves.
		requiredPermissions: [{ module: "scheduling", action: "view" }],
		requireAllPermissions: [{ module: "scheduling", action: "edit" }],
		excludePermissions: [{ module: "audit", action: "view" }],
	},
	{
		title: "Appointment Booking",
		href: "/scheduling/book",
		iconName: "patient",
		// Scheduler Story 13.2 — search/select patient inside booking workflow.
		requiredPermissions: [{ module: "scheduling", action: "view" }],
		requireAllPermissions: [{ module: "scheduling", action: "create" }],
		excludePermissions: [{ module: "audit", action: "view" }],
	},
	{
		title: "Check-In",
		href: "/scheduling/check-in",
		iconName: "nursing",
		// Scheduler Story 13.2 — mark appointments arrived and issue queue numbers.
		requiredPermissions: [{ module: "scheduling", action: "view" }],
		requireAllPermissions: [{ module: "scheduling", action: "create" }],
		excludePermissions: [{ module: "audit", action: "view" }],
	},
	{
		title: "OPD Queue",
		href: "/scheduling/queue",
		iconName: "sla",
		// Scheduler Story 13.2 — monitor and advance the OPD queue.
		requiredPermissions: [{ module: "scheduling", action: "view" }],
		requireAllPermissions: [{ module: "scheduling", action: "edit" }],
		excludePermissions: [{ module: "audit", action: "view" }],
	},
	{
		title: "OR Schedule",
		href: "/or/schedule",
		iconName: "surgical",
		// Scheduler Story 9.4 — book surgical cases against OR availability.
		requiredPermissions: [{ module: "scheduling", action: "view" }],
		requireAllPermissions: [{ module: "scheduling", action: "create" }],
		excludePermissions: [{ module: "audit", action: "view" }],
	},
	{
		title: "OR Schedule",
		href: "/or/schedule",
		iconName: "surgical",
		// Surgeon/Anesthesiologist read-only schedule for assigned cases.
		requiredPermissions: [{ module: "surgical", action: "view" }],
		excludePermissions: [{ module: "scheduling", action: "view" }],
	},
	{
		title: "Bed Management",
		href: "/beds",
		iconName: "bed",
		requiredPermissions: [
			{ module: "adt", action: "edit" },
			{ module: "adt", action: "delete" },
		],
		// Exclude Scheduler who has adt:view/create but shouldn't manage beds
		excludePermissions: [{ module: "scheduling", action: "view" }],
	},
	{
		title: "Housekeeping",
		href: "/beds/housekeeping",
		iconName: "bed",
		requiredPermissions: [{ module: "adt", action: "edit" }],
		requireAllPermissions: REGISTRAR_ROLE_BUNDLE,
	},
	{
		title: "Emergency",
		href: "/ed",
		iconName: "emergency",
		// Triage Officers use /triage for Story 2.7, 3.1, and 3.4. The broader
		// ED workspace contains nurse tracking and physician disposition flows.
		requiredPermissions: [{ module: "ed", action: "view" }],
		excludeAllPermissions: TRIAGE_ROLE_BUNDLE,
	},
	{
		title: "Surgical Services",
		href: "/surgical",
		iconName: "surgical",
		// Dedicated surgical module permission (seeded for Surgeon/Anesthesiologist)
		// Admin does not have surgical access per TOR
		requiredPermissions: [{ module: "surgical", action: "view" }],
	},
	{
		title: "OPD",
		href: "/opd",
		iconName: "stethoscope",
		// OPD access is now controlled by dedicated opd:view permission
		// Seeded for: Admin, Physician, Surgeon, Nurse, Registrar
		// NOT seeded for: Anesthesiologist (works only in OR), Auditor (non-clinical role)
		// NOTE: Auditor doesn't have opd:view, so OPD is already hidden from them
		requiredPermissions: [{ module: "opd", action: "view" }],
		excludeAllPermissions: TRIAGE_ROLE_BUNDLE,
	},
	{
		title: "Chart Merge",
		href: "/registrar/chart-merge",
		iconName: "records",
		requiredPermissions: [{ module: "adt", action: "edit" }],
		requireAllPermissions: [{ module: "patients", action: "edit" }],
	},
	{
		title: "Civil Registry",
		href: "/registrar/civil-registry",
		iconName: "records",
		requiredPermissions: [{ module: "civil_registry", action: "view" }],
		requireAllPermissions: REGISTRAR_ROLE_BUNDLE,
	},
	{
		title: "Patient Transfers",
		href: "/registrar/transfers",
		iconName: "bed",
		requiredPermissions: [{ module: "adt", action: "edit" }],
		requireAllPermissions: REGISTRAR_ROLE_BUNDLE,
	},
	{
		title: "Discharge Processing",
		href: "/registrar/discharge",
		iconName: "bed",
		requiredPermissions: [{ module: "adt", action: "edit" }],
		requireAllPermissions: REGISTRAR_ROLE_BUNDLE,
	},
	{
		title: "Laboratory",
		href: "/laboratory",
		iconName: "laboratory",
		// Laboratory module is seeded for Lab Technologist role
		// Admin does not have laboratory access per TOR
		requiredPermissions: [{ module: "laboratory", action: "view" }],
	},
	{
		title: "Radiology",
		href: "/radiology",
		iconName: "radiology",
		// Radiology module is seeded for Radiologist role
		// Admin does not have radiology access per TOR
		requiredPermissions: [{ module: "radiology", action: "view" }],
	},
	{
		title: "Pharmacy",
		href: "/pharmacy",
		iconName: "pill",
		requiredPermissions: [{ module: "orders", action: "verify" }],
	},
	{
		title: "OPD Dispensing",
		href: "/pharmacy/opd",
		iconName: "pill",
		// Primary sidebar for Pharmacist — hidden from admins and physicians
		requiredPermissions: [{ module: "orders", action: "verify" }],
		excludePermissions: [
			{ module: "admin", action: "view" },
			{ module: "clinical_docs", action: "sign" },
		],
	},
	{
		title: "Formulary",
		href: "/pharmacy/formulary",
		iconName: "formulary",
		// Primary sidebar for Pharmacist — note-editing workflow
		requiredPermissions: [{ module: "orders", action: "verify" }],
		// Admin users access the governance surface at /admin/formulary instead
		excludePermissions: [{ module: "admin", action: "view" }],
	},
	{
		title: "Nursing",
		href: "/nursing",
		iconName: "nursing",
		requiredPermissions: [{ module: "nursing", action: "view" }],
		// Physicians have nursing:view to read nursing notes, not to manage the nursing dashboard
		excludePermissions: [{ module: "clinical_docs", action: "sign" }],
		excludeAllPermissions: TRIAGE_ROLE_BUNDLE,
	},
	{
		title: "Pending Transfers",
		href: "/nursing/transfers",
		iconName: "bed",
		requiredPermissions: [{ module: "nursing", action: "create" }],
		excludeAllPermissions: TRIAGE_ROLE_BUNDLE,
	},
	{
		title: "Nutrition",
		href: "/nutrition",
		iconName: "nutrition",
		// Primary nav for Dietitian
		requiredPermissions: [{ module: "nutrition", action: "view" }],
	},
	{
		title: "Telemedicine",
		href: "/telemedicine",
		iconName: "video",
		// telemedicine:view is the dedicated module permission seeded for Physician only
		// Matches the page-level gate and aligns with TOR: Physicians conduct virtual consultations
		requiredPermissions: [{ module: "telemedicine", action: "view" }],
	},
	{
		title: "Billing",
		href: "/billing",
		iconName: "billing",
		requiredPermissions: [{ module: "billing", action: "view" }],
		// Billing dashboard is for Billing Staff, not clinical staff who create notes
		excludePermissions: [{ module: "clinical_docs", action: "create" }],
	},
]

/**
 * Secondary nav items — shown in the "More Modules" collapsible.
 *
 * Formulary     — anyone who can view the formulary (pharmacist, physician, admin)
 * Reporting     — reporting/surveillance officers and admins
 * Audit Trail   — auditor / privacy officer roles
 * Administration — system admin only
 */
export const SECONDARY_NAV_ITEMS: NavItemConfig[] = [
	{
		title: "Medical Records",
		href: "/records",
		iconName: "records",
		// medical_records:view is the dedicated module permission
		// Seeded for: HIM Coder (view/create/edit) and Registrar (view)
		// Admin does not have medical records access per TOR
		requiredPermissions: [{ module: "medical_records", action: "view" }],
		excludeAllPermissions: REGISTRAR_ROLE_BUNDLE,
		isSecondary: true,
	},
	{
		title: "HIM Dashboard",
		href: "/him",
		iconName: "records",
		// HIM access accepts the dedicated him:read/write permission pair and the
		// legacy medical_records:view fallback during the RBAC transition.
		requiredPermissions: [
			{ module: "him", action: "read" },
			{ module: "him", action: "write" },
			{ module: "medical_records", action: "view" },
		],
		excludeAllPermissions: REGISTRAR_ROLE_BUNDLE,
		isSecondary: true,
	},
	{
		title: "NBS Logbook",
		href: "/nbs",
		iconName: "nbs",
		// NBS access is controlled by dedicated nbs:view permission
		// Seeded for Nurse role (ward nurses/midwives who perform screening)
		// Admin does not have NBS access per TOR
		requiredPermissions: [{ module: "nbs", action: "view" }],
		isSecondary: true,
	},
	{
		title: "Civil Registry",
		href: "/admin/civil-registry",
		iconName: "records",
		// Civil registry operations belong to civil_registry-role staff (Registrar, Nurse/Midwife).
		// The page gate and backend guard both require civil_registry:view — align nav to match.
		requiredPermissions: [{ module: "civil_registry", action: "view" }],
		excludeAllPermissions: REGISTRAR_ROLE_BUNDLE,
		isSecondary: true,
	},
	{
		title: "SLA Dashboard",
		href: "/sla",
		iconName: "sla",
		requiredPermissions: [
			{ module: "admin", action: "view" },
			{ module: "reporting", action: "view" },
		],
		// SLA dashboard (/sla) is for Reporting Officers only.
		// Admin users have a unified workspace at /admin/sla — exclude them here to avoid duplication.
		// Billing Officers have reporting:view for export but SLA monitoring is for surveillance;
		// use billing:create (not billing:view) to identify Billing Officers specifically,
		// so admins who have billing:view (read-only) are not excluded from this logic.
		excludePermissions: [
			{ module: "clinical_docs", action: "create" },
			{ module: "billing", action: "create" },
			{ module: "admin", action: "view" },
		],
		isSecondary: true,
	},
	{
		title: "User Management",
		href: "/admin/users",
		iconName: "patient",
		requiredPermissions: [{ module: "admin", action: "view" }],
		isSecondary: true,
		adminGroup: "Identity & Access",
	},
	{
		title: "Roles & Permissions",
		href: "/admin/roles",
		iconName: "audit",
		requiredPermissions: [{ module: "admin", action: "view" }],
		isSecondary: true,
		adminGroup: "Identity & Access",
	},
	{
		title: "Clinician Licenses",
		href: "/admin/clinician-licenses",
		iconName: "stethoscope",
		requiredPermissions: [{ module: "admin", action: "view" }],
		isSecondary: true,
		adminGroup: "Identity & Access",
	},
	{
		title: "Feature Flags",
		href: "/admin/feature-flags",
		iconName: "settings",
		requiredPermissions: [
			{ module: "admin", action: "view" },
			{ module: "feature_flags", action: "view" },
		],
		isSecondary: true,
		adminGroup: "Clinical Configuration",
	},
	{
		title: "BOR & Census",
		href: "/admin/bor",
		iconName: "bed",
		requiredPermissions: [{ module: "admin", action: "view" }],
		isSecondary: true,
		adminGroup: "Clinical Configuration",
	},
	{
		title: "ARTA / SLA",
		href: "/admin/sla",
		iconName: "sla",
		requiredPermissions: [{ module: "admin", action: "view" }],
		isSecondary: true,
		adminGroup: "Reporting & Compliance",
	},
	{
		title: "FHIR Export",
		href: "/admin/fhir",
		iconName: "report",
		requiredPermissions: [{ module: "admin", action: "view" }],
		requireAllPermissions: [{ module: "fhir", action: "view" }],
		isSecondary: true,
		adminGroup: "Reporting & Compliance",
	},
	{
		title: "FHIR Endpoints",
		href: "/admin/fhir-endpoints",
		iconName: "report",
		requiredPermissions: [{ module: "admin", action: "view" }],
		isSecondary: true,
		adminGroup: "Reporting & Compliance",
	},
	{
		title: "Terminology",
		href: "/admin/terminology",
		iconName: "formulary",
		requiredPermissions: [{ module: "admin", action: "view" }],
		isSecondary: true,
		adminGroup: "Reporting & Compliance",
	},
	{
		title: "Facility Profile",
		href: "/admin/facility-profile",
		iconName: "settings",
		requiredPermissions: [{ module: "admin", action: "view" }],
		requireAllPermissions: [{ module: "facility_profile", action: "view" }],
		isSecondary: true,
		adminGroup: "System Settings",
	},
	{
		title: "System Settings",
		href: "/admin/settings",
		iconName: "settings",
		requiredPermissions: [
			{ module: "admin", action: "view" },
			{ module: "system_settings", action: "view" },
		],
		isSecondary: true,
		adminGroup: "System Settings",
	},
	{
		title: "Integration Registry",
		href: "/admin/integration-registry",
		iconName: "settings",
		requiredPermissions: [{ module: "integration_registry", action: "view" }],
		requireAllPermissions: [{ module: "admin", action: "view" }],
		isSecondary: true,
		adminGroup: "System Settings",
	},
	{
		title: "Master Data",
		href: "/admin/master-data",
		iconName: "formulary",
		requiredPermissions: [{ module: "admin", action: "view" }],
		isSecondary: true,
		adminGroup: "System Settings",
	},
	{
		title: "Social Work (MSW)",
		href: "/msw",
		iconName: "social-work",
		// msw:view is the dedicated module permission (seeded for Medical Social Worker)
		// No excludePermissions needed — msw:view is role-specific
		requiredPermissions: [{ module: "msw", action: "view" }],
		isSecondary: true,
	},
	{
		title: "Blood Bank",
		href: "/blood-bank",
		iconName: "blood-bank",
		// Blood Bank is tied to Laboratory module (Lab Techs handle cross-matching)
		// Admin does not have blood bank access per TOR
		requiredPermissions: [{ module: "laboratory", action: "view" }],
		isSecondary: true,
	},
	{
		title: "Patients",
		href: "/patients/search",
		iconName: "patient",
		// Lab Techs, Radiologists, and Pharmacists access patients from SECONDARY for contextual lookup
		requiredPermissions: [
			{ module: "laboratory", action: "view" },
			{ module: "radiology", action: "view" },
			{ module: "orders", action: "verify" },
		],
		excludePermissions: [{ module: "admin", action: "view" }],
		isSecondary: true,
	},
	{
		title: "Formulary",
		href: "/admin/formulary",
		iconName: "formulary",
		requiredPermissions: [{ module: "formulary", action: "view" }],
		// Dual-gate: admin governance surface requires admin:view (FORM-005)
		requireAllPermissions: [{ module: "admin", action: "view" }],
		isSecondary: true,
	},
	{
		title: "Reporting",
		href: "/reporting",
		iconName: "report",
		requiredPermissions: [{ module: "reporting", action: "view" }],
		// Reporting dashboard is for Surveillance Officers; clinical staff access death reporting
		// via disposition triggers, not via this nav link
		excludePermissions: [{ module: "clinical_docs", action: "sign" }],
		isSecondary: true,
	},
	{
		title: "Clinical Docs",
		href: "/clinical-docs",
		iconName: "records",
		// Biller, HIM Coder, and similar roles need view access to clinical docs
		// HIM Coders have clinical_docs:edit for chart completion (but can't sign)
		// This is separate from the Documentation tab inside encounters
		requiredPermissions: [
			{ module: "clinical_docs", action: "view" },
			{ module: "clinical_docs", action: "edit" }, // HIM Coders have edit for chart completion
		],
		// Exclude clinical staff who sign their own notes - they use Documentation tab
		// Also exclude nurses and ancillary staff
		excludePermissions: [
			{ module: "clinical_docs", action: "sign" }, // Physicians sign notes, don't need this nav
			{ module: "nursing", action: "create" },
			{ module: "nutrition", action: "view" },
			{ module: "radiology", action: "view" },
			{ module: "laboratory", action: "view" },
		],
		isSecondary: true,
	},
	{
		title: "Audit Trail",
		href: "/auditor/audit-log",
		iconName: "audit",
		requiredPermissions: [{ module: "audit", action: "view" }],
		isSecondary: true,
	},
	{
		title: "Administration",
		href: "/admin",
		iconName: "settings",
		requiredPermissions: [{ module: "admin", action: "view" }],
		isSecondary: true,
	},
]

interface Permission {
	module: string
	action: string
}

export function getDefaultPatientsHref(permissions: Permission[]): string {
	const permSet = new Set(permissions.map(p => `${p.module}:${p.action}`))

	if (
		TRIAGE_ROLE_BUNDLE.every(permission => permSet.has(`${permission.module}:${permission.action}`))
	) {
		return "/triage"
	}

	if (permSet.has("clinical_docs:sign")) {
		return "/patients/search"
	}

	if (permSet.has("nursing:create") && !permSet.has("adt:create")) {
		return "/patients/search"
	}

	return "/patients/register"
}

/**
 * Filter navigation items based on the user's active role permissions.
 *
 * - Items with an empty requiredPermissions array are always shown (Dashboard).
 * - Otherwise the item is shown if the user holds ANY of the listed module+action
 *   pairs. This allows fine-grained role separation beyond just "has the module".
 * - excludePermissions take precedence: if the user holds ANY of those, the item
 *   is hidden regardless of requiredPermissions.
 *
 * TOR note: Administrators are not granted a broad navigation bypass. Their
 * visible items are determined by the explicit permissions seeded for the
 * Administrator role (admin:view, audit:view, formulary:view,
 * integration_registry:view, etc.). Clinical module nav items must not include
 * admin:view in their requiredPermissions.
 */
export function filterNavItems(items: NavItemConfig[], permissions: Permission[]): NavItemConfig[] {
	const permSet = new Set(permissions.map(p => `${p.module}:${p.action}`))

	return items.filter(item => {
		// Check excludes first (takes precedence over includes)
		if (item.excludePermissions?.some(p => permSet.has(`${p.module}:${p.action}`))) {
			return false
		}

		if (
			item.excludeAllPermissions?.length &&
			item.excludeAllPermissions.every(p => permSet.has(`${p.module}:${p.action}`))
		) {
			return false
		}

		// AND logic: all listed permissions must be present
		if (
			item.requireAllPermissions?.length &&
			!item.requireAllPermissions.every(p => permSet.has(`${p.module}:${p.action}`))
		) {
			return false
		}

		if (item.requiredPermissions.length === 0) return true
		return item.requiredPermissions.some(p => permSet.has(`${p.module}:${p.action}`))
	})
}

interface PermissionLike {
	module: string
	action: string
}

/**
 * Default widget configurations per role name.
 * Keys are role names (lowercase). Widgets are IDs resolved by DashboardWidgets.
 */
export const ROLE_DASHBOARD_WIDGETS: Record<string, string[]> = {
	// TOR: System Admin — governance, config, audit, integration, ARTA/SLA visibility
	"administrator": [
		"admin-access-governance",
		"admin-platform-control",
		"admin-integrations",
		"admin-audit",
		"admin-arta-sla",
	],
	"registrar": ["my-patient-list", "quick-stats", "alerts"],
	"clinician": ["my-patient-list", "pending-orders", "unsigned-notes", "alerts"],
	"physician": ["my-patient-list", "pending-orders", "unsigned-notes", "alerts"],
	"surgeon": ["my-patient-list", "unsigned-notes", "alerts"],
	"anesthesiologist": ["my-patient-list", "unsigned-notes", "alerts"],
	"nurse": ["my-patient-list", "pending-orders", "alerts", "quick-stats"],
	"pharmacist": ["pending-orders", "alerts", "quick-stats"],
	"billing officer": ["quick-stats", "alerts"],
}

export function getDashboardWidgetsForPermissions(permissions: PermissionLike[]): string[] {
	const permSet = new Set(permissions.map(p => `${p.module}:${p.action}`))
	const widgetIds = new Set<string>(["quick-stats", "alerts"])

	if (permSet.has("patients:view")) {
		widgetIds.add("my-patient-list")
	}

	if (permSet.has("orders:create") || permSet.has("orders:sign") || permSet.has("orders:verify")) {
		widgetIds.add("pending-orders")
	}

	if (permSet.has("clinical_docs:sign")) {
		widgetIds.add("unsigned-notes")
	}

	return [...widgetIds]
}

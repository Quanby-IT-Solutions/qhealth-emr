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
	 * All permissions in this list must be present for the item to show.
	 * Applied after requiredPermissions. Use this to enforce AND logic across
	 * multiple distinct permission requirements (e.g. admin:view + fhir:view).
	 */
	requireAllPermissions?: RequiredPermission[]
	isSecondary?: boolean
}

/**
 * Primary navigation items visible in the sidebar.
 *
 * Visibility rules (per TOR role bundles in seed-dev.ts):
 *
 * Dashboard          — always visible
 * Register Patient   — roles that create patient records (adt/create → Registrar, Admin)
 * Patients           — anyone who can view clinical data (adt, clinical_docs, orders, nursing, billing)
 * Bed Management     — roles that modify ADT records (adt/edit → Admin, Registrar-like)
 * Emergency          — roles that create pre-encounters (adt/create) OR chart nursing in ER (nursing/create)
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
		title: "Register Patient",
		href: "/patients/register",
		iconName: "patient",
		requiredPermissions: [
			{ module: "adt", action: "create" },
		],
		// Registration is for Registrars/Triage, not clinical staff who sign documents
		excludePermissions: [
			{ module: "clinical_docs", action: "sign" },
		],
	},
	{
		title: "Patients",
		href: "/patients/search",
		iconName: "patient",
		requiredPermissions: [
			{ module: "patients", action: "view" },
		],
		// Pharmacists, Lab Techs, Radiologists, PIDSR Officers access patient data
		// via their primary workflow nav, not the global Patients list
		excludePermissions: [
			{ module: "orders", action: "verify" }, // Pharmacist
			{ module: "laboratory", action: "view" }, // Lab Technologist, Blood Bank Technician
			{ module: "radiology", action: "view" }, // Radiologist
			{ module: "reporting", action: "edit" }, // PIDSR Officer
		],
	},
	{
		title: "Scheduling",
		href: "/scheduling",
		iconName: "calendar",
		// Scheduling module is for Scheduler role and Registrar (adt:edit)
		// Admin does not have scheduling access per TOR
		requiredPermissions: [
			{ module: "scheduling", action: "view" },
			{ module: "adt", action: "edit" }, // Registrar fallback (also manages appointments)
		],
		// Exclude Nurses who have adt:edit for bed management, not scheduling
		excludePermissions: [
			{ module: "nursing", action: "create" },
		],
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
		excludePermissions: [
			{ module: "scheduling", action: "view" },
		],
	},
	{
		title: "Emergency",
		href: "/ed",
		iconName: "emergency",
		// ed:view is the dedicated ED module permission (seeded for Triage Officer, Nurse, Physician)
		// Replaces the proxy adt:create/nursing:create approach — no excludePermissions needed
		requiredPermissions: [
			{ module: "ed", action: "view" },
		],
	},
	{
		title: "Surgical Services",
		href: "/surgical",
		iconName: "surgical",
		// Dedicated surgical module permission (seeded for Surgeon/Anesthesiologist)
		// Admin does not have surgical access per TOR
		requiredPermissions: [
			{ module: "surgical", action: "view" },
		],
	},
	{
		title: "OPD",
		href: "/opd",
		iconName: "stethoscope",
		// OPD access is now controlled by dedicated opd:view permission
		// Seeded for: Admin, Physician, Surgeon, Nurse, Registrar
		// NOT seeded for: Anesthesiologist (works only in OR), Auditor (non-clinical role)
		// NOTE: Auditor doesn't have opd:view, so OPD is already hidden from them
		requiredPermissions: [
			{ module: "opd", action: "view" },
		],
	},
	{
		title: "Laboratory",
		href: "/laboratory",
		iconName: "laboratory",
		// Laboratory module is seeded for Lab Technologist role
		// Admin does not have laboratory access per TOR
		requiredPermissions: [
			{ module: "laboratory", action: "view" },
		],
	},
	{
		title: "Radiology",
		href: "/radiology",
		iconName: "radiology",
		// Radiology module is seeded for Radiologist role
		// Admin does not have radiology access per TOR
		requiredPermissions: [
			{ module: "radiology", action: "view" },
		],
	},
	{
		title: "Pharmacy",
		href: "/pharmacy",
		iconName: "pill",
		requiredPermissions: [
			{ module: "orders", action: "verify" },
		],
	},
	{
		title: "OPD Dispensing",
		href: "/pharmacy/opd",
		iconName: "pill",
		// Primary sidebar for Pharmacist — hidden from admins and physicians
		requiredPermissions: [
			{ module: "orders", action: "verify" },
		],
		excludePermissions: [
			{ module: "admin", action: "view" },
			{ module: "clinical_docs", action: "sign" },
		],
	},
	{
		title: "Formulary",
		href: "/admin/formulary",
		iconName: "formulary",
		// Primary sidebar for Pharmacist
		requiredPermissions: [
			{ module: "orders", action: "verify" },
		],
	},
	{
		title: "Nursing",
		href: "/nursing",
		iconName: "nursing",
		requiredPermissions: [
			{ module: "nursing", action: "view" },
		],
	},
	{
		title: "Nutrition",
		href: "/nutrition",
		iconName: "nutrition",
		// Primary nav for Dietitian
		requiredPermissions: [
			{ module: "nutrition", action: "view" },
		],
	},
	{
		title: "Telemedicine",
		href: "/telemedicine",
		iconName: "video",
		// telemedicine:view is the dedicated module permission seeded for Physician only
		// Matches the page-level gate and aligns with TOR: Physicians conduct virtual consultations
		requiredPermissions: [
			{ module: "telemedicine", action: "view" },
		],
	},
	{
		title: "Billing",
		href: "/billing",
		iconName: "billing",
		requiredPermissions: [
			{ module: "billing", action: "view" },
		],
		// Billing dashboard is for Billing Staff, not clinical staff who create notes
		excludePermissions: [
			{ module: "clinical_docs", action: "create" },
		],
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
		requiredPermissions: [
			{ module: "medical_records", action: "view" },
		],
		isSecondary: true,
	},
	{
		title: "HIM Dashboard",
		href: "/him",
		iconName: "records",
		// HIM Coder owns chart completion queue, deficiency tracking, coding queue
		// medical_records:view is the correct boundary — aligns with the backend guard
		requiredPermissions: [
			{ module: "medical_records", action: "view" },
		],
		isSecondary: true,
	},
	{
		title: "NBS Logbook",
		href: "/nbs",
		iconName: "nbs",
		// NBS access is controlled by dedicated nbs:view permission
		// Seeded for Nurse role (ward nurses/midwives who perform screening)
		// Admin does not have NBS access per TOR
		requiredPermissions: [
			{ module: "nbs", action: "view" },
		],
		isSecondary: true,
	},
	{
		title: "Civil Registry",
		href: "/admin/civil-registry",
		iconName: "records",
		// civil_registry:view is the dedicated module permission
		// Seeded for Registrar (view/create/edit)
		requiredPermissions: [
			{ module: "civil_registry", action: "view" },
		],
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
		title: "FHIR Export",
		href: "/admin/fhir",
		iconName: "report",
		requiredPermissions: [
			{ module: "admin", action: "view" },
		],
		// Also require fhir:view — the page itself enforces both permissions,
		// so the nav link should only appear when the user can actually access it.
		requireAllPermissions: [
			{ module: "fhir", action: "view" },
		],
		isSecondary: true,
	},
	{
		title: "ARTA / SLA",
		href: "/admin/sla",
		iconName: "sla",
		requiredPermissions: [
			{ module: "admin", action: "view" },
		],
		isSecondary: true,
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
	},
	{
		title: "Facility Profile",
		href: "/admin/facility-profile",
		iconName: "settings",
		requiredPermissions: [
			{ module: "admin", action: "view" },
		],
		// Also require facility_profile:view — the page and API enforce this permission,
		// so the nav link must only appear when the user can actually access it.
		requireAllPermissions: [
			{ module: "facility_profile", action: "view" },
		],
		isSecondary: true,
	},
	{
		title: "Integration Registry",
		href: "/admin/integration-registry",
		iconName: "settings",
		requiredPermissions: [
			{ module: "integration_registry", action: "view" },
		],
		isSecondary: true,
	},
	{
		title: "Social Work (MSW)",
		href: "/msw",
		iconName: "social-work",
		// msw:view is the dedicated module permission (seeded for Medical Social Worker)
		// No excludePermissions needed — msw:view is role-specific
		requiredPermissions: [
			{ module: "msw", action: "view" },
		],
		isSecondary: true,
	},
	{
		title: "Nutrition",
		href: "/nutrition",
		iconName: "nutrition",
		// nutrition:view is the dedicated module permission (seeded for Clinical Dietitian)
		// Nurses access dietary information via clinical notes, not the Nutrition module
		requiredPermissions: [
			{ module: "nutrition", action: "view" },
		],
		isSecondary: true,
	},
	{
		title: "Blood Bank",
		href: "/blood-bank",
		iconName: "blood-bank",
		// Blood Bank is tied to Laboratory module (Lab Techs handle cross-matching)
		// Admin does not have blood bank access per TOR
		requiredPermissions: [
			{ module: "laboratory", action: "view" },
		],
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
		excludePermissions: [
			{ module: "admin", action: "view" },
		],
		isSecondary: true,
	},
	{
		title: "Formulary",
		href: "/admin/formulary",
		iconName: "formulary",
		requiredPermissions: [
			{ module: "formulary", action: "view" },
		],
		isSecondary: true,
	},
	{
		title: "OPD Dispensing",
		href: "/pharmacy/opd",
		iconName: "pill",
		// OPD dispensing for outpatient prescription processing
		requiredPermissions: [
			{ module: "orders", action: "verify" },
		],
		isSecondary: true,
	},
	{
		title: "Reporting",
		href: "/reporting",
		iconName: "report",
		requiredPermissions: [
			{ module: "reporting", action: "view" },
		],
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
		href: "/audit",
		iconName: "audit",
		requiredPermissions: [
			{ module: "audit", action: "view" },
		],
		isSecondary: true,
	},
	{
		title: "Administration",
		href: "/admin",
		iconName: "settings",
		requiredPermissions: [
			{ module: "admin", action: "view" },
		],
		isSecondary: true,
	},
]

interface Permission {
	module: string
	action: string
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
 * Administrator role (admin:view, audit:view, formulary:view, reporting:view,
 * integration_registry:view, etc.). Clinical module nav items must not include
 * admin:view in their requiredPermissions.
 */
export function filterNavItems(
	items: NavItemConfig[],
	permissions: Permission[]
): NavItemConfig[] {
	const permSet = new Set(permissions.map(p => `${p.module}:${p.action}`))

	return items.filter(item => {
		// Check excludes first (takes precedence over includes)
		if (item.excludePermissions?.some(p => permSet.has(`${p.module}:${p.action}`))) {
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

/**
 * Default widget configurations per role name.
 * Keys are role names (lowercase). Widgets are IDs resolved by DashboardWidgets.
 */
export const ROLE_DASHBOARD_WIDGETS: Record<string, string[]> = {
	// TOR: System Admin — governance, config, audit, integration, ARTA/SLA visibility
	administrator: [
		"admin-access-governance",
		"admin-platform-control",
		"admin-integrations",
		"admin-audit",
		"admin-arta-sla",
	],
	registrar: ["my-patient-list", "quick-stats", "alerts"],
	clinician: ["my-patient-list", "pending-orders", "unsigned-notes", "alerts"],
	physician: ["my-patient-list", "pending-orders", "unsigned-notes", "alerts"],
	nurse: ["my-patient-list", "pending-orders", "alerts", "quick-stats"],
	pharmacist: ["pending-orders", "alerts", "quick-stats"],
	"billing officer": ["quick-stats", "alerts"],
}

export function getDashboardWidgets(roleName: string): string[] {
	const key = roleName.toLowerCase()
	return ROLE_DASHBOARD_WIDGETS[key] ?? ["quick-stats", "alerts"]
}

/**
 * Returns true if the given role name resolves to the Administrator widget set.
 */
export function isAdminRole(roleName: string): boolean {
	return roleName.toLowerCase() === "administrator"
}

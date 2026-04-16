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
	| "surgical" // Seeded for Surgeon/Anesthesiologist roles
	| "opd" // Seeded for roles that access OPD (not Anesthesiologist)
	// Future modules — permissions not yet seeded; gated on admin/view for visualization
	| "scheduling"
	| "him"
	| "msw"
	| "telemedicine"
	| "nutrition"
	| "blood_bank"
	| "laboratory"
	| "radiology"

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
			{ module: "adt", action: "view" },
			{ module: "clinical_docs", action: "view" },
			{ module: "orders", action: "view" },
			{ module: "nursing", action: "view" },
			{ module: "billing", action: "view" },
		],
		// Pharmacists, Lab Techs, Radiologists access patients via SECONDARY nav
		// PIDSR Officers access patients via Clinical Docs nav, not primary Patients
		excludePermissions: [
			{ module: "orders", action: "verify" },
			{ module: "laboratory", action: "view" },
			{ module: "radiology", action: "view" },
			{ module: "reporting", action: "edit" }, // PIDSR has reporting:edit; Physician only has view/create
		],
	},
	{
		title: "Scheduling",
		href: "/scheduling",
		iconName: "calendar",
		// Scheduling module is now seeded for Scheduler role
		requiredPermissions: [
			{ module: "admin", action: "view" },
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
		requiredPermissions: [
			// Triage officers / physicians create pre-encounters
			{ module: "adt", action: "create" },
			// ER nurses chart nursing records before registration
			{ module: "nursing", action: "create" },
		],
		// Exclude Scheduler who has adt:create but shouldn't access ED
		excludePermissions: [
			{ module: "scheduling", action: "view" },
		],
	},
	{
		title: "Surgical Services",
		href: "/surgical",
		iconName: "surgical",
		// Now using dedicated surgical module permission (seeded for Surgeon/Anesthesiologist)
		requiredPermissions: [
			{ module: "admin", action: "view" },
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
		requiredPermissions: [
			{ module: "admin", action: "view" },
			{ module: "laboratory", action: "view" },
		],
	},
	{
		title: "Radiology",
		href: "/radiology",
		iconName: "radiology",
		// Radiology module is seeded for Radiologist role
		requiredPermissions: [
			{ module: "admin", action: "view" },
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
		title: "Telemedicine",
		href: "/telemedicine",
		iconName: "video",
		// Telemedicine is for clinicians who sign consultation notes (virtual visits)
		// clinical_docs:sign distinguishes Physicians from HIM Coders (who only have create/edit)
		requiredPermissions: [
			{ module: "admin", action: "view" },
			{ module: "clinical_docs", action: "sign" },
		],
		// Surgeons/Anesthesiologists don't use telemedicine - they use Surgical Services
		// Nurses/Midwives don't use telemedicine - they work on wards/ED
		excludePermissions: [
			{ module: "surgical", action: "view" },
			{ module: "nursing", action: "create" },
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
		// TODO: swap to { module: "him", action: "view" } when module is seeded
		// HIM Coder needs clinical_docs:edit (not just view) for chart completion
		// Registrar needs access for birth/death certificate data (adt:edit)
		requiredPermissions: [
			{ module: "admin", action: "view" },
			{ module: "clinical_docs", action: "edit" },
			{ module: "adt", action: "edit" },
		],
		// HIM dashboard is for Health Information staff, not clinical staff who sign docs
		// Also not for Nurses who have clinical_docs:edit for charting purposes
		excludePermissions: [
			{ module: "clinical_docs", action: "sign" },
			{ module: "nursing", action: "create" },
		],
		isSecondary: true,
	},
	{
		title: "HIM Dashboard",
		href: "/him",
		iconName: "records",
		// HIM Dashboard is for chart completion queue, deficiency tracking
		// HIM Coders have clinical_docs:edit but can't sign notes
		requiredPermissions: [
			{ module: "admin", action: "view" },
			{ module: "clinical_docs", action: "edit" },
		],
		// Exclude clinicians who sign notes - they use Documentation tab
		// Exclude nurses who chart but aren't HIM staff
		excludePermissions: [
			{ module: "clinical_docs", action: "sign" },
			{ module: "nursing", action: "create" },
		],
		isSecondary: true,
	},
	{
		title: "NBS Logbook",
		href: "/nbs",
		iconName: "nbs",
		// TODO: swap to dedicated nbs module permission when seeded
		// NBS is for ward nurses/midwives who have nursing:edit, not Triage (only nursing:create)
		requiredPermissions: [
			{ module: "admin", action: "view" },
			{ module: "nursing", action: "edit" },
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
		// SLA dashboard is for Reporting Officers, not clinical staff or billing staff
		// Billing Officers have reporting:view for export, but SLA monitoring is for surveillance
		excludePermissions: [
			{ module: "clinical_docs", action: "create" },
			{ module: "billing", action: "view" },
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
		isSecondary: true,
	},
	{
		title: "SLA Configuration",
		href: "/admin/sla",
		iconName: "settings",
		requiredPermissions: [
			{ module: "admin", action: "view" },
		],
		isSecondary: true,
	},
	{
		title: "Social Work (MSW)",
		href: "/msw",
		iconName: "social-work",
		// TODO: swap to { module: "msw", action: "view" } when module is seeded
		requiredPermissions: [
			{ module: "admin", action: "view" },
			{ module: "billing", action: "view" },
		],
		// MSW dashboard is for Medical Social Workers, not clinical staff or billing staff
		// Billing Officers have billing:view but also billing:create (which MSW doesn't have)
		excludePermissions: [
			{ module: "clinical_docs", action: "create" },
			{ module: "billing", action: "create" },
		],
		isSecondary: true,
	},
	{
		title: "Nutrition",
		href: "/nutrition",
		iconName: "nutrition",
		// Nutrition module is now seeded for Clinical Dietitian role
		// Also visible to Nurses via nursing:edit for viewing diet orders
		requiredPermissions: [
			{ module: "admin", action: "view" },
			{ module: "nutrition", action: "view" },
			{ module: "nursing", action: "edit" },
		],
		isSecondary: true,
	},
	{
		title: "Blood Bank",
		href: "/blood-bank",
		iconName: "blood-bank",
		// Blood Bank is tied to Laboratory module (Lab Techs handle cross-matching)
		requiredPermissions: [
			{ module: "admin", action: "view" },
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
 */
export function filterNavItems(
	items: NavItemConfig[],
	permissions: Permission[]
): NavItemConfig[] {
	const permSet = new Set(permissions.map(p => `${p.module}:${p.action}`))
	const isAdmin = permSet.has("admin:view")

	return items.filter(item => {
		// Admin bypass - admins see everything except items they shouldn't
		if (isAdmin && item.requiredPermissions.length > 0) {
			return true
		}

		// Check excludes first (takes precedence over includes)
		if (item.excludePermissions?.some(p => permSet.has(`${p.module}:${p.action}`))) {
			return false
		}

		if (item.requiredPermissions.length === 0) return true
		return item.requiredPermissions.some(p => permSet.has(`${p.module}:${p.action}`))
	})
}

/**
 * Default widget configurations per role name.
 * Keys are role names (lowercase). Widgets are placeholder IDs populated by later tickets.
 */
export const ROLE_DASHBOARD_WIDGETS: Record<string, string[]> = {
	"system admin": ["quick-stats", "alerts", "system-health"],
	registrar: ["my-patient-list", "quick-stats", "alerts"],
	clinician: ["my-patient-list", "pending-orders", "unsigned-notes", "alerts"],
	nurse: ["my-patient-list", "pending-orders", "alerts", "quick-stats"],
	pharmacist: ["pending-orders", "alerts", "quick-stats"],
	"billing officer": ["quick-stats", "alerts"],
}

export function getDashboardWidgets(roleName: string): string[] {
	const key = roleName.toLowerCase()
	return ROLE_DASHBOARD_WIDGETS[key] ?? ["quick-stats", "alerts"]
}

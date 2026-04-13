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

interface NavItemConfig {
	title: string
	href: string
	iconName: NavIconName
	requiredModules: RbacModule[]
	isSecondary?: boolean
}

/**
 * Primary navigation items visible in the sidebar.
 * Filtered by the user's active role permissions.
 */
export const PRIMARY_NAV_ITEMS: NavItemConfig[] = [
	{
		title: "Dashboard",
		href: "/dashboard",
		iconName: "dashboard",
		requiredModules: [],
	},
	{
		title: "Patients",
		href: "/patients/search",
		iconName: "patient",
		requiredModules: ["adt"],
	},
	{
		title: "Bed Management",
		href: "/beds",
		iconName: "bed",
		requiredModules: ["adt"],
	},
	{
		title: "Emergency",
		href: "/ed",
		iconName: "emergency",
		requiredModules: ["adt"],
	},
	{
		title: "Pharmacy",
		href: "/pharmacy",
		iconName: "pill",
		requiredModules: ["orders"],
	},
]

/**
 * Secondary nav items — shown in the "More Modules" collapsible.
 */
export const SECONDARY_NAV_ITEMS: NavItemConfig[] = [
	{
		title: "Formulary",
		href: "/admin/formulary",
		iconName: "formulary",
		requiredModules: ["formulary"],
		isSecondary: true,
	},
	{
		title: "Reporting",
		href: "/reporting",
		iconName: "report",
		requiredModules: ["reporting"],
		isSecondary: true,
	},
	{
		title: "Audit Trail",
		href: "/audit",
		iconName: "audit",
		requiredModules: ["audit"],
		isSecondary: true,
	},
	{
		title: "Administration",
		href: "/admin",
		iconName: "settings",
		requiredModules: ["admin"],
		isSecondary: true,
	},
]

interface Permission {
	module: string
	action: string
}

/**
 * Filter navigation items based on the user's active permissions.
 * Items with empty requiredModules are always shown (e.g., Dashboard).
 */
export function filterNavItems(
	items: NavItemConfig[],
	permissions: Permission[]
): NavItemConfig[] {
	const moduleSet = new Set(permissions.map(p => p.module))

	return items.filter(item => {
		if (item.requiredModules.length === 0) return true
		return item.requiredModules.some(mod => moduleSet.has(mod))
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

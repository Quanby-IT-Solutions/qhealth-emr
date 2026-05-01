// Semantic status color tokens mapped to Tailwind classes.
// Use these instead of raw colors to ensure consistent visual language.

export type StatusVariant =
	| "verified"
	| "pending"
	| "active"
	| "inactive"
	| "expired"
	| "restricted"

export const STATUS_CLASSES: Record<StatusVariant, string> = {
	verified:   "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
	pending:    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
	active:     "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
	inactive:   "bg-muted text-muted-foreground",
	expired:    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
	restricted: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
}

export const STATUS_LABELS: Record<StatusVariant, string> = {
	verified:   "Verified",
	pending:    "Pending",
	active:     "Active",
	inactive:   "Inactive",
	expired:    "Expired",
	restricted: "Restricted",
}

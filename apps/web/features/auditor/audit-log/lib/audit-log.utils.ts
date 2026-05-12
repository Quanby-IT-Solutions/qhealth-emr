export const ACTION_COLORS: Record<string, string> = {
	create: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
	update: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
	delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
	sign: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
	verify: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
	override: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
}

export const SEVERITY_COLORS: Record<string, string> = {
	info: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
	warning: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
	critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

export const OUTCOME_COLORS: Record<string, string> = {
	success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
	failure: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

export function formatDateTime(val: unknown): string {
	if (!val) return "—"
	try {
		return new Date(val as string).toLocaleString("en-PH", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		})
	} catch {
		return String(val)
	}
}
